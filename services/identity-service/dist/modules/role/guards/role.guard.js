"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = exports.RoleGuard = void 0;
const common_1 = require("@nestjs/common");
const user_guard_1 = require("../../user/guards/user.guard");
let RoleGuard = class RoleGuard extends user_guard_1.TenantGuard {
};
exports.RoleGuard = RoleGuard;
exports.RoleGuard = RoleGuard = __decorate([
    (0, common_1.Injectable)()
], RoleGuard);
var user_guard_2 = require("../../user/guards/user.guard");
Object.defineProperty(exports, "TenantGuard", { enumerable: true, get: function () { return user_guard_2.TenantGuard; } });
//# sourceMappingURL=role.guard.js.map