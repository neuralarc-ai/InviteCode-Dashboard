import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to determine user type based on email domain
export const getUserType = (email: string | undefined): 'internal' | 'external' => {
  if (!email || typeof email !== 'string') {
    return 'external'; // Default to external if email is missing
  }
  const emailLower = email.toLowerCase();
  if (emailLower.endsWith('@he2.ai') || emailLower.endsWith('@neuralarc.ai')) {
    return 'internal';
  }
  return 'external';
};
