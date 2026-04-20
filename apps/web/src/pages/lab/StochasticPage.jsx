import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Play, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext.jsx';

// ── Math ──────────────────────────────────────────────────────────────────────────

function randn() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function poissonSample(lam) {
  if (lam <= 0) return 0;
  const L = Math.exp(-Math.min(lam, 20));
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
function pctile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
function normalCDF(x) {
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1/(1+p*Math.abs(x)/Math.sqrt(2));
  const y = 1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-(x*x)/2);
  return 0.5*(1+sign*y);
}
function blackScholes(S, K, r, sigma, T, type) {
  if (T<=0||sigma<=0||S<=0||K<=0) return Math.max(type==='CALL'?S-K:K-S,0);
  const d1=(Math.log(S/K)+(r+sigma*sigma/2)*T)/(sigma*Math.sqrt(T));
  const d2=d1-sigma*Math.sqrt(T);
  if(type==='CALL') return S*normalCDF(d1)-K*Math.exp(-r*T)*normalCDF(d2);
  return K*Math.exp(-r*T)*normalCDF(-d2)-S*normalCDF(-d1);
}

// ── Process definitions ───────────────────────────────────────────────────────────

const PROCESSES = {
  GBM: {
    label: 'Geometric Brownian Motion',
    sde:   'dS = μS dt + σS dW',
    disc:  'S(t+dt) = S(t)·exp((μ − σ²/2)dt + σ√dt·Z)',
    color: '#6366f1', isPricePath: true,
    params: [
      { key:'S0',  label:'S₀',      min:10,   max:500,  step:5,    def:100  },
      { key:'mu',  label:'μ (ann.)', min:-0.3, max:0.6,  step:0.01, def:0.08 },
      { key:'sig', label:'σ (ann.)', min:0.05, max:0.9,  step:0.01, def:0.20 },
      { key:'T',   label:'T (yrs)', min:0.25, max:10,   step:0.25, def:1    },
    ],
    simulate(p, n) {
      const { S0,mu,sig,T } = p;
      const steps = T<=1 ? Math.max(Math.round(252*T),5) : Math.round(52*T);
      const dt = T/steps;
      const paths=[];
      for(let i=0;i<n;i++){
        const path=new Float64Array(steps+1); path[0]=S0; let S=S0;
        for(let t=0;t<steps;t++){
          S*=Math.exp((mu-0.5*sig*sig)*dt+sig*Math.sqrt(dt)*randn());
          path[t+1]=S;
        }
        paths.push(path);
      }
      return {paths,steps,S0,T,yLabel:'Price ($)'};
    },
    desc:'Standard equity price model. Log-returns are normally distributed; prices are log-normal. Underpins Black-Scholes and most derivatives pricing.',
  },

  'JUMP-DIFFUSION': {
    label: 'Merton Jump-Diffusion',
    sde:   'dS = (μ−λk̄)S dt + σS dW + S dJ  [J = compound Poisson]',
    disc:  'S(t+dt) = S(t)·GBM_factor · ∏exp(Yᵢ)  Yᵢ ~ N(μⱼ,σⱼ²)',
    color: '#ec4899', isPricePath: true,
    params: [
      { key:'S0',    label:'S₀',      min:10,   max:500,  step:5,    def:100   },
      { key:'mu',    label:'μ (ann.)', min:-0.3, max:0.6,  step:0.01, def:0.08  },
      { key:'sig',   label:'σ (ann.)', min:0.05, max:0.9,  step:0.01, def:0.18  },
      { key:'T',     label:'T (yrs)', min:0.25, max:10,   step:0.25, def:1     },
      { key:'lam',   label:'λ (jump rate/yr)', min:0, max:20, step:0.5, def:3  },
      { key:'muJ',   label:'μⱼ (jump mean)', min:-0.5, max:0.5, step:0.01, def:-0.1 },
      { key:'sigJ',  label:'σⱼ (jump std)',  min:0.01, max:0.5, step:0.01, def:0.15 },
    ],
    simulate(p, n) {
      const { S0,mu,sig,T,lam,muJ,sigJ } = p;
      const steps = T<=1 ? Math.max(Math.round(252*T),5) : Math.round(52*T);
      const dt = T/steps;
      const paths=[];
      for(let i=0;i<n;i++){
        const path=new Float64Array(steps+1); path[0]=S0; let S=S0;
        for(let t=0;t<steps;t++){
          let f=Math.exp((mu-0.5*sig*sig)*dt+sig*Math.sqrt(dt)*randn());
          const nJ=poissonSample(lam*dt);
          for(let j=0;j<nJ;j++) f*=Math.exp(muJ+sigJ*randn());
          S*=f; path[t+1]=S;
        }
        paths.push(path);
      }
      return {paths,steps,S0,T,yLabel:'Price ($)'};
    },
    desc:'GBM augmented with Poisson-driven log-normal jumps. Captures sudden price dislocations (earnings, crises). Fat tails and skew emerge naturally.',
  },

  'HESTON': {
    label: 'Heston Stochastic Volatility',
    sde:   'dS=μS dt+√v·S dW₁  ;  dv=κ(θ−v)dt+ξ√v dW₂  [corr ρ]',
    disc:  'Euler-Maruyama with Cholesky-correlated Brownians',
    color: '#f97316', isPricePath: true,
    params: [
      { key:'S0',  label:'S₀',            min:50,    max:500, step:10,   def:100  },
      { key:'mu',  label:'μ (drift)',      min:0,     max:0.3, step:0.01, def:0.05 },
      { key:'v0',  label:'v₀ (init var)', min:0.01,  max:0.3, step:0.01, def:0.04 },
      { key:'kap', label:'κ (reversion)', min:0.1,   max:8,   step:0.1,  def:1.5  },
      { key:'th',  label:'θ̄ (LR var)',   min:0.01,  max:0.3, step:0.01, def:0.04 },
      { key:'xi',  label:'ξ (vol of vol)',min:0.05,  max:2,   step:0.05, def:0.4  },
      { key:'rho', label:'ρ (leverage)',  min:-0.95, max:0.3, step:0.05, def:-0.7 },
      { key:'T',   label:'T (yrs)',       min:0.25,  max:5,   step:0.25, def:1    },
    ],
    simulate(p, n) {
      const { S0,mu,v0,kap,th,xi,rho,T } = p;
      const steps = T<=1 ? Math.max(Math.round(252*T),5) : Math.round(52*T);
      const dt = T/steps;
      const paths=[];
      for(let i=0;i<n;i++){
        const path=new Float64Array(steps+1); path[0]=S0; let S=S0,v=v0;
        for(let t=0;t<steps;t++){
          const Z1=randn(),Z2=randn();
          const W1=Z1, W2=rho*Z1+Math.sqrt(1-rho*rho)*Z2;
          v=Math.max(v+kap*(th-v)*dt+xi*Math.sqrt(Math.max(v,0))*Math.sqrt(dt)*W2,0);
          S*=Math.exp((mu-v/2)*dt+Math.sqrt(Math.max(v,0))*Math.sqrt(dt)*W1);
          path[t+1]=S;
        }
        paths.push(path);
      }
      return {paths,steps,S0,T,yLabel:'Price ($)'};
    },
    desc:'Stochastic volatility model with leverage effect (ρ<0). Generates realistic vol smiles/skews. The industry standard for equity options with semi-closed-form pricing via Fourier inversion.',
  },

  'OU': {
    label: 'Ornstein-Uhlenbeck',
    sde:   'dX = θ(μ − X)dt + σ dW',
    disc:  'X(t+dt) = X(t) + θ(μ−X(t))dt + σ√dt·Z',
    color: '#22c55e', isPricePath: false,
    params: [
      { key:'X0',  label:'X₀ (initial)',  min:-5,  max:5,  step:0.1, def:3   },
      { key:'mu',  label:'μ (LR mean)',   min:-3,  max:3,  step:0.1, def:0   },
      { key:'th',  label:'θ (speed)',     min:0.1, max:12, step:0.1, def:2   },
      { key:'sig', label:'σ (vol)',       min:0.1, max:3,  step:0.1, def:0.5 },
      { key:'T',   label:'T (yrs)',       min:0.5, max:10, step:0.5, def:3   },
    ],
    simulate(p, n) {
      const { X0,mu,th,sig,T } = p;
      const steps=Math.round(252*Math.min(T,5)), dt=T/steps;
      const paths=[];
      for(let i=0;i<n;i++){
        const path=new Float64Array(steps+1); path[0]=X0; let X=X0;
        for(let t=0;t<steps;t++){
          X+=th*(mu-X)*dt+sig*Math.sqrt(dt)*randn(); path[t+1]=X;
        }
        paths.push(path);
      }
      return {paths,steps,S0:X0,T,yLabel:'X(t)'};
    },
    desc:'Mean-reverting continuous process. Used for interest rates (Vasicek), spreads, and vol. Stationary distribution N(μ, σ²/2θ). Mean reversion half-life = ln2/θ.',
  },

  'CIR': {
    label: 'Cox-Ingersoll-Ross',
    sde:   'dr = κ(θ − r)dt + σ√r dW',
    disc:  'r(t+dt) = max(r(t)+κ(θ−r(t))dt + σ√r(t)·√dt·Z, 0)',
    color: '#eab308', isPricePath: false,
    params: [
      { key:'r0',  label:'r₀ (initial)',  min:0.005,max:0.15, step:0.005, def:0.05 },
      { key:'kap', label:'κ (reversion)', min:0.1,  max:8,   step:0.1,   def:1.5  },
      { key:'th',  label:'θ (LR rate)',   min:0.005,max:0.15, step:0.005, def:0.05 },
      { key:'sig', label:'σ (vol)',       min:0.01, max:0.2, step:0.005,  def:0.05 },
      { key:'T',   label:'T (yrs)',       min:1,    max:20,  step:1,      def:10   },
    ],
    simulate(p, n) {
      const { r0,kap,th,sig,T } = p;
      const steps=Math.round(52*T), dt=T/steps;
      const paths=[];
      for(let i=0;i<n;i++){
        const path=new Float64Array(steps+1); path[0]=r0; let r=r0;
        for(let t=0;t<steps;t++){
          r=Math.max(r+kap*(th-r)*dt+sig*Math.sqrt(Math.max(r,0))*Math.sqrt(dt)*randn(),0);
          path[t+1]=r;
        }
        paths.push(path);
      }
      return {paths,steps,S0:r0,T,yLabel:'r(t)'};
    },
    desc:'Mean-reverting with vol ∝ √r. Non-negative when 2κθ>σ² (Feller condition). Standard model for short rates and credit spreads. Stationary distribution: Gamma(2κθ/σ², σ²/2κ).',
  },
};

