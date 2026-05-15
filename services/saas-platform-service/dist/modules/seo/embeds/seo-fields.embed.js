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
exports.SeoFieldsEmbed = void 0;
const typeorm_1 = require("typeorm");
class SeoFieldsEmbed {
}
exports.SeoFieldsEmbed = SeoFieldsEmbed;
__decorate([
    (0, typeorm_1.Column)({ name: 'seo_title', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seo_description', type: 'varchar', length: 320, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seo_keywords', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "keywords", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seo_canonical_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "canonicalUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seo_robots', type: 'varchar', length: 64, nullable: true, default: 'index,follow' }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "robots", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'og_title', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "ogTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'og_description', type: 'varchar', length: 320, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "ogDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'og_image_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "ogImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'og_type', type: 'varchar', length: 32, nullable: true, default: 'website' }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "ogType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'twitter_card', type: 'varchar', length: 32, nullable: true, default: 'summary_large_image' }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "twitterCard", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'twitter_title', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "twitterTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'twitter_description', type: 'varchar', length: 320, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "twitterDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'twitter_image_url', type: 'varchar', length: 2048, nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "twitterImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'schema_json_ld', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], SeoFieldsEmbed.prototype, "schemaJsonLd", void 0);
//# sourceMappingURL=seo-fields.embed.js.map