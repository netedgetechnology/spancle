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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceReferenceEntity = exports.InvoiceTaxEntity = exports.InvoiceLineEntity = void 0;
const typeorm_1 = require("typeorm");
let InvoiceLineEntity = class InvoiceLineEntity {
};
exports.InvoiceLineEntity = InvoiceLineEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InvoiceLineEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], InvoiceLineEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], InvoiceLineEntity.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: false }),
    __metadata("design:type", String)
], InvoiceLineEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'line_type', type: 'varchar', length: 40, nullable: false }),
    __metadata("design:type", String)
], InvoiceLineEntity.prototype, "lineType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: false, default: 1 }),
    __metadata("design:type", Number)
], InvoiceLineEntity.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_price_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], InvoiceLineEntity.prototype, "unitPriceMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subtotal_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], InvoiceLineEntity.prototype, "subtotalMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'discount_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceLineEntity.prototype, "discountMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'net_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], InvoiceLineEntity.prototype, "netMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_minor', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceLineEntity.prototype, "taxMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'applied_rule_ids', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], InvoiceLineEntity.prototype, "appliedRuleIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'coupon_code', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], InvoiceLineEntity.prototype, "couponCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'coupon_rule_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], InvoiceLineEntity.prototype, "couponRuleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'discount_source', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], InvoiceLineEntity.prototype, "discountSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'line_source_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], InvoiceLineEntity.prototype, "lineSourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', nullable: false, default: 0 }),
    __metadata("design:type", Number)
], InvoiceLineEntity.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], InvoiceLineEntity.prototype, "createdAt", void 0);
exports.InvoiceLineEntity = InvoiceLineEntity = __decorate([
    (0, typeorm_1.Entity)('finance_invoice_lines'),
    (0, typeorm_1.Index)(['tenantId', 'invoiceId']),
    (0, typeorm_1.Index)(['tenantId', 'lineSourceId'], { where: '"line_source_id" IS NOT NULL' })
], InvoiceLineEntity);
let InvoiceTaxEntity = class InvoiceTaxEntity {
};
exports.InvoiceTaxEntity = InvoiceTaxEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InvoiceTaxEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], InvoiceTaxEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], InvoiceTaxEntity.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_code', type: 'varchar', length: 30, nullable: false }),
    __metadata("design:type", String)
], InvoiceTaxEntity.prototype, "taxCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_name', type: 'varchar', length: 100, nullable: false }),
    __metadata("design:type", String)
], InvoiceTaxEntity.prototype, "taxName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'regime', type: 'varchar', length: 20, nullable: false }),
    __metadata("design:type", String)
], InvoiceTaxEntity.prototype, "regime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rate_bps', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], InvoiceTaxEntity.prototype, "rateBps", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'taxable_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], InvoiceTaxEntity.prototype, "taxableMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_minor', type: 'int', nullable: false }),
    __metadata("design:type", Number)
], InvoiceTaxEntity.prototype, "taxMinor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_inclusive', type: 'boolean', nullable: false }),
    __metadata("design:type", Boolean)
], InvoiceTaxEntity.prototype, "isInclusive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_compound', type: 'boolean', nullable: false }),
    __metadata("design:type", Boolean)
], InvoiceTaxEntity.prototype, "isCompound", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], InvoiceTaxEntity.prototype, "createdAt", void 0);
exports.InvoiceTaxEntity = InvoiceTaxEntity = __decorate([
    (0, typeorm_1.Entity)('finance_invoice_taxes'),
    (0, typeorm_1.Index)(['tenantId', 'invoiceId'])
], InvoiceTaxEntity);
let InvoiceReferenceEntity = class InvoiceReferenceEntity {
};
exports.InvoiceReferenceEntity = InvoiceReferenceEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InvoiceReferenceEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tenant_id', type: 'uuid', nullable: false }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], InvoiceReferenceEntity.prototype, "tenantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], InvoiceReferenceEntity.prototype, "invoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_number', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], InvoiceReferenceEntity.prototype, "invoiceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_type', type: 'varchar', length: 20, nullable: false }),
    __metadata("design:type", String)
], InvoiceReferenceEntity.prototype, "sourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_id', type: 'uuid', nullable: false }),
    __metadata("design:type", String)
], InvoiceReferenceEntity.prototype, "sourceId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], InvoiceReferenceEntity.prototype, "createdAt", void 0);
exports.InvoiceReferenceEntity = InvoiceReferenceEntity = __decorate([
    (0, typeorm_1.Entity)('finance_invoice_references'),
    (0, typeorm_1.Index)(['tenantId', 'sourceType', 'sourceId'], { unique: true }),
    (0, typeorm_1.Index)(['tenantId', 'invoiceId'])
], InvoiceReferenceEntity);
//# sourceMappingURL=invoice-line.entity.js.map