import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, TrendingUp, Database } from 'lucide-react';
import FinanceTicker from '@/components/FinanceTicker.jsx';
import MarketDataPanel from '@/components/MarketDataPanel.jsx';
import ProjectCard from '@/components/ProjectCard.jsx';
import SectionHeader from '@/components/SectionHeader.jsx';
import TerminalBadge from '@/components/TerminalBadge.jsx';
import BlinkingCursor from '@/components/BlinkingCursor.jsx';
import OptionsChain from '@/components/OptionsChain.jsx';
import SkillDetailModal from '@/components/SkillDetailModal.jsx';
import { useReadingMode } from '@/contexts/ReadingModeContext.jsx';

const HEADSHOT = 'https://horizons-cdn.hostinger.com/21974f96-abad-40ec-bff7-0adadb1dfab0/f4feb6c64fe322280c7ed8d4608b1f8a.png';

const recentResearch = [
  { id: 'PEAD-001', title: 'Statistical Analysis of Short-Term Market Efficiency' },
  { id: 'ETL-002',  title: 'Institutional Data Integration Engine (Amphora)' },
  { id: 'TRAD-003', title: 'Quantitative Trading Deck' },
];

const featuredProjects = [
  {
    id: 1, reportId: 'ETL-002',
    title: 'Institutional Data Integration',
    shortDescription: 'Automated pipelines at Amphora Investment Management.',
    technicalShortDescription: 'Python/Pandas ETL pipeline for institutional data integration.',
    techStack: ['Python', 'Pandas', 'REST API'],
    category: 'Data Engineering',
    metrics: ['80% reduction in manual processing time', 'Real-time data validation'],
    dataSources: ['IBKR API', 'Harmony', 'Bloomberg Data License'],
    reportLink: 'https://drive.google.com/drive/folders/1UOnr5dxz01tNMoN0dowL7zSadmxg76WL',
    codeLink: '#',
  },
  {
    id: 2, reportId: 'TRAD-003',
    title: 'Quantitative Trading Deck',
    shortDescription: 'Real-time cryptocurrency trading system.',
    technicalShortDescription: 'Asyncio WebSocket client with automated execution logic.',
    techStack: ['Python', 'Asyncio', 'WebSockets'],
    category: 'Quantitative',
    metrics: ['Sub-second trade execution latency', 'Multi-exchange connectivity'],
    dataSources: ['Binance WebSocket API', 'Coinbase Pro API', 'Kraken REST API'],
    reportLink: 'https://drive.google.com/file/d/1y8MlzRKhUrgumKxb7Jw680nIQHm-M0kW/view',
    codeLink: 'https://drive.google.com/drive/folders/1ZUcBXwVD-fR5Z8g5lat5UFhQUsrMP2I6?usp=drive_link',
  },
  {
    id: 4, reportId: 'ML-005',
    title: 'Predictive Housing Model',
    shortDescription: 'AI model for predicting house prices.',
    technicalShortDescription: 'Random Forest regressor achieving R² 0.816 on housing dataset.',
    techStack: ['Random Forest', 'Scikit-learn', 'Pandas'],
    category: 'Statistical Modeling',
    metrics: ['R² score: 0.816', 'RMSE: $270,534 AUD', '10,000+ property records'],
    dataSources: ['Kaggle Melbourne Housing Dataset', 'ABS', 'Domain Group'],
    reportLink: 'https://drive.google.com/file/d/1zcGUEaRWoGIFPrVUi1k3UDg7PU2peKfR/view',
    codeLink: '#',
  },
  {
    id: 10, reportId: 'PEAD-001',
    title: 'PEAD Market Efficiency Analysis',
    shortDescription: 'Testing the Post-Earnings Announcement Drift hypothesis.',
    technicalShortDescription: 'Statistical arbitrage analysis yielding 10.9% significant Alpha.',
    techStack: ['Python', 'WebSockets', 'Asyncio', 'Quantitative Models'],
    category: 'Quantitative',
    metrics: ['Only 10.9% of stocks showed significant Alpha', 'Evaluated short-term market efficiency'],
    dataSources: ['Compustat', 'CRSP', 'I/B/E/S'],
    reportLink: 'https://drive.google.com/file/d/1KMCov59hzqVeszJgeXmMe1eGDp_Ckqde/view',
    codeLink: '#',
  },
];

