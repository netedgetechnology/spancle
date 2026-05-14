"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = Table;
exports.TableHeader = TableHeader;
exports.TableBody = TableBody;
exports.TableFooter = TableFooter;
exports.TableRow = TableRow;
exports.TableHead = TableHead;
exports.TableCell = TableCell;
exports.TableCaption = TableCaption;
const jsx_runtime_1 = require("react/jsx-runtime");
const cn_1 = require("../../lib/cn");
/**
 * Table family — semantic HTML table with consistent Spancle styling.
 * Server Component safe — no interactivity.
 *
 * Usage:
 *   <Table>
 *     <TableHeader>
 *       <TableRow>
 *         <TableHead>Name</TableHead>
 *       </TableRow>
 *     </TableHeader>
 *     <TableBody>
 *       <TableRow>
 *         <TableCell>Alice</TableCell>
 *       </TableRow>
 *     </TableBody>
 *   </Table>
 */
function Table({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "w-full overflow-auto rounded-lg border border-gray-200", children: (0, jsx_runtime_1.jsx)("table", { className: (0, cn_1.cn)('w-full caption-bottom text-sm', className), ...props }) }));
}
function TableHeader({ className, ...props }) {
    return (0, jsx_runtime_1.jsx)("thead", { className: (0, cn_1.cn)('bg-gray-50', className), ...props });
}
function TableBody({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("tbody", { className: (0, cn_1.cn)('divide-y divide-gray-100 bg-white', className), ...props }));
}
function TableFooter({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("tfoot", { className: (0, cn_1.cn)('border-t border-gray-200 bg-gray-50 font-medium', className), ...props }));
}
function TableRow({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("tr", { className: (0, cn_1.cn)('transition-colors hover:bg-gray-50', 'data-[selected=true]:bg-primary-50', className), ...props }));
}
function TableHead({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("th", { className: (0, cn_1.cn)('h-10 px-4 text-left align-middle text-xs font-semibold uppercase', 'tracking-wider text-gray-500', 'whitespace-nowrap', '[&:has([role=checkbox])]:pr-0', className), ...props }));
}
function TableCell({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("td", { className: (0, cn_1.cn)('px-4 py-3 align-middle text-gray-700', '[&:has([role=checkbox])]:pr-0', className), ...props }));
}
function TableCaption({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("caption", { className: (0, cn_1.cn)('mt-2 text-sm text-gray-500', className), ...props }));
}
//# sourceMappingURL=table.js.map