import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GlobalExceptionFilter } from './global-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  AppException,
  ResourceNotFoundException,
  ValidationException,
  ConflictException,
  UnauthorizedException,
  InternalServerException,
  InsufficientTicketsException,
} from '../exceptions';

function createMockHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response = { status };
  const request = { url: '/api/test', method: 'GET' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  };
  return { host, json, status, request, response };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  describe('AppException handling', () => {
    it('formats AppException correctly', () => {
      const { host, json, status } = createMockHost();
      const exception = new ResourceNotFoundException('Event', 'abc-123');

      filter.catch(exception, host as any);

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_NOT_FOUND',
            message: expect.stringContaining('Event'),
            path: '/api/test',
          }),
        }),
      );
    });

    it('includes timestamp in error response', () => {
      const { host, json } = createMockHost();
      const exception = new AppException(400, 'TEST', 'Test error');
      const before = Date.now();

      filter.catch(exception, host as any);

      const callArg = json.mock.calls[0]![0] as any;
      const timestamp = new Date(callArg.error.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('handles InsufficientTicketsException', () => {
      const { host, status, json } = createMockHost();
      const exception = new InsufficientTicketsException(1, 2);

      filter.catch(exception, host as any);

      expect(status).toHaveBeenCalledWith(409);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INSUFFICIENT_TICKETS',
          }),
        }),
      );
    });

    it('handles UnauthorizedException', () => {
      const { host, status } = createMockHost();
      const exception = new UnauthorizedException('Invalid API key');

      filter.catch(exception, host as any);

      expect(status).toHaveBeenCalledWith(401);
    });

    it('handles ValidationException', () => {
      const { host, status } = createMockHost();
      const exception = new ValidationException('Invalid data');

      filter.catch(exception, host as any);

      expect(status).toHaveBeenCalledWith(400);
    });

    it('handles InternalServerException', () => {
      const { host, status } = createMockHost();
      const exception = new InternalServerException('DB error');

      filter.catch(exception, host as any);

      expect(status).toHaveBeenCalledWith(500);
    });

    it('handles ConflictException', () => {
      const { host, status } = createMockHost();
      const exception = new ConflictException('Conflict');

      filter.catch(exception, host as any);

      expect(status).toHaveBeenCalledWith(409);
    });
  });

  describe('Error handling for unknown exceptions', () => {
    it('handles plain Error objects', () => {
      const { host, status } = createMockHost();
      const error = new Error('Something broke');

      filter.catch(error, host as any);

      expect(status).toHaveBeenCalledWith(500);
    });

    it('handles string errors', () => {
      const { host, status } = createMockHost();
      filter.catch('just a string', host as any);

      expect(status).toHaveBeenCalledWith(500);
    });

    it('handles null/undefined errors', () => {
      const { host, status } = createMockHost();
      filter.catch(null, host as any);

      expect(status).toHaveBeenCalledWith(500);
    });

    it('returns INTERNAL_SERVER_ERROR code for unknown errors', () => {
      const { host, json } = createMockHost();
      filter.catch('unknown error', host as any);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
          }),
        }),
      );
    });
  });

  describe('Response structure', () => {
    it('returns correct response shape', () => {
      const { host, json } = createMockHost();
      const exception = new AppException(400, 'TEST', 'test');

      filter.catch(exception, host as any);

      const response = json.mock.calls[0]![0];
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('timestamp');
      expect(response.error).toHaveProperty('path');
    });

    it('includes details in response when present (from HttpException)', () => {
      const { host, json } = createMockHost();
      const exception = new HttpException(
        {
          message: 'Not Found',
          errorCode: 'NOT_FOUND',
          details: { id: 'abc' },
          statusCode: 404,
        },
        404,
      );

      filter.catch(exception, host as any);

      const response = json.mock.calls[0]![0] as any;
      expect(response.error.details).toEqual({ id: 'abc' });
    });

    it('omits details from response when undefined', () => {
      const { host, json } = createMockHost();
      const exception = new AppException(400, 'TEST', 'test');

      filter.catch(exception, host as any);

      const response = json.mock.calls[0]![0] as any;
      expect(response.error.details).toBeUndefined();
    });
  });

  describe('HttpException handling', () => {
    it('handles HttpException with object response', () => {
      const { host, status, json } = createMockHost();
      const exception = new HttpException(
        { message: 'Validation failed', error: 'Bad Request', statusCode: 400 },
        400,
      );

      filter.catch(exception, host as any);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'BAD_REQUEST',
            message: 'Validation failed',
            details: 'Bad Request',
          }),
        }),
      );
    });

    it('falls back to default error code when errorCode missing from HttpException response', () => {
      const { host, json } = createMockHost();
      const exception = new HttpException(
        { message: 'Not found', statusCode: 404 },
        404,
      );

      filter.catch(exception, host as any);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
          }),
        }),
      );
    });

    it('falls back to exception.message when message missing from HttpException response', () => {
      const { host, json } = createMockHost();
      const exception = new HttpException({ error: 'Bad data' }, 400);

      filter.catch(exception, host as any);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Http Exception',
          }),
        }),
      );
    });

    it('handles HttpException with string response', () => {
      const { host, status, json } = createMockHost();
      const exception = new HttpException('Custom error', 403);

      filter.catch(exception, host as any);

      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Custom error',
          }),
        }),
      );
    });
  });

  describe('getDefaultErrorCode edge cases', () => {
    it('maps unknown status to UNKNOWN_ERROR', () => {
      const { host, status, json } = createMockHost();
      const exception = new HttpException('Teapot', 418);

      filter.catch(exception, host as any);

      expect(status).toHaveBeenCalledWith(418);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNKNOWN_ERROR',
          }),
        }),
      );
    });

    it('maps known status codes correctly', () => {
      const { host, status } = createMockHost();
      const exception422 = new HttpException('Unprocessable', 422);

      filter.catch(exception422, host as any);

      expect(status).toHaveBeenCalledWith(422);
    });
  });

  describe('Development mode details', () => {
    afterEach(() => {
      delete process.env['NODE_ENV'];
    });

    it('includes error details in development mode for unknown exceptions', () => {
      const prev = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';
      const { host, json } = createMockHost();
      const error = new Error('Database connection failed');

      filter.catch(error, host as any);

      const response = json.mock.calls[0]![0] as any;
      expect(response.error.details).toBe('Database connection failed');
      process.env['NODE_ENV'] = prev;
    });

    it('handles non-Error unknown exception in development mode', () => {
      const prev = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';
      const { host, json } = createMockHost();

      filter.catch('string error', host as any);

      const response = json.mock.calls[0]![0] as any;
      expect(response.error.details).toBe('string error');
      process.env['NODE_ENV'] = prev;
    });

    it('does not include error details in non-development mode', () => {
      const prev = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';
      const { host, json } = createMockHost();
      const error = new Error('Database connection failed');

      filter.catch(error, host as any);

      const response = json.mock.calls[0]![0] as any;
      expect(response.error.details).toBeUndefined();
      process.env['NODE_ENV'] = prev;
    });
  });
});
