"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDisclosure = useDisclosure;
const react_1 = require("react");
/**
 * useDisclosure — manages open/closed boolean state for modals,
 * drawers, dropdowns, and other toggle-based UI patterns.
 *
 * Usage:
 *   const modal = useDisclosure();
 *   <Button onClick={modal.open}>Open</Button>
 *   <Modal open={modal.isOpen} onOpenChange={modal.set} ... />
 */
function useDisclosure(initialState = false) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(initialState);
    const open = (0, react_1.useCallback)(() => setIsOpen(true), []);
    const close = (0, react_1.useCallback)(() => setIsOpen(false), []);
    const toggle = (0, react_1.useCallback)(() => setIsOpen((prev) => !prev), []);
    const set = (0, react_1.useCallback)((value) => setIsOpen(value), []);
    return { isOpen, open, close, toggle, set };
}
//# sourceMappingURL=use-disclosure.js.map