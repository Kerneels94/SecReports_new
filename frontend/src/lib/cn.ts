/**
 * Utility that merges Tailwind class names using `clsx` and `tailwind-merge`,
 * resolving conflicts in favour of the last non-conflicting class.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
