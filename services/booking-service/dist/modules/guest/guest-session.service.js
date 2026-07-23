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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GuestSessionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestSessionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("node:crypto"));
let GuestSessionService = GuestSessionService_1 = class GuestSessionService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(GuestSessionService_1.name);
        this.VERSION = 'gs1';
        this.TTL_MS = 15 * 60 * 1000;
        const dedicated = config.get('GUEST_SESSION_SECRET');
        if (dedicated) {
            this.secret = dedicated;
        }
        else {
            const jwtSecret = config.getOrThrow('JWT_SECRET');
            this.secret = crypto
                .createHmac('sha256', jwtSecret)
                .update('spancle:guest-session:key-derivation')
                .digest('hex');
            this.logger.warn('GUEST_SESSION_SECRET not set — using derived key from JWT_SECRET. ' +
                'Set GUEST_SESSION_SECRET for independent rotation.');
        }
    }
    issue(tenantId, clientIp) {
        const now = Date.now();
        const expiresAt = new Date(now + this.TTL_MS);
        const payload = {
            tenantId,
            exp: expiresAt.getTime(),
            jti: crypto.randomUUID(),
            purpose: 'guest_booking',
            ...(clientIp ? { ip: clientIp } : {}),
        };
        const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const data = `${this.VERSION}.${payloadB64}`;
        const hmac = this.sign(data);
        const token = `${data}.${hmac}`;
        this.logger.debug(`Guest session issued — tenant=${tenantId} jti=${payload.jti}`);
        return { token, expiresAt: expiresAt.toISOString() };
    }
    validate(token, tenantId) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new common_1.UnauthorizedException('Invalid guest session');
        }
        const [version, payloadB64, providedHmac] = parts;
        if (version !== this.VERSION) {
            throw new common_1.UnauthorizedException('Invalid guest session');
        }
        const data = `${version}.${payloadB64}`;
        const expected = this.sign(data);
        const eq = crypto.timingSafeEqual(Buffer.from(providedHmac, 'base64url'), Buffer.from(expected, 'base64url'));
        if (!eq) {
            this.logger.warn('Guest session HMAC mismatch — possible tampering');
            throw new common_1.UnauthorizedException('Invalid guest session');
        }
        let payload;
        try {
            payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid guest session');
        }
        if (Date.now() > payload.exp) {
            throw new common_1.UnauthorizedException('Guest session expired');
        }
        if (payload.tenantId !== tenantId) {
            this.logger.warn(`Guest session tenant mismatch — token=${payload.tenantId} request=${tenantId}`);
            throw new common_1.UnauthorizedException('Invalid guest session');
        }
        return payload;
    }
    issueGuestLookupToken(params) {
        const payload = {
            bid: params.bookingId,
            em: params.customerEmail.toLowerCase().trim(),
            tid: params.tenantId,
            exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
            jti: crypto.randomUUID(),
        };
        const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const hmac = this.sign(`lookup.${b64}`);
        return `lookup.${b64}.${hmac}`;
    }
    validateGuestLookupToken(token, tenantId) {
        const parts = token.split('.');
        if (parts.length !== 3 || parts[0] !== 'lookup') {
            throw new common_1.UnauthorizedException('Invalid lookup token');
        }
        const [, b64, provided] = parts;
        const expected = this.sign(`lookup.${b64}`);
        const eq = crypto.timingSafeEqual(Buffer.from(provided, 'base64url'), Buffer.from(expected, 'base64url'));
        if (!eq)
            throw new common_1.UnauthorizedException('Invalid lookup token');
        let p;
        try {
            p = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid lookup token');
        }
        if (Date.now() > p.exp)
            throw new common_1.UnauthorizedException('Lookup token expired');
        if (p.tid !== tenantId)
            throw new common_1.UnauthorizedException('Invalid lookup token');
        return { bookingId: p.bid, customerEmail: p.em };
    }
    sign(data) {
        return crypto
            .createHmac('sha256', this.secret)
            .update(data)
            .digest('base64url');
    }
};
exports.GuestSessionService = GuestSessionService;
exports.GuestSessionService = GuestSessionService = GuestSessionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GuestSessionService);
//# sourceMappingURL=guest-session.service.js.map