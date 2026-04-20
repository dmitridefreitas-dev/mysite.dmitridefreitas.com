import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader.jsx';

const CLIPS = [
  { src: '/IMG_1914.mp4', label: 'See the stack in motion', tag: 'CLIP / 01' },
  { src: '/IMG_1921.mp4', label: 'AI agent functions',      tag: 'CLIP / 02' },
];

const SERVICES = [
  {
    num: '01',
    name: 'AI Voice Receptionist',
    desc: 'Never miss a call. Answers 24/7, qualifies leads, transfers calls & books appointments.',
    tags: ['24/7 AVAILABILITY', 'CALL TRANSFER', 'CALENDAR BOOKING', 'SMS FOLLOW-UP'],
  },
  {
    num: '02',
    name: 'AI Chatbot',
    desc: 'Engages visitors instantly \u2014 captures leads, answers FAQs, guides prospects through your sales funnel.',
    tags: ['LEAD CAPTURE', 'FAQ AUTOMATION', 'LIVE CHAT HANDOFF', 'CRM INTEGRATION'],
  },
  {
    num: '03',
    name: 'Paid Advertising',
    desc: 'Data-driven Google & Meta campaigns. Every dollar optimized to maximize return on ad spend.',
    tags: ['GOOGLE ADS', 'META ADS', 'RETARGETING', 'A/B TESTING'],
  },
  {
    num: '04',
    name: 'SEO & Content',
    desc: 'Rank higher and attract organic traffic with strategic content and technical SEO that compounds.',
    tags: ['KEYWORD RESEARCH', 'ON-PAGE SEO', 'LINK BUILDING', 'CONTENT STRATEGY'],
  },
  {
    num: '05',
    name: 'Email & SMS',
    desc: 'Nurture leads and retain customers with automated sequences and targeted SMS campaigns that convert.',
    tags: ['AUTOMATION FLOWS', 'SEGMENTATION', 'SMS CAMPAIGNS', 'ANALYTICS'],
  },
  {
    num: '06',
    name: 'Brand & Web Design',
    desc: 'From logo to landing page \u2014 visuals that communicate value and convert visitors into clients.',
    tags: ['BRAND IDENTITY', 'LANDING PAGES', 'UI/UX DESIGN', 'CONVERSION OPT'],
  },
  {
    num: '07',
    name: 'Social Media',
    desc: 'Consistent, engaging presence across every platform. Content that builds audience and drives results.',
    tags: ['CONTENT CREATION', 'SCHEDULING', 'COMMUNITY MGMT', 'ANALYTICS'],
  },
  {
    num: '08',
    name: 'Analytics & Reporting',
    desc: "Clear, actionable reports so you always know what\u2019s working. Full-funnel tracking from click to closed deal.",
    tags: ['DASHBOARD SETUP', 'MONTHLY REPORTS', 'ATTRIBUTION', 'FUNNEL ANALYSIS'],
  },
];

/**
 * Individual clip tile with its own preview video, audio graph, and modal.
 * AudioContext + MediaElementSource are created once per <video> element and
 * retained in refs so the graph is reused across open/close cycles.
 */
function ClipTile({ clip, index }) {
  const previewRef = useRef(null);
  const modalRef   = useRef(null);

  const audioCtxRef = useRef(null);
  const sourceRef   = useRef(null);
  const gainRef     = useRef(null);

  const [open, setOpen] = useState(false);

  // Ensure preview plays muted on mount
  useEffect(() => {
    const v = previewRef.current;
    if (!v) return;
    v.muted = true;
    const tryPlay = () => { v.play().catch(() => {}); };
    tryPlay();
  }, []);

  const ensureAudioGraph = useCallback(async () => {
    const video = modalRef.current;
    if (!video) return;

    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        const ctx = new Ctx();
        const source = ctx.createMediaElementSource(video);
        const gain   = ctx.createGain();
        gain.gain.value = 8;
        source.connect(gain);
        gain.connect(ctx.destination);
        audioCtxRef.current = ctx;
        sourceRef.current   = source;
        gainRef.current     = gain;
      } catch (err) {
        // If an AudioContext was already created for this element, surface and continue silently
        // (audio just won't be boosted).
        // eslint-disable-next-line no-console
        console.warn('AudioContext init failed:', err);
        return;
      }
    }

    try {
      await audioCtxRef.current.resume();
    } catch (_err) {
      // ignore
    }
  }, []);

  const handleOpen = useCallback(async () => {
    setOpen(true);
    // pause preview, move user focus to modal
    const preview = previewRef.current;
    if (preview) preview.pause();
  }, []);

  // After modal mounts, start modal video with boosted audio
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const startModalPlayback = async () => {
      const video = modalRef.current;
      if (!video) return;
      video.muted     = false;
      video.currentTime = 0;
      await ensureAudioGraph();
      if (cancelled) return;
      try {
        await video.play();
      } catch (err) {
        // Autoplay with sound might be blocked; user can hit play button
        // eslint-disable-next-line no-console
        console.warn('Modal playback blocked, awaiting user gesture:', err);
      }
    };

    startModalPlayback();
    return () => { cancelled = true; };
  }, [open, ensureAudioGraph]);

  const handleClose = useCallback(() => {
    const video = modalRef.current;
    if (video) {
      video.pause();
      video.muted = true;
    }
    setOpen(false);
    // resume preview loop
    const preview = previewRef.current;
    if (preview) {
      preview.muted = true;
      preview.play().catch(() => {});
    }
  }, []);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.08, duration: 0.4 }}
        className="group"
      >
        <button
          type="button"
          onClick={handleOpen}
          className="relative block w-full aspect-video border border-border bg-card overflow-hidden hover:border-primary/60 transition-colors"
          aria-label={`Play ${clip.label}`}
        >
          <video
            ref={previewRef}
            src={clip.src}
            loop
            muted
            playsInline
            autoPlay
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* subtle dark overlay */}
          <div className="absolute inset-0 bg-background/30 group-hover:bg-background/20 transition-colors pointer-events-none" />

          {/* centered play button */}
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/40 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 md:w-6 md:h-6 translate-x-[1px]" fill="currentColor" />
            </span>
          </span>

          {/* corner tag */}
          <span className="absolute top-2 left-2 font-mono text-[9px] tracking-widest border border-border bg-background/70 text-muted-foreground px-1.5 py-0.5 backdrop-blur-sm">
            {clip.tag}
          </span>
        </button>

        <div className="mt-3 flex items-center justify-between">
          <p className="font-mono text-[11px] text-foreground tracking-wider uppercase">
            {clip.label}
          </p>
          <p className="font-mono text-[9px] text-muted-foreground tracking-widest">
            {clip.tag}
          </p>
        </div>
      </motion.div>

      {/* MODAL */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md p-4 md:p-8"
          role="dialog"
          aria-modal="true"
          onClick={handleClose}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 font-mono text-[10px] tracking-widest border border-border bg-background/80 text-foreground px-3 py-2 hover:border-primary/60 hover:text-primary transition-colors"
            aria-label="Close video"
          >
            <X className="w-3 h-3" />
            CLOSE
          </button>

          <div
            className="relative w-full max-w-5xl aspect-video border border-border bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={modalRef}
              src={clip.src}
              controls
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          </div>

          <p className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center font-mono text-[9px] tracking-widest text-muted-foreground">
            ESC TO CLOSE &middot; AUDIO BOOSTED 8&times;
          </p>
        </div>
      )}
    </>
  );
}

