import React, { useState, useEffect, useMemo } from 'react';
import { findBestDatabaseMatches, rgbToHex, hexToRgb } from './utils/solver';
import { filterColorsByWordleHints } from './utils/wordleSolver';
import Papa from 'papaparse';
import { Hash, Copy, Trash2, ChevronRight, Search, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
    const [mode, setMode] = useState('percentage'); // 'percentage' | 'wordle'

    // Multi-Guess State
    const [guesses, setGuesses] = useState([
        { id: 'cyan', name: 'Cyan', hex: '#00FFFF', rgb: [0, 255, 255], score: '', isBaseline: true },
        { id: 'magenta', name: 'Magenta', hex: '#FF00FF', rgb: [255, 0, 255], score: '', isBaseline: true },
        { id: 'yellow', name: 'Yellow', hex: '#FFFF00', rgb: [255, 255, 0], score: '', isBaseline: true },
        { id: 'white', name: 'White', hex: '#FFFFFF', rgb: [255, 255, 255], score: '', isBaseline: true }
    ]);

    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Wordle State
    const [wordleGuess, setWordleGuess] = useState(['', '', '', '', '', '']);
    const [wordleFeedback, setWordleFeedback] = useState(['absent', 'absent', 'absent', 'absent', 'absent', 'absent']);
    const [wordleHistory, setWordleHistory] = useState([]);
    const [filteredColors, setFilteredColors] = useState([]);

    const [colorList, setColorList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        Papa.parse('/colornames.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const formatted = results.data.map((c, i) => ({
                    id: `color-${i}`,
                    name: c.name,
                    hex: c.hex.toUpperCase()
                }));
                setColorList(formatted);
                setFilteredColors(formatted);
                setLoading(false);
            }
        });
    }, []);

    // Color Search Results
    const filteredSearch = useMemo(() => {
        if (!searchQuery) return [];
        return colorList
            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 5);
    }, [searchQuery, colorList]);

    // Calculate result
    useEffect(() => {
        const activeGuesses = guesses.filter(g => g.score !== '');

        if (activeGuesses.length >= 1) {
            try {
                const constraints = activeGuesses.map(g => ({
                    rgb: g.rgb,
                    score: parseFloat(g.score)
                }));

                const candidates = findBestDatabaseMatches(constraints, colorList, 10);

                if (candidates.length > 0) {
                    const best = candidates[0];
                    setResult({ rgb: best.rgb, hex: best.hex, candidates });
                } else {
                    setResult(null);
                }
            } catch (err) {
                console.error("Calculation error:", err);
                setResult(null);
            }
        } else {
            setResult(null);
        }
    }, [guesses, colorList]);

    const handleScoreChange = (id, value) => {
        setGuesses(prev => prev.map(g => g.id === id ? { ...g, score: value } : g));
    };

    const addGuess = (color) => {
        const rgbObj = hexToRgb(color.hex);
        if (!rgbObj) return;

        const newGuess = {
            id: Date.now().toString(),
            name: color.name,
            hex: color.hex,
            rgb: [rgbObj.r, rgbObj.g, rgbObj.b],
            score: '',
            isBaseline: false
        };

        setGuesses(prev => [...prev, newGuess]);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    const removeGuess = (id) => {
        setGuesses(prev => prev.filter(g => g.id !== id));
    };

    const handleWordleInput = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^[0-9A-Fa-f]?$/.test(value)) return;

        const newGuess = [...wordleGuess];
        newGuess[index] = value.toUpperCase();
        setWordleGuess(newGuess);

        if (value && index < 5) {
            const next = document.getElementById(`wordle-input-${index + 1}`);
            if (next) next.focus();
        }
    };

    const cycleFeedback = (index) => {
        const states = ['absent', 'present', 'correct'];
        const currentIdx = states.indexOf(wordleFeedback[index]);
        const nextIdx = (currentIdx + 1) % states.length;
        const newFeedback = [...wordleFeedback];
        newFeedback[index] = states[nextIdx];
        setWordleFeedback(newFeedback);
    };

    const addWordleGuess = () => {
        const hex = wordleGuess.join('');
        if (hex.length !== 6) return;

        const newHistory = [...wordleHistory, { hex, feedback: [...wordleFeedback] }];
        setWordleHistory(newHistory);

        const filtered = filterColorsByWordleHints(colorList, newHistory);
        setFilteredColors(filtered);

        setWordleGuess(['', '', '', '', '', '']);
        setWordleFeedback(['absent', 'absent', 'absent', 'absent', 'absent', 'absent']);
        const firstInput = document.getElementById('wordle-input-0');
        if (firstInput) firstInput.focus();
    };

    const resetSolver = () => {
        setGuesses([
            { id: 'cyan', name: 'Cyan', hex: '#00FFFF', rgb: [0, 255, 255], score: '', isBaseline: true },
            { id: 'magenta', name: 'Magenta', hex: '#FF00FF', rgb: [255, 0, 255], score: '', isBaseline: true },
            { id: 'yellow', name: 'Yellow', hex: '#FFFF00', rgb: [255, 255, 0], score: '', isBaseline: true },
            { id: 'white', name: 'White', hex: '#FFFFFF', rgb: [255, 255, 255], score: '', isBaseline: true }
        ]);
        setWordleGuess(['', '', '', '', '', '']);
        setWordleFeedback(['absent', 'absent', 'absent', 'absent', 'absent', 'absent']);
        setWordleHistory([]);
        setFilteredColors(colorList);
        setResult(null);
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    };

    return (
        <div className="App">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
            >
                <h1>Colordle Solver</h1>

                <div className="tab-group">
                    <button
                        className={`tab-btn ${mode === 'percentage' ? 'active' : ''}`}
                        onClick={() => setMode('percentage')}
                    >
                        Distance Modes
                    </button>
                    <button
                        className={`tab-btn ${mode === 'wordle' ? 'active' : ''}`}
                        onClick={() => setMode('wordle')}
                    >
                        Wordle Mode
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 gap-4">
                        <div className="loading-spinner"></div>
                        <p className="text-slate-400 animate-pulse">Loading color database...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {mode === 'percentage' ? (
                            <motion.div
                                key="percentage"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <p className="subtitle">Enter the distance percentages from your guesses</p>

                                <div className="guesses-list">
                                    {guesses.map((guess) => (
                                        <div key={guess.id} className="guess-card">
                                            <div className="guess-info">
                                                <div className="swatch" style={{ backgroundColor: guess.hex }}></div>
                                                <div className="flex flex-col text-left">
                                                    <span className="font-bold text-sm">{guess.name}</span>
                                                    <span className="text-xs text-slate-500 font-mono">{guess.hex}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    className="guess-score-input"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={guess.score}
                                                    onChange={(e) => handleScoreChange(guess.id, e.target.value)}
                                                />
                                                <span className="text-sky-400 font-bold">%</span>
                                                {!guess.isBaseline && (
                                                    <button className="remove-btn" onClick={() => removeGuess(guess.id)}>
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="add-guess-section">
                                    <div className="search-container">
                                        <div className="flex items-center gap-2 bg-slate-900/50 rounded-xl px-4 border border-white/10">
                                            <Search size={18} className="text-slate-500" />
                                            <input
                                                type="text"
                                                className="bg-transparent border-none focus:ring-0 py-3"
                                                placeholder="Add another guess color..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onFocus={() => setShowSearchResults(true)}
                                            />
                                        </div>

                                        {showSearchResults && filteredSearch.length > 0 && (
                                            <div className="search-results">
                                                {filteredSearch.map(color => (
                                                    <div
                                                        key={color.id}
                                                        className="search-item"
                                                        onClick={() => addGuess(color)}
                                                    >
                                                        <div className="swatch" style={{ backgroundColor: color.hex }}></div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold">{color.name}</span>
                                                            <span className="text-xs text-slate-500 font-mono">{color.hex}</span>
                                                        </div>
                                                        <Plus size={16} className="ml-auto text-sky-400" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {result && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="result-section"
                                        >
                                            <div
                                                className="main-color-display"
                                                style={{ backgroundColor: result.hex }}
                                            ></div>

                                            <div className="flex flex-col gap-4 items-center">
                                                <div className="hex-display flex items-center gap-3">
                                                    <Hash className="text-sky-400" size={32} />
                                                    {result.hex}
                                                    <button
                                                        className={`ml-2 p-2 rounded-full transition-colors ${copySuccess ? 'text-green-400' : 'text-slate-400 hover:text-white'}`}
                                                        onClick={() => copyToClipboard(result.hex)}
                                                    >
                                                        <Copy size={20} />
                                                    </button>
                                                </div>

                                                {result.candidates && (
                                                    <div className="candidates-container">
                                                        <div className="text-slate-500 text-[10px] uppercase tracking-[0.2em] mb-3 font-bold">Top Match Candidates</div>
                                                        <div className="candidates-grid">
                                                            {result.candidates.map((c, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`candidate-card ${i === 0 ? 'primary-match' : ''}`}
                                                                    onClick={() => copyToClipboard(c.hex)}
                                                                >
                                                                    <div className="swatch" style={{ backgroundColor: c.hex }}></div>
                                                                    <div className="flex flex-col text-left">
                                                                        <span className="candidate-name">{c.name}</span>
                                                                        <span className="candidate-hex">{c.hex}</span>
                                                                    </div>
                                                                    <div className="candidate-match">
                                                                        {c.score.toFixed(2)}%
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-3 gap-8 mt-4 text-slate-400">
                                                <div>
                                                    <div className="text-xs uppercase mb-1">Red</div>
                                                    <div className="text-xl font-bold text-white">{result.rgb.r}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs uppercase mb-1">Green</div>
                                                    <div className="text-xl font-bold text-white">{result.rgb.g}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs uppercase mb-1">Blue</div>
                                                    <div className="text-xl font-bold text-white">{result.rgb.b}</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="wordle"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="wordle-container"
                            >
                                <p className="subtitle">Enter your guess and tap boxes to match feedback colors</p>

                                <div className="guess-row">
                                    <div className="hex-input-row">
                                        {wordleGuess.map((char, i) => (
                                            <input
                                                key={i}
                                                id={`wordle-input-${i}`}
                                                className={`char-box ${wordleFeedback[i]}`}
                                                value={char}
                                                onChange={(e) => handleWordleInput(i, e.target.value)}
                                                onClick={() => cycleFeedback(i)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Backspace' && !char && i > 0) {
                                                        const prev = document.getElementById(`wordle-input-${i - 1}`);
                                                        if (prev) prev.focus();
                                                    }
                                                }}
                                                placeholder="?"
                                            />
                                        ))}
                                    </div>
                                    <div className="action-bar">
                                        <button className="btn-icon btn-primary" onClick={addWordleGuess}>
                                            <ChevronRight size={20} /> Add Hint
                                        </button>
                                        <button className="btn-icon" onClick={resetSolver}>
                                            <Trash2 size={20} /> Reset
                                        </button>
                                    </div>
                                </div>

                                {wordleHistory.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-4">Possible Colors ({filteredColors.length})</h3>
                                        <div className="results-list">
                                            {filteredColors.slice(0, 100).map((color, i) => (
                                                <div
                                                    key={i}
                                                    className="color-item"
                                                    onClick={() => copyToClipboard(color.hex)}
                                                >
                                                    <div className="swatch" style={{ backgroundColor: color.hex }}></div>
                                                    <div className="color-info">
                                                        <span className="name">{color.name}</span>
                                                        <span className="hex">{color.hex}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}

                {!result && !loading && (
                    <div className="mt-8 flex justify-center">
                        <button className="btn-icon" onClick={resetSolver}>
                            <Trash2 size={20} /> Reset All
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

export default App;
