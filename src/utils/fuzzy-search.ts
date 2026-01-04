/**
 * Simple fuzzy string matching for spell search.
 * Returns a score from 0-1 indicating match quality.
 */
export function fuzzyMatch(query: string, target: string): number {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  // Exact match
  if (targetLower === queryLower) {
    return 1.0;
  }

  // Starts with query
  if (targetLower.startsWith(queryLower)) {
    return 0.9;
  }

  // Contains query as substring
  if (targetLower.includes(queryLower)) {
    return 0.7;
  }

  // Count matching characters in order
  let matches = 0;
  let queryIndex = 0;

  for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIndex]) {
      matches++;
      queryIndex++;
    }
  }

  // Score based on character matches
  const matchRatio = matches / queryLower.length;

  if (matchRatio >= 0.8) {
    return 0.5; // Fuzzy match
  } else if (matchRatio >= 0.6) {
    return 0.3; // Weak match
  }

  return 0; // No match
}

/**
 * Normalize class name for comparison (case-insensitive, handle variations)
 */
export function normalizeClassName(className: string): string {
  return className.toLowerCase().trim();
}

/**
 * Normalize spell school for comparison
 */
export function normalizeSchool(school: string): string {
  return school.toLowerCase().trim();
}
