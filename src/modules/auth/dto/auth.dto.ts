import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsIn,
} from 'class-validator';

export class SendRegistrationOtpDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল ঠিকানা প্রদান করুন।' })
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class VerifyRegistrationOtpDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল ঠিকানা প্রদান করুন।' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '৬ ডিজিটের ওটিপি প্রদান করুন।' })
  otpCode: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Mohammad Ali' })
  @IsString()
  @IsNotEmpty({ message: 'নাম আবশ্যক।' })
  name: string;

  @ApiProperty({ example: 'student@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল ঠিকানা প্রদান করুন।' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '01700000000' })
  @IsString()
  @IsNotEmpty({ message: 'মোবাইল নম্বর আবশ্যক।' })
  phone: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6, { message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' })
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nidNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল ঠিকানা প্রদান করুন।' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty({ message: 'পাসওয়ার্ড আবশ্যক।' })
  password: string;

  @ApiPropertyOptional({ enum: ['STUDENT_PORTAL', 'ADMIN_PORTAL', 'TEACHER_PORTAL'] })
  @IsOptional()
  @IsIn(['STUDENT_PORTAL', 'ADMIN_PORTAL', 'TEACHER_PORTAL'])
  portal?: 'STUDENT_PORTAL' | 'ADMIN_PORTAL' | 'TEACHER_PORTAL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল ঠিকানা প্রদান করুন।' })
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'টোকেন আবশ্যক।' })
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'বর্তমান পাসওয়ার্ড আবশ্যক।' })
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' })
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nidNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;
}

export class GoogleLoginDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  credential?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ enum: ['STUDENT_PORTAL', 'ADMIN_PORTAL'] })
  @IsOptional()
  @IsIn(['STUDENT_PORTAL', 'ADMIN_PORTAL'])
  portal?: 'STUDENT_PORTAL' | 'ADMIN_PORTAL';

  @ApiPropertyOptional()
  @IsOptional()
  userInfo?: {
    email: string;
    name?: string;
    avatar?: string;
    googleId?: string;
  };
}

export class RefreshTokenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class SendVerificationEmailDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class VerifyEmailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otpCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}
