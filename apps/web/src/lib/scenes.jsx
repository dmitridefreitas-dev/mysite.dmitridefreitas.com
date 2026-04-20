// scenes.jsx — Terra video scenes
// Palette: deep charcoal bg + acid-lime accent + bone white

import React from 'react';
import { Sprite, Easing, clamp, useTime } from './animations.jsx';

const TERRA = {
  bg: '#0b0d0a', bgAlt: '#111411', fg: '#ecece4', dim: '#8a8d82',
  line: 'rgba(236,236,228,0.14)', lime: '#d4ff3a', limeDark: '#a8cc2d', rust: '#ff5a1f',
};
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";

function HUD({ sceneLabel, sceneNum, totalScenes }) {
  const time = useTime();
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
      <div style={{ position: 'absolute', left: 48, bottom: 40, fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', color: TERRA.dim }}>
        ● REC  T+{time.toFixed(2).padStart(5, '0')}s
      </div>
      <div style={{ position: 'absolute', right: 48, bottom: 40, fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', color: TERRA.dim, textTransform: 'uppercase' }}>
        real people · real results · no bs
      </div>
      {[
        { left: 24, top: 24, bw: '2px 0 0 2px' },
        { right: 24, top: 24, bw: '2px 2px 0 0' },
        { left: 24, bottom: 24, bw: '0 0 2px 2px' },
        { right: 24, bottom: 24, bw: '0 2px 2px 0' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 22, height: 22, borderStyle: 'solid', borderColor: TERRA.lime, borderWidth: s.bw, ...s }}/>
      ))}
    </div>
  );
}

function SceneColdOpen({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const logoP = clamp((localTime - 0.4) / 0.9, 0, 1);
        const logoEased = Easing.easeOutExpo(logoP);
        const subP = clamp((localTime - 1.6) / 0.7, 0, 1);
        const exitP = clamp((localTime - 3.5) / 0.5, 0, 1);
        const exitY = Easing.easeInCubic(exitP) * -30;
        const exitOp = 1 - exitP;
        const lineOffset = localTime * 20;
        return (
          <div style={{ position: 'absolute', inset: 0, background: TERRA.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: -100, background: `repeating-linear-gradient(-20deg, transparent 0 60px, rgba(236,236,228,0.025) 60px 61px, transparent 61px 120px)`, transform: `translateX(${lineOffset}px)` }}/>
            <div style={{ position: 'absolute', left: 0, right: 0, top: `${(localTime * 30) % 110 - 5}%`, height: 1, background: `linear-gradient(90deg, transparent, ${TERRA.lime}, transparent)`, opacity: 0.6 }}/>
            <div style={{ position: 'relative', transform: `translateY(${exitY}px)`, opacity: exitOp, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.3em', color: TERRA.lime, textTransform: 'uppercase', opacity: clamp((localTime - 0.2) / 0.4, 0, 1), marginBottom: 32 }}>
                — A DIGITAL GROWTH AGENCY —
              </div>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ fontFamily: SANS, fontSize: 280, fontWeight: 900, letterSpacing: '-0.05em', color: TERRA.fg, lineHeight: 0.9, clipPath: `inset(0 ${(1 - logoEased) * 100}% 0 0)` }}>TERRA.</div>
                <div style={{ position: 'absolute', left: 0, bottom: 20, height: 8, width: `${logoEased * 100}%`, background: TERRA.lime }}/>
              </div>
              <div style={{ marginTop: 24, fontFamily: SANS, fontSize: 26, fontWeight: 400, color: TERRA.dim, letterSpacing: '0.02em', opacity: subP, transform: `translateY(${(1 - subP) * 8}px)` }}>
                Your long-term growth partner.
              </div>
            </div>
            <HUD sceneLabel="COLD OPEN" sceneNum={1} totalScenes={5} />
          </div>
        );
      }}
    </Sprite>
  );
}