const skillsData = [
  { name: 'Python', category: 'LANGUAGES', typeCode: 'PY', proficiency: 90, yearsExp: 3.5, delta: 0.95, iv: 0.94, context: 'PROD USE', itm: true, description: 'General-purpose programming language', technicalDescription: 'High-level, interpreted language with dynamic semantics and robust standard library.', usedFor: ['data analysis', 'machine learning', 'automation'], technicalUsedFor: ['ETL pipelines', 'algorithmic trading', 'statistical modeling'], keyFeatures: ['Pandas', 'NumPy', 'Scikit-learn'], technicalKeyFeatures: ['asyncio', 'multiprocessing', 'memory management'] },
  { name: 'SQL', category: 'LANGUAGES', typeCode: 'SQL', proficiency: 80, yearsExp: 3.0, delta: 0.88, iv: 0.91, context: 'PROD USE', itm: true, description: 'Language for managing databases', technicalDescription: 'Domain-specific language for managing data in a RDBMS.', usedFor: ['query', 'update', 'analyze structured data'], technicalUsedFor: ['complex joins', 'window functions', 'query optimization'], keyFeatures: ['data extraction'], technicalKeyFeatures: ['PostgreSQL', 'MySQL', 'indexing strategies'] },
  { name: 'R Studio', category: 'LANGUAGES', typeCode: 'R', proficiency: 75, yearsExp: 2.5, delta: 0.72, iv: 0.78, context: 'RESEARCH', itm: true, description: 'Environment for R programming', technicalDescription: 'IDE for R, a language for statistical computing and graphics.', usedFor: ['statistical analysis', 'visualization'], technicalUsedFor: ['linear mixed-effects modeling', 'spatial statistics', 'time series analysis'], keyFeatures: ['academic and research settings'], technicalKeyFeatures: ['ggplot2', 'dplyr', 'lme4'] },
  { name: 'MATLAB', category: 'LANGUAGES', typeCode: 'MAT', proficiency: 65, yearsExp: 2.0, delta: 0.65, iv: 0.70, context: 'ACADEMIC', itm: false, description: 'Programming platform for engineers', technicalDescription: 'Proprietary multi-paradigm programming language and numeric computing environment.', usedFor: ['matrix operations', 'algorithms'], technicalUsedFor: ['signal processing', 'financial toolbox applications', 'econometrics'], keyFeatures: ['academic research'], technicalKeyFeatures: ['Simulink', 'vectorized operations', 'toolboxes'] },
  { name: 'VSCode', category: 'LANGUAGES', typeCode: 'VS', proficiency: 85, yearsExp: 3.5, delta: 0.55, iv: 0.62, context: 'PROD USE', itm: false, description: 'Code editor with powerful extensions', technicalDescription: 'Source-code editor by Microsoft with debugging, syntax highlighting, and version control.', usedFor: ['writing', 'debugging code'], technicalUsedFor: ['remote development', 'containerized environments', 'integrated terminal workflows'], keyFeatures: ['Python', 'R', 'SQL'], technicalKeyFeatures: ['Jupyter integration', 'GitLens', 'Copilot'] },
  { name: 'Git', category: 'LANGUAGES', typeCode: 'GIT', proficiency: 78, yearsExp: 3.5, delta: 0.68, iv: 0.71, context: 'PROD USE', itm: false, description: 'Version control system', technicalDescription: 'Distributed version control system tracking changes in any set of computer files.', usedFor: ['tracks code changes', 'collaboration'], technicalUsedFor: ['branching strategies', 'merge conflict resolution', 'CI/CD pipelines'], keyFeatures: ['collaboration'], technicalKeyFeatures: ['GitHub Actions', 'rebase', 'submodules'] },
  { name: 'Bloomberg', category: 'QUANT', typeCode: 'BBG', proficiency: 75, yearsExp: 1.5, delta: 0.90, iv: 0.85, context: 'PROD USE', itm: true, description: 'Financial data terminal', technicalDescription: 'Computer software providing real-time financial market data, news, and analytics.', usedFor: ['real-time market data', 'analytics'], technicalUsedFor: ['BQL queries', 'API data extraction', 'portfolio analytics'], keyFeatures: ['Industry standard in finance'], technicalKeyFeatures: ['Bloomberg API (B-PIPE)', 'Excel Add-in', 'Launchpad'] },
  { name: 'Quantlib', category: 'QUANT', typeCode: 'QL', proficiency: 70, yearsExp: 1.5, delta: 0.88, iv: 0.88, context: 'RESEARCH', itm: true, description: 'Library for quantitative finance', technicalDescription: 'Free/open-source library for derivative pricing and risk management.', usedFor: ['pricing derivatives', 'risk analysis'], technicalUsedFor: ['yield curve bootstrapping', 'Monte Carlo simulations', 'option pricing models'], keyFeatures: ['Industry standard in finance'], technicalKeyFeatures: ['C++ core', 'Python SWIG wrappers', 'stochastic processes'] },
  { name: 'Excel/VBA', category: 'QUANT', typeCode: 'XL', proficiency: 78, yearsExp: 4.0, delta: 0.80, iv: 0.72, context: 'PROD USE', itm: true, description: 'Spreadsheet software with programming', technicalDescription: 'Spreadsheet application augmented with Visual Basic for Applications.', usedFor: ['data analysis', 'modeling', 'automation'], technicalUsedFor: ['financial modeling', 'legacy system integration', 'automated reporting'], keyFeatures: ['automates repetitive tasks'], technicalKeyFeatures: ['PivotTables', 'Power Query', 'COM add-ins'] },
  { name: 'FRED', category: 'QUANT', typeCode: 'FRD', proficiency: 70, yearsExp: 2.0, delta: 0.72, iv: 0.75, context: 'RESEARCH', itm: false, description: 'Federal Reserve Economic Data', technicalDescription: 'Database maintained by the Federal Reserve Bank of St. Louis.', usedFor: ['free economic data', 'macroeconomic research'], technicalUsedFor: ['macroeconomic modeling', 'time series forecasting', 'API integration'], keyFeatures: ['Thousands of US and international datasets'], technicalKeyFeatures: ['FRED API', 'vintage data (ALFRED)', 'data transformations'] },
  { name: 'Matplotlib', category: 'VIZ', typeCode: 'MPL', proficiency: 80, yearsExp: 3.0, delta: 0.70, iv: 0.74, context: 'RESEARCH', itm: false, description: 'Python library for creating charts', technicalDescription: 'Comprehensive library for static, animated, and interactive visualizations.', usedFor: ['data visualization', 'charting'], technicalUsedFor: ['publication-quality figures', 'custom plot architectures', 'financial charting'], keyFeatures: ['line plots', 'scatter plots', 'histograms'], technicalKeyFeatures: ['object-oriented API', 'pyplot interface', 'custom color maps'] },
  { name: 'Seaborn', category: 'VIZ', typeCode: 'SBN', proficiency: 72, yearsExp: 2.5, delta: 0.60, iv: 0.68, context: 'RESEARCH', itm: false, description: 'Python library built on Matplotlib', technicalDescription: 'High-level interface for drawing attractive statistical graphics.', usedFor: ['statistical visualizations'], technicalUsedFor: ['correlation matrices', 'regression fits', 'multi-plot grids'], keyFeatures: ['heatmaps', 'pair plots', 'distribution plots'], technicalKeyFeatures: ['FacetGrid', 'categorical estimation', 'theme management'] },
  { name: 'PowerBI', category: 'VIZ', typeCode: 'PBI', proficiency: 68, yearsExp: 1.5, delta: 0.58, iv: 0.65, context: 'REPORTING', itm: false, description: 'Business analytics tool from Microsoft', technicalDescription: 'Interactive data visualization software for business intelligence.', usedFor: ['interactive dashboards', 'reporting'], technicalUsedFor: ['DAX measure creation', 'data modeling', 'enterprise reporting'], keyFeatures: ['connects to various data sources'], technicalKeyFeatures: ['Power Query M', 'Row-level security', 'API integration'] },
  { name: 'Tableau', category: 'VIZ', typeCode: 'TAB', proficiency: 65, yearsExp: 1.5, delta: 0.55, iv: 0.63, context: 'REPORTING', itm: false, description: 'Data visualization platform', technicalDescription: 'Visual analytics platform for problem-solving with data.', usedFor: ['interactive dashboards', 'shareable reports'], technicalUsedFor: ['LOD expressions', 'complex data blending', 'server deployment'], keyFeatures: ['Drag-and-drop interface'], technicalKeyFeatures: ['Tableau Prep', 'calculated fields', 'dashboard actions'] },
];

