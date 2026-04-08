import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import ProjectCard from '@/components/ProjectCard.jsx';
import ProjectDetailModal from '@/components/ProjectDetailModal.jsx';
import SectionHeader from '@/components/SectionHeader.jsx';

const ProjectsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openProject) {
      setSelectedProject(location.state.openProject);
      setIsModalOpen(true);
      // Clear state so back-navigation doesn't re-open
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const categories = ['All', 'Quantitative', 'Data Engineering', 'Statistical Modeling'];

  const projects = [
    {
      id: 10, reportId: 'PEAD-001',
      title: 'Statistical Analysis of Short-Term Market Efficiency Following Positive Earnings Surprises',
      shortDescription: 'Testing the Post-Earnings Announcement Drift (PEAD) Hypothesis',
      technicalShortDescription: 'Statistical arbitrage analysis of PEAD hypothesis yielding 10.9% significant Alpha.',
      simpleDescription: 'Analyzed how stock prices react after companies announce better-than-expected earnings. Found that markets are highly efficient and adjust prices almost immediately, contrary to some traditional theories that suggest prices drift slowly over time.',
      technicalDescription: 'Conducted a rigorous statistical analysis to test the Post-Earnings Announcement Drift (PEAD) hypothesis. Developed quantitative models to evaluate short-term market efficiency following positive earnings surprises, analyzing whether markets immediately price in new information or if drift occurs. The study revealed that only a small fraction of stocks exhibited statistically significant Alpha, suggesting higher market efficiency than traditionally assumed in PEAD literature.',
      techStack: ['Python', 'WebSockets', 'Asyncio', 'Quantitative Models'],
      category: 'Quantitative',
      metrics: [
        'Only 10.9% of stocks showed statistically significant Alpha',
        'Evaluated short-term market efficiency',
        'Tested Post-Earnings Announcement Drift (PEAD) hypothesis',
        'Analyzed immediate vs delayed price discovery'
      ],
      dataSources: [
        'Compustat: Historical earnings data',
        'CRSP: Daily stock returns and market capitalization',
        'I/B/E/S: Analyst earnings estimates'
      ],
      reportLink: 'https://drive.google.com/file/d/1KMCov59hzqVeszJgeXmMe1eGDp_Ckqde/view',
      codeLink: '#',
    },
    {
      id: 1, reportId: 'ETL-002',
      title: 'Institutional Data Integration Engine',
      shortDescription: 'Automated data pipeline reducing manual processing by 80%',
      technicalShortDescription: 'Python/Pandas ETL pipeline for institutional data integration.',
      simpleDescription: 'Built automated systems to collect and organize financial data, saving the team hundreds of hours of manual work. Created easy-to-read dashboards for tracking investments and ensuring data accuracy across different platforms.',
      technicalDescription: 'Built comprehensive automated data pipelines at Amphora Investment Management to streamline institutional data integration workflows. Implemented REST API connections, Excel/VBA automation, and Power BI dashboards to transform manual data processing into efficient, scalable systems.',
      techStack: ['Python', 'Pandas', 'REST API', 'Excel/VBA', 'Power BI'],
      category: 'Data Engineering',
      metrics: [
        '80% reduction in manual processing time',
        'Automated integration of multiple institutional data sources',
        'Real-time data validation and error handling',
        'Scalable pipeline architecture for future expansion',
      ],
      dataSources: [
        'Interactive Brokers (IBKR) API',
        'Harmony: Internal portfolio management system',
        'Bloomberg Data License'
      ],
      reportLink: 'https://drive.google.com/drive/folders/1UOnr5dxz01tNMoN0dowL7zSadmxg76WL',
      codeLink: '#',
    },
    {
      id: 2, reportId: 'TRAD-003',
      title: 'Quantitative Trading Deck',
      shortDescription: 'Real-time cryptocurrency trading system with WebSocket integration',
      technicalShortDescription: 'Asyncio WebSocket client with automated execution logic.',
      simpleDescription: 'Created a fast, automated trading system for cryptocurrencies that connects to multiple exchanges and executes trades instantly based on live market data streams.',
      technicalDescription: 'Developed a sophisticated real-time cryptocurrency trading system leveraging WebSocket connections for live market data streaming. Implemented asynchronous processing with Python Asyncio to handle multiple concurrent data streams and execute trades with minimal latency.',
      techStack: ['Python', 'WebSockets', 'Asyncio'],
      category: 'Quantitative',
      metrics: [
        'Real-time market data streaming',
        'Sub-second trade execution latency',
        'Multi-exchange connectivity',
        'Asynchronous order management system',
      ],
      dataSources: [
        'Binance WebSocket API',
        'Coinbase Pro API',
        'Kraken REST API'
      ],
      reportLink: 'https://drive.google.com/file/d/1y8MlzRKhUrgumKxb7Jw680nIQHm-M0kW/view',
      codeLink: 'https://drive.google.com/drive/folders/1ZUcBXwVD-fR5Z8g5lat5UFhQUsrMP2I6?usp=drive_link',
    },
    {
      id: 3, reportId: 'TERM-004',
      title: 'Institutional Trading Terminal',
      shortDescription: 'Full-stack trading platform with secure authentication',
      technicalShortDescription: 'React/Node.js full-stack terminal with JWT-based stateless authentication.',
      simpleDescription: 'Built a secure, professional-grade trading platform where users can log in, view live market data, and manage their trades in real-time through a clean web interface.',
      technicalDescription: 'Engineered a complete institutional-grade trading terminal featuring secure JWT authentication, real-time WebSocket data feeds, RESTful API backend, and responsive HTML/CSS/JS frontend. Designed for professional traders requiring enterprise-level security and performance.',
      techStack: ['Python', 'WebSockets', 'Asyncio', 'JWT Auth', 'REST API', 'HTML/CSS/JS'],
      category: 'Quantitative',
      metrics: [
        'Enterprise-grade security with JWT authentication',
        'Real-time order book updates',
        'Multi-user session management',
        'Comprehensive trade history and analytics',
      ],
      dataSources: [
        'Alpaca Markets API',
        'Polygon.io: Real-time market data',
        'Internal simulated matching engine'
      ],
      reportLink: 'https://drive.google.com/file/d/1MygghOsEu7fFybnPwSsZ81TExeu4bZVe/view',
      codeLink: '#',
    },
    {
      id: 4, reportId: 'ML-005',
      title: 'Predictive Modeling & Housing Price Intelligence',
      shortDescription: 'AI model for predicting house prices accurately',
      technicalShortDescription: 'Random Forest regressor achieving R² 0.816 on housing dataset.',
      simpleDescription: 'Developed an AI model that accurately predicts house prices in Australia by analyzing thousands of property records and identifying key factors that affect value, such as location and property features.',
      technicalDescription: 'Developed advanced predictive models for Australian housing prices using Random Forest algorithms and comprehensive feature engineering. Achieved exceptional model performance with R² of 0.816 and RMSE of $270,534 AUD through rigorous data preprocessing, feature selection, and hyperparameter tuning.',
      techStack: ['Python', 'Scikit-learn', 'Pandas', 'Seaborn', 'Random Forest'],
      category: 'Statistical Modeling',
      metrics: [
        'R² score: 0.816',
        'RMSE: $270,534 AUD',
        'Analyzed 10,000+ property records',
        'Feature importance analysis for interpretability',
      ],
      dataSources: [
        'Kaggle: Melbourne Housing Market Dataset',
        'Australian Bureau of Statistics (ABS)',
        'Domain Group Property Data'
      ],
      reportLink: 'https://drive.google.com/file/d/1zcGUEaRWoGIFPrVUi1k3UDg7PU2peKfR/view',
      codeLink: '#',
    },
    {
      id: 5, reportId: 'CLM-006',
      title: 'Climate Science & Statistical Modeling',
      shortDescription: 'Study showing global warming trends over time',
      technicalShortDescription: 'Fourier analysis and linear modeling quantifying a 0.13°C/decade warming trend.',
      simpleDescription: 'Analyzed global temperature data to identify long-term climate trends, finding clear statistical evidence of a steady warming pattern over time across different regions of the world.',
      technicalDescription: 'Conducted comprehensive statistical analysis of global temperature trends using advanced time series methods, Fourier analysis, and spatial modeling. Identified significant warming trend of 0.13°C/year with 71% of temperature variation explained by the model, providing robust evidence for climate change patterns.',
      techStack: ['R', 'Linear Models', 'Lubridate', 'Maps', 'Fields', 'Fourier Analysis'],
      category: 'Statistical Modeling',
      metrics: [
        '0.13°C/year warming trend identified',
        '71% variation explained (R²)',
        'Spatial analysis across global regions',
        'Seasonal decomposition and trend analysis',
      ],
      dataSources: [
        'NOAA: National Centers for Environmental Information',
        'NASA GISS Surface Temperature Analysis',
        'Hadley Centre (HadCRUT)'
      ],
      reportLink: 'https://drive.google.com/file/d/1PS-8_Two0Nz-ljb0DgiXv18tJ9w-LtiN/view',
      codeLink: '#',
    },
    {
      id: 6, reportId: 'NFL-007',
      title: 'NFL Win Probability Forecasting',
      shortDescription: 'Statistical models for NFL game predictions',
      technicalShortDescription: 'GLM and Beta-Binomial models for NFL win probability forecasting.',
      simpleDescription: 'Created a statistical model to predict the winning chances of NFL teams by analyzing historical game data and team performance metrics, adjusting for specific team strengths and weaknesses.',
      technicalDescription: 'Built sophisticated statistical models using Generalized Linear Models (GLM) and Beta-Binomial distributions to forecast NFL team win probabilities. Incorporated mixed effects modeling to account for team-specific variations and achieved strong predictive performance with AIC of 944.3.',
      techStack: ['R', 'GLM', 'Beta-Binomial Models', 'Mixed Effects'],
      category: 'Statistical Modeling',
      metrics: [
        'AIC: 944.3',
        'Projected Ravens/49ers/Chiefs as top performers',
        'Mixed effects for team-specific adjustments',
        'Season-long prediction accuracy validation',
      ],
      dataSources: [
        'ESPN API: Historical game data',
        'NFL.com: Official statistics',
        'Pro Football Reference'
      ],
      reportLink: 'https://drive.google.com/file/d/1PS-8_Two0Nz-ljb0DgiXv18tJ9w-LtiN/view',
      codeLink: '#',
    },
    {
      id: 7, reportId: 'BIO-008',
      title: 'Running Surface Biomechanics Analysis',
      shortDescription: 'Analysis of running performance on different surfaces',
      technicalShortDescription: 'Linear mixed-effects modeling for multi-surface biomechanical variance analysis.',
      simpleDescription: 'Studied how different running surfaces (like grass vs. concrete) affect a runner\'s body and performance, helping to understand injury risks and efficiency differences.',
      technicalDescription: 'Analyzed the impact of different running surfaces on biomechanical performance using linear mixed models and repeated measures ANOVA. Controlled for individual athlete variations while identifying significant surface-specific effects on running efficiency and injury risk.',
      techStack: ['R', 'Linear Mixed Models', 'Repeated Measures', 'ANOVA'],
      category: 'Statistical Modeling',
      metrics: [
        'Multi-surface comparison (track, grass, concrete)',
        'Repeated measures design for within-subject analysis',
        'Biomechanical metric quantification',
        'Statistical significance testing with ANOVA',
      ],
      dataSources: [
        'University Biomechanics Lab Data',
        'Wearable sensor data (accelerometers)',
        'Force plate measurements'
      ],
      reportLink: 'https://drive.google.com/file/d/1-0o599jc8_PsLD-tjGG0T1Z46egoE6Tq/view',
      codeLink: '#',
    },
    {
      id: 8, reportId: 'TCY-009',
      title: 'Tropical Cyclone Cold Wake Analysis',
      shortDescription: 'Analysis of ocean temperature changes after hurricanes',
      technicalShortDescription: 'Statistical testing and exponential distribution modeling of ocean temperature patterns.',
      simpleDescription: 'Investigated how hurricanes cool down the ocean surface along their path, creating maps to show these temperature changes and helping to improve future storm predictions.',
      technicalDescription: 'Investigated tropical cyclone-induced ocean cooling patterns using advanced statistical testing methods and exponential distribution modeling. Conducted spatial analysis to map cold wake formation and persistence, contributing to improved hurricane intensity forecasting.',
      techStack: ['R', 'Statistical Testing', 'Exponential Distributions', 'Spatial Analysis'],
      category: 'Statistical Modeling',
      metrics: [
        'Analyzed 100+ cyclone events',
        'Spatial mapping of cold wake patterns',
        'Exponential decay modeling',
        'Temperature anomaly quantification',
      ],
      dataSources: [
        'NOAA Hurricane Research Division',
        'Satellite Sea Surface Temperature (SST) data',
        'National Hurricane Center (NHC) Best Track Data'
      ],
      reportLink: 'https://drive.google.com/file/d/1ZoGA1EgN0x95YwXnjuS9onlMG6VD7TsD/view',
      codeLink: '#',
    },
    {
      id: 9, reportId: 'TRN-010',
      title: 'US Tornado Pattern Analysis',
      shortDescription: 'Analysis of historical tornado events across the US',
      technicalShortDescription: 'Spatial statistics and GAM models for 70,000+ tornado events.',
      simpleDescription: 'Analyzed over 70,000 historical tornado records to find geographic hotspots and track how tornado patterns have changed across the United States over time.',
      technicalDescription: 'Comprehensive analysis of US tornado patterns using spatial statistics, Generalized Additive Models (GAM), and kernel density estimation. Processed and analyzed over 70,000 tornado events to identify geographic hotspots, temporal trends, and intensity distributions across the United States.',
      techStack: ['R', 'Spatial Statistics', 'GAM Models', 'Kernel Density Estimation'],
      category: 'Statistical Modeling',
      metrics: [
        '70,000+ tornado events analyzed',
        'Geographic hotspot identification',
        'Temporal trend analysis (1950-2023)',
        'Intensity distribution modeling',
      ],
      dataSources: [
        'NOAA Storm Prediction Center (SPC)',
        'National Weather Service (NWS) archives',
        'Tornado History Project database'
      ],
      reportLink: 'https://drive.google.com/file/d/1J02SDuD61vPO0l4oF_DJw6j3UA3EHZ28/view',
      codeLink: '#',
    },
  ];

  const filteredProjects =
    selectedCategory === 'All'
      ? projects
      : projects.filter((project) => project.category === selectedCategory);

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedProject(null);
    }, 200);
  };

  return (
    <>
      <Helmet>
        <title>Projects - Dmitri De Freitas</title>
        <meta
          name="description"
          content="Explore Dmitri De Freitas's portfolio of quantitative finance, data engineering, and statistical modeling projects including trading systems, predictive models, and data pipelines."
        />
      </Helmet>

      <div className="min-h-screen pt-12 md:pt-14 pb-16">
        {/* Hero Section */}
        <section className="py-10 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="03" title="RESEARCH CATALOG" />
            <p className="text-sm text-muted-foreground max-w-2xl">
              {filteredProjects.length} projects across quantitative finance, data engineering,
              and statistical modeling. Each entry includes methodology, data sources, and performance metrics.
            </p>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="py-0 sticky top-12 md:top-14 bg-background/95 backdrop-blur-sm z-40 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex divide-x divide-border border-x border-border w-fit">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`font-mono text-[11px] uppercase tracking-widest px-4 h-9 transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Projects Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {filteredProjects.map((project) => (
                <div key={project.id} className="h-full">
                  <ProjectCard project={project} onViewProject={handleViewProject} />
                </div>
              ))}
            </div>

            {filteredProjects.length === 0 && (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground">
                  No projects found in this category.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Project Detail Modal */}
        <ProjectDetailModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </>
  );
};

export default ProjectsPage;