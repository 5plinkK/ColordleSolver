/**
 * Filters the color list based on Wordle-style feedback
 * 
 * @param {Array} colorList - List of colors { name: string, hex: string }
 * @param {Array} guesses - Array of { hint: string, feedback: string[] }
 *                          hint: e.g. "123456"
 *                          feedback: e.g. ["correct", "present", "absent", "absent", "absent", "absent"]
 * @returns {Array} - Filtered color list
 */
export function filterColorsByWordleHints(colorList, guesses) {
    if (!guesses || guesses.length === 0) return colorList;

    return colorList.filter(color => {
        const hex = color.hex.startsWith('#') ? color.hex.slice(1).toUpperCase() : color.hex.toUpperCase();

        // Ensure it's a valid 6-char hex
        if (hex.length !== 6) return false;

        return guesses.every(guess => {
            const guessHex = guess.hex.toUpperCase();
            const feedback = guess.feedback; // Array of 6 states

            // 1. Check 'correct' (Green) first
            for (let i = 0; i < 6; i++) {
                if (feedback[i] === 'correct') {
                    if (hex[i] !== guessHex[i]) return false;
                }
            }

            // 2. Count characters for 'present' logic (like Wordle)
            // We need to handle duplicate characters correctly.
            const remainingTarget = [];
            const remainingGuess = [];

            for (let i = 0; i < 6; i++) {
                if (feedback[i] !== 'correct') {
                    remainingTarget.push(hex[i]);
                    remainingGuess.push({ char: guessHex[i], type: feedback[i] });
                }
            }

            // For each 'present' guess, it must exist in the remaining target
            const targetCharCounts = {};
            remainingTarget.forEach(c => targetCharCounts[c] = (targetCharCounts[c] || 0) + 1);

            // Check present characters
            for (let i = 0; i < remainingGuess.length; i++) {
                const g = remainingGuess[i];
                if (g.type === 'present') {
                    if (!targetCharCounts[g.char] || targetCharCounts[g.char] <= 0) {
                        return false; // Not found or already used
                    }
                    targetCharCounts[g.char]--;
                }
            }

            // Check absent characters
            // Note: If a character is marked 'absent', it means there are no MORE instances 
            // of that character in the target than were already accounted for by 'correct' and 'present'.
            for (let i = 0; i < remainingGuess.length; i++) {
                const g = remainingGuess[i];
                if (g.type === 'absent') {
                    if (targetCharCounts[g.char] && targetCharCounts[g.char] > 0) {
                        return false; // Still exists in target but shouldn't
                    }
                }
            }

            return true;
        });
    });
}
