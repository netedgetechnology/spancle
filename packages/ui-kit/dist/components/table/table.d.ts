import * as React from 'react';
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
declare function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>): React.ReactElement;
declare function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement;
declare function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement;
declare function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement;
declare function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>): React.ReactElement;
declare function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>): React.ReactElement;
declare function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): React.ReactElement;
declare function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>): React.ReactElement;
export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption, };
//# sourceMappingURL=table.d.ts.map