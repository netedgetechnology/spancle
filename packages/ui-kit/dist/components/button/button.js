"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buttonVariants = exports.Button = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const react_slot_1 = require("@radix-ui/react-slot");
const cn_1 = require("../../lib/cn");
const button_variants_1 = require("./button.variants");
Object.defineProperty(exports, "buttonVariants", { enumerable: true, get: function () { return button_variants_1.buttonVariants; } });
/**
 * Button — the primary interactive element.
 *
 * Supports all variants, sizes, loading states and asChild composition.
 * Fully accessible: manages aria-disabled, aria-busy, focus ring.
 */
const Button = React.forwardRef(({ className, variant, size, fullWidth, iconOnly, asChild = false, isLoading = false, loadingText, disabled, children, ...props }, ref) => {
    const Comp = asChild ? react_slot_1.Slot : 'button';
    const isDisabled = disabled ?? isLoading;
    return ((0, jsx_runtime_1.jsx)(Comp, { ref: ref, className: (0, cn_1.cn)((0, button_variants_1.buttonVariants)({ variant, size, fullWidth, iconOnly }), className), disabled: isDisabled, "aria-disabled": isDisabled, "aria-busy": isLoading, ...props, children: isLoading ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("svg", { className: "h-4 w-4 animate-spin", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] }), (0, jsx_runtime_1.jsx)("span", { children: loadingText ?? children })] })) : (children) }));
});
exports.Button = Button;
Button.displayName = 'Button';
//# sourceMappingURL=button.js.map