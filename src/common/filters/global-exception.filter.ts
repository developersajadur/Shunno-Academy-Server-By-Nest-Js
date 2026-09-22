import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';
import { errorLogger } from '../../logger/winston.logger';

export interface ErrorSource {
  path: string;
  message: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong!';
    let errorSources: ErrorSource[] = [{ path: '', message: 'Something went wrong' }];
    let errorCode: string | undefined;
    let errorEmail: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res: any = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errorSources = [{ path: '', message: res }];
      } else if (typeof res === 'object') {
        message = res.message || exception.message;
        errorCode = res.errorCode;
        errorEmail = res.email;

        if (Array.isArray(res.message)) {
          // Class validator error messages
          message = 'Validation failed';
          errorSources = res.message.map((msg: string) => {
            const parts = msg.split(' ');
            return {
              path: parts[0] || '',
              message: msg,
            };
          });
        } else {
          errorSources = [{ path: '', message: res.message || exception.message }];
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        statusCode = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || [];
        message = `Duplicate entry for field: ${target.join(', ')}`;
        errorSources = [
          {
            path: target.join(', '),
            message: `${target.join(', ')} already exists.`,
          },
        ];
      } else if (exception.code === 'P2025') {
        statusCode = HttpStatus.NOT_FOUND;
        message = (exception.meta?.cause as string) || 'Record not found';
        errorSources = [{ path: '', message }];
      } else if (exception.code === 'P2003') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint violation';
        errorSources = [
          {
            path: (exception.meta?.field_name as string) || '',
            message: 'Related record was not found or cannot be deleted.',
          },
        ];
      } else {
        statusCode = HttpStatus.BAD_REQUEST;
        message = exception.message;
        errorSources = [{ path: '', message: exception.message }];
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Prisma Validation Error';
      errorSources = [{ path: '', message: exception.message }];
    } else if (exception instanceof Error) {
      message = exception.message;
      errorSources = [{ path: '', message: exception.message }];
      errorCode = (exception as any).errorCode;
      errorEmail = (exception as any).email;
    }

    if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      message = 'অতিরিক্ত রিকোয়েস্ট পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন (Too Many Requests)।';
      errorSources = [{ path: '', message }];
    }

    if (statusCode >= 500) {
      errorLogger.error(
        `[${request.method}] ${request.originalUrl} - ${message}`,
        { stack: (exception as any)?.stack },
      );
    } else {
      errorLogger.warn(
        `[${request.method}] ${request.originalUrl} (${statusCode}) - ${message}`,
      );
    }

    const isProd = process.env.NODE_ENV === 'production';
    const clientMessage = isProd && statusCode === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'সার্ভারে সাময়িক সমস্যা হয়েছে! অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।'
      : message;
    const clientErrorSources = isProd && statusCode === HttpStatus.INTERNAL_SERVER_ERROR
      ? [{ path: '', message: 'Internal server error' }]
      : errorSources;

    response.status(statusCode).json({
      success: false,
      message: clientMessage,
      ...(errorCode && { errorCode }),
      ...(errorEmail && { email: errorEmail }),
      errorSources: clientErrorSources,
      stack: !isProd ? (exception as any)?.stack : undefined,
    });
  }
}
