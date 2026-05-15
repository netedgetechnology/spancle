"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var PasswordService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const constants_1 = require("@spancle/constants");
let PasswordService = PasswordService_1 = class PasswordService {
    constructor() {
        this.logger = new common_1.Logger(PasswordService_1.name);
        this.rounds = constants_1.PASSWORD.BCRYPT_ROUNDS;
        this.minLen = constants_1.PASSWORD.MIN_LENGTH;
        this.maxLen = constants_1.PASSWORD.MAX_LENGTH;
        this.commonPasswords = new Set([
            'password', 'password1', 'password123',
            'qwerty123', 'qwertyuiop',
            'letmein1', 'welcome1',
            'abc123456', '123456789',
            'iloveyou1', 'admin1234',
            'spancle123', 'spancle1',
        ]);
    }
    async hash(plaintext) {
        this.enforcePolicy(plaintext);
        return bcrypt.hash(plaintext, this.rounds);
    }
    async compare(plaintext, hash) {
        try {
            return await bcrypt.compare(plaintext, hash);
        }
        catch (err) {
            this.logger.error(`bcrypt.compare threw unexpectedly: ${String(err)}`);
            return false;
        }
    }
    validatePolicy(password) {
        const violations = [];
        if (password.length < this.minLen) {
            violations.push({
                rule: 'min_length',
                message: `Password must be at least ${this.minLen} characters`,
            });
        }
        if (password.length > this.maxLen) {
            violations.push({
                rule: 'max_length',
                message: `Password must not exceed ${this.maxLen} characters`,
            });
        }
        if (!/[A-Z]/.test(password)) {
            violations.push({
                rule: 'uppercase',
                message: 'Password must contain at least one uppercase letter',
            });
        }
        if (!/[a-z]/.test(password)) {
            violations.push({
                rule: 'lowercase',
                message: 'Password must contain at least one lowercase letter',
            });
        }
        if (!/\d/.test(password)) {
            violations.push({
                rule: 'digit',
                message: 'Password must contain at least one number',
            });
        }
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
            violations.push({
                rule: 'special_char',
                message: 'Password must contain at least one special character',
            });
        }
        if (this.commonPasswords.has(password.toLowerCase())) {
            violations.push({
                rule: 'common_password',
                message: 'This password is too common. Please choose a more unique password',
            });
        }
        return { valid: violations.length === 0, violations };
    }
    enforcePolicy(password) {
        const result = this.validatePolicy(password);
        if (!result.valid) {
            throw new common_1.UnprocessableEntityException({
                message: 'Password does not meet security policy requirements',
                violations: result.violations.map((v) => ({
                    rule: v.rule,
                    message: v.message,
                })),
            });
        }
    }
    async isDifferentFromCurrent(newPassword, currentHash) {
        const isSame = await this.compare(newPassword, currentHash);
        return !isSame;
    }
};
exports.PasswordService = PasswordService;
exports.PasswordService = PasswordService = PasswordService_1 = __decorate([
    (0, common_1.Injectable)()
], PasswordService);
//# sourceMappingURL=password.service.js.map