function SceneManifesto({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const words = [
          { text: 'REAL', sub: 'PEOPLE.', t: 0.2, accent: false },
          { text: 'REAL', sub: 'RESULTS.', t: 1.5, accent: false },
          { text: 'NO', sub: 'BS.', t: 2.8, accent: true },
        ];
        const exitP = clamp((localTime - (duration - 0.55)) / 0.5, 0, 1);
        const exitOp = 1 - exitP;
        return (
          <div style={{ position: 'absolute', inset: 0, background: TERRA.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: exitOp }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(90deg, ${TERRA.line} 1px, transparent 1px)`, backgroundSize: '25% 100%', opacity: 0.5 }}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', padding: '0 120px' }}>
              {words.map((w, i) => {
                const wp = clamp((localTime - w.t) / 0.35, 0, 1);
                const eased = Easing.easeOutExpo(wp);
                const slideX = (1 - eased) * -80;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 32, opacity: wp, transform: `translateX(${slideX}px)`, overflow: 'hidden' }}>
                    <div style={{ fontFamily: MONO, fontSize: 16, color: TERRA.dim, width: 40, letterSpacing: '0.1em' }}>0{i + 1}</div>
                    <div style={{ fontFamily: SANS, fontSize: 140, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: TERRA.fg }}>{w.text}</div>
                    <div style={{ fontFamily: SANS, fontSize: 140, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: w.accent ? TERRA.lime : TERRA.fg, fontStyle: w.accent ? 'italic' : 'normal' }}>{w.sub}</div>
                  </div>
                );
              })}
              <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 20, opacity: clamp((localTime - 3.8) / 0.5, 0, 1) }}>
                <div style={{ width: 60, height: 2, background: TERRA.lime }}/>
                <div style={{ fontFamily: MONO, fontSize: 14, color: TERRA.dim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>We don't win unless you do.</div>
              </div>
            </div>
            <HUD sceneLabel="MANIFESTO" sceneNum={2} totalScenes={5} />
          </div>
        );
      }}
    </Sprite>
  );
}

function Counter({ from, to, suffix = '', prefix = '', duration, t, fixed = 0 }) {
  const p = clamp(t / duration, 0, 1);
  const eased = Easing.easeOutExpo(p);
  const v = from + (to - from) * eased;
  const display = fixed > 0 ? v.toFixed(fixed) : Math.round(v).toString();
  return `${prefix}${display}${suffix}`;
}

function SceneStats({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const stats = [
          { label: 'CLIENTS SERVED', from: 0, to: 150, suffix: '+', countDur: 1.9, startAt: 0.4 },
          { label: 'AVG. ROI INCREASE', from: 0, to: 3.2, suffix: 'x', fixed: 1, countDur: 1.9, startAt: 0.8 },
          { label: 'AI SUPPORT', from: 0, to: 24, suffix: '/7', countDur: 1.9, startAt: 1.2 },
          { label: 'CLIENT RETENTION', from: 0, to: 98, suffix: '%', countDur: 1.9, startAt: 1.6 },
        ];
        const headerP = clamp(localTime / 0.7, 0, 1);
        const exitP = clamp((localTime - (duration - 0.6)) / 0.5, 0, 1);
        const globalOp = 1 - exitP;
        return (
          <div style={{ position: 'absolute', inset: 0, background: TERRA.lime, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 120px', opacity: globalOp }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 80, opacity: headerP, transform: `translateY(${(1 - headerP) * 12}px)` }}>
              <div style={{ width: 48, height: 2, background: TERRA.bg }}/>
              <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.2em', color: TERRA.bg, textTransform: 'uppercase' }}>THE NUMBERS — RECEIPTS, NOT PROMISES</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: `1px solid ${TERRA.bg}`, borderBottom: `1px solid ${TERRA.bg}` }}>
              {stats.map((s, i) => {
                const localT = Math.max(0, localTime - s.startAt);
                const appearP = clamp((localTime - (s.startAt - 0.1)) / 0.3, 0, 1);
                return (
                  <div key={i} style={{ padding: '48px 24px', borderLeft: i > 0 ? `1px solid ${TERRA.bg}` : 'none', opacity: appearP, transform: `translateY(${(1 - appearP) * 20}px)` }}>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: TERRA.bg, letterSpacing: '0.15em', marginBottom: 24, opacity: 0.6 }}>0{i + 1} / 04</div>
                    <div style={{ fontFamily: SANS, fontSize: 140, fontWeight: 900, color: TERRA.bg, letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {Counter({ from: s.from, to: s.to, suffix: s.suffix, duration: s.countDur, t: localT, fixed: s.fixed || 0 })}
                    </div>
                    <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 18, fontWeight: 600, color: TERRA.bg, letterSpacing: '0.02em' }}>{s.label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 64, display: 'flex', gap: 4, height: 40, alignItems: 'flex-end' }}>
              {Array.from({ length: 40 }, (_, i) => {
                const phase = (localTime * 2 + i * 0.15) % (Math.PI * 2);
                const h = 20 + Math.abs(Math.sin(phase)) * 20;
                const op = clamp((localTime - 0.4) / 0.8, 0, 1);
                return (<div key={i} style={{ width: 8, height: h, background: TERRA.bg, opacity: op * 0.8 }}/>);
              })}
            </div>
            <HUD sceneLabel="THE NUMBERS" sceneNum={3} totalScenes={5} />
          </div>
        );
      }}
    </Sprite>
  );
}

function SceneResults({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const results = [
          { metric: '$127K', label: 'TRACKED REVENUE', client: 'SUMMIT ROOFING', detail: 'Cold account → 3.8x ROAS in 90 days' },
          { metric: '+340%', label: 'ORGANIC ENQUIRIES', client: 'LUXE SKIN CLINIC', detail: 'Booked 6 weeks out in 90 days' },
          { metric: '4.1x', label: 'RETURN ON AD SPEND', client: 'CLEARPATH LAW', detail: '4x consultations, same budget' },
          { metric: '−61%', label: 'COST PER LEAD', client: 'LOANBRIDGE FINANCIAL', detail: 'Half the cost, twice the quality' },
          { metric: '#1', label: '14 LOCAL KEYWORDS', client: 'NESTFINDER REALTY', detail: 'Organic > paid in 4 months' },
          { metric: '0', label: 'MISSED CALLS — EVER', client: 'PRESTIGE HOME SVCS', detail: '15 lost calls/day → 0', hold: true },
        ];
        const cardDur = 1.15;
        const lastCardBonus = 0.9;
        const totalCards = results.length;
        const regularSpan = (totalCards - 1) * cardDur;
        let currentIdx, cardLocal, effectiveDur;
        if (localTime < regularSpan) { currentIdx = Math.floor(localTime / cardDur); cardLocal = localTime - currentIdx * cardDur; effectiveDur = cardDur; }
        else { currentIdx = totalCards - 1; cardLocal = localTime - regularSpan; effectiveDur = cardDur + lastCardBonus; }
        currentIdx = clamp(currentIdx, 0, totalCards - 1);
        const cardP = clamp(cardLocal / effectiveDur, 0, 1);
        const r = results[currentIdx];
        const isLast = currentIdx === totalCards - 1;
        const pulse = isLast ? (1 + Math.sin(cardLocal * 5) * 0.04) : 1;
        const headerP = clamp(localTime / 0.5, 0, 1);
        const exitP = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1);
        const globalOp = 1 - exitP;
        return (
          <div style={{ position: 'absolute', inset: 0, background: TERRA.bg, display: 'flex', flexDirection: 'column', padding: '0 120px', justifyContent: 'center', opacity: globalOp }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40, opacity: headerP }}>
              <div style={{ width: 48, height: 2, background: TERRA.lime }}/>
              <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.2em', color: TERRA.lime, textTransform: 'uppercase' }}>PROVEN RESULTS — REAL CLIENTS, REAL NUMBERS</div>
            </div>
            <div key={currentIdx} style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', alignItems: 'center', gap: 80, borderTop: `1px solid ${TERRA.line}`, borderBottom: `1px solid ${TERRA.line}`, padding: '60px 0', position: 'relative' }}>
              <div style={{ transform: `scale(${pulse})`, transformOrigin: 'left center' }}>
                <div style={{ fontFamily: MONO, fontSize: 12, color: TERRA.dim, letterSpacing: '0.2em', marginBottom: 16 }}>CASE #{String(currentIdx + 1).padStart(2, '0')} / 0{results.length}{isLast ? ' · FINAL' : ''}</div>
                <div style={{ fontFamily: SANS, fontSize: isLast ? 340 : 220, fontWeight: 900, color: TERRA.lime, letterSpacing: '-0.05em', lineHeight: 0.9, clipPath: `inset(0 ${(1 - Easing.easeOutExpo(clamp(cardP * 2.2, 0, 1))) * 100}% 0 0)`, textShadow: isLast ? `0 0 60px ${TERRA.lime}55` : 'none' }}>{r.metric}</div>
                <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, color: TERRA.fg, letterSpacing: '0.05em', marginTop: 16, opacity: clamp((cardP - 0.2) / 0.3, 0, 1) }}>{r.label}</div>
              </div>
              <div style={{ borderLeft: `1px solid ${TERRA.line}`, paddingLeft: 60, opacity: clamp((cardP - 0.15) / 0.3, 0, 1), transform: `translateX(${(1 - clamp(cardP / 0.4, 0, 1)) * 20}px)` }}>
                <div style={{ fontFamily: MONO, fontSize: 12, color: TERRA.dim, letterSpacing: '0.2em', marginBottom: 12 }}>CLIENT</div>
                <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 800, color: TERRA.fg, letterSpacing: '-0.02em', marginBottom: 24, lineHeight: 1.05 }}>{r.client}</div>
                <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 400, color: TERRA.dim, letterSpacing: '0.01em', lineHeight: 1.4 }}>{r.detail}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 40 }}>
                  {results.map((_, i) => (<div key={i} style={{ width: i === currentIdx ? 40 : 20, height: 3, background: i === currentIdx ? TERRA.lime : i < currentIdx ? TERRA.fg : TERRA.line, transition: 'none' }}/>))}
                </div>
              </div>
            </div>
            <HUD sceneLabel="CASE FILES" sceneNum={4} totalScenes={5} />
          </div>
        );
      }}
    </Sprite>
  );
}

function SceneCTA({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const p1 = clamp(localTime / 0.7, 0, 1);
        const p2 = clamp((localTime - 0.7) / 0.8, 0, 1);
        const p3 = clamp((localTime - 1.8) / 0.7, 0, 1);
        const p4 = clamp((localTime - 2.8) / 0.7, 0, 1);
        const p5 = clamp((localTime - 3.9) / 0.6, 0, 1);
        const pulse = 1 + Math.sin(localTime * 4) * 0.02;
        return (
          <div style={{ position: 'absolute', inset: 0, background: TERRA.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 60%, rgba(212,255,58,0.12), transparent 60%)`, opacity: p2 }}/>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${TERRA.line} 1px, transparent 1px), linear-gradient(90deg, ${TERRA.line} 1px, transparent 1px)`, backgroundSize: '80px 80px', opacity: 0.4, maskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 80%)' }}/>
            <div style={{ textAlign: 'center', position: 'relative', padding: '0 80px' }}>
              <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '0.3em', color: TERRA.lime, textTransform: 'uppercase', marginBottom: 32, opacity: p1, transform: `translateY(${(1 - p1) * 8}px)` }}>→ READY TO GROW?</div>
              <div style={{ fontFamily: SANS, fontSize: 150, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 0.95, color: TERRA.fg, clipPath: `inset(0 ${(1 - Easing.easeOutExpo(p2)) * 100}% 0 0)` }}>Let's find out <br/><span style={{ color: TERRA.lime, fontStyle: 'italic' }}>if we fit.</span></div>
              <div style={{ marginTop: 32, fontFamily: SANS, fontSize: 22, fontWeight: 400, color: TERRA.dim, letterSpacing: '0.02em', opacity: p3, transform: `translateY(${(1 - p3) * 8}px)` }}>Free strategy call. No commitment. No pressure.</div>
              <div style={{ marginTop: 56, display: 'inline-flex', alignItems: 'center', gap: 24, opacity: p4, transform: `translateY(${(1 - p4) * 12}px) scale(${pulse})` }}>
                <div style={{ padding: '24px 48px', background: TERRA.lime, color: TERRA.bg, fontFamily: SANS, fontSize: 22, fontWeight: 800, letterSpacing: '0.02em', display: 'inline-flex', alignItems: 'center', gap: 16, borderRadius: 0 }}>BOOK A FREE CALL<span style={{ fontSize: 22 }}>→</span></div>
                <div style={{ fontFamily: MONO, fontSize: 13, color: TERRA.dim, letterSpacing: '0.1em', textAlign: 'left', lineHeight: 1.6 }}>DMITRIDEFREITAS.COM<br/>BASED IN BARBADOS</div>
              </div>
              <div style={{ marginTop: 72, opacity: p5, transform: `scale(${0.92 + p5 * 0.08})`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: TERRA.lime }}/>
                <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, color: TERRA.fg, letterSpacing: '-0.02em' }}>TERRA.</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: TERRA.dim, letterSpacing: '0.15em', marginLeft: 8 }}>— WE DON'T WIN UNLESS YOU DO</div>
              </div>
            </div>
            <HUD sceneLabel="CTA" sceneNum={5} totalScenes={5} />
          </div>
        );
      }}
    </Sprite>
  );
}

export { TERRA, SANS, MONO, HUD, SceneColdOpen, SceneManifesto, SceneStats, SceneResults, SceneCTA };
