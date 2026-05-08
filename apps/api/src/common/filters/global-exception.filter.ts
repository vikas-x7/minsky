import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let errorCode: string;
    let message: string;
    let details: unknown;

    if (exception instanceof AppException) {
      statusCode = exception.statusCode;
      errorCode = exception.errorCode;
      message = exception.userMessage;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        errorCode =
          (resp['errorCode'] as string) || this.getDefaultErrorCode(statusCode);
        message = (resp['message'] as string) || exception.message;
        details = resp['details'] ?? resp['error'];
      } else {
        errorCode = this.getDefaultErrorCode(statusCode);
        message = exception.message;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';
      message = 'Something went wrong. Please try again later.';

      if (process.env['NODE_ENV'] === 'development') {
        details =
          exception instanceof Error ? exception.message : String(exception);
      }
    }

    const responseBody: Record<string, unknown> = {
      success: false,
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    if (details !== undefined) {
      (responseBody.error as Record<string, unknown>)['details'] = details;
    }

    const logMessage = `${statusCode} - ${request.method} ${request.url} - ${message}`;
    if (statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(logMessage, stack);
    } else {
      this.logger.warn(logMessage);
    }

    response.status(statusCode).json(responseBody);
  }

  private getDefaultErrorCode(statusCode: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return codeMap[statusCode] || 'UNKNOWN_ERROR';
  }
}
