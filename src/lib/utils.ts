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

// Helper function to extract a display name from email when name is not available
export const getNameFromEmail = (email: string | undefined | null): string => {
  if (!email || typeof email !== 'string') {
    return 'User';
  }
  
  // Extract the part before @
  const emailPrefix = email.split('@')[0];
  
  // If email prefix is empty or too short, return default
  if (!emailPrefix || emailPrefix.length < 1) {
    return 'User';
  }
  
  // Split by common separators (., -, _) and find the first meaningful part
  const parts = emailPrefix.split(/[._-]/);
  
  // Find the first part that starts with a letter and has at least 2 characters
  let namePart = parts.find(part => part.length >= 2 && /^[a-zA-Z]/.test(part));
  
  // If found, remove trailing numbers and format
  if (namePart) {
    // Remove trailing numbers (e.g., "barber934" -> "barber")
    namePart = namePart.replace(/\d+$/, '');
    
    // If after removing numbers we still have a meaningful name (at least 2 chars)
    if (namePart.length >= 2) {
      // Capitalize first letter, lowercase the rest
      return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    }
  }
  
  // If no meaningful name part found, try the whole prefix (remove trailing numbers)
  let cleanPrefix = emailPrefix.replace(/\d+$/, '');
  if (cleanPrefix.length >= 2 && /^[a-zA-Z]/.test(cleanPrefix)) {
    return cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1).toLowerCase();
  }
  
  // Final fallback: use the prefix as-is, capitalized
  return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
};
