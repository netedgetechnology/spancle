import * as React from 'react';
import { cn } from '../../lib/cn';

/**
 * Card family — composed of Card, CardHeader, CardTitle,
 * CardDescription, CardContent, CardFooter.
 *
 * Server Component safe — no interactivity.
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes default padding from the card surface */
  noPadding?: boolean;
}

function Card({ className, noPadding = false, ...props }: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        !noPadding && 'p-0',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-gray-100 px-6 py-4', className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return (
    <h3
      className={cn('text-base font-semibold leading-tight text-gray-900', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement {
  return (
    <p
      className={cn('text-sm text-gray-500', className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('px-6 py-4', className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'flex items-center border-t border-gray-100 px-6 py-4',
        className,
      )}
      {...props}
    />
  );
}

Card.Header      = CardHeader;
Card.Title       = CardTitle;
Card.Description = CardDescription;
Card.Content     = CardContent;
Card.Footer      = CardFooter;

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