const PROC_NAMES = Object.keys(PROCESSES);

// ── Full simulation engine (for price processes) ──────────────────────────────────

function computeStats(simResult) {
  const { paths, steps, S0 } = simResult;
  const n = paths.length;
  const finalPrices = paths.map(p => p[steps]);
  const sorted = [...finalPrices].sort((a,b)=>a-b);
  const mean   = finalPrices.reduce((a,b)=>a+b,0)/n;
  const median = pctile(sorted,50);
  const std    = Math.sqrt(finalPrices.reduce((a,b)=>a+(b-mean)**2,0)/n);
  const p5=pctile(sorted,5), p95=pctile(sorted,95);
  const pProfit = finalPrices.filter(v=>v>S0).length/n;

  const meanPath = new Float64Array(steps+1);
  for(let t=0;t<=steps;t++) meanPath[t]=paths.reduce((a,p)=>a+p[t],0)/n;

  const BS=Math.min(steps+1,41);
  const bandIdx=Array.from({length:BS},(_,i)=>Math.round(i*steps/(BS-1)));
  const p5B=new Float64Array(BS), p95B=new Float64Array(BS);
  bandIdx.forEach((tIdx,i)=>{
    const vals=[...paths.map(p=>p[tIdx])].sort((a,b)=>a-b);
    p5B[i]=pctile(vals,5); p95B[i]=pctile(vals,95);
  });

  const hMin=sorted[0], hMax=sorted[sorted.length-1];
  const bW=(hMax-hMin)/25||1;
  const bins=Array.from({length:25},(_,i)=>({
    price:hMin+(i+0.5)*bW, label:`$${(hMin+i*bW).toFixed(0)}`, count:0,
  }));
  finalPrices.forEach(v=>{ const idx=Math.min(Math.floor((v-hMin)/bW),24); bins[idx].count++; });

  return { meanPath,p5Band:p5B,p95Band:p95B,bandIdx,sorted,bins,
           stats:{mean,median,std,p5,p95,pProfit,S0} };
}

