import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { TokenType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  RegisterDto,
  LoginDto,
  GoogleLoginDto,
  UpdateProfileDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly queueService: QueueService,
  ) {}

  private async generateUniqueStudentId(): Promise<string> {
    const currentYear = new Date().getFullYear();
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const studentId = `SA-${currentYear}-${randomNum}`;
      const existing = await this.prisma.user.findUnique({
        where: { studentId },
        select: { id: true },
      });
      if (!existing) {
        return studentId;
      }
    }
    const timestampSuffix = Date.now().toString().slice(-6);
    return `SA-${currentYear}-${timestampSuffix}`;
  }

  private async verifyTurnstileToken(token?: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('turnstile.secretKey');
    if (!secretKey) return true;
    if (!token) {
      throw new BadRequestException(
        'রোবট বা বট সুরক্ষার জন্য সিকিউরিটি যাচাইকরণ সম্পন্ন করুন (Turnstile verification required).',
      );
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const result: any = await response.json();
      if (!result.success) {
        throw new ForbiddenException(
          'বট বা সন্দেহজনক ট্র্যাফিক সনাক্ত করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
        );
      }
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof BadRequestException) {
        throw err;
      }
      return true;
    }
  }

  // 1. Send Registration OTP
  async sendRegistrationOtp(email: string, turnstileToken?: string) {
    if (turnstileToken) {
      await this.verifyTurnstileToken(turnstileToken);
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      throw new ConflictException(
        'এই ইমেইল দিয়ে ইতোমধ্যে একটি একাউন্ট তৈরি করা আছে! অনুগ্রহ করে লগইন করুন।',
      );
    }

    await this.prisma.emailToken.deleteMany({
      where: { email: cleanEmail, type: TokenType.EMAIL_VERIFICATION },
    });

    const verifyTokenStr = crypto.randomBytes(32).toString('hex');
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.emailToken.create({
      data: {
        email: cleanEmail,
        token: verifyTokenStr,
        otpCode,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt,
      },
    });

    const clientUrl = this.configService.get<string>('clientUrl');
    const verifyUrl = `${clientUrl}/verify-email?token=${verifyTokenStr}`;

    this.queueService
      .addEmailJob({
        to: cleanEmail,
        subject: 'আপনার রেজিস্ট্রেশন ওটিপি কোড - Shunno Academy',
        template: 'EMAIL_VERIFICATION',
        context: { name: 'শিক্ষার্থী', verifyUrl, otpCode },
      })
      .catch(() => {});

    return {
      success: true,
      message: 'আপনার ইমেইলে একটি ৬ ডিজিটের ভেরিফিকেশন কোড পাঠানো হয়েছে।',
      email: cleanEmail,
    };
  }

  // 2. Verify Registration OTP
  async verifyRegistrationOtp(email: string, otpCode: string) {
    const cleanEmail = email.toLowerCase().trim();
    const emailToken = await this.prisma.emailToken.findFirst({
      where: {
        email: cleanEmail,
        otpCode: otpCode.trim(),
        type: TokenType.EMAIL_VERIFICATION,
      },
    });

    if (!emailToken) {
      throw new BadRequestException('ভুল ওটিপি কোড! অনুগ্রহ করে সঠিক কোড দিন।');
    }

    if (new Date() > emailToken.expiresAt) {
      await this.prisma.emailToken.delete({ where: { id: emailToken.id } });
      throw new BadRequestException('ওটিপি কোডের মেয়াদ শেষ হয়ে গেছে! অনুগ্রহ করে পুনরায় ওটিপি পাঠান।');
    }

    await this.prisma.emailToken.delete({ where: { id: emailToken.id } });

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const registrationToken = this.jwtService.sign(
      { email: cleanEmail, isPreVerified: true },
      { secret: accessSecret, expiresIn: '1h' },
    );

    return {
      success: true,
      message: 'ইমেইল সফলভাবে ভেরিফাই হয়েছে!',
      email: cleanEmail,
      registrationToken,
    };
  }

  // 3. Register Student
  async register(payload: RegisterDto) {
    if (payload.turnstileToken) {
      await this.verifyTurnstileToken(payload.turnstileToken);
    }

    const cleanEmail = payload.email.toLowerCase().trim();

    if (payload.registrationToken) {
      try {
        const accessSecret = this.configService.get<string>('jwt.accessSecret');
        const decoded: any = this.jwtService.verify(payload.registrationToken, {
          secret: accessSecret,
        });
        if (decoded.email !== cleanEmail) {
          throw new BadRequestException('ভেরিফিকেশন টোকেন ও ইমেইল মিলছে না।');
        }
      } catch {
        throw new BadRequestException('রেজিস্ট্রেশন টোকেনের মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার ভেরিফাই করুন।');
      }
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      throw new ConflictException('এই ইমেইল দিয়ে ইতোমধ্যে একটি একাউন্ট তৈরি করা আছে!');
    }

    if (payload.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: payload.phone.trim() },
      });
      if (existingPhone) {
        throw new ConflictException('এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি একাউন্ট খোলা আছে!');
      }
    }

    const saltRounds = this.configService.get<number>('saltRounds') || 12;
    const hashedPassword = await bcrypt.hash(payload.password, saltRounds);
    const studentId = await this.generateUniqueStudentId();

    const newUser = await this.prisma.user.create({
      data: {
        studentId,
        name: payload.name.trim(),
        email: cleanEmail,
        phone: payload.phone.trim(),
        password: hashedPassword,
        role: UserRole.STUDENT,
        fatherName: payload.fatherName?.trim() || null,
        fatherPhone: payload.fatherPhone?.trim() || null,
        guardianName: payload.guardianName?.trim() || null,
        guardianPhone: payload.guardianPhone?.trim() || null,
        address: payload.address?.trim() || null,
        nidNumber: payload.nidNumber?.trim() || null,
        employeeId: payload.employeeId?.trim() || null,
        district: payload.district?.trim() || null,
        country: payload.country?.trim() || 'Bangladesh',
        occupation: payload.occupation?.trim() || null,
        isEmailVerified: true,
      },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        district: true,
        occupation: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    const currentSessionId = crypto.randomUUID();
    const jwtPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      sessionId: currentSessionId,
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') || '7d';
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '30d';

    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
    });
    const refreshToken = this.jwtService.sign(jwtPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    await this.prisma.user.update({
      where: { id: newUser.id },
      data: { refreshToken, currentSessionId },
    });

    // Send Welcome Email asynchronously
    this.queueService
      .addEmailJob({
        to: newUser.email,
        subject: 'শুন্য একাডেমিতে আপনাকে স্বাগতম!',
        template: 'WELCOME',
        context: { name: newUser.name },
      })
      .catch(() => {});

    return {
      user: newUser,
      accessToken,
      refreshToken,
    };
  }

  // 4. Login
  async login(payload: LoginDto, portalParam?: 'STUDENT_PORTAL' | 'ADMIN_PORTAL' | 'TEACHER_PORTAL') {
    if (payload.turnstileToken) {
      await this.verifyTurnstileToken(payload.turnstileToken);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase().trim() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Your account has been suspended! Please contact support.');
    }

    const activePortal = portalParam || payload.portal || 'STUDENT_PORTAL';

    if (activePortal === 'STUDENT_PORTAL') {
      if (user.role === UserRole.ADMIN || user.role === UserRole.STAFF) {
        throw new ForbiddenException(
          'অ্যাডমিন অ্যাকাউন্ট দিয়ে সাধারণ লগইন পেজে লগইন করা যাবে না। অনুগ্রহ করে /admin-login পেজ ব্যবহার করুন।',
        );
      }
      if (user.role === UserRole.INSTRUCTOR) {
        throw new ForbiddenException(
          'শিক্ষক অ্যাকাউন্ট দিয়ে সাধারণ লগইন পেজে লগইন করা যাবে না। অনুগ্রহ করে /teacher-login পেজ ব্যবহার করুন।',
        );
      }
    }

    if (activePortal === 'ADMIN_PORTAL') {
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF) {
        throw new ForbiddenException(
          'শুধুমাত্র অনুমোদিত অ্যাডমিন এবং স্টাফগণ অ্যাডমিন পোর্টালে লগইন করতে পারবেন।',
        );
      }
    }

    if (activePortal === 'TEACHER_PORTAL') {
      if (user.role !== UserRole.INSTRUCTOR && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'শুধুমাত্র শিক্ষকগণ শিক্ষক পোর্টালে লগইন করতে পারবেন। সাধারণ শিক্ষার্থীরা /login পেজ ব্যবহার করুন।',
        );
      }
    }

    const isPasswordMatched = await bcrypt.compare(payload.password, user.password);
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    if (!user.isEmailVerified) {
      const err = new ForbiddenException(
        'Your email address is not verified. Please check your inbox and verify before logging in.',
      ) as any;
      err.response = {
        success: false,
        statusCode: 403,
        message: err.message,
        errorCode: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      };
      throw err;
    }

    const currentSessionId = crypto.randomUUID();
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: currentSessionId,
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') || '7d';
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '30d';

    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
    });
    const refreshToken = this.jwtService.sign(jwtPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, currentSessionId },
    });

    const sanitizedUser = {
      id: user.id,
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      district: user.district,
      occupation: user.occupation,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    return {
      user: sanitizedUser,
      accessToken,
      refreshToken,
    };
  }

  // 5. Google Login
  async googleLogin(payload: GoogleLoginDto) {
    let email: string | undefined;
    let name: string | undefined;
    let avatar: string | undefined;
    let googleId: string | undefined;

    // 1. Verify Google ID Token (credential) with Google tokeninfo endpoint
    if (payload.credential) {
      try {
        const res = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(payload.credential)}`,
        );
        if (res.ok) {
          const googleData: any = await res.json();
          if (googleData.email && (googleData.email_verified === 'true' || googleData.email_verified === true)) {
            email = googleData.email;
            name = googleData.name;
            avatar = googleData.picture;
            googleId = googleData.sub;
          }
        }
      } catch {}
    }

    // 2. Verify Google OAuth Access Token with Google UserInfo endpoint
    if (!email && payload.accessToken) {
      try {
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${payload.accessToken}` },
        });
        if (userinfoRes.ok) {
          const googleData: any = await userinfoRes.json();
          if (googleData.email && (googleData.email_verified === 'true' || googleData.email_verified === true)) {
            email = googleData.email;
            name = googleData.name;
            avatar = googleData.picture;
            googleId = googleData.sub;
          }
        }
      } catch {}
    }

    if (!email) {
      throw new UnauthorizedException(
        'গুগল অ্যাকাউন্ট যাচাইকরণ ব্যর্থ হয়েছে! একটি বৈধ ও ভেরিফাইড গুগল অ্যাকাউন্ট দিয়ে পুনরায় চেষ্টা করুন।',
      );
    }

    email = email.toLowerCase().trim();
    const activePortal = payload.portal || 'STUDENT_PORTAL';

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(googleId ? [{ googleId }] : [])],
      },
    });

    if (user) {
      if (activePortal === 'STUDENT_PORTAL' && (user.role === UserRole.ADMIN || user.role === UserRole.STAFF)) {
        throw new ForbiddenException(
          'অ্যাডমিন অ্যাকাউন্ট দিয়ে সাধারণ গুগল লগইন ব্যবহার করা যাবে না। অনুগ্রহ করে /admin-login পেজ ব্যবহার করুন।',
        );
      }

      if (activePortal === 'ADMIN_PORTAL' && user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF) {
        throw new ForbiddenException('শিক্ষার্থী অ্যাকাউন্ট দিয়ে অ্যাডমিন পোর্টালে লগইন করা যাবে না।');
      }

      if (user.isBlocked) {
        throw new ForbiddenException('Your account has been suspended! Please contact support.');
      }

      // Link googleId or update avatar if missing
      if (!user.googleId || !user.avatar || !user.isEmailVerified) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId || googleId,
            avatar: user.avatar || avatar,
            isEmailVerified: true,
          },
        });
      }
    } else {
      const studentId = await this.generateUniqueStudentId();
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      user = await this.prisma.user.create({
        data: {
          studentId,
          name: name || 'Google User',
          email,
          googleId,
          avatar,
          password: hashedPassword,
          role: UserRole.STUDENT,
          isEmailVerified: true,
        },
      });

      this.queueService
        .addEmailJob({
          to: user.email,
          subject: 'শুন্য একাডেমিতে আপনাকে স্বাগতম!',
          template: 'WELCOME',
          context: { name: user.name },
        })
        .catch(() => {});
    }

    const currentSessionId = crypto.randomUUID();
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: currentSessionId,
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') || '7d';
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '30d';

    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
    });
    const refreshToken = this.jwtService.sign(jwtPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, currentSessionId },
    });

    const sanitizedUser = {
      id: user.id,
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      district: user.district,
      occupation: user.occupation,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    return {
      user: sanitizedUser,
      accessToken,
      refreshToken,
    };
  }

  // 6. Forgot Password
  async forgotPassword(email: string, turnstileToken?: string) {
    if (turnstileToken) {
      await this.verifyTurnstileToken(turnstileToken);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return { success: true, message: 'If an account exists with this email, a reset link has been dispatched.' };
    }

    await this.prisma.emailToken.deleteMany({
      where: { email: user.email, type: TokenType.PASSWORD_RESET },
    });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.emailToken.create({
      data: {
        email: user.email,
        token: resetToken,
        type: TokenType.PASSWORD_RESET,
        expiresAt,
      },
    });

    const clientUrl = this.configService.get<string>('clientUrl');
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    this.queueService
      .addEmailJob({
        to: user.email,
        subject: 'পাসওয়ার্ড রিসেট নির্দেশিকা - Shunno Academy',
        template: 'PASSWORD_RESET',
        context: { name: user.name, resetUrl },
      })
      .catch(() => {});

    return { success: true, message: 'Password reset link sent to your email successfully.' };
  }

  // 7. Reset Password
  async resetPassword(token: string, newPassword: string) {
    const emailToken = await this.prisma.emailToken.findFirst({
      where: { token, type: TokenType.PASSWORD_RESET },
    });

    if (!emailToken) {
      throw new BadRequestException('Invalid or expired password reset link!');
    }

    if (new Date() > emailToken.expiresAt) {
      await this.prisma.emailToken.delete({ where: { id: emailToken.id } });
      throw new BadRequestException('Password reset link has expired! Please request a new one.');
    }

    const saltRounds = this.configService.get<number>('saltRounds') || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: emailToken.email },
        data: {
          password: hashedPassword,
          isEmailVerified: true,
          refreshToken: null,
        },
      }),
      this.prisma.emailToken.delete({ where: { id: emailToken.id } }),
    ]);

    return { message: 'Password has been reset successfully! You can now log in.' };
  }

  // 8. Send Verification Email
  async sendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('User not found with this email!');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified!' };
    }

    await this.prisma.emailToken.deleteMany({
      where: { email: user.email, type: TokenType.EMAIL_VERIFICATION },
    });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailToken.create({
      data: {
        email: user.email,
        token: verifyToken,
        otpCode,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt,
      },
    });

    const clientUrl = this.configService.get<string>('clientUrl');
    const verifyUrl = `${clientUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(user.email)}`;

    this.queueService
      .addEmailJob({
        to: user.email,
        subject: 'আপনার ইমেইল ভেরিফাই করুন - Shunno Academy',
        template: 'EMAIL_VERIFICATION',
        context: { name: user.name, verifyUrl, otpCode },
      })
      .catch(() => {});

    return { message: 'Verification email has been sent successfully.' };
  }

  // 9. Verify Email
  async verifyEmail(token?: string, otpCode?: string, email?: string) {
    if (!token && !otpCode) {
      throw new BadRequestException('Verification token or OTP code is required!');
    }

    let emailToken;
    if (token) {
      emailToken = await this.prisma.emailToken.findFirst({
        where: { token, type: TokenType.EMAIL_VERIFICATION },
      });
    } else if (otpCode && email) {
      emailToken = await this.prisma.emailToken.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          otpCode: otpCode.trim(),
          type: TokenType.EMAIL_VERIFICATION,
        },
      });
    }

    if (!emailToken) {
      throw new BadRequestException('Invalid or expired verification token or OTP!');
    }

    if (new Date() > emailToken.expiresAt) {
      await this.prisma.emailToken.delete({ where: { id: emailToken.id } });
      throw new BadRequestException('Verification link/OTP has expired. Please request a new one.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: emailToken.email },
        data: { isEmailVerified: true },
      }),
      this.prisma.emailToken.delete({ where: { id: emailToken.id } }),
    ]);

    return { message: 'Email has been verified successfully! You can now log in.' };
  }

  // 10. Refresh Token
  async refreshToken(token?: string) {
    if (!token) {
      throw new UnauthorizedException('Refresh token is required!');
    }

    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    let decoded: any;
    try {
      decoded = this.jwtService.verify(token, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token!');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.isBlocked || user.refreshToken !== token) {
      throw new UnauthorizedException('Invalid refresh token or account suspended!');
    }

    const currentSessionId = user.currentSessionId || crypto.randomUUID();
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: currentSessionId,
    };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') || '7d';

    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
    });

    return { accessToken };
  }

  // 11. Get Current User Profile (Me)
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        district: true,
        occupation: true,
        fatherName: true,
        fatherPhone: true,
        guardianName: true,
        guardianPhone: true,
        address: true,
        nidNumber: true,
        country: true,
        employeeId: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
                mode: true,
              },
            },
            payment: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    if (user.role === UserRole.STUDENT && !user.studentId) {
      const generatedId = await this.generateUniqueStudentId();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { studentId: generatedId },
      });
      user.studentId = generatedId;
    }

    return user;
  }

  // 12. Update Profile
  async updateProfile(userId: string, payload: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: payload,
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        district: true,
        occupation: true,
        fatherName: true,
        fatherPhone: true,
        guardianName: true,
        guardianPhone: true,
        address: true,
        nidNumber: true,
        country: true,
        employeeId: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // 13. Change Password
  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    const isMatch = await bcrypt.compare(oldPass, user.password);
    if (!isMatch) {
      throw new BadRequestException('বর্তমান পাসওয়ার্ড সঠিক নয়!');
    }

    const saltRounds = this.configService.get<number>('saltRounds') || 12;
    const hashedPassword = await bcrypt.hash(newPass, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully!' };
  }
}
