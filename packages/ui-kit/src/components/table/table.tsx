import * as React from 'react';
import { cn } from '../../lib/cn';

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

function Table({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>): React.ReactElement {
  return (
    <div className="w-full overflow-auto rounded-lg border border-gray-200">
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return <thead className={cn('bg-gray-50', className)} {...props} />;
}

function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return (
    <tbody
      className={cn('divide-y divide-gray-100 bg-white', className)}
      {...props}
    />
  );
}

function TableFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return (
    <tfoot
      className={cn('border-t border-gray-200 bg-gray-50 font-medium', className)}
      {...props}
    />
  );
}

function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>): React.ReactElement {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-gray-50',
        'data-[selected=true]:bg-primary-50',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-semibold uppercase',
        'tracking-wider text-gray-500',
        'whitespace-nowrap',
        '[&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle text-gray-700',
        '[&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>): React.ReactElement {
  return (
    <caption
      className={cn('mt-2 text-sm text-gray-500', className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
