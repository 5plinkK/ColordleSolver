import { filterColorsByWordleHints } from './wordleSolver.js';

const mockColorList = [
    { name: 'Red', hex: '#FF0000' },
    { name: 'Green', hex: '#00FF00' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Cyan', hex: '#00FFFF' },
    { name: 'Magenta', hex: '#FF00FF' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#000000' }
];

function test() {
    console.log("Running Wordle Solver Tests...");

    // Test 1: Exact match with 'correct'
    const guesses1 = [
        { hex: 'FF0000', feedback: ['correct', 'correct', 'correct', 'correct', 'correct', 'correct'] }
    ];
    const results1 = filterColorsByWordleHints(mockColorList, guesses1);
    console.log("Test 1 (Exact Match):", results1.length === 1 && results1[0].name === 'Red' ? "PASS" : "FAIL", results1);

    // Test 2: 'absent' filter
    const guesses2 = [
        { hex: 'FF0000', feedback: ['absent', 'absent', 'absent', 'absent', 'absent', 'absent'] }
    ];
    const results2 = filterColorsByWordleHints(mockColorList, guesses2);
    // Should NOT include anything with 'F' or '0' at those positions... wait.
    // Actually, if 'F' is marked absent, it means there are NO 'F's in the target.
    // 'Red' is #FF0000. 'Blue' is #0000FF. 'Black' is #000000.
    // Black has no 'F's.
    console.log("Test 2 (Absent Filter):", results2.length === 1 && results2[0].name === 'Black' ? "PASS" : "FAIL", results2);

    // Test 3: 'present' filter
    // Target is Blue #0000FF. Guess is Cyan #00FFFF.
    // Feedback for #00FFFF if target is #0000FF:
    // 0: correct, 0: correct, F: absent (since target has 0), F: absent, F: correct, F: correct
    // Let's try: Guess #00FFFF, 0,0 are correct. F at pos 2 is absent. 
    const guesses3 = [
        { hex: '00FFFF', feedback: ['correct', 'correct', 'absent', 'absent', 'correct', 'correct'] }
    ];
    const results3 = filterColorsByWordleHints(mockColorList, guesses3);
    console.log("Test 3 (Mixed):", results3.length === 1 && results3[0].name === 'Blue' ? "PASS" : "FAIL", results3);
}

test();
