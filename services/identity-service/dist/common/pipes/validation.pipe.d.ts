import { ValidationPipe as NestValidationPipe } from '@nestjs/common';
/**
 * SpancleValidationPipe — wraps NestJS ValidationPipe with structured error output.
 * Returns 422 Unprocessable Entity with field-level error map.
 */
export declare class SpancleValidationPipe extends NestValidationPipe {
    constructor();
    private static flattenErrors;
}
//# sourceMappingURL=validation.pipe.d.ts.map