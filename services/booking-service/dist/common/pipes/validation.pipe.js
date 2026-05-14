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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpancleValidationPipe = void 0;
const common_1 = require("@nestjs/common");
let SpancleValidationPipe = class SpancleValidationPipe extends common_1.ValidationPipe {
    constructor() {
        super({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            exceptionFactory: (errors) => {
                const flatten = (errs, prefix = '') => {
                    const out = {};
                    for (const e of errs) {
                        const path = prefix ? `${prefix}.${e.property}` : e.property;
                        if (e.constraints)
                            out[path] = Object.values(e.constraints);
                        if (e.children?.length)
                            Object.assign(out, flatten(e.children, path));
                    }
                    return out;
                };
                return new common_1.UnprocessableEntityException({ message: 'Validation failed', details: flatten(errors) });
            },
        });
    }
};
exports.SpancleValidationPipe = SpancleValidationPipe;
exports.SpancleValidationPipe = SpancleValidationPipe = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SpancleValidationPipe);
//# sourceMappingURL=validation.pipe.js.map