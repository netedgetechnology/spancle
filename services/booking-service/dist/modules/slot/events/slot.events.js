"use strict";
/**
 * slot.events.ts — All domain event names and payloads for the slot engine.
 * Namespaced under spancle.slot.* and spancle.holiday.*
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotEvents = void 0;
var SlotEvents;
(function (SlotEvents) {
    SlotEvents["CREATED"] = "spancle.slot.created";
    SlotEvents["UPDATED"] = "spancle.slot.updated";
    SlotEvents["DELETED"] = "spancle.slot.deleted";
    SlotEvents["STATUS_CHANGED"] = "spancle.slot.status_changed";
    SlotEvents["BULK_GENERATED"] = "spancle.slot.bulk_generated";
    SlotEvents["RESERVED"] = "spancle.slot.reserved";
    SlotEvents["RESERVATION_EXPIRED"] = "spancle.slot.reservation_expired";
})(SlotEvents || (exports.SlotEvents = SlotEvents = {}));
//# sourceMappingURL=slot.events.js.map