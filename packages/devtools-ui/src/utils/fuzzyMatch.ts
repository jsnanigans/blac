/**
 * Fuzzy match scoring algorithm
 * Returns a score based on how well the query matches the text
 * Higher score = better match
 */
export function fuzzyMatch(query: string, text: string): number {
  let score = 0;
  let queryIndex = 0;
  let textIndex = 0;
  let consecutiveMatches = 0;

  while (queryIndex < query.length && textIndex < text.length) {
    if (query[queryIndex] === text[textIndex]) {
      // Exact match
      queryIndex++;
      consecutiveMatches++;

      // Bonus for consecutive matches
      score += 1 + consecutiveMatches * 0.5;

      // Bonus for match at start
      if (textIndex === 0) score += 10;
    } else {
      consecutiveMatches = 0;
    }
    textIndex++;
  }

  // Return 0 if not all characters in query were found
  if (queryIndex < query.length) return 0;

  // Normalize score by text length (shorter matches rank higher)
  return score / text.length;
}