// ── Canvas drawing ────────────────────────────────────────────────────────────────

function drawPaths(canvas, simResult, extra, theme) {
  if(!canvas||!simResult) return;
  const { paths,steps } = simResult;
  const { meanPath,p5Band,p95Band,bandIdx,stats:{S0} } = extra;

  const dpr=window.devicePixelRatio||1;
  const W=canvas.offsetWidth, H=canvas.offsetHeight;
  canvas.width=W*dpr; canvas.height=H*dpr;
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);

  const cs=getComputedStyle(document.documentElement);
  const hsl =v=>`hsl(${cs.getPropertyValue(v).trim()})`;
  const hsla=(v,a)=>`hsla(${cs.getPropertyValue(v).trim()},${a})`;

  ctx.fillStyle=hsl('--card'); ctx.fillRect(0,0,W,H);

  let minP=Infinity,maxP=-Infinity;
  p5Band.forEach(v=>{if(v<minP)minP=v});
  p95Band.forEach(v=>{if(v>maxP)maxP=v});
  const pad=(maxP-minP)*0.1||Math.abs(S0)*0.2||1;
  minP-=pad; maxP+=pad;

  const PL=58,PR=14,PT=14,PB=30;
  const cW=W-PL-PR, cH=H-PT-PB;
  const xP=t=>PL+(t/steps)*cW;
  const yP=v=>PT+(1-(v-minP)/(maxP-minP))*cH;

  // grid
  ctx.strokeStyle=hsla('--border',0.4); ctx.lineWidth=0.5;
  for(let i=0;i<=4;i++){
    const y=PT+(i/4)*cH;
    ctx.beginPath(); ctx.moveTo(PL,y); ctx.lineTo(W-PR,y); ctx.stroke();
    const val=maxP-(i/4)*(maxP-minP);
    ctx.fillStyle=hsla('--muted-foreground',0.6);
    ctx.font='9px monospace'; ctx.textAlign='right';
    ctx.fillText(val>=1?`$${val.toFixed(0)}`:`${val.toFixed(4)}`,PL-4,y+3);
  }

  // S0 dashed reference
  ctx.strokeStyle=hsla('--muted-foreground',0.3); ctx.setLineDash([4,4]); ctx.lineWidth=1;
  const y0=yP(S0);
  ctx.beginPath(); ctx.moveTo(PL,y0); ctx.lineTo(W-PR,y0); ctx.stroke(); ctx.setLineDash([]);

  // confidence band
  ctx.fillStyle=hsla('--primary',0.07);
  ctx.beginPath();
  bandIdx.forEach((tI,i)=>{ const x=xP(tI); i===0?ctx.moveTo(x,yP(p95Band[i])):ctx.lineTo(x,yP(p95Band[i])); });
  for(let i=bandIdx.length-1;i>=0;i--) ctx.lineTo(xP(bandIdx[i]),yP(p5Band[i]));
  ctx.closePath(); ctx.fill();

  // paths
  const disp=paths.length>200?paths.slice(0,200):paths;
  const alpha=paths.length>500?0.10:paths.length>100?0.18:0.28;
  disp.forEach(path=>{
    ctx.strokeStyle=`rgba(180,180,180,${alpha})`;
    ctx.lineWidth=0.8; ctx.beginPath();
    for(let t=0;t<=steps;t++) t===0?ctx.moveTo(xP(t),yP(path[t])):ctx.lineTo(xP(t),yP(path[t]));
    ctx.stroke();
  });

  // mean path
  ctx.strokeStyle=hsl('--foreground'); ctx.lineWidth=2; ctx.beginPath();
  for(let t=0;t<=steps;t++) t===0?ctx.moveTo(xP(t),yP(meanPath[t])):ctx.lineTo(xP(t),yP(meanPath[t]));
  ctx.stroke();

  // x labels
  const T=simResult.T;
  ctx.fillStyle=hsla('--muted-foreground',0.5); ctx.font='9px monospace'; ctx.textAlign='center';
  const lbls=T<=1?['0','3M','6M','9M','1Y'].slice(0,T<=0.25?3:T<=0.5?4:5)
             :['0',...Array.from({length:Math.ceil(T)},(_,i)=>`${i+1}Y`)];
  lbls.forEach((l,i)=>ctx.fillText(l,PL+(i/(lbls.length-1))*cW,H-8));
}

