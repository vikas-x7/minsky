import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

function validateEnv() {
  if (!process.env['ALLOWED_ORIGIN'] && !process.env['CORS_ORIGIN']) {
    throw new Error('ALLOWED_ORIGIN or CORS_ORIGIN is required');
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('HTTP');

  validateEnv();

  app.use(helmet());

  const allowedOrigin =
    process.env['ALLOWED_ORIGIN'] || process.env['CORS_ORIGIN'];

  app.enableCors({
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  });

  app.setGlobalPrefix('api');

  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const ipAddress = request.ip || request.socket.remoteAddress || 'unknown';

    logger.log(`${request.method} ${request.originalUrl} - ${ipAddress}`);

    response.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      logger.log(
        `${request.method} ${request.originalUrl} - ${response.statusCode} - ${durationMs}ms`,
      );
    });

    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: 422,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env['PORT'] || 3001;
  await app.listen(port);
  logger.log(`API server running on http://localhost:${port}`);
}

bootstrap();
