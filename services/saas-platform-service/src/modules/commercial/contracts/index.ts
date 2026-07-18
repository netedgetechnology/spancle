/**
 * contracts/index.ts
 *
 * Public API surface for Commercial→Finance contracts.
 *
 * Finance Engine imports ONLY from this barrel.
 * Internal implementation details (builder, interfaces from other modules) are not exported.
 *
 * Frozen at contractVersion 1.0.0.
 */
export { COMMERCIAL_CONTRACT_VERSION, isCompatibleVersion } from './contract-version';
export type { VersionedContract, CommercialContractVersion }  from './contract-version';
export type {
  CommercialDecisionContract,
  EvaluatedRuleRef,
} from './commercial-decision.contract';
export type {
  PaymentInstruction,
  InvoiceInstruction,
  InvoiceLine,
  SettlementInstruction,
  RevenueInstruction,
  RevenueTier,
} from './financial-instructions.contracts';
export { CommercialContractBuilder }                          from './commercial-contract.builder';