const competencies = [
  { icon: TrendingUp, title: 'Quantitative Modeling', description: 'Statistical analysis, machine learning, and predictive modeling for financial markets.' },
  { icon: Code2,      title: 'Algorithmic Trading',   description: 'Real-time trading systems, WebSocket integration, and automated execution strategies.' },
  { icon: Database,   title: 'Data Engineering',      description: 'ETL pipelines, data integration, and automated processing workflows.' },
];

const timeline = [
  { year: '2025',      code: 'EXP', title: 'Amphora Investment Management', description: 'Intern — ETL pipeline development, 80% reduction in manual processing' },
  { year: '2024–2026', code: 'EDU', title: 'Washington University in St. Louis', description: 'BS Data Science & Financial Engineering · GPA: 3.7' },
  { year: '2021–2023', code: 'EDU', title: 'Drew University', description: 'BA Mathematics · GPA: 3.7' },
  { year: '2015–2021', code: 'EDU', title: 'Harrison College', description: 'A-level Examinations Unit I & II · GRADE: I AAA' },
];

const targetRoles = ['Quantitative Research Analyst', 'Financial Engineer', 'Data Scientist'];

const kpis = [
  { value: '8+',      label: 'APPROACHES' },
  { value: '70,000+', label: 'DATA POINTS' },
  { value: 'R² 0.816',label: 'PEAK MODEL'  },
  { value: '4',       label: 'DOMAINS'     },
];

