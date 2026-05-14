import * as React from 'react';
export type ToastIntent = 'success' | 'error' | 'warning' | 'info' | 'default';
export interface ToastMessage {
    id: string;
    title: string;
    description?: string;
    intent?: ToastIntent;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}
interface ToastContextValue {
    toast: (message: Omit<ToastMessage, 'id'>) => void;
    dismiss: (id: string) => void;
}
export declare function useToast(): ToastContextValue;
export declare function ToastProvider({ children, }: {
    children: React.ReactNode;
}): React.ReactElement;
declare function Toast({ message, onDismiss, }: {
    message: ToastMessage;
    onDismiss: () => void;
}): React.ReactElement;
export { Toast };
//# sourceMappingURL=toast.d.ts.map