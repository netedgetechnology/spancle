import { Module, Global } from '@nestjs/common';
import { ConfigModule }   from '@nestjs/config';
import { RedisEventBusPublisher } from './redis-event-bus.publisher';

/**
 * EventBusModule (booking-service)
 *
 * @Global() — RedisEventBusPublisher is available to any module
 * in the service without re-importing EventBusModule.
 *
 * Import once in AppModule; inject RedisEventBusPublisher anywhere.
 */
@Global()
@Module({
  imports:   [ConfigModule],
  providers: [RedisEventBusPublisher],
  exports:   [RedisEventBusPublisher],
})
export class EventBusModule {}
