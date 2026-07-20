export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
    tenantId: string | null;
    image: string | null;
}
export interface UserMenuLink {
    label: string;
    href: string;
    icon?: 'user' | 'settings' | 'key';
}
export interface UserMenuProps {
    user: AuthUser;
    onSignOut: () => void;
    links?: UserMenuLink[];
    className?: string;
}
export declare function UserMenu({ user, onSignOut, links }: UserMenuProps): React.ReactElement;
//# sourceMappingURL=user-menu.d.ts.map