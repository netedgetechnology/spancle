import * as React from 'react';
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
declare function Card({ className, noPadding, ...props }: CardProps): React.ReactElement;
declare namespace Card {
    var Header: typeof CardHeader;
    var Title: typeof CardTitle;
    var Description: typeof CardDescription;
    var Content: typeof CardContent;
    var Footer: typeof CardFooter;
}
declare function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
declare function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement;
declare function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement;
declare function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
declare function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, };
//# sourceMappingURL=card.d.ts.map