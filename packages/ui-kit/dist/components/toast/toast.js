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
exports.useToast = useToast;
exports.ToastProvider = ToastProvider;
exports.Toast = Toast;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const ToastPrimitive = __importStar(require("@radix-ui/react-toast"));
const lucide_react_1 = require("lucide-react");
const cn_1 = require("../../lib/cn");
const ToastContext = React.createContext(null);
function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx)
        throw new Error('useToast must be used within a ToastProvider');
    return ctx;
}
// ── Provider ──────────────────────────────────────────────────────────────────
function ToastProvider({ children, }) {
    const [messages, setMessages] = React.useState([]);
    const toast = React.useCallback((message) => {
        const id = crypto.randomUUID();
        setMessages((prev) => [...prev, { ...message, id }]);
    }, []);
    const dismiss = React.useCallback((id) => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
    }, []);
    return ((0, jsx_runtime_1.jsx)(ToastContext.Provider, { value: { toast, dismiss }, children: (0, jsx_runtime_1.jsxs)(ToastPrimitive.Provider, { swipeDirection: "right", children: [children, messages.map((msg) => ((0, jsx_runtime_1.jsx)(Toast, { message: msg, onDismiss: () => dismiss(msg.id) }, msg.id))), (0, jsx_runtime_1.jsx)(ToastPrimitive.Viewport, { className: (0, cn_1.cn)('fixed bottom-4 right-4 z-[100]', 'flex flex-col gap-2', 'w-[380px] max-w-[calc(100vw-2rem)]', 'outline-none') })] }) }));
}
// ── Intent config ─────────────────────────────────────────────────────────────
const INTENT_CONFIG = {
    success: { icon: lucide_react_1.CheckCircle, containerClass: 'border-green-200 bg-green-50', iconClass: 'text-green-500' },
    error: { icon: lucide_react_1.AlertCircle, containerClass: 'border-red-200   bg-red-50', iconClass: 'text-red-500' },
    warning: { icon: lucide_react_1.AlertTriangle, containerClass: 'border-amber-200 bg-amber-50', iconClass: 'text-amber-500' },
    info: { icon: lucide_react_1.Info, containerClass: 'border-blue-200  bg-blue-50', iconClass: 'text-blue-500' },
    default: { icon: lucide_react_1.Info, containerClass: 'border-gray-200  bg-white', iconClass: 'text-gray-400' },
};
// ── Toast item ────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss, }) {
    const intent = message.intent ?? 'default';
    const config = INTENT_CONFIG[intent];
    const Icon = config.icon;
    return ((0, jsx_runtime_1.jsxs)(ToastPrimitive.Root, { duration: message.duration ?? 5000, onOpenChange: (open) => { if (!open)
            onDismiss(); }, className: (0, cn_1.cn)('flex items-start gap-3 rounded-lg border p-4 shadow-md', 'data-[state=open]:animate-toast-slide-in', 'data-[state=closed]:animate-toast-slide-out', 'data-[swipe=end]:animate-toast-swipe-out', config.containerClass), children: [(0, jsx_runtime_1.jsx)(Icon, { className: (0, cn_1.cn)('mt-0.5 h-5 w-5 shrink-0', config.iconClass), "aria-hidden": "true" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 space-y-1", children: [(0, jsx_runtime_1.jsx)(ToastPrimitive.Title, { className: "text-sm font-semibold text-gray-900", children: message.title }), message.description && ((0, jsx_runtime_1.jsx)(ToastPrimitive.Description, { className: "text-sm text-gray-600", children: message.description })), message.action && ((0, jsx_runtime_1.jsx)(ToastPrimitive.Action, { altText: message.action.label, asChild: true, children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: message.action.onClick, className: "text-sm font-medium text-primary-600 underline-offset-2 hover:underline focus:outline-none focus:ring-1 focus:ring-primary-500", children: message.action.label }) }))] }), (0, jsx_runtime_1.jsx)(ToastPrimitive.Close, { onClick: onDismiss, className: (0, cn_1.cn)('rounded p-0.5 text-gray-400 transition-colors', 'hover:bg-black/5 hover:text-gray-600', 'focus:outline-none focus:ring-1 focus:ring-gray-400'), "aria-label": "Dismiss", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4", "aria-hidden": "true" }) })] }));
}
//# sourceMappingURL=toast.js.map