// ── Sub-components ────────────────────────────────────────────────────────────────

function SliderRow({label,min,max,step,value,onChange}){
  return (
    <div className="mb-2.5">
      <div className="flex justify-between mb-0.5">
        <span className="font-mono text-[9px] text-muted-foreground">{label}</span>
        <span className="font-mono text-[9px] text-primary tabular-nums">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))} className="w-full h-1 accent-primary"/>
    </div>
  );
}

const HistTooltip=({active,payload})=>{
  if(!active||!payload?.length) return null;
  return(
    <div className="border border-border bg-background p-2 font-mono text-[10px]">
      <p>price: ${payload[0]?.payload?.price?.toFixed(2)}</p>
      <p>count: {payload[0]?.value}</p>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────────

export default function StochasticPage(){
  const {theme}=useTheme();
  const canvasRef=useRef(null);

  const [procName,setProcName]=useState('GBM');
  const [paramVals,setParamVals]=useState(()=>{
    const v={}; PROCESSES.GBM.params.forEach(p=>{v[p.key]=p.def;}); return v;
  });
  const [numPaths,setNumPaths]=useState(500);
  const [running,setRunning]=useState(false);
  const [simResult,setSimResult]=useState(null);
  const [extra,setExtra]=useState(null);

  // Option pricer
  const [optK,setOptK]=useState(100);
  const [optR,setOptR]=useState(0.05);
  const [optType,setOptType]=useState('CALL');

  const proc=PROCESSES[procName];

  const handleProcChange=useCallback(name=>{
    setProcName(name);
    const v={}; PROCESSES[name].params.forEach(p=>{v[p.key]=p.def;}); setParamVals(v);
    setSimResult(null); setExtra(null);
  },[]);

  const run=useCallback(()=>{
    setRunning(true);
    setTimeout(()=>{
      const raw=proc.simulate(paramVals,numPaths);
      const ex=computeStats(raw);
      setSimResult(raw); setExtra(ex);
      setRunning(false);
      // Sync option strike to S0
      if(proc.isPricePath) setOptK(Math.round(paramVals.S0||100));
    },10);
  },[proc,paramVals,numPaths]);

  useEffect(()=>{
    if(simResult&&extra&&canvasRef.current) drawPaths(canvasRef.current,simResult,extra,theme);
  },[simResult,extra,theme]);

  useEffect(()=>{
    const ro=new ResizeObserver(()=>{
      if(simResult&&extra&&canvasRef.current) drawPaths(canvasRef.current,simResult,extra,theme);
    });
    if(canvasRef.current) ro.observe(canvasRef.current);
    return()=>ro.disconnect();
  },[simResult,extra,theme]);

  // MC option price
  const mcOptionPrice=useMemo(()=>{
    if(!simResult||!extra||!proc.isPricePath) return null;
    const {paths,steps}=simResult;
    const r=optR, T=simResult.T, K=optK;
    const payoffs=paths.map(p=>optType==='CALL'?Math.max(p[steps]-K,0):Math.max(K-p[steps],0));
    return Math.exp(-r*T)*payoffs.reduce((a,b)=>a+b,0)/paths.length;
  },[simResult,extra,proc,optK,optR,optType]);

  const bsPrice=useMemo(()=>{
    if(!proc.isPricePath||!paramVals.S0) return null;
    const sig=paramVals.sig||paramVals.xi||0.2;
    return blackScholes(paramVals.S0,optK,optR,sig,paramVals.T||1,optType);
  },[proc,paramVals,optK,optR,optType]);

  const {stats}=extra||{};

  return(
    <>
      <Helmet><title>DDF·LAB — Stochastic Processes & Monte Carlo</title></Helmet>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">

          <div className="mb-6 border-b border-border pb-4">
            <p className="font-mono text-[9px] text-primary tracking-widest mb-1">[4] STOCHASTIC PROCESSES · MONTE CARLO</p>
            <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">SDE Simulator</h1>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              GBM · Jump-Diffusion · Heston · OU · CIR — full simulation engine, statistics, option pricing
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

            {/* ── Left panel ─────────────────────────────────────── */}
            <div className="xl:col-span-1 space-y-4">

              {/* Process selector */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">PROCESS</p>
                {PROC_NAMES.map(name=>(
                  <button key={name} onClick={()=>handleProcChange(name)}
                    className={`flex items-center gap-2 w-full mb-1.5 font-mono text-[10px] tracking-wider px-2 py-1.5 border transition-colors ${
                      procName===name?'border-primary bg-primary/10 text-primary':'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background:PROCESSES[name].color}}/>
                    {name}
                  </button>
                ))}
              </div>

              {/* Parameters */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">PARAMETERS</p>
                {proc.params.map(({key,label,min,max,step})=>(
                  <SliderRow key={key} label={label} min={min} max={max} step={step}
                    value={paramVals[key]??0}
                    onChange={v=>setParamVals(prev=>({...prev,[key]:v}))}/>
                ))}
              </div>

              {/* Paths + run */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">SIMULATION</p>
                <div className="flex gap-1.5 mb-3">
                  {[100,500,1000,5000].map(n=>(
                    <button key={n} onClick={()=>setNumPaths(n)}
                      className={`flex-1 font-mono text-[9px] py-1 border transition-colors ${
                        numPaths===n?'border-primary bg-primary/10 text-primary':'border-border text-muted-foreground'
                      }`}>
                      {n>=1000?`${n/1000}k`:n}
                    </button>
                  ))}
                </div>
                <button onClick={run} disabled={running}
                  className="w-full flex items-center justify-center gap-2 font-mono text-[10px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground py-2 transition-colors disabled:opacity-50">
                  <Play className="h-3 w-3"/>
                  {running?'RUNNING…':'RUN SIMULATION'}
                </button>
              </div>

              {/* SDE */}
              <div className="border border-border p-4">
                <p className="font-mono text-[10px] tracking-widest text-foreground mb-2">SDE</p>
                <p className="font-mono text-[9px] text-primary bg-muted/20 px-2 py-1.5 border border-border/50 mb-2 leading-relaxed">{proc.sde}</p>
                <p className="font-mono text-[8px] text-muted-foreground/70 leading-relaxed mb-2">{proc.disc}</p>
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">{proc.desc}</p>
              </div>
            </div>

            {/* ── Right panel ────────────────────────────────────── */}
            <div className="xl:col-span-3 space-y-4">

              {/* Canvas */}
              <div className="border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-[10px] tracking-widest text-foreground">
                    {proc.label} — {numPaths.toLocaleString()} PATHS
                    <span className="text-muted-foreground ml-2 text-[9px]">thick = mean · band = P5–P95</span>
                  </p>
                  {simResult&&(
                    <button onClick={()=>{setSimResult(null);setExtra(null);}}
                      className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground hover:text-primary border border-border px-2 py-0.5 transition-colors">
                      <RotateCcw className="h-2.5 w-2.5"/> CLEAR
                    </button>
                  )}
                </div>
                {!simResult?(
                  <div className="flex items-center justify-center border border-dashed border-border" style={{height:320}}>
                    <button onClick={run} className="font-mono text-[10px] tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 py-2 transition-colors flex items-center gap-2">
                      <Play className="h-3 w-3"/> RUN
                    </button>
                  </div>
                ):(
                  <canvas ref={canvasRef} className="w-full" style={{height:320}}/>
                )}
              </div>

              {/* Stats + histogram (price processes only) */}
              {simResult&&extra&&(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Stats */}
                  <div className="border border-border p-4">
                    <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">TERMINAL DISTRIBUTION</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {[
                        ['Mean',   proc.isPricePath?`$${stats.mean.toFixed(2)}`:stats.mean.toFixed(4)],
                        ['Median', proc.isPricePath?`$${stats.median.toFixed(2)}`:stats.median.toFixed(4)],
                        ['Std Dev',proc.isPricePath?`$${stats.std.toFixed(2)}`:stats.std.toFixed(4)],
                        ['P5',     proc.isPricePath?`$${stats.p5.toFixed(2)}`:stats.p5.toFixed(4)],
                        ['P95',    proc.isPricePath?`$${stats.p95.toFixed(2)}`:stats.p95.toFixed(4)],
                        ['P90 range',proc.isPricePath?`$${(stats.p95-stats.p5).toFixed(2)}`:`${(stats.p95-stats.p5).toFixed(4)}`],
                        ...(proc.isPricePath?[
                          ['P(above S₀)', `${(stats.pProfit*100).toFixed(1)}%`],
                          ['Paths', numPaths.toLocaleString()],
                        ]:[
                          ['Mean-rev time', `${(Math.log(2)/(paramVals.th||paramVals.kap||1)).toFixed(2)}Y`],
                          ['Paths', numPaths.toLocaleString()],
                        ]),
                      ].map(([k,v])=>(
                        <div key={k}>
                          <p className="font-mono text-[8px] text-muted-foreground">{k}</p>
                          <p className="font-mono text-[11px] font-bold text-primary tabular-nums">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Histogram */}
                  <div className="border border-border p-4">
                    <p className="font-mono text-[10px] tracking-widest text-foreground mb-3">TERMINAL PRICE DISTRIBUTION</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={extra.bins} margin={{top:4,right:8,bottom:4,left:8}}>
                        <XAxis dataKey="label" tick={{fontFamily:'monospace',fontSize:8}} interval={4}/>
                        <YAxis tick={{fontFamily:'monospace',fontSize:8}}/>
                        <Tooltip content={<HistTooltip/>}/>
                        <ReferenceLine x={`$${Math.round(stats.S0)}`} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3"/>
                        <Bar dataKey="count" maxBarSize={18}>
                          {extra.bins.map((b,i)=>(
                            <Cell key={i} fill={b.price>=stats.S0?'rgba(34,197,94,0.7)':'rgba(239,68,68,0.7)'}/>
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Option pricer (price processes only) */}
              {simResult&&extra&&proc.isPricePath&&(
                <div className="border border-border p-4">
                  <p className="font-mono text-[10px] tracking-widest text-foreground mb-4">OPTION PRICER</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Controls */}
                    <div className="md:col-span-1 space-y-3">
                      <SliderRow label="Strike K" min={Math.round(paramVals.S0*0.5)} max={Math.round(paramVals.S0*1.5)} step={1} value={optK} onChange={setOptK}/>
                      <SliderRow label="Risk-free r" min={0} max={0.15} step={0.005} value={optR} onChange={setOptR}/>
                      <div className="flex gap-2">
                        {['CALL','PUT'].map(t=>(
                          <button key={t} onClick={()=>setOptType(t)}
                            className={`flex-1 font-mono text-[10px] tracking-widest py-1.5 border transition-colors ${
                              optType===t?'border-primary bg-primary text-primary-foreground':'border-border text-muted-foreground'
                            }`}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <p className="font-mono text-[8px] text-muted-foreground">
                        Moneyness: {optK<paramVals.S0?'ITM':optK===paramVals.S0?'ATM':'OTM'}&nbsp;
                        ({((optK/paramVals.S0-1)*100).toFixed(1)}%)
                      </p>
                    </div>

                    {/* Results */}
                    <div className="md:col-span-2 grid grid-cols-3 gap-3">
                      {[
                        { label:'MC PRICE', val:mcOptionPrice!=null?`$${mcOptionPrice.toFixed(4)}`:'—', sub:`${numPaths.toLocaleString()} paths · ${procName}`, color:'text-primary' },
                        { label:'BLACK-SCHOLES', val:bsPrice!=null?`$${bsPrice.toFixed(4)}`:'—', sub:'Closed-form (GBM assumption)', color:'text-foreground' },
                        { label:'DIFFERENCE', val:mcOptionPrice!=null&&bsPrice!=null?`$${(mcOptionPrice-bsPrice).toFixed(4)}`:'—',
                          sub: mcOptionPrice!=null&&bsPrice!=null
                            ? Math.abs(mcOptionPrice-bsPrice)<0.01?'Models agree'
                              :(mcOptionPrice>bsPrice?`${procName} prices higher`:`${procName} prices lower`)
                            : '',
                          color: mcOptionPrice!=null&&bsPrice!=null
                            ? Math.abs(mcOptionPrice-bsPrice)<0.01?'text-green-500'
                              :mcOptionPrice>bsPrice?'text-red-400':'text-yellow-500'
                            :'text-muted-foreground'
                        },
                      ].map(({label,val,sub,color})=>(
                        <div key={label} className="border border-border p-3">
                          <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-1">{label}</p>
                          <p className={`font-mono text-lg font-bold tabular-nums ${color}`}>{val}</p>
                          <p className="font-mono text-[8px] text-muted-foreground mt-1">{sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
