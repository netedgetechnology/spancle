import { type VariantProps } from 'class-variance-authority';
export declare const badgeVariants: (props?: ({
    intent?: "default" | "primary" | "success" | "warning" | "danger" | "info" | null | undefined;
    size?: "sm" | "md" | "lg" | null | undefined;
    dot?: boolean | null | undefined;
} & import("class-variance-authority/dist/types").ClassProp) | undefined) => string;
export type BadgeVariantProps = VariantProps<typeof badgeVariants>;
//# sourceMappingURL=badge.variants.d.ts.map