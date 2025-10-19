/**
 * Type guard utilities for runtime validation
 *
 * These functions provide safe type checking and casting for JSON fields
 * from Prisma, preventing unsafe type assertions.
 */

/**
 * Check if a value is an array of numbers
 */
export function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'number' && !isNaN(item))
  );
}

/**
 * Check if a value is an array of strings
 */
export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string')
  );
}

/**
 * Safely cast JSON field to number array with validation
 * @throws Error if value is not a valid number array
 */
export function toNumberArray(value: unknown, fieldName: string = 'field'): number[] {
  if (!isNumberArray(value)) {
    throw new Error(
      `Expected ${fieldName} to be number[], got ${typeof value}. ` +
      `Value: ${JSON.stringify(value)}`
    );
  }
  return value;
}

/**
 * Safely cast JSON field to string array with validation
 * @throws Error if value is not a valid string array
 */
export function toStringArray(value: unknown, fieldName: string = 'field'): string[] {
  if (!isStringArray(value)) {
    throw new Error(
      `Expected ${fieldName} to be string[], got ${typeof value}. ` +
      `Value: ${JSON.stringify(value)}`
    );
  }
  return value;
}

/**
 * Safely cast JSON field to number array with fallback
 * Returns empty array if validation fails instead of throwing
 */
export function safeNumberArray(value: unknown): number[] {
  return isNumberArray(value) ? value : [];
}

/**
 * Safely cast JSON field to string array with fallback
 * Returns empty array if validation fails instead of throwing
 */
export function safeStringArray(value: unknown): string[] {
  return isStringArray(value) ? value : [];
}

/**
 * Banlist data structure (used for deck validation)
 */
export interface BanlistData {
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
}

/**
 * Validate and cast Prisma JSON fields to BanlistData
 * @throws Error if any field is invalid
 */
export function toBanlistData(data: {
  banned: unknown;
  limited: unknown;
  semilimited: unknown;
  unlimited: unknown;
}): BanlistData {
  return {
    banned: toNumberArray(data.banned, 'banned'),
    limited: toNumberArray(data.limited, 'limited'),
    semilimited: toNumberArray(data.semilimited, 'semilimited'),
    unlimited: toNumberArray(data.unlimited, 'unlimited'),
  };
}

/**
 * Safely cast Prisma JSON fields to BanlistData with fallback
 * Returns empty arrays for invalid fields instead of throwing
 */
export function safeBanlistData(data: {
  banned: unknown;
  limited: unknown;
  semilimited: unknown;
  unlimited: unknown;
}): BanlistData {
  return {
    banned: safeNumberArray(data.banned),
    limited: safeNumberArray(data.limited),
    semilimited: safeNumberArray(data.semilimited),
    unlimited: safeNumberArray(data.unlimited),
  };
}
