/**
 * SlotModule — the complete slot engine.
 *
 * Entities registered: slots, slot_templates, pricing_rules, blackouts, holidays
 *
 * HttpModule: used by SlotGeneratorService to call identity-service for
 *   court + branch data (operating hours, status, rate).
 *
 * Exports SlotService and AvailabilityService so BookingModule can:
 *   - Reserve slots before confirming a booking (SlotService.reserve)
 *   - Check availability during booking (AvailabilityService.isWindowFree)
 */
export declare class SlotModule {
}
//# sourceMappingURL=slot.module.d.ts.map