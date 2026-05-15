"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Public = exports.RequirePermissions = exports.Roles = exports.IS_PUBLIC_KEY = exports.PERMISSIONS_KEY = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ROLES_KEY = 'spancle:roles';
exports.PERMISSIONS_KEY = 'spancle:permissions';
exports.IS_PUBLIC_KEY = 'spancle:is_public';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
const RequirePermissions = (...permissions) => (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
exports.RequirePermissions = RequirePermissions;
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
//# sourceMappingURL=roles.decorator.js.map