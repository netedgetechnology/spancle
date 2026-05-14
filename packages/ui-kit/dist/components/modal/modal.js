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
exports.Modal = Modal;
const jsx_runtime_1 = require("react/jsx-runtime");
const Dialog = __importStar(require("@radix-ui/react-dialog"));
const lucide_react_1 = require("lucide-react");
const cn_1 = require("../../lib/cn");
const SIZE_MAP = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-[calc(100vw-2rem)]',
};
/**
 * Modal — accessible dialog built on Radix UI Dialog primitive.
 *
 * Features:
 *   - Focus trap managed by Radix
 *   - Escape key closes (unless persistent=true)
 *   - Backdrop click closes (unless persistent=true)
 *   - Screen reader announcements via title and description
 *   - Portal renders outside app DOM tree
 */
function Modal({ open, onOpenChange, title, description, children, footer, size = 'md', persistent = false, className, }) {
    const handleOpenChange = (nextOpen) => {
        if (!nextOpen && persistent)
            return;
        onOpenChange(nextOpen);
    };
    return ((0, jsx_runtime_1.jsx)(Dialog.Root, { open: open, onOpenChange: handleOpenChange, children: (0, jsx_runtime_1.jsxs)(Dialog.Portal, { children: [(0, jsx_runtime_1.jsx)(Dialog.Overlay, { className: (0, cn_1.cn)('fixed inset-0 z-50 bg-black/40 backdrop-blur-sm', 'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out') }), (0, jsx_runtime_1.jsxs)(Dialog.Content, { className: (0, cn_1.cn)('fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2', 'rounded-xl border border-gray-200 bg-white shadow-xl', 'focus:outline-none', 'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out', SIZE_MAP[size], className), onInteractOutside: (e) => {
                        if (persistent)
                            e.preventDefault();
                    }, onEscapeKeyDown: (e) => {
                        if (persistent)
                            e.preventDefault();
                    }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between border-b border-gray-100 px-6 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-0.5 pr-8", children: [(0, jsx_runtime_1.jsx)(Dialog.Title, { className: "text-base font-semibold text-gray-900", children: title }), description && ((0, jsx_runtime_1.jsx)(Dialog.Description, { className: "text-sm text-gray-500", children: description }))] }), !persistent && ((0, jsx_runtime_1.jsx)(Dialog.Close, { className: (0, cn_1.cn)('rounded-md p-1 text-gray-400 transition-colors', 'hover:bg-gray-100 hover:text-gray-600', 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1'), "aria-label": "Close", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4", "aria-hidden": "true" }) }))] }), (0, jsx_runtime_1.jsx)("div", { className: "px-6 py-4", children: children }), footer && ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4", children: footer }))] })] }) }));
}
//# sourceMappingURL=modal.js.map