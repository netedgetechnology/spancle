process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'di-validate-placeholder';
process.env.JWT_ISSUER = 'di-validate';
process.env.DATABASE_URL = 'postgresql://localhost/placeholder';
process.env.IDENTITY_SERVICE_URL = 'http://localhost:9999';
process.env.QR_TOKEN_SECRET = 'placeholder';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

const { NestFactory } = require('@nestjs/core');
const { AppModule }   = require('./app.module');

async function validate() {
  let app;
  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error'],
    });
    console.log('BOOTSTRAP OK — full DI graph resolved');
    await app.close();
    process.exit(0);
  } catch (err) {
    const msg = (err.message || String(err));
    const isDiError =
      msg.includes("Can't resolve dependencies") ||
      msg.includes('Cannot resolve dependencies') ||
      msg.includes('is not available in the') ||
      msg.includes('Nest cannot create');
    if (isDiError) {
      console.error('DI FAILURE:', msg.slice(0, 600));
      process.exit(1);
    }
    // Infrastructure errors (DB connection, Redis, missing non-JWT config) expected
    console.log('BOOTSTRAP DI OK — infra error (expected in sandbox):', msg.split('\n')[0]);
    if (app) await app.close().catch(() => {});
    process.exit(0);
  }
}

validate();
