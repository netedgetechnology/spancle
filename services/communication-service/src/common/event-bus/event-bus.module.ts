import { Module, Global } from '@nestjs/common';
import { ConfigModule }   from '@nestjs/config';
import { RedisEventBusSubscriber } from './redis-event-bus.subscriber';

/**
 * EventBusModule (communication-service)
 *
 * @Global() — RedisEventBusSubscriber is available throughout the service
 * and starts its Redis subscription on module init.
 *
 * Import once in AppModule; future handlers use @OnEvent() without
 * needing to import EventBusModule themselves.
 */
@Global()
@Module({
  imports:   [ConfigModule],
  providers: [RedisEventBusSubscriber],
  exports:   [RedisEventBusSubscriber],
})
export class EventBusModule {}
