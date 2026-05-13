import { Injectable, UnprocessableEntityException, ValidationPipe as NestValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * SpancleValidationPipe — wraps NestJS ValidationPipe with structured error output.
 * Returns 422 Unprocessable Entity with field-level error map.
 */
@Injectable()
export class SpancleValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors: ValidationError[]) => {
        const formatted = SpancleValidationPipe.flattenErrors(errors);
        return new UnprocessableEntityException({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'Validation failed',
          details: formatted,
        });
      },
    });
  }

  private static flattenErrors(
    errors: ValidationError[],
    parentPath = '',
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const error of errors) {
      const path = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        result[path] = Object.values(error.constraints);
      }

      if (error.children?.length) {
        const nested = SpancleValidationPipe.flattenErrors(error.children, path);
        Object.assign(result, nested);
      }
    }

    return result;
  }
}
