export interface BaseConfig {
    REDIS_HOST: string;
    REDIS_PORT: number;
    REDIS_PASSWORD: string;
    REDIS_DB_CACHE: number;
    REDIS_DB_SESSION: number;
    JWT_SECRET: string;
    JWT_ISSUER: string;
    JWT_ACCESS_TOKEN_EXPIRY_SECONDS: number;
    JWT_REFRESH_TOKEN_EXPIRY_SECONDS: number;
    QR_TOKEN_SECRET: string;
}
//# sourceMappingURL=base.config.d.ts.map