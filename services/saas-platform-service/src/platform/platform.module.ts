import { Module }       from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PLATFORM_CONTRACT_PUBLISHER } from './publisher/platform-contract-publisher.interface';
import { InProcessPlatformContractPublisher } from './publisher/in-process-platform-contract-publisher';

/**
 * PlatformModule
 *
 * Provides the platform integration boundary for SPANCLE.
 * Registers PLATFORM_CONTRACT_PUBLISHER with the in-process EventEmitter2 adapter.
 *
 * To switch to a message broker (RabbitMQ, Kafka, etc.):
 *   Replace InProcessPlatformContractPublisher with the broker adapter here.
 *   Commercial modules remain unchanged.
 *
 * Import this module into any feature module that needs to publish platform contracts.
 */
@Module({
  providers: [
    {
      provide:  PLATFORM_CONTRACT_PUBLISHER,
      useClass: InProcessPlatformContractPublisher,
    },
  ],
  exports: [PLATFORM_CONTRACT_PUBLISHER],
})
export class PlatformModule {}
