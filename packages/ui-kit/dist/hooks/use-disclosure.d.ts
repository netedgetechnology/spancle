export interface DisclosureState {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    set: (value: boolean) => void;
}
/**
 * useDisclosure — manages open/closed boolean state for modals,
 * drawers, dropdowns, and other toggle-based UI patterns.
 *
 * Usage:
 *   const modal = useDisclosure();
 *   <Button onClick={modal.open}>Open</Button>
 *   <Modal open={modal.isOpen} onOpenChange={modal.set} ... />
 */
export declare function useDisclosure(initialState?: boolean): DisclosureState;
//# sourceMappingURL=use-disclosure.d.ts.map