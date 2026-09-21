import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BYPASS_TRANSFORM_KEY } from '../decorators/bypass-transform.decorator';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  meta?: any;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isBypassed = this.reflector.getAllAndOverride<boolean>(
      BYPASS_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isBypassed) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((resData) => {
        // If the controller returned an object that already has { data, message, meta }
        if (
          resData &&
          typeof resData === 'object' &&
          ('data' in resData || 'message' in resData) &&
          !Array.isArray(resData)
        ) {
          const { message, meta, data, ...rest } = resData;
          return {
            success: true,
            statusCode,
            message: message || 'Request successful',
            meta,
            data: data !== undefined ? data : rest,
          };
        }

        return {
          success: true,
          statusCode,
          message: 'Request successful',
          data: resData,
        };
      }),
    );
  }
}
