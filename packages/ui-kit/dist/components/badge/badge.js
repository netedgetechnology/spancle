"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeVariants = void 0;
exports.Badge = Badge;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../../lib/cn");
const badge_variants_1 = require("./badge.variants");
Object.defineProperty(exports, "badgeVariants", { enumerable: true, get: function () { return badge_variants_1.badgeVariants; } });
/**
 * Badge — inline status/category label.
 * Server Component safe — no interactivity.
 */
function Badge({ className, intent, size, dot = false, children, ...props }) {
    return ((0, jsx_runtime_1.jsxs)("span", { className: (0, cn_1.cn)((0, badge_variants_1.badgeVariants)({ intent, size, dot }), className), ...props, children: [dot && ((0, jsx_runtime_1.jsx)("span", { className: (0, cn_1.cn)('h-1.5 w-1.5 rounded-full bg-current'), "aria-hidden": "true" })), children] }));
}
//# sourceMappingURL=badge.js.map