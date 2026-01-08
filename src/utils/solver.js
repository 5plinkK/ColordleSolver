import convert from 'color-convert';
import { getDeltaE00 } from 'delta-e';

/**
 * CIEDE2000 scoring used by Colordle: Score = 100 - DeltaE2000
 * We need to find RGB that minimizes error across 4 guesses.
 */

const BASELINES = [
    { name: 'cyan', rgb: [0, 255, 255] },
    { name: 'magenta', rgb: [255, 0, 255] },
    { name: 'yellow', rgb: [255, 255, 0] },
    { name: 'white', rgb: [255, 255, 255] }
];

function getDeltaE(rgb1, rgb2) {
    const lab1 = convert.rgb.lab(rgb1);
    const lab2 = convert.rgb.lab(rgb2);

    return getDeltaE00(
        { L: lab1[0], A: lab1[1], B: lab1[2] },
        { L: lab2[0], A: lab2[1], B: lab2[2] }
    );
}

/**
 * Numerical solver using Hill Climbing to find RGB from multiple guesses
 * constraints: [{ rgb: [r,g,b], score: number }, ...]
 */
export function solveRGBIncremental(constraints) {
    if (!constraints || constraints.length === 0) return { r: 128, g: 128, b: 128 };

    const targets = constraints.map(c => ({
        rgb: c.rgb,
        targetDE: 100 - (c.score || 0)
    }));

    // Try a few starting points: center of RGB space and the average of inputs
    const startingPoints = [
        [128, 128, 128],
        [64, 64, 64],
        [192, 192, 192]
    ];

    if (constraints.length > 0) {
        const avg = constraints.reduce((acc, c) => [acc[0] + c.rgb[0], acc[1] + c.rgb[1], acc[2] + c.rgb[2]], [0, 0, 0])
            .map(v => v / constraints.length);
        startingPoints.push(avg);
    }

    let overallBestRGB = [128, 128, 128];
    let overallMinError = Infinity;

    for (const startPoint of startingPoints) {
        let bestRGB = [...startPoint];
        let minError = calculateError(bestRGB, targets);

        // Successive refinement: start with large steps, then sub-integer steps for higher precision
        const steps = [64, 32, 16, 8, 4, 2, 1, 0.5, 0.1];

        for (const step of steps) {
            let improved = true;
            while (improved) {
                improved = false;

                // Try 6 directions in RGB space
                const directions = [
                    [step, 0, 0], [-step, 0, 0],
                    [0, step, 0], [0, -step, 0],
                    [0, 0, step], [0, 0, -step]
                ];

                for (const [dr, dg, db] of directions) {
                    const nextRGB = [
                        Math.max(0, Math.min(255, bestRGB[0] + dr)),
                        Math.max(0, Math.min(255, bestRGB[1] + dg)),
                        Math.max(0, Math.min(255, bestRGB[2] + db))
                    ];

                    const error = calculateError(nextRGB, targets);
                    if (error < minError) {
                        minError = error;
                        bestRGB = nextRGB;
                        improved = true;
                    }
                }
            }
        }

        if (minError < overallMinError) {
            overallMinError = minError;
            overallBestRGB = bestRGB;
        }
    }

    return {
        r: Math.round(overallBestRGB[0]),
        g: Math.round(overallBestRGB[1]),
        b: Math.round(overallBestRGB[2])
    };
}

function calculateError(rgb, targets) {
    let totalError = 0;
    for (const target of targets) {
        const calculatedDE = getDeltaE(rgb, target.rgb);
        totalError += Math.pow(calculatedDE - target.targetDE, 2);
    }
    return totalError;
}

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/**
 * Exhaustive search that checks every color in the database against constraints.
 * This is significantly more accurate than numerical hill-climbing for discrete color sets.
 */
export function findBestDatabaseMatches(constraints, colorList, limit = 10) {
    if (!constraints || constraints.length === 0) return [];

    const targets = constraints.map(c => ({
        rgb: c.rgb,
        targetDE: 100 - (c.score || 0)
    }));

    const scored = colorList.map(color => {
        const rgbObj = hexToRgb(color.hex);
        if (!rgbObj) return { color, error: Infinity };

        const rgbArr = [rgbObj.r, rgbObj.g, rgbObj.b];
        let totalError = 0;

        for (const target of targets) {
            const calculatedDE = getDeltaE(rgbArr, target.rgb);
            totalError += Math.pow(calculatedDE - target.targetDE, 2);
        }

        return { color, error: totalError };
    });

    return scored
        .sort((a, b) => a.error - b.error)
        .slice(0, limit)
        .map(item => {
            const rgbObj = hexToRgb(item.color.hex);
            // Calculate a combined confidence score (100 is perfect)
            const avgError = Math.sqrt(item.error / constraints.length);
            const score = Math.max(0, 100 - avgError);

            return {
                ...item.color,
                rgb: rgbObj,
                error: item.error,
                score: score
            };
        });
}
