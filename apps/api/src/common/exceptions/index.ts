export class AppException extends Error {
  statusCode: number;
  errorCode: string;
  userMessage: string;

  constructor(statusCode: number, errorCode: string, userMessage: string) {
    super(userMessage);
    this.name = 'AppException';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.userMessage = userMessage;
  }
}

export class ResourceNotFoundException extends AppException {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    super(404, 'RESOURCE_NOT_FOUND', message);
  }
}

export class ValidationException extends AppException {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class ConflictException extends AppException {
  constructor(message: string) {
    super(409, 'CONFLICT_ERROR', message);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class InternalServerException extends AppException {
  constructor(message = 'Something went wrong. Please try again later.') {
    super(500, 'INTERNAL_SERVER_ERROR', message);
  }
}

export class InsufficientTicketsException extends AppException {
  constructor(available: number, requested: number) {
    super(
      409,
      'INSUFFICIENT_TICKETS',
      `Not enough tickets available. Only ${available} ticket${available === 1 ? '' : 's'} remaining, but you requested ${requested}.`,
    );
  }
}
