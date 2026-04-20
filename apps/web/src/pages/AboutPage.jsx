import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Award, Download, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SectionHeader from '@/components/SectionHeader.jsx';
import TerminalBadge from '@/components/TerminalBadge.jsx';
import ExperienceModal from '@/components/ExperienceModal.jsx';

const AboutPage = () => {
  const [selectedExperience, setSelectedExperience] = useState(null);

  const skillCategories = [
    {
      title: 'Programming & Languages',
      skills: ['Python', 'R', 'SQL', 'MATLAB', 'VBA', 'Bash']
    },
    {
      title: 'Data Science & ML',
      skills: ['Pandas', 'NumPy', 'Scikit-learn', 'PyTorch', 'TensorFlow', 'Statsmodels', 'SciPy']
    },
    {
      title: 'Data Visualization & BI',
      skills: ['Matplotlib', 'Seaborn', 'Plotly', 'Power BI', 'Tableau']
    },
    {
      title: 'Databases & Big Data',
      skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'AWS S3/EC2/Lambda', 'Apache Spark']
    },
    {
      title: 'Quantitative & Finance',
      skills: ['Bloomberg Terminal', 'FRED', 'QuantLib', 'Backtrader', 'Interactive Brokers API']
    },
    {
      title: 'Development & DevOps',
      skills: ['Git', 'GitHub', 'VS Code', 'Docker', 'Jupyter', 'Linux/Unix']
    },
    {
      title: 'Cloud & Infrastructure',
      skills: ['AWS', 'Google Cloud', 'Azure', 'REST APIs', 'WebSockets']
    }
  ];

  const targetRoles = [
    'Quantitative Research Analyst',
    'Financial Engineer',
    'Data Scientist',
    'Algorithmic Trading Developer',
  ];

  const experiences = [
    {
      title: 'Amphora Investment Management',
      organization: 'Intern',
      role: 'Data Scientist',
      date: '2025',
      type: 'EXP',
      shortDescription: 'Built automated data pipelines to speed up investment workflows.',
      technicalShortDescription: 'Architected Python-based ETL pipelines for IBKR-Harmony integration, reducing manual processing by 80%.',
      description: [
        'Reduced manual data processing by 80% with automated Python pipeline for IBKR-Harmony',
        'Sped up portfolio construction through quantitative models',
        'Streamlined deal-sourcing workflow with dynamic Excel tools',
        'Initiated automated investor reporting for performance attribution'
      ],
      technicalDescription: [
        'Engineered robust Python ETL pipelines integrating Interactive Brokers (IBKR) and Harmony APIs, achieving an 80% reduction in manual data reconciliation.',
        'Developed quantitative portfolio construction models utilizing Pandas and NumPy for optimized asset allocation.',
        'Architected dynamic VBA/Excel tools to streamline deal-sourcing workflows and enhance data visibility.',
        'Implemented automated performance attribution reporting systems for institutional investors.'
      ]
    },
    {
      title: 'Startup Founder & Manager',
      organization: 'MobileHub Barbados',
      role: 'Founder',
      date: '2022–2024',
      type: 'EXP',
      shortDescription: 'Founded and managed a mobile technology business.',
      technicalShortDescription: 'Engineered supply chain logistics and managed international vendor API integrations.',
      description: [
        'Founded and scaled a mobile technology startup, overseeing all aspects of business operations and strategy.',
        'Managed international vendor relations and supply chain logistics in partnership with Shenzhen Rongyi Technology Co., Ltd.',
        'Handled inventory management, customer service, and financial tracking to ensure profitability and growth.'
      ],
      technicalDescription: [
        'Engineered end-to-end supply chain logistics and managed international vendor relations with Shenzhen Rongyi Technology Co., Ltd.',
        'Implemented inventory tracking systems and financial modeling to optimize cash flow and profitability.',
        'Developed and executed go-to-market strategies, achieving consistent month-over-month revenue growth.'
      ]
    },
    {
      title: 'Gary M. Sumers Recreation Center',
      organization: 'Washington University in St. Louis',
      role: 'Front Desk / Reception',
      date: '2025',
      type: 'EXP',
      shortDescription: 'Managed front desk operations and customer service.',
      technicalShortDescription: 'Managed facility access control systems and point-of-sale transaction processing.',
      description: [
        'Served as the primary point of contact for students, faculty, and guests, ensuring a welcoming and organized environment.',
        'Managed memberships, facility access, and point-of-sale transactions efficiently.',
        'Developed strong communication and problem-solving skills by addressing patron inquiries and resolving issues promptly.'
      ],
      technicalDescription: [
        'Operated facility access control systems and managed high-volume point-of-sale transaction processing.',
        'Maintained accurate membership databases and resolved access discrepancies in real-time.',
        'Optimized front-desk operational workflows to handle peak traffic periods efficiently.'
      ]
    },
    {
      title: 'Personal Care Assistant',
      organization: 'Private In-Home Care | SMA Patient',
      role: 'Caregiver',
      date: '2025–2026',
      type: 'EXP',
      shortDescription: 'Provided dedicated in-home care and daily assistance.',
      technicalShortDescription: 'Administered specialized medical equipment and monitored patient health metrics.',
      description: [
        'Delivered dedicated in-home care and daily living assistance for a patient with Spinal Muscular Atrophy (SMA).',
        'Assisted with mobility, personal hygiene, and specialized equipment operation.',
        'Monitored health status and maintained a safe, supportive environment, demonstrating high reliability and empathy.'
      ],
      technicalDescription: [
        'Administered and maintained specialized medical equipment for a patient with Spinal Muscular Atrophy (SMA).',
        'Monitored critical health metrics and executed emergency protocols when necessary.',
        'Maintained detailed health logs and coordinated with medical professionals to ensure optimal care delivery.'
      ]
    },
    {
      title: "Duke of Edinburgh's International",
      organization: 'Expedition',
      role: 'Bronze Award',
      date: '2021',
      type: 'ACT',
      shortDescription: 'Completed rigorous outdoor expedition and teamwork challenges.',
      technicalShortDescription: 'Executed complex route planning and resource management under demanding environmental constraints.',
      description: [
        'Successfully completed the rigorous expedition component, demonstrating physical endurance and outdoor survival skills.',
        'Collaborated with a team to plan routes, manage resources, and navigate challenging terrain.',
        'Developed strong leadership, teamwork, and resilience under demanding conditions.'
      ],
      technicalDescription: [
        'Executed complex topographical route planning and navigation using traditional orienteering methods.',
        'Managed critical resource allocation (water, rations, medical supplies) under demanding environmental constraints.',
        'Demonstrated crisis management and team leadership during high-stress expedition scenarios.'
      ]
    },
    {
      title: 'Science Club President',
      organization: 'Harrison College',
      role: 'President',
      date: '2020–2021',
      type: 'ACT',
      shortDescription: 'Led student science club and organized educational events.',
      technicalShortDescription: 'Directed STEM initiatives and coordinated experimental demonstrations for junior members.',
      description: [
        "Led the school's Science Club, organizing educational events, experiments, and competitions to foster STEM interest.",
        'Coordinated weekly meetings and managed a team of student volunteers to execute club initiatives.',
        'Enhanced public speaking and organizational skills while mentoring junior members in scientific concepts.'
      ],
      technicalDescription: [
        'Directed STEM curriculum development and coordinated complex experimental demonstrations.',
        'Managed club budget, resource procurement, and logistical planning for inter-school competitions.',
        "Implemented structured mentorship programs to improve junior members' scientific literacy and analytical skills."
      ]
    }
  ];

  return (
    <>
      <Helmet>
        <title>About — Dmitri De Freitas</title>
        <meta name="description"      content="About Dmitri De Freitas — quantitative finance practitioner. BS Data Science & Financial Engineering, Washington University in St. Louis. GPA 3.7. Available May 2026." />
        <link rel="canonical"         href="https://findmitridefreitas.com/about" />
        <meta property="og:url"       content="https://findmitridefreitas.com/about" />
        <meta property="og:title"     content="About — Dmitri De Freitas" />
        <meta property="og:description" content="Quantitative finance practitioner. BS Data Science & Financial Engineering, WashU. GPA 3.7. Amphora Investment Management intern. Available May 2026." />
        <meta property="og:type"   content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:image"  content="https://findmitridefreitas.com/IMG_1948.jpeg" />
        <meta property="og:image:width"  content="800" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:image"       content="https://findmitridefreitas.com/IMG_1948.jpeg" />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-16">

        {/* Hero */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="02" title="PROFILE" />
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-border shrink-0">
                <img
                  src="/IMG_1948.jpeg"
                  alt="Dmitri De Freitas"
                  className="w-full h-full object-cover object-top scale-[1.8] -translate-y-4 translate-x-[3px]"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <h1 className="font-mono text-2xl font-bold tracking-tight">DMITRI DE FREITAS</h1>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    BS Data Science & Financial Engineering · Washington University in St. Louis
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TerminalBadge variant="status">STATUS: SEEKING_ALPHA</TerminalBadge>
                  <TerminalBadge variant="date">AVAILABLE: 2026-05-01</TerminalBadge>
                  <TerminalBadge variant="location">LOCATION: STL</TerminalBadge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Executive Summary */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="01" title="EXECUTIVE SUMMARY" />
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed pl-1">
              <p>
                Quantitative finance and data science practitioner completing a BS in Data Science &amp; Financial Engineering at Washington University in St. Louis (GPA: 3.7), following a BA in Mathematics from Drew University (GPA: 3.7).
              </p>
              <p>
                Demonstrated experience building production ETL pipelines (80% reduction in manual processing at Amphora Investment Management), developing real-time algorithmic trading systems with sub-second execution latency, and conducting statistical research yielding rigorous results — 10.9% significant alpha in PEAD analysis, R² 0.816 in predictive housing modeling.
              </p>
              <p>
                Core competencies span Python, R, SQL, and MATLAB across quantitative modeling, time series analysis, derivatives pricing, and high-frequency data processing. Seeking full-time roles in quantitative research, financial engineering, or data science starting May 2026.
              </p>
            </div>
          </div>
        </section>

        {/* Education */}
        <section className="py-10 border-b border-border bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="max-w-5xl"
            >
              <SectionHeader number="02" title="EDUCATION" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">INSTITUTION</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">DEGREE</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">PERIOD</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">RESULT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs font-medium">Washington University in St. Louis</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">BS Data Science & Financial Engineering</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">2024–2026</TableCell>
                    <TableCell className="font-mono text-xs text-terminal-green">GPA 3.7</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs font-medium">Drew University</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">BA Mathematics</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">2021–2023</TableCell>
                    <TableCell className="font-mono text-xs text-terminal-green">GPA 3.7</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs font-medium">Harrison College</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">A-level Examinations Unit I & II</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">2015–2021</TableCell>
                    <TableCell className="font-mono text-xs text-terminal-green">GRADE I AAA</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs font-medium">Caribbean Examinations Council</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">CAPE® Unit II Physics</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">2021</TableCell>
                    <TableCell className="font-mono text-xs">
                      <span className="text-terminal-amber flex items-center gap-1">
                        <Award className="w-3 h-3" /> TOP 8 w/ Honors
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 pl-1">
                <Link
                  to="/coursework"
                  className="font-mono text-[10px] text-primary hover:text-primary/80 transition-colors tracking-widest"
                >
                  [VIEW FULL COURSEWORK →]
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Experience */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="03" title="EXPERIENCE & ACTIVITIES" />
            <div className="max-w-5xl divide-y divide-border">
              {experiences.map((exp, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06, duration: 0.3 }}
                  onClick={() => setSelectedExperience(exp)}
                  className="w-full text-left py-4 grid grid-cols-[80px_auto_1fr] gap-4 items-start hover:bg-muted/20 transition-colors px-2 -mx-2 group"
                >
                  <span className="font-mono text-[10px] text-muted-foreground pt-0.5 tabular-nums">{exp.date}</span>
                  <span className={`font-mono text-[10px] border px-1.5 py-0.5 shrink-0 ${
                    exp.type === 'EXP'
                      ? 'border-primary/40 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}>
                    {exp.type}
                  </span>
                  <div>
                    <p className="font-mono text-xs font-semibold group-hover:text-primary transition-colors">
                      {exp.title}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {exp.role} · {exp.organization}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground/70 mt-1 line-clamp-1">
                      {exp.technicalShortDescription}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground/50 mt-3 pl-2">
              · Click any entry to expand full details
            </p>
          </div>
        </section>

        {/* Target Roles & Availability */}
        <section className="py-10 border-b border-border bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="04" title="DEPLOYMENT PARAMETERS" />
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl">
              {/* Target Roles */}
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">TARGET ROLES</p>
                <div className="space-y-1.5">
                  {targetRoles.map((role, i) => (
                    <div key={i} className="font-mono text-xs flex items-center gap-2">
                      <span className="text-primary">›</span>
                      <span className="text-foreground/80">{role}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Availability */}
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">AVAILABILITY</p>
                <div className="space-y-2">
                  <div className="font-mono text-xs flex gap-3">
                    <span className="text-muted-foreground w-28 shrink-0">START DATE</span>
                    <span className="text-terminal-green">2026-05-01</span>
                  </div>
                  <div className="font-mono text-xs flex gap-3">
                    <span className="text-muted-foreground w-28 shrink-0">CURRENT LOC</span>
                    <span className="text-foreground/80">St. Louis, MO</span>
                  </div>
                  <div className="font-mono text-xs flex gap-3">
                    <span className="text-muted-foreground w-28 shrink-0">RELOCATION</span>
                    <span className="text-terminal-green">[YES]</span>
                  </div>
                  <div className="font-mono text-xs flex gap-3">
                    <span className="text-muted-foreground w-28 shrink-0">WORK AUTH</span>
                    <span className="text-foreground/80">US (F-1 OPT eligible)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Skills */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="max-w-5xl"
            >
              <SectionHeader number="05" title="TECHNICAL STACK" />
              <div className="divide-y divide-border border-y border-border">
                {skillCategories.map((category, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06, duration: 0.3 }}
                    className="grid grid-cols-[160px_1fr] gap-6 py-3 items-start"
                  >
                    <p className="font-mono text-[10px] text-primary uppercase tracking-widest pt-0.5">
                      {category.title}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {category.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="font-mono text-[10px] px-2 py-0.5 border border-border text-foreground/80 bg-muted/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Research Approach */}
        <section className="py-10 border-b border-border bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="06" title="RESEARCH METHODOLOGY" />
            <p className="text-sm text-muted-foreground leading-relaxed pl-1">
              Research methodology centered on statistical rigor, reproducibility, and production-ready implementation.
              Every model undergoes cross-validation, sensitivity analysis, and out-of-sample testing before deployment.
              In quantitative finance, where milliseconds and basis points determine outcomes, precision in methodology
              is non-negotiable.
            </p>
          </div>
        </section>

        {/* References */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="07" title="REFERENCES" />
            <div className="max-w-5xl space-y-0 divide-y divide-border border border-border">

              <div className="flex items-start gap-4 px-4 py-3 hover:bg-muted/10 transition-colors group">
                <span className="font-mono text-[8px] border border-border text-muted-foreground px-1.5 py-0.5 shrink-0 mt-0.5">PAPER</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Jegadeesh, N. &amp; Titman, S. · 1993 · <em>Journal of Finance</em> 48(1)
                  </p>
                  <p className="font-mono text-xs text-foreground/90 mt-0.5 font-medium">
                    Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency
                  </p>
                </div>
                <Link
                  to="/lab/notes"
                  className="font-mono text-[10px] text-primary hover:text-primary/80 tracking-widest shrink-0 self-center opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  [→]
                </Link>
              </div>

              <div className="flex items-start gap-4 px-4 py-3 hover:bg-muted/10 transition-colors group">
                <span className="font-mono text-[8px] border border-border text-muted-foreground px-1.5 py-0.5 shrink-0 mt-0.5">DATA</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    French, K.R. · Tuck School of Business, Dartmouth
                  </p>
                  <p className="font-mono text-xs text-foreground/90 mt-0.5 font-medium">
                    Kenneth R. French — Data Library (FF Factors, Portfolios, Breakpoints)
                  </p>
                </div>
                <Link
                  to="/lab/notes"
                  className="font-mono text-[10px] text-primary hover:text-primary/80 tracking-widest shrink-0 self-center opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  [→]
                </Link>
              </div>

              <div className="flex items-start gap-4 px-4 py-3 hover:bg-muted/10 transition-colors group">
                <span className="font-mono text-[8px] border border-border text-muted-foreground px-1.5 py-0.5 shrink-0 mt-0.5">DATA</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Damodaran, A. · Stern School of Business, NYU
                  </p>
                  <p className="font-mono text-xs text-foreground/90 mt-0.5 font-medium">
                    Aswath Damodaran Data Archive (Valuation &amp; Corporate Finance)
                  </p>
                </div>
                <a
                  href="https://pages.stern.nyu.edu/~adamodar/New_Home_Page/data.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-primary hover:text-primary/80 tracking-widest shrink-0 self-center opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  [↗]
                </a>
              </div>

              <div className="flex items-start gap-4 px-4 py-3 hover:bg-muted/10 transition-colors group">
                <span className="font-mono text-[8px] border border-border text-muted-foreground px-1.5 py-0.5 shrink-0 mt-0.5">DATA</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Shiller, R.J. · Yale University Department of Economics
                  </p>
                  <p className="font-mono text-xs text-foreground/90 mt-0.5 font-medium">
                    Robert Shiller Online Data (Market History &amp; CAPE)
                  </p>
                </div>
                <a
                  href="http://www.econ.yale.edu/~shiller/data.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-primary hover:text-primary/80 tracking-widest shrink-0 self-center opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  [↗]
                </a>
              </div>

              <div className="flex items-start gap-4 px-4 py-3 hover:bg-muted/10 transition-colors group">
                <span className="font-mono text-[8px] border border-border text-muted-foreground px-1.5 py-0.5 shrink-0 mt-0.5">DATA</span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Federal Reserve Bank of St. Louis
                  </p>
                  <p className="font-mono text-xs text-foreground/90 mt-0.5 font-medium">
                    FRED — Federal Reserve Economic Data (Macroeconomics)
                  </p>
                </div>
                <a
                  href="https://fred.stlouisfed.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-primary hover:text-primary/80 tracking-widest shrink-0 self-center opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  [↗]
                </a>
              </div>

            </div>
            <p className="font-mono text-[9px] text-muted-foreground/50 mt-3 pl-1">
              · Full annotations and data links in <Link to="/lab/notes" className="text-primary hover:text-primary/80">LAB → NOTES</Link>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">ARTIFACTS</p>
              <div className="flex flex-wrap gap-6 items-center">
                <a
                  href="https://drive.google.com/file/d/1Ff9CtgP3OndC67ARXolrRjH6Y2seE1Sl/view?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-primary hover:text-primary/80 transition-colors tracking-widest flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  [DOWNLOAD CV.PDF →]
                </a>
                <a
                  href="/contact"
                  className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors tracking-widest"
                >
                  [SUBMIT INQUIRY →]
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>

      <ExperienceModal
        isOpen={!!selectedExperience}
        onClose={() => setSelectedExperience(null)}
        experience={selectedExperience}
      />
    </>
  );
};

export default AboutPage;
