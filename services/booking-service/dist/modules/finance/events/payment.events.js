"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentEvents = void 0;
var PaymentEvents;
(function (PaymentEvents) {
    PaymentEvents["INITIATED"] = "spancle.finance.payment_initiated";
    PaymentEvents["AUTHORIZED"] = "spancle.finance.payment_authorized";
    PaymentEvents["CAPTURED"] = "spancle.finance.payment_captured";
    PaymentEvents["FAILED"] = "spancle.finance.payment_failed";
    PaymentEvents["ALLOCATED"] = "spancle.finance.payment_allocated";
    PaymentEvents["RECONCILED"] = "spancle.finance.payment_reconciled";
})(PaymentEvents || (exports.PaymentEvents = PaymentEvents = {}));
//# sourceMappingURL=payment.events.js.map