const HomePage = () => {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const { isTechnicalMode } = useReadingMode();
  const navigate = useNavigate();

  const handleViewProject = (project) => {
    navigate('/projects', { state: { openProject: project } });
  };

  return (
    <>
      <Helmet>
        <title>Dmitri De Freitas — Quantitative Finance & Data Science</title>
        <meta name="description" content="Portfolio of Dmitri De Freitas — quantitative finance, algorithmic trading, and data science. Available May 2026." />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14">

        {/* ── 01. TERMINAL DASHBOARD HERO ─────────────────────────────── */}
        <section className="py-10 md:py-16 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">

              {/* Left 3/5 */}
              <div className="lg:col-span-3 space-y-5">

                {/* Headshot + name */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-border shrink-0 mt-1">
                    <img
                      src={HEADSHOT}
                      alt="Dmitri De Freitas"
                      className="w-full h-full object-cover object-top scale-[1.35] translate-y-1"
                    />
                  </div>
                  <div>
                    <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight text-foreground leading-none flex items-center gap-2">
                      DMITRI DE FREITAS <BlinkingCursor />
                    </h1>
                    <p className="font-mono text-xs text-muted-foreground mt-2 leading-relaxed">
                      BS Data Science & Financial Engineering · Washington University in St. Louis
                    </p>
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  <TerminalBadge variant="status">STATUS: SEEKING_ALPHA</TerminalBadge>
                  <TerminalBadge variant="date">AVAILABLE: 2026-05-01</TerminalBadge>
                  <TerminalBadge variant="location">LOCATION: STL</TerminalBadge>
                </div>

                {/* Executive summary */}
                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                  Quantitative finance practitioner building production-grade ETL pipelines, real-time
                  trading systems, and statistical models. Demonstrated research rigor across
                  institutional data engineering, market microstructure analysis, and predictive modeling.
                </p>

                {/* KPI strip */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4">
                  {kpis.map((k, i) => (
                    <React.Fragment key={k.label}>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-lg font-bold text-primary">{k.value}</span>
                        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{k.label}</span>
                      </div>
                      {i < kpis.length - 1 && <span className="text-border text-xs hidden sm:inline">|</span>}
                    </React.Fragment>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex gap-3 flex-wrap">
                  <Link
                    to="/projects"
                    className="font-mono text-[11px] tracking-widest bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 transition-colors"
                  >
                    VIEW RESEARCH →
                  </Link>
                  <Link
                    to="/contact"
                    className="font-mono text-[11px] tracking-widest border border-border px-4 py-2 text-foreground hover:bg-muted transition-colors"
                  >
                    SUBMIT INQUIRY
                  </Link>
                </div>
              </div>

              {/* Right 2/5 — Recent Research panel */}
              <div className="lg:col-span-2 border border-border">
                <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    RECENT RESEARCH
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">STATUS</span>
                </div>
                {recentResearch.map((item) => (
                  <Link key={item.id} to="/projects">
                    <div className="px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors flex items-start justify-between gap-3 group">
                      <div>
                        <span className="font-mono text-[9px] text-primary block mb-0.5">{item.id}</span>
                        <span className="font-mono text-[11px] text-foreground/80 group-hover:text-primary transition-colors leading-snug block">
                          {item.title}
                        </span>
                      </div>
                      <TerminalBadge variant="complete" className="shrink-0 mt-0.5">COMPLETE</TerminalBadge>
                    </div>
                  </Link>
                ))}
                <div className="px-4 py-2 bg-muted/20">
                  <Link to="/projects" className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors tracking-widest">
                    [VIEW ALL RESEARCH →]
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── DATA STRIPS ─────────────────────────────────────────────── */}
        <FinanceTicker />
        <MarketDataPanel />

        {/* ── 02. FEATURED RESEARCH ───────────────────────────────────── */}
        <section className="py-14 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="02" title="FEATURED RESEARCH" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className="h-full"
                >
                  <ProjectCard project={project} onViewProject={handleViewProject} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 03. TECHNICAL EXPERTISE ─────────────────────────────────── */}
        <section className="py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="03" title="TECHNICAL EXPERTISE" />
            <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
              {isTechnicalMode
                ? 'Skill chain sorted by role-relevance (Δ). ITM = active production deployment. Click any strike for full spec.'
                : 'Programming languages, data visualization, and quantitative finance platforms. Click any row to view detail.'}
            </p>
            <OptionsChain skillsData={skillsData} onSkillClick={setSelectedSkill} />
          </div>
        </section>

        {/* ── 04. CORE COMPETENCIES ───────────────────────────────────── */}
        <section className="py-14 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="04" title="CORE COMPETENCIES" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {competencies.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="border border-border p-5"
                >
                  <c.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-mono text-sm font-bold mb-2 uppercase tracking-wide">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 05. EDUCATION & EXPERIENCE ──────────────────────────────── */}
        <section className="py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="05" title="EDUCATION & EXPERIENCE" />
            <div className="max-w-3xl space-y-0 divide-y divide-border border border-border">
              {timeline.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.35 }}
                  className="flex gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-mono text-[10px] text-muted-foreground w-20 shrink-0 pt-0.5 leading-tight">
                    {item.year}
                  </span>
                  <span className="font-mono text-[9px] border border-border text-muted-foreground px-1.5 py-0.5 h-fit shrink-0 mt-0.5">
                    {item.code}
                  </span>
                  <div>
                    <p className="font-mono text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 06. AVAILABILITY & TARGET ROLES ─────────────────────────── */}
        <section className="py-14 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="06" title="AVAILABILITY & TARGET ROLES" />
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {targetRoles.map((role, i) => (
                  <span key={i} className="font-mono text-xs border border-border px-3 py-1 text-foreground/80">
                    {role}
                  </span>
                ))}
              </div>
              <div className="font-mono text-xs text-muted-foreground space-y-1">
                <p>· Full-time positions from <span className="text-foreground">May 2026</span></p>
                <p>· Currently located in <span className="text-foreground">St. Louis, MO</span></p>
                <p>· Open to relocation</p>
              </div>
              <div className="pt-4">
                <Link
                  to="/contact"
                  className="font-mono text-[11px] tracking-widest bg-primary text-primary-foreground px-5 py-2.5 hover:bg-primary/90 transition-colors inline-block"
                >
                  SUBMIT INQUIRY →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 07. RESEARCH CATALOG ────────────────────────────────────── */}
        <section className="py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="07" title="RESEARCH CATALOG" />
            <p className="text-sm text-muted-foreground mb-6 max-w-xl">
              Full project catalog with methodology, data sources, and performance metrics.
              10 projects across quantitative finance, data engineering, and statistical modeling.
            </p>
            <Link
              to="/projects"
              className="font-mono text-[11px] tracking-widest border border-border px-5 py-2.5 text-foreground hover:bg-muted transition-colors inline-block"
            >
              [VIEW ALL RESEARCH →]
            </Link>
          </div>
        </section>

      </div>

      <SkillDetailModal
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        skill={selectedSkill}
      />
    </>
  );
};

export default HomePage;
