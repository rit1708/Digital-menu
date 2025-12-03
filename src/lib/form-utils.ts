import type { FieldErrors } from "react-hook-form";

/**
 * Helper to get first error field name from form errors
 * Used for focusing on the first error field
 */
export function getFirstErrorField(errors: FieldErrors): string | null {
  return Object.keys(errors)[0] || null;
}

