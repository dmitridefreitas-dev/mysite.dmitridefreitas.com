import React, { useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RotateCcw, ChevronRight, ArrowLeft } from 'lucide-react';
import { questions, CATEGORIES, DIFFICULTIES } from '@/data/quizData.js';
import SectionHeader from '@/components/SectionHeader.jsx';
import TerminalBadge from '@/components/TerminalBadge.jsx';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const difficultyVariant = {
  JUNIOR: 'date',
  SENIOR: 'active',
  QUANT:  'error',
};

const difficultyColor = {
  JUNIOR: 'text-muted-foreground border-border',
  SENIOR: 'text-terminal-amber border-terminal-amber/60',
  QUANT:  'text-destructive border-destructive/60',
};

// ─── Shuffle helper ────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── QuizPage ──────────────────────────────────────────────────────────────────
const QuizPage = () => {
  const [category,   setCategory]   = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [started,    setStarted]    = useState(false);
  const [deck,       setDeck]       = useState([]);
  const [current,    setCurrent]    = useState(0);
  const [selected,   setSelected]   = useState(null);   // index of chosen option
  const [revealed,   setRevealed]   = useState(false);
  const [score,      setScore]      = useState(0);
  const [finished,   setFinished]   = useState(false);
  const [history,    setHistory]    = useState([]);     // {question, chosen, correct}

  // Filtered count for the lobby
  const filteredCount = useMemo(() => {
    return questions.filter(q =>
      (category   === 'All' || q.category   === category)   &&
      (difficulty === 'All' || q.difficulty === difficulty)
    ).length;
  }, [category, difficulty]);

  const startQuiz = useCallback(() => {
    const pool = questions.filter(q =>
      (category   === 'All' || q.category   === category)   &&
      (difficulty === 'All' || q.difficulty === difficulty)
    );
    setDeck(shuffle(pool));
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setFinished(false);
    setHistory([]);
    setStarted(true);
  }, [category, difficulty]);

  const handleSelect = (idx) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    const isCorrect = idx === deck[current].answer;
    if (isCorrect) setScore(s => s + 1);
    setHistory(h => [...h, {
      question: deck[current].question,
      chosen:   idx,
      correct:  deck[current].answer,
      isCorrect,
    }]);
  };

  const handleNext = () => {
    if (current + 1 >= deck.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const q = deck[current];
  const pct = deck.length > 0 ? Math.round((score / deck.length) * 100) : 0;

  // ── RESULTS SCREEN ──
  if (finished) {
    const grade =
      pct >= 90 ? { label: 'ALPHA ACHIEVED', variant: 'complete' } :
      pct >= 70 ? { label: 'ABOVE THRESHOLD', variant: 'active'   } :
                  { label: 'BELOW THRESHOLD', variant: 'error'     };

    return (
      <>
        <Helmet><title>Quiz Results — Dmitri De Freitas</title></Helmet>
        <div className="min-h-screen pt-12 md:pt-14 pb-16">
          <section className="py-10 border-b border-border">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader number="06" title="QUIZ RESULTS" />
            </div>
          </section>

          <section className="py-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border p-6 space-y-6"
              >
                {/* Score */}
                <div className="text-center space-y-3">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">FINAL SCORE</p>
                  <p className="font-mono text-5xl font-bold text-primary">{score}<span className="text-muted-foreground text-2xl">/{deck.length}</span></p>
                  <p className="font-mono text-lg text-foreground">{pct}%</p>
                  <TerminalBadge variant={grade.variant}>{grade.label}</TerminalBadge>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 divide-x divide-border border border-border">
                  {[
                    { label: 'CORRECT',   value: score                },
                    { label: 'INCORRECT', value: deck.length - score  },
                    { label: 'ACCURACY',  value: `${pct}%`            },
                  ].map(s => (
                    <div key={s.label} className="p-3 text-center">
                      <p className="font-mono text-lg font-bold text-foreground">{s.value}</p>
                      <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Question review */}
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">REVIEW</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {history.map((h, i) => (
                      <div key={i} className={`flex items-start gap-3 px-3 py-2 border ${h.isCorrect ? 'border-terminal-green/30 bg-terminal-green/5' : 'border-destructive/30 bg-destructive/5'}`}>
                        {h.isCorrect
                          ? <CheckCircle className="w-3.5 h-3.5 text-terminal-green shrink-0 mt-0.5" />
                          : <XCircle    className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5"    />}
                        <p className="font-mono text-[10px] text-muted-foreground leading-snug line-clamp-2">{h.question}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={startQuiz}
                    className="font-mono text-[11px] tracking-widest bg-primary text-primary-foreground px-5 py-2.5 hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-3 h-3" /> RETRY
                  </button>
                  <button
                    onClick={() => { setStarted(false); setFinished(false); }}
                    className="font-mono text-[11px] tracking-widest border border-border px-5 py-2.5 text-foreground hover:bg-muted transition-colors"
                  >
                    CHANGE FILTERS
                  </button>
                </div>
              </motion.div>
            </div>
          </section>
        </div>
      </>
    );
  }

  // ── ACTIVE QUIZ ──
  if (started && q) {
    const progress = ((current) / deck.length) * 100;

    return (
      <>
        <Helmet><title>Quiz — Dmitri De Freitas</title></Helmet>
        <div className="min-h-screen pt-12 md:pt-14 pb-16">
          {/* Progress bar */}
          <div className="fixed top-12 md:top-14 left-0 right-0 h-0.5 bg-border z-40">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <section className="py-10 border-b border-border">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => { setStarted(false); setFinished(false); }}
                    className="font-mono text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-1 flex items-center gap-1.5 transition-colors tracking-widest"
                  >
                    <ArrowLeft className="w-3 h-3" /> EXIT
                  </button>
                  <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    QUESTION {current + 1} / {deck.length}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`font-mono text-[10px] border px-2 py-0.5 ${difficultyColor[q.difficulty]}`}>
                      {q.difficulty}
                    </span>
                    <span className="font-mono text-[10px] border border-border text-muted-foreground px-2 py-0.5">
                      {q.category}
                    </span>
                    <span className="font-mono text-[10px] text-primary">{q.id}</span>
                  </div>
                  </div>
                </div>
                <div className="font-mono text-sm text-muted-foreground">
                  SCORE: <span className="text-primary font-bold">{score}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="py-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Question */}
                  <p className="font-mono text-sm md:text-base font-semibold text-foreground leading-relaxed">
                    {q.question}
                  </p>

                  {/* Options */}
                  <div className="space-y-2">
                    {q.options.map((opt, i) => {
                      const isSelected = selected === i;
                      const isCorrect  = i === q.answer;
                      let cls = 'border border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer';
                      if (revealed) {
                        if (isCorrect)              cls = 'border border-terminal-green bg-terminal-green/10 cursor-default';
                        else if (isSelected)        cls = 'border border-destructive bg-destructive/10 cursor-default';
                        else                        cls = 'border border-border opacity-40 cursor-default';
                      }
                      return (
                        <button
                          key={i}
                          onClick={() => handleSelect(i)}
                          disabled={revealed}
                          className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${cls}`}
                        >
                          <span className={`font-mono text-[11px] shrink-0 mt-0.5 font-bold ${
                            revealed && isCorrect  ? 'text-terminal-green' :
                            revealed && isSelected ? 'text-destructive'    : 'text-primary'
                          }`}>
                            [{OPTION_LABELS[i]}]
                          </span>
                          <span className="font-mono text-xs text-foreground leading-relaxed">{opt}</span>
                          {revealed && isCorrect  && <CheckCircle className="w-4 h-4 text-terminal-green ml-auto shrink-0 mt-0.5" />}
                          {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-destructive ml-auto shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <AnimatePresence>
                    {revealed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border border-border bg-muted/20 px-4 py-3">
                          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">EXPLANATION</p>
                          <p className="font-mono text-xs text-foreground/80 leading-relaxed">{q.explanation}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Next button */}
                  {revealed && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={handleNext}
                      className="font-mono text-[11px] tracking-widest bg-primary text-primary-foreground px-5 py-2.5 hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      {current + 1 >= deck.length ? 'VIEW RESULTS' : 'NEXT QUESTION'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </>
    );
  }

  // ── LOBBY ──
  return (
    <>
      <Helmet>
        <title>Quiz — Dmitri De Freitas</title>
        <meta name="description" content="Test your knowledge in quantitative finance, probability, options pricing, fixed income, and IB." />
      </Helmet>
      <div className="min-h-screen pt-12 md:pt-14 pb-16">

        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="06" title="QUANT QUIZ" />
            <p className="font-mono text-xs text-muted-foreground max-w-xl">
              150 questions across Probability, Options & Derivatives, Statistics, Fixed Income, and IB/Accounting.
              Filter by category and difficulty, then start.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl space-y-8">

            {/* Category filter */}
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">CATEGORY</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`font-mono text-[11px] tracking-widest px-3 py-1.5 border transition-colors ${
                      category === c
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty filter */}
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">DIFFICULTY</p>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`font-mono text-[11px] tracking-widest px-3 py-1.5 border transition-colors ${
                      difficulty === d
                        ? 'bg-primary text-primary-foreground border-primary'
                        : d === 'JUNIOR' ? 'border-border text-muted-foreground hover:text-foreground'
                        : d === 'SENIOR' ? 'border-terminal-amber/40 text-terminal-amber/70 hover:border-terminal-amber hover:text-terminal-amber'
                        : d === 'QUANT'  ? 'border-destructive/40 text-destructive/70 hover:border-destructive hover:text-destructive'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-4 font-mono text-[10px] text-muted-foreground/60">
                <span>JUNIOR = undergraduate level</span>
                <span>SENIOR = graduate / CFA level</span>
                <span>QUANT = PhD / desk quant</span>
              </div>
            </div>

            {/* Info + start */}
            <div className="border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">SELECTED POOL</p>
                <span className="font-mono text-2xl font-bold text-primary">{filteredCount}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] text-muted-foreground">
                <span>· Questions shuffled randomly</span>
                <span>· Explanation shown after each answer</span>
                <span>· Score tracked throughout</span>
              </div>
              <button
                onClick={startQuiz}
                disabled={filteredCount === 0}
                className="font-mono text-[11px] tracking-widest bg-primary text-primary-foreground px-6 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                START QUIZ → ({filteredCount} QUESTIONS)
              </button>
            </div>

          </div>
        </section>
      </div>
    </>
  );
};

export default QuizPage;
