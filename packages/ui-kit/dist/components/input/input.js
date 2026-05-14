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
exports.Input = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const LabelPrimitive = __importStar(require("@radix-ui/react-label"));
const cn_1 = require("../../lib/cn");
const input_variants_1 = require("./input.variants");
/**
 * Input — accessible text input with label, description, error and
 * leading/trailing adornment slots.
 *
 * Automatically applies error intent when error prop is provided.
 * Label is always rendered for accessibility — use hideLabel for visual hiding.
 */
const Input = React.forwardRef(({ className, intent, size, label, description, error, hideLabel = false, prefix, suffix, id: idProp, required, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;
    const descId = `${id}-desc`;
    const errorId = `${id}-error`;
    const resolvedIntent = error ? 'error' : intent;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [label && ((0, jsx_runtime_1.jsxs)(LabelPrimitive.Root, { htmlFor: id, className: (0, cn_1.cn)('text-sm font-medium text-gray-700', hideLabel && 'sr-only', disabled && 'opacity-50'), children: [label, required && ((0, jsx_runtime_1.jsx)("span", { className: "ml-0.5 text-red-500", "aria-hidden": "true", children: "*" }))] })), description && !hideLabel && ((0, jsx_runtime_1.jsx)("p", { id: descId, className: "text-xs text-gray-500", children: description })), (0, jsx_runtime_1.jsxs)("div", { className: "relative flex items-center", children: [prefix && ((0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none absolute left-3 flex items-center text-gray-400", children: prefix })), (0, jsx_runtime_1.jsx)("input", { ref: ref, id: id, className: (0, cn_1.cn)((0, input_variants_1.inputVariants)({ intent: resolvedIntent, size }), prefix && 'pl-9', suffix && 'pr-9', className), "aria-describedby": [description && descId, error && errorId]
                            .filter(Boolean)
                            .join(' ') || undefined, "aria-invalid": error ? true : undefined, "aria-required": required, disabled: disabled, required: required, ...props }), suffix && ((0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none absolute right-3 flex items-center text-gray-400", children: suffix }))] }), error && ((0, jsx_runtime_1.jsx)("p", { id: errorId, role: "alert", className: "text-xs text-red-600", children: error }))] }));
});
exports.Input = Input;
Input.displayName = 'Input';
//# sourceMappingURL=input.js.map