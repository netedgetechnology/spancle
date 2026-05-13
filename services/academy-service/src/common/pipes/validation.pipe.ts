import { Injectable, UnprocessableEntityException, ValidationPipe as NestValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

@Injectable()
export class SpancleValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const flatten = (errs: ValidationError[], prefix = ''): Record<string, string[]> => {
          const out: Record<string, string[]> = {};
          for (const e of errs) {
            const path = prefix ? `${prefix}.${e.property}` : e.property;
            if (e.constraints) out[path] = Object.values(e.constraints);
            if (e.children?.length) Object.assign(out, flatten(e.children, path));
          }
          return out;
        };
        return new UnprocessableEntityException({ message: 'Validation failed', details: flatten(errors) });
      },
    });
  }
}
