"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SpancleValidationPipe_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpancleValidationPipe = void 0;
const common_1 = require("@nestjs/common");
/**
 * SpancleValidationPipe — wraps NestJS ValidationPipe with structured error output.
 * Returns 422 Unprocessable Entity with field-level error map.
 */
let SpancleValidationPipe = SpancleValidationPipe_1 = class SpancleValidationPipe extends common_1.ValidationPipe {
    constructor() {
        super({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: false },
            exceptionFactory: (errors) => {
                const formatted = SpancleValidationPipe_1.flattenErrors(errors);
                return new common_1.UnprocessableEntityException({
                    statusCode: 422,
                    error: 'Unprocessable Entity',
                    message: 'Validation failed',
                    details: formatted,
                });
            },
        });
    }
    static flattenErrors(errors, parentPath = '') {
        const result = {};
        for (const error of errors) {
            const path = parentPath ? `${parentPath}.${error.property}` : error.property;
            if (error.constraints) {
                result[path] = Object.values(error.constraints);
            }
            if (error.children?.length) {
                const nested = SpancleValidationPipe_1.flattenErrors(error.children, path);
                Object.assign(result, nested);
            }
        }
        return result;
    }
};
exports.SpancleValidationPipe = SpancleValidationPipe;
exports.SpancleValidationPipe = SpancleValidationPipe = SpancleValidationPipe_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SpancleValidationPipe);
//# sourceMappingURL=validation.pipe.js.map