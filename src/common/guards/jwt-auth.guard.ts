import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('You are not authorized to access this route!');
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;

    try {
      const secret = this.configService.get<string>('jwt.accessSecret');
      decoded = this.jwtService.verify(token, { secret });
    } catch {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Invalid or expired authentication token!');
    }

    const { userId } = decoded;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isBlocked: true,
        currentSessionId: true,
      },
    });

    if (!user) {
      if (isPublic) return true;
      throw new NotFoundException('User account no longer exists!');
    }

    if (user.isBlocked) {
      throw new ForbiddenException(
        'Your account has been suspended! Please contact support.',
      );
    }

    // Single Concurrent Session / Single Device Enforcement
    if (
      user.role !== UserRole.ADMIN &&
      decoded.sessionId &&
      user.currentSessionId &&
      decoded.sessionId !== user.currentSessionId
    ) {
      const err = new UnauthorizedException(
        'আপনার অ্যাকাউন্টটি অন্য একটি ডিভাইস থেকে লগইন করা হয়েছে। নিরাপত্তা নিশ্চিত করতে এই ডিভাইস থেকে লগআউট করা হলো।',
      ) as any;
      err.response = {
        success: false,
        statusCode: 401,
        message: err.message,
        errorCode: 'SESSION_SUPERSEDED',
      };
      throw err;
    }

    request.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: user.currentSessionId || undefined,
    };

    return true;
  }
}
