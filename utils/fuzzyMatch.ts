// Calculate Levenshtein distance between two strings
export const levenshteinDistance = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    const matrix: number[][] = [];

    for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[s2.length][s1.length];
};

// Find similar items in list
export const findSimilarItems = <T extends { id: number; name: string; quantity: number }>(
    itemName: string,
    existingItems: T[]
): { item: T; distance: number }[] => {
    if (itemName.trim().length < 3) {
        return []; // Skip fuzzy matching for very short names
    }

    return existingItems
        .map(item => ({
            item,
            distance: levenshteinDistance(itemName, item.name)
        }))
        .filter(({ distance }) => distance <= 4) // Only show if reasonably similar
        .sort((a, b) => a.distance - b.distance);
};
