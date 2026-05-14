"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
exports.CardHeader = CardHeader;
exports.CardTitle = CardTitle;
exports.CardDescription = CardDescription;
exports.CardContent = CardContent;
exports.CardFooter = CardFooter;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../../lib/cn");
function Card({ className, noPadding = false, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)('rounded-xl border border-gray-200 bg-white shadow-sm', !noPadding && 'p-0', className), ...props }));
}
function CardHeader({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)('flex flex-col gap-1 border-b border-gray-100 px-6 py-4', className), ...props }));
}
function CardTitle({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("h3", { className: (0, cn_1.cn)('text-base font-semibold leading-tight text-gray-900', className), ...props }));
}
function CardDescription({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("p", { className: (0, cn_1.cn)('text-sm text-gray-500', className), ...props }));
}
function CardContent({ className, ...props }) {
    return (0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)('px-6 py-4', className), ...props });
}
function CardFooter({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, cn_1.cn)('flex items-center border-t border-gray-100 px-6 py-4', className), ...props }));
}
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;
//# sourceMappingURL=card.js.map