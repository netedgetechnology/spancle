'use client';

import { useCallback, useState } from 'react';

export interface DisclosureState {
  isOpen:  boolean;
  open:    () => void;
  close:   () => void;
  toggle:  () => void;
  set:     (value: boolean) => void;
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
export function useDisclosure(initialState = false): DisclosureState {
  const [isOpen, setIsOpen] = useState<boolean>(initialState);

  const open   = useCallback(() => setIsOpen(true),            []);
  const close  = useCallback(() => setIsOpen(false),           []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const set    = useCallback((value: boolean) => setIsOpen(value), []);

  return { isOpen, open, close, toggle, set };
}
