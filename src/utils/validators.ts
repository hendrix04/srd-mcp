/**
 * Validation utilities for tool inputs
 */

export function isValidSpellLevel(level: unknown): level is number {
  return (
    typeof level === "number" &&
    level >= 0 &&
    level <= 9 &&
    Number.isInteger(level)
  );
}

export function isValidCharacterLevel(level: unknown): level is number {
  return (
    typeof level === "number" &&
    level >= 1 &&
    level <= 20 &&
    Number.isInteger(level)
  );
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

export function validateClassLevel(args: unknown): {
  valid: boolean;
  error?: string;
} {
  if (typeof args !== "object" || args === null) {
    return { valid: false, error: "Arguments must be an object" };
  }

  const a = args as Record<string, unknown>;

  if (!a.className || !isValidString(a.className)) {
    return {
      valid: false,
      error: "Class name is required and must be a non-empty string",
    };
  }

  if (a.level !== undefined && !isValidCharacterLevel(a.level)) {
    return { valid: false, error: "Level must be a number between 1 and 20" };
  }

  return { valid: true };
}

export function validateFeatFilters(filters: unknown): {
  valid: boolean;
  error?: string;
} {
  if (typeof filters !== "object" || filters === null) {
    return { valid: false, error: "Filters must be an object" };
  }

  const f = filters as Record<string, unknown>;

  if (f.category !== undefined && !isValidString(f.category)) {
    return { valid: false, error: "Category must be a non-empty string" };
  }

  if (f.repeatable !== undefined && typeof f.repeatable !== "boolean") {
    return { valid: false, error: "Repeatable must be a boolean" };
  }

  return { valid: true };
}
