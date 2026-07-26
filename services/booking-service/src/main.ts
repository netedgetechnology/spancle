import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet') as (...args: unknown[]) => import('express').RequestHandler;


import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  // CB-4 FIX: enable rawBody buffering so WebhookController can access req.rawBody
  // for HMAC signature verification (Stripe, Razorpay).  Must be set at NestFactory
  // level — cannot be added after the app is created.
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody:    true,   // makes req.rawBody available on all routes
  });

  const config = app.get(ConfigService);
  const port   = config.get<number>('PORT', 3003);

  // CB-4 FIX: helmet sets secure HTTP response headers (X-Frame-Options,
  // X-Content-Type-Options, Strict-Transport-Security, Content-Security-Policy, etc.)
  // Must be applied before route registration.
  app.use(helmet());

  // Override body parser for webhook routes: they need the raw bytes for HMAC
  // verification and must NOT be parsed as JSON by the global body parser.
  // The NestJS rawBody:true option above ensures req.rawBody is populated.
  app.use('/api/v1/webhooks', (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
    // Webhook routes receive raw bytes — express body-parser is not applied here
    // because NestJS with rawBody:true already buffers the raw bytes.
    next();
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:                true,
      forbidNonWhitelisted:     true,
      transform:                true,
      transformOptions:         { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const corsOrigins = config.get<string>('CORS_ORIGINS', '');
  if (!corsOrigins && config.get('NODE_ENV') === 'production') {
    throw new Error('CORS_ORIGINS must be set in production (NODE_ENV=production)');
  }

  app.enableCors({
    origin:      corsOrigins ? corsOrigins.split(',') : 'http://localhost:3000',
    credentials: true,
  });

  // OpenAPI / Swagger documentation
  // Available at /api/docs in non-production environments.
  // Set SWAGGER_ENABLED=true to enable in production.
  if (config.get('NODE_ENV') !== 'production' || config.get('SWAGGER_ENABLED') === 'true') {
    const doc = new DocumentBuilder()
      .setTitle('Spancle Booking API')
      .setDescription(
        'Booking service — courts, slots, reservations, payments, membership entitlements, ' +
        'waitlist, and guest checkout.',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-tenant-id' }, 'TenantId')
      .addServer('/api/v1')
      .build();

    const document = SwaggerModule.createDocument(app, doc);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    const host = `http://localhost:${port}`;
    app.get(ConfigService).get('NODE_ENV') !== 'test' &&
      console.log(`OpenAPI docs: ${host}/api/docs`);
  }

  await app.listen(port);
}

void bootstrap();
