"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrUtils = void 0;
const node_crypto_1 = require("node:crypto");
const ALG = 'sha256';
class QrUtils {
    static generateToken(tenantId, bookingId, secret) {
        const nonce = (0, node_crypto_1.randomBytes)(16).toString('hex');
        const data = Buffer.from(`${tenantId}:${bookingId}:${nonce}`).toString('base64url');
        const sig = (0, node_crypto_1.createHmac)(ALG, secret).update(data).digest('hex');
        const rawToken = `${data}.${sig}`;
        const tokenHash = QrUtils.hashToken(rawToken);
        return { rawToken, tokenHash };
    }
    static hashToken(rawToken) {
        return (0, node_crypto_1.createHash)(ALG).update(rawToken).digest('hex');
    }
    static verifyTokenSignature(rawToken, secret) {
        const dotIdx = rawToken.lastIndexOf('.');
        if (dotIdx === -1)
            return false;
        const data = rawToken.slice(0, dotIdx);
        const providedSig = rawToken.slice(dotIdx + 1);
        const expectedSig = (0, node_crypto_1.createHmac)(ALG, secret).update(data).digest('hex');
        if (providedSig.length !== expectedSig.length)
            return false;
        try {
            return (0, node_crypto_1.timingSafeEqual)(Buffer.from(providedSig, 'hex'), Buffer.from(expectedSig, 'hex'));
        }
        catch {
            return false;
        }
    }
    static buildSignedPayload(payload, secret) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'QR' })).toString('base64url');
        const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const sigInput = `${header}.${body}`;
        const signature = (0, node_crypto_1.createHmac)(ALG, secret).update(sigInput).digest('base64url');
        return `${sigInput}.${signature}`;
    }
    static verifySignedPayload(signedPayload, secret) {
        const parts = signedPayload.split('.');
        if (parts.length !== 3)
            return null;
        const [header, body, signature] = parts;
        const sigInput = `${header}.${body}`;
        const expectedSig = (0, node_crypto_1.createHmac)(ALG, secret).update(sigInput).digest('base64url');
        try {
            const valid = (0, node_crypto_1.timingSafeEqual)(Buffer.from(signature, 'base64url'), Buffer.from(expectedSig, 'base64url'));
            if (!valid)
                return null;
        }
        catch {
            return null;
        }
        try {
            const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
            return decoded;
        }
        catch {
            return null;
        }
    }
    static buildQrContent(rawToken, purpose) {
        const params = new URLSearchParams({ t: rawToken, p: purpose });
        return `spancle://verify?${params.toString()}`;
    }
    static extractTokenFromQrContent(qrContent) {
        try {
            if (qrContent.startsWith('spancle://verify?')) {
                const url = new URL(qrContent.replace('spancle://', 'https://spancle.app/'));
                const token = url.searchParams.get('t');
                return token ?? null;
            }
            if (qrContent.includes('.') && qrContent.length > 40) {
                return qrContent;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    static redisKey(tenantId, tokenHash) {
        return `tenant:${tenantId}:qr:${tokenHash}`;
    }
    static expiresAt(ttlMinutes) {
        return new Date(Date.now() + ttlMinutes * 60_000);
    }
    static isWithinCheckInWindow(bookingStartAt, now = new Date(), earlyMinutes = 30, lateMinutes = 60) {
        const earliest = bookingStartAt.getTime() - earlyMinutes * 60_000;
        const latest = bookingStartAt.getTime() + lateMinutes * 60_000;
        const ts = now.getTime();
        return ts >= earliest && ts <= latest;
    }
}
exports.QrUtils = QrUtils;
//# sourceMappingURL=qr.utils.js.map