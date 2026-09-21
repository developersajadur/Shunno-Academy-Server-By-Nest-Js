import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  SendRegistrationOtpDto,
  VerifyRegistrationOtpDto,
  RegisterDto,
  LoginDto,
  GoogleLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateProfileDto,
  RefreshTokenDto,
  SendVerificationEmailDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('google')
  @ApiOperation({ summary: 'Google OAuth Login & Registration' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    const result = await this.authService.googleLogin(dto);
    return {
      message: 'গুগল দিয়ে সফলভাবে লগইন হয়েছে!',
      data: result,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('send-registration-otp')
  @ApiOperation({ summary: 'Send 6-Digit Email Verification OTP for Student Registration' })
  async sendRegistrationOtp(@Body() dto: SendRegistrationOtpDto) {
    const result = await this.authService.sendRegistrationOtp(dto.email, dto.turnstileToken);
    return {
      message: result.message,
      data: result,
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-registration-otp')
  @ApiOperation({ summary: 'Verify 6-Digit Email OTP for Student Registration' })
  async verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
    const result = await this.authService.verifyRegistrationOtp(dto.email, dto.otpCode);
    return {
      message: result.message,
      data: result,
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new student after email OTP verification' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    res.status(HttpStatus.CREATED);
    const result = await this.authService.register(dto);
    return {
      message: 'রেজিস্ট্রেশন সফল হয়েছে!',
      data: result,
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Login student & obtain JWT tokens' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto, 'STUDENT_PORTAL');
    return {
      message: 'Logged in successfully',
      data: result,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('teacher-login')
  @ApiOperation({ summary: 'Dedicated secure portal login for Teachers & Instructors' })
  async teacherLogin(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto, 'TEACHER_PORTAL');
    return {
      message: 'শিক্ষক প্যানেলে সফলভাবে লগইন হয়েছে!',
      data: result,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('admin-login')
  @ApiOperation({ summary: 'Dedicated secure portal login for Admins & Staff' })
  async adminLogin(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto, 'ADMIN_PORTAL');
    return {
      message: 'অ্যাডমিন ড্যাশবোর্ডে সফলভাবে লগইন হয়েছে!',
      data: result,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset link' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email, dto.turnstileToken);
    return {
      message: result.message,
      data: null,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto.token, dto.newPassword);
    return {
      message: result.message,
      data: null,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('send-verification-email')
  @ApiOperation({ summary: 'Send email verification link & OTP' })
  async sendVerificationEmail(
    @Body() dto: SendVerificationEmailDto,
    @Req() req: Request,
  ) {
    const email = dto.email || (req as any).user?.email;
    const result = await this.authService.sendVerificationEmail(email);
    return {
      message: result.message,
      data: null,
    };
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address with token or OTP' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(dto.token, dto.otpCode, dto.email);
    return {
      message: result.message,
      data: null,
    };
  }

  @Public()
  @Post('refresh-token')
  @ApiOperation({ summary: 'Obtain new access token via refresh token' })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const token = dto.refreshToken || req.cookies?.refreshToken;
    const result = await this.authService.refreshToken(token);
    return {
      message: 'Access token generated successfully!',
      data: result,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.authService.getMe(user.userId);
    return {
      message: 'Profile retrieved successfully',
      data: result,
    };
  }

  @Patch('update-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile info' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const result = await this.authService.updateProfile(user.userId, dto);
    return {
      message: 'Profile updated successfully!',
      data: result,
    };
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(
      user.userId,
      dto.oldPassword,
      dto.newPassword,
    );
    return {
      message: result.message,
      data: null,
    };
  }
}
