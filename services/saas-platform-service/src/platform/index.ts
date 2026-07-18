/**
 * src/platform/index.ts
 *
 * Public API surface for the SPANCLE Platform Integration Boundary.
 *
 * Any SPANCLE module that publishes or receives platform contracts imports
 * from this barrel. No consumer-specific or transport-specific types exported.
 */

// Event types
export { PlatformEventTypes }                from './events/platform-event-types';
export type { PlatformEventType }            from './events/platform-event-types';

// Envelope
export {
  createEnvelope,
  PLATFORM_SCHEMA_VERSION,
  PLATFORM_SOURCE_SERVICE,
} from './contracts/platform-contract-envelope';
export type {
  PlatformContractEnvelopeData,
  DeliveryMetadata,
  IdempotencyMetadata,
  DeliveryMode,
  EnvelopePriority,
  CreateEnvelopeInput,
} from './contracts/platform-contract-envelope';

// Publisher
export type { IPlatformContractPublisher, PublishResult } from './publisher/platform-contract-publisher.interface';
export { PLATFORM_CONTRACT_PUBLISHER }                    from './publisher/platform-contract-publisher.interface';

// Receiver
export type { IPlatformContractReceiver, ReceiveResult, ReceiveOutcome } from './receiver/platform-contract-receiver.interface';
export { PLATFORM_CONTRACT_RECEIVER }                                    from './receiver/platform-contract-receiver.interface';

// Serialization
export { PlatformContractSerializer }        from './serialization/platform-contract-serializer';

// Versioning
export {
  PLATFORM_SCHEMA_CURRENT_VERSION,
  PLATFORM_SCHEMA_SUPPORTED_VERSIONS,
  PLATFORM_SCHEMA_DEPRECATED_VERSIONS,
  isPlatformVersionCompatible,
  isPlatformVersionSupported,
  isPlatformVersionDeprecated,
  checkPlatformVersionCompatibility,
  isContractVersionCompatible,
} from './versioning/platform-version-compatibility';
export type {
  SupportedPlatformSchemaVersion,
  VersionCompatibilityResult,
} from './versioning/platform-version-compatibility';

// Module
export { PlatformModule }                    from './platform.module';
