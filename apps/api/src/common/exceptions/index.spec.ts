import { describe, it, expect } from 'vitest';
import {
  AppException,
  ResourceNotFoundException,
  ValidationException,
  ConflictException,
  UnauthorizedException,
  InternalServerException,
  InsufficientTicketsException,
} from './index';

describe('AppException', () => {
  it('creates a base exception with correct properties', () => {
    const ex = new AppException(418, 'TEAPOT', "I'm a teapot");
    expect(ex.statusCode).toBe(418);
    expect(ex.errorCode).toBe('TEAPOT');
    expect(ex.userMessage).toBe("I'm a teapot");
    expect(ex.name).toBe('AppException');
    expect(ex).toBeInstanceOf(Error);
  });
});

describe('ResourceNotFoundException', () => {
  it('creates exception with resource name and id', () => {
    const ex = new ResourceNotFoundException('Event', 'abc-123');
    expect(ex.statusCode).toBe(404);
    expect(ex.errorCode).toBe('RESOURCE_NOT_FOUND');
    expect(ex.userMessage).toContain('Event');
    expect(ex.userMessage).toContain('abc-123');
  });

  it('creates exception without id', () => {
    const ex = new ResourceNotFoundException('Event');
    expect(ex.userMessage).toBe('Event not found');
    expect(ex.userMessage).not.toContain('ID');
  });
});

describe('ValidationException', () => {
  it('creates exception with 400 status', () => {
    const ex = new ValidationException('Invalid input');
    expect(ex.statusCode).toBe(400);
    expect(ex.errorCode).toBe('VALIDATION_ERROR');
    expect(ex.userMessage).toBe('Invalid input');
  });
});

describe('ConflictException', () => {
  it('creates exception with 409 status', () => {
    const ex = new ConflictException('Resource conflict');
    expect(ex.statusCode).toBe(409);
    expect(ex.errorCode).toBe('CONFLICT_ERROR');
    expect(ex.userMessage).toBe('Resource conflict');
  });
});

describe('UnauthorizedException', () => {
  it('creates exception with default message', () => {
    const ex = new UnauthorizedException();
    expect(ex.statusCode).toBe(401);
    expect(ex.errorCode).toBe('UNAUTHORIZED');
    expect(ex.userMessage).toBe('Unauthorized');
  });

  it('creates exception with custom message', () => {
    const ex = new UnauthorizedException('Invalid API key');
    expect(ex.userMessage).toBe('Invalid API key');
  });
});

describe('InternalServerException', () => {
  it('creates exception with default message', () => {
    const ex = new InternalServerException();
    expect(ex.statusCode).toBe(500);
    expect(ex.errorCode).toBe('INTERNAL_SERVER_ERROR');
    expect(ex.userMessage).toBe(
      'Something went wrong. Please try again later.',
    );
  });

  it('creates exception with custom message', () => {
    const ex = new InternalServerException('DB connection failed');
    expect(ex.userMessage).toBe('DB connection failed');
  });
});

describe('InsufficientTicketsException', () => {
  it('creates exception with 409 status', () => {
    const ex = new InsufficientTicketsException(3, 5);
    expect(ex.statusCode).toBe(409);
    expect(ex.errorCode).toBe('INSUFFICIENT_TICKETS');
  });

  it("uses singular 'ticket' for 1 available", () => {
    const ex = new InsufficientTicketsException(1, 2);
    expect(ex.userMessage).toContain('Only 1 ticket remaining');
  });

  it("uses plural 'tickets' for multiple available", () => {
    const ex = new InsufficientTicketsException(3, 5);
    expect(ex.userMessage).toContain('Only 3 tickets remaining');
  });

  it('mentions the requested quantity', () => {
    const ex = new InsufficientTicketsException(2, 4);
    expect(ex.userMessage).toContain('you requested 4');
  });
});
