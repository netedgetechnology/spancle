import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind classes without conflicts. Internal to ui-kit. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