export default function AIPage() {
  return (
    <>
      <Helmet>
        <title>{'AI Services \u2014 Dmitri De Freitas'}</title>
        <meta name="description" content={'AI-powered services from Dmitri De Freitas \u2014 24/7 voice receptionist, chatbots, paid ads, SEO, email/SMS automation, brand design, social media, and analytics.'} />
        <link rel="canonical" href="https://findmitridefreitas.com/ai" />
        <meta property="og:type"   content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:url"    content="https://findmitridefreitas.com/ai" />
        <meta property="og:title"  content={'AI Services \u2014 Dmitri De Freitas'} />
        <meta property="og:description" content="AI voice receptionist, chatbots, paid ads, SEO, and full-funnel growth services." />
        <meta property="og:image"  content="https://findmitridefreitas.com/IMG_1948.jpeg" />
        <meta property="og:image:width"  content="800" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:image"       content="https://findmitridefreitas.com/IMG_1948.jpeg" />
      </Helmet>

      <div className="min-h-screen pt-10 md:pt-11">

        {/* ── SECTION A: RECEPTIONIST HERO ─────────────────────────────── */}
        <section className="w-full" style={{ marginTop: '-2.75rem' }}>
          <iframe
            src="/receptionist-standalone.html"
            className="w-full block border-0 h-[60vh] md:h-screen"
            title="AI Receptionist Demo"
          />
        </section>

        {/* ── SECTION B: MY AI DEMOS ───────────────────────────────────── */}
        <section className="py-14 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="01" title="MY AI DEMOS" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {CLIPS.map((clip, i) => (
                <ClipTile key={clip.src} clip={clip} index={i} />
              ))}
            </div>

            <p className="font-mono text-[10px] text-muted-foreground/60 mt-6 tracking-widest uppercase">
              Click a clip to expand &middot; Audio boosted 8&times; on playback
            </p>
          </div>
        </section>

        {/* ── SECTION C: SERVICES ──────────────────────────────────────── */}
        <section className="py-14 bg-muted/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader number="02" title="SERVICES" />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {SERVICES.map((svc, i) => (
                <motion.div
                  key={svc.num}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  className="relative bg-card border border-border p-4 md:p-5 flex flex-col gap-3 hover:border-primary/60 transition-colors group overflow-hidden"
                >
                  {/* Growing blue line on hover */}
                  <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary group-hover:w-full transition-all duration-500 ease-out" />

                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-widest text-primary border border-primary/40 px-1.5 py-0.5">
                      {svc.num}
                    </span>
                    <span className="font-mono text-[8px] text-muted-foreground/50 tracking-widest">
                      SERVICE
                    </span>
                  </div>

                  <h3 className="font-mono text-sm md:text-base font-bold tracking-tight text-foreground uppercase leading-snug">
                    {svc.name}
                  </h3>

                  <p className="font-mono text-[11px] text-muted-foreground leading-relaxed flex-1">
                    {svc.desc}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                    {svc.tags.map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[8px] tracking-widest border border-primary/40 text-primary/80 px-1.5 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <p className="font-mono text-[10px] text-muted-foreground/60 mt-8 tracking-widest uppercase">
              Full-funnel growth stack &middot; Built & operated end-to-end
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
