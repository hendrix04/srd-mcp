/**
 * Validation utilities for tool inputs
 */

export function isValidSpellLevel(level: unknown): level is number {
  return typeof level === "number" && level >= 0 && level <= 9 && Number.isInteger(level);
}

export function isValidCharacterLevel(level: unknown): level is number {
  return typeof level === "number" && level >= 1 && level <= 20 && Number.isInteger(level);
}

export function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateSpellFilters(filters: unknown): {
  valid: boolean;
  error?: string;
} {
  if (typeof filters !== "object" || filters === null) {
    return { valid: false, error: "Filters must be an object" };
  }

  const f = filters as Record<string, unknown>;

  if (f.level !== undefined && !isValidSpellLevel(f.level)) {
    return { valid: false, error: "Level must be a number between 0 and 9" };
  }

  if (f.className !== undefined && !isValidString(f.className)) {
    return { valid: false, error: "Class name must be a non-empty string" };
  }

  if (f.school !== undefined && !isValidString(f.school)) {
    return { valid: false, error: "School must be a non-empty string" };
  }

  return { valid: true };
}
