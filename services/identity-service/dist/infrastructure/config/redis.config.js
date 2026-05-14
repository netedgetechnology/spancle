"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisClient = createRedisClient;
const ioredis_1 = __importDefault(require("ioredis"));
function createRedisClient(config, _purpose) {
    return new ioredis_1.default({
        host: config.get('REDIS_HOST', { infer: true }) ?? 'localhost',
        port: Number(config.get('REDIS_PORT', { infer: true }) ?? 6379),
        password: config.get('REDIS_PASSWORD', { infer: true }),
        db: Number(config.get('REDIS_DB_CACHE', { infer: true }) ?? 0),
        lazyConnect: true,
    });
}
//# sourceMappingURL=redis.config.js.map