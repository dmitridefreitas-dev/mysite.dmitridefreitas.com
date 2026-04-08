import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import GridBackground from '@/components/GridBackground.jsx';

const coursework = [
  {
    institution: 'Washington University in St. Louis',
    degree: 'BS Data Science & Financial Engineering',
    courses: [
      { code: 'ACCT 2610',  title: 'Principles of Financial Accounting' },
      { code: 'CSE 217A',   title: 'Introduction to Data Science' },
      { code: 'CSE 247',    title: 'Data Structures and Algorithms' },
      { code: 'CSE 3104',   title: 'Data Manipulation and Management' },
      { code: 'CSE 4102',   title: 'Introduction to Artificial Intelligence', status: 'IN PROGRESS' },
      { code: 'CSE 4107',   title: 'Introduction to Machine Learning' },
      { code: 'ECON 4011',  title: 'Intermediate Microeconomic Theory' },
      { code: 'ENGR 310',   title: 'Technical Writing' },
      { code: 'ENGR 4503',  title: 'Conflict Management and Negotiation' },
      { code: 'ESE 4150',   title: 'Optimization', status: 'IN PROGRESS' },
      { code: 'ESE 4261',   title: 'Statistical Methods for Data Analysis with Applications to Financial Engineering', status: 'IN PROGRESS' },
      { code: 'ESE 4270',   title: 'Financial Mathematics' },
      { code: 'FIN 340',    title: 'Capital Markets & Financial Management' },
      { code: 'FIN 4410',   title: 'Investments' },
      { code: 'FIN 4506',   title: 'Financial Technology: Methods and Practice', status: 'IN PROGRESS' },
      { code: 'FIN 4510',   title: 'Options, Futures and Derivative Securities', status: 'IN PROGRESS' },
      { code: 'MSB 5560',   title: 'Ethics in Biostatistics and Data Science', status: 'IN PROGRESS' },
      { code: 'SDS 3211',   title: 'Statistics for Data Science I' },
      { code: 'SDS 439',    title: 'Linear Statistical Models' },
      { code: 'SDS 4030',   title: 'Statistics for Data Science II' },
      { code: 'SDS 4135',   title: 'Applied Statistics Practicum' },
      { code: 'SDS 4140',   title: 'Advanced Linear Statistical Models', status: 'IN PROGRESS' },
    ],
  },
  {
    institution: 'Drew University',
    degree: 'BA Mathematics',
    courses: [
      { code: 'ART 150',    title: 'Digital Imaging' },
      { code: 'CSCI 150',   title: 'Introduction to Computer Science in Python' },
      { code: 'CSCI 151',   title: 'Object-Oriented Programming in Java' },
      { code: 'CSCI 235',   title: 'Quantum Computing' },
      { code: 'CSCI 270',   title: 'Cybersecurity: Philosophy & Ethics' },
      { code: 'ECON 101',   title: 'Principles of Microeconomics' },
      { code: 'ECON 102',   title: 'Principles of Macroeconomics' },
      { code: 'FIN 683',    title: 'Special Topics in Finance' },
      { code: 'MATH 250',   title: 'Calculus & Analytical Geometry III' },
      { code: 'MATH 303',   title: 'Linear Algebra' },
      { code: 'MATH 310',   title: 'Foundations of Higher Mathematics' },
      { code: 'MATH 315',   title: 'Differential Equations' },
      { code: 'MATH 320',   title: 'Probability' },
      { code: 'MATH 330',   title: 'Real and Complex Analysis I' },
      { code: 'PHIL 214',   title: 'Business Ethics' },
      { code: 'STAT 207',   title: 'Introduction to Statistics' },
      { code: 'WRTG 120',   title: 'Academic Writing' },
    ],
  },
  {
    institution: 'Caribbean Examinations Council',
    degree: 'CAPE — Transfer Credits',
    courses: [
      { code: 'CHEM 150',   title: 'Principles of Chemistry I' },
      { code: 'CHEM 160',   title: 'Principles of Chemistry II' },
      { code: 'LAST 101',   title: 'Societies of Latin America' },
      { code: 'MATH 150',   title: 'Calculus & Analytical Geometry I' },
      { code: 'MATH 151',   title: 'Calculus & Analytical Geometry II' },
      { code: 'PHYS 150',   title: 'University Physics I' },
      { code: 'PHYS 160',   title: 'University Physics II' },
    ],
  },
];

const isInputActive = () => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
};

export default function CourseworkPage() {
  const navigate  = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handler = (e) => {
      if (isInputActive()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') navigate('/about');
      if (e.key === 'd') toggleTheme();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, toggleTheme]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Coursework — Dmitri De Freitas</title>
      </Helmet>
      <GridBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-12 px-3 gap-3">
          <Link
            to="/about"
            className="flex items-center gap-1.5 px-3 h-8 font-mono text-[11px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
            title="Back to profile (Escape)"
          >
            <ArrowLeft className="h-3 w-3" />
            ESC
          </Link>

          <span className="text-border hidden sm:inline mx-1">|</span>

          <span className="font-mono text-[10px] tracking-widest text-muted-foreground hidden sm:inline">
            ACADEMIC RECORD — COURSEWORK
          </span>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 h-6 transition-colors tracking-wider"
              title="Toggle theme (D)"
            >
              [{theme === 'light' ? 'D' : 'L'}]
            </button>
            <span className="font-mono text-[10px] text-muted-foreground tracking-widest hidden sm:inline">
              DDF<span className="text-primary">·</span>COURSEWORK
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow pt-16 pb-16 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Page title */}
          <div className="mb-8 border-b border-border pb-5">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">ACADEMIC RECORD</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">Coursework</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Washington University in St. Louis · Drew University · Caribbean Examinations Council
            </p>
          </div>

          {/* Schools */}
          <div className="space-y-10">
            {coursework.map((school) => (
              <section key={school.institution}>

                {/* School header */}
                <div className="mb-3">
                  <h2 className="font-mono text-xs font-bold text-foreground tracking-wider uppercase">
                    {school.institution}
                  </h2>
                  <p className="font-mono text-[10px] text-muted-foreground">{school.degree}</p>
                </div>

                {/* Course list */}
                <div className="border border-border divide-y divide-border/50">
                  {school.courses.map((course) => (
                    <div
                      key={course.code}
                      className="flex items-baseline gap-4 px-4 py-2.5 hover:bg-muted/10 transition-colors"
                    >
                      <span className="font-mono text-[10px] text-primary/80 shrink-0 tabular-nums w-20">
                        {course.code}
                      </span>
                      <span className="font-mono text-[11px] text-foreground/80 flex-1">
                        {course.title}
                      </span>
                      {course.status && (
                        <span className="font-mono text-[8px] border border-terminal-green/50 text-terminal-green px-1.5 py-0.5 shrink-0">
                          {course.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <p className="font-mono text-[9px] text-muted-foreground/40 mt-1.5 pl-1">
                  {school.courses.length} courses
                </p>

              </section>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-10 pt-4 border-t border-border">
            <p className="font-mono text-[8px] text-muted-foreground tracking-wider">
              · TRANSFER CREDITS SHOWN UNDER ORIGINATING INSTITUTION ·
              <Link to="/about" className="text-primary hover:text-primary/80 ml-2">← BACK TO PROFILE</Link>
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
