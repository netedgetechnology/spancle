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
exports.CustomerQueryDto = exports.UpdateCustomerDto = exports.CreateCustomerDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];
const STATUSES = ['active', 'inactive', 'banned'];
class CreateCustomerDto {
}
exports.CreateCustomerDto = CreateCustomerDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "parentCustomerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(GENDERS),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCustomerDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(254),
    (0, class_transformer_1.Transform)(({ value }) => value?.toLowerCase().trim()),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCustomerDto.prototype, "emergencyContact", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCustomerDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "profilePhoto", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateCustomerDto.prototype, "isGuest", void 0);
class UpdateCustomerDto {
}
exports.UpdateCustomerDto = UpdateCustomerDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(GENDERS),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCustomerDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(254),
    (0, class_transformer_1.Transform)(({ value }) => value?.toLowerCase().trim()),
    __metadata("design:type", String)
], UpdateCustomerDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCustomerDto.prototype, "emergencyContact", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCustomerDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", Object)
], UpdateCustomerDto.prototype, "profilePhoto", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", Object)
], UpdateCustomerDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(STATUSES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCustomerDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCustomerDto.prototype, "parentCustomerId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(10_000_000),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateCustomerDto.prototype, "walletBalanceMinor", void 0);
class CustomerQueryDto {
}
exports.CustomerQueryDto = CustomerQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "q", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(STATUSES),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CustomerQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], CustomerQueryDto.prototype, "isGuest", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['fullName', 'createdAt', 'email']),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['ASC', 'DESC']),
    __metadata("design:type", String)
], CustomerQueryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(200),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    __metadata("design:type", Number)
], CustomerQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    __metadata("design:type", Number)
], CustomerQueryDto.prototype, "offset", void 0);
//# sourceMappingURL=customer.dto.js.map