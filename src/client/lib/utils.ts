import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Decode JWT token and extract expiration time
 * @param token JWT token string
 * @returns Date object representing token expiration or null if invalid
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = JSON.parse(atob(paddedPayload));

    // Extract expiration time (exp claim is in seconds since epoch)
    if (decodedPayload.exp) {
      return new Date(decodedPayload.exp * 1000);
    }

    return null;
  } catch {
    return null;
  }
}