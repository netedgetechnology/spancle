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
exports.Select = Select;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const SelectPrimitive = __importStar(require("@radix-ui/react-select"));
const lucide_react_1 = require("lucide-react");
const cn_1 = require("../../lib/cn");
function isGroupOption(opt) {
    return 'groupLabel' in opt;
}
/**
 * Select — accessible dropdown built on Radix UI Select primitive.
 * Supports flat options and grouped options.
 */
function Select({ value, defaultValue, onValueChange, placeholder = 'Select an option', options, disabled = false, error, label, required, id: idProp, className, }) {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;
    const errorId = `${id}-error`;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [label && ((0, jsx_runtime_1.jsxs)("label", { htmlFor: id, className: (0, cn_1.cn)('text-sm font-medium text-gray-700', disabled && 'opacity-50'), children: [label, required && (0, jsx_runtime_1.jsx)("span", { className: "ml-0.5 text-red-500", "aria-hidden": "true", children: "*" })] })), (0, jsx_runtime_1.jsxs)(SelectPrimitive.Root, { value: value, defaultValue: defaultValue, onValueChange: onValueChange, disabled: disabled, children: [(0, jsx_runtime_1.jsxs)(SelectPrimitive.Trigger, { id: id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined, "aria-required": required, className: (0, cn_1.cn)('flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm', 'bg-white text-gray-900', 'placeholder:text-gray-400', 'focus:outline-none focus:ring-2 focus:ring-offset-0', 'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50', 'transition-colors duration-150', error
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200', className), children: [(0, jsx_runtime_1.jsx)(SelectPrimitive.Value, { placeholder: placeholder }), (0, jsx_runtime_1.jsx)(SelectPrimitive.Icon, { asChild: true, children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "h-4 w-4 text-gray-400", "aria-hidden": "true" }) })] }), (0, jsx_runtime_1.jsx)(SelectPrimitive.Portal, { children: (0, jsx_runtime_1.jsx)(SelectPrimitive.Content, { className: (0, cn_1.cn)('relative z-50 min-w-[8rem] overflow-hidden', 'rounded-md border border-gray-200 bg-white shadow-md', 'data-[state=open]:animate-fade-in'), position: "popper", sideOffset: 4, children: (0, jsx_runtime_1.jsx)(SelectPrimitive.Viewport, { className: "p-1", children: options.map((opt, idx) => isGroupOption(opt) ? ((0, jsx_runtime_1.jsxs)(SelectPrimitive.Group, { children: [(0, jsx_runtime_1.jsx)(SelectPrimitive.Label, { className: "px-2 py-1.5 text-xs font-semibold text-gray-400", children: opt.groupLabel }), opt.options.map((item) => ((0, jsx_runtime_1.jsx)(SelectItem, { ...item }, item.value)))] }, `group-${idx}`)) : ((0, jsx_runtime_1.jsx)(SelectItem, { ...opt }, opt.value))) }) }) })] }), error && ((0, jsx_runtime_1.jsx)("p", { id: errorId, role: "alert", className: "text-xs text-red-600", children: error }))] }));
}
function SelectItem({ value, label, disabled, }) {
    return ((0, jsx_runtime_1.jsxs)(SelectPrimitive.Item, { value: value, disabled: disabled, className: (0, cn_1.cn)('relative flex cursor-default select-none items-center', 'rounded-sm px-2 py-1.5 pl-7 text-sm text-gray-900', 'outline-none transition-colors', 'focus:bg-primary-50 focus:text-primary-700', 'data-[disabled]:pointer-events-none data-[disabled]:opacity-40'), children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: (0, jsx_runtime_1.jsx)(SelectPrimitive.ItemIndicator, { children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-3.5 w-3.5", "aria-hidden": "true" }) }) }), (0, jsx_runtime_1.jsx)(SelectPrimitive.ItemText, { children: label })] }));
}
//# sourceMappingURL=select.js.map