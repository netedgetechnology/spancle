"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TaxResolver_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxResolver = void 0;
const common_1 = require("@nestjs/common");
const tax_rate_repository_1 = require("../repositories/tax-rate.repository");
let TaxResolver = TaxResolver_1 = class TaxResolver {
    constructor(taxRateRepository) {
        this.taxRateRepository = taxRateRepository;
        this.logger = new common_1.Logger(TaxResolver_1.name);
    }
    async resolveLine(tenantId, line, jurisdiction, transactionDate) {
        if (!Number.isInteger(line.lineAmountMinor)) {
            throw new Error(`TaxResolver: lineAmountMinor must be an integer; got ${line.lineAmountMinor}`);
        }
        let applicableRates = [];
        if (line.taxCode) {
            const rate = await this.taxRateRepository.findByCode(line.taxCode, tenantId);
            if (rate && rate.isActive)
                applicableRates = [rate];
        }
        else if (jurisdiction) {
            const allRates = await this.taxRateRepository.findForJurisdiction(tenantId, jurisdiction, transactionDate);
            applicableRates = allRates.filter((r) => !r.appliesTo || r.appliesTo.length === 0 || r.appliesTo.includes(line.lineType));
        }
        else {
            const def = await this.taxRateRepository.findDefault(tenantId);
            if (def)
                applicableRates = [def];
        }
        if (applicableRates.length === 0) {
            return { totalTaxMinor: 0, taxLines: [] };
        }
        const taxLines = [];
        let baseTaxTotal = 0;
        for (const rate of applicableRates) {
            let taxMinor;
            let taxableMinor;
            if (rate.isCompound) {
                taxableMinor = baseTaxTotal;
                taxMinor = Math.trunc(taxableMinor * rate.rateBps / 10000);
            }
            else if (rate.isInclusive) {
                taxableMinor = line.lineAmountMinor;
                taxMinor = Math.trunc((taxableMinor * rate.rateBps) / (10000 + rate.rateBps));
            }
            else {
                taxableMinor = line.lineAmountMinor;
                taxMinor = Math.trunc(taxableMinor * rate.rateBps / 10000);
            }
            baseTaxTotal += taxMinor;
            taxLines.push({
                taxCode: rate.code,
                taxName: rate.name,
                rateBps: rate.rateBps,
                taxableMinor,
                taxMinor,
                isInclusive: rate.isInclusive,
                isCompound: rate.isCompound,
            });
        }
        const totalTaxMinor = taxLines.reduce((s, l) => s + l.taxMinor, 0);
        return { totalTaxMinor, taxLines };
    }
    async resolveLines(tenantId, lines, jurisdiction, transactionDate) {
        const lineResults = await Promise.all(lines.map((l) => this.resolveLine(tenantId, l, jurisdiction, transactionDate)));
        const grandTotalTaxMinor = lineResults.reduce((sum, r) => sum + r.totalTaxMinor, 0);
        return { lineResults, grandTotalTaxMinor };
    }
    static formatRate(rateBps) {
        return (rateBps / 100).toFixed(2);
    }
};
exports.TaxResolver = TaxResolver;
exports.TaxResolver = TaxResolver = TaxResolver_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tax_rate_repository_1.TaxRateRepository])
], TaxResolver);
//# sourceMappingURL=tax-resolver.service.js.map