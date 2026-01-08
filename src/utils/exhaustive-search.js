import convert from 'color-convert';
import * as deltaE from 'delta-e';
import fs from 'fs';
import Papa from 'papaparse';

const { getDeltaE00 } = deltaE.default || deltaE;

function getDeltaE(rgb1, rgb2) {
    const lab1 = convert.rgb.lab(rgb1);
    const lab2 = convert.rgb.lab(rgb2);

    return getDeltaE00(
        { L: lab1[0], A: lab1[1], B: lab1[2] },
        { L: lab2[0], A: lab2[1], B: lab2[2] }
    );
}

const getDeltaE76 = (rgb1, rgb2) => {
    const lab1 = convert.rgb.lab(rgb1);
    const lab2 = convert.rgb.lab(rgb2);
    return Math.sqrt(
        Math.pow(lab1[0] - lab2[0], 2) +
        Math.pow(lab1[1] - lab2[1], 2) +
        Math.pow(lab1[2] - lab2[2], 2)
    );
};

const constraints = [
    { name: 'Cyan', rgb: [0, 255, 255], score: 47.69 },
    { name: 'Magenta', rgb: [255, 0, 255], score: 58.84 },
    { name: 'Yellow', rgb: [255, 255, 0], score: 26.16 },
    { name: 'White', rgb: [255, 255, 255], score: 44.13 },
    { name: "America's Cup", rgb: [52, 84, 109], score: 96.35 },    // #34546D
    { name: 'Deep Ocean', rgb: [42, 75, 95], score: 94.15 },       // #2A4B5F
    { name: 'Arapawa', rgb: [39, 74, 93], score: 93.21 },          // #274A5D
    { name: 'Regatta Bay', rgb: [45, 83, 103], score: 93.20 },     // #2D5367
    { name: 'Shadow of Night', rgb: [42, 79, 97], score: 92.60 },   // #2A4F61
    { name: 'Deep Sea Blue', rgb: [42, 75, 90], score: 91.78 }     // #2A4B5A (fixed from csv)
];

const csvData = fs.readFileSync('public/colornames.csv', 'utf8');
const results = Papa.parse(csvData, { header: true }).data;

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
};

const scoredColors = results.map(color => {
    if (!color.hex) return null;
    const rgb = hexToRgb(color.hex);
    if (!rgb) return null;

    let totalError00 = 0;
    let totalError76 = 0;
    for (const c of constraints) {
        const de00 = getDeltaE(rgb, c.rgb);
        const de76 = getDeltaE76(rgb, c.rgb);

        totalError00 += Math.pow((100 - de00) - c.score, 2);
        totalError76 += Math.pow((100 - de76) - c.score, 2);
    }

    return {
        ...color,
        error00: totalError00,
        error76: totalError76,
        avgError00: Math.sqrt(totalError00 / constraints.length),
        avgError76: Math.sqrt(totalError76 / constraints.length)
    };
}).filter(c => c !== null);

console.log('--- Top Candidates (DE2000) ---');
scoredColors.sort((a, b) => a.error00 - b.error00).slice(0, 15).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.hex}) - Avg Score Diff: ${c.avgError00.toFixed(4)}`);
});

console.log('\n--- Top Candidates (CIE76) ---');
scoredColors.sort((a, b) => a.error76 - b.error76).slice(0, 15).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.hex}) - Avg Score Diff: ${c.avgError76.toFixed(4)}`);
});
