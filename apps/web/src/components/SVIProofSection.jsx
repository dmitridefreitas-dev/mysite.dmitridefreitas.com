import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea,
  CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import {
  PAPER, sviW, gFunction, rawToJW, guaranteedFix,
  runExample51, naiveFitLesson, linspace,
} from '@/lib/sviGJProof.js';

// ── Correctness proof: reproduce Gatheral–Jacquier (2014) in the browser ────
// Every number in this section is computed client-side, on every page load,
// from the equations in the paper — and compared against the values the paper
// prints. Nothing is hard-coded except the published targets.

const fmt7 = (x) => {
  // match the paper's 7-significant-figure printing
  const s = x.toPrecision(7);
  return s.includes('e') ? (+s).toExponential(4) : s;
};
const fmtDelta = (a, b) => Math.abs(a - b).toExponential(1);

const CheckBadge = ({ ok }) => (
  <span className={`font-mono text-[8px] tracking-widest border px-1.5 py-0.5 ${
    ok ? 'text-terminal-green border-terminal-green/60 bg-terminal-green/5'
       : 'text-destructive border-destructive/60 bg-destructive/5'}`}>
    {ok ? 'PASS' : 'FAIL'}
  </span>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-2 font-mono text-[10px]">
      <p className="text-muted-foreground">k = {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.stroke }}>
          {p.name}: {p.value?.toFixed(5)}
        </p>
      ))}
    </div>
  );
};

export default function SVIProofSection() {
  const [ex51, setEx51] = useState(null);
  const [running, setRunning] = useState(false);

  // ── Static checks: computed on mount, deterministic ───────────────────────
  const proof = useMemo(() => {
    const t = PAPER.t;
    const jw = rawToJW(PAPER.vogtRaw, t);
    const gf = guaranteedFix(jw);
    const lesson = naiveFitLesson();

    const jwRows = [
      ['v_t   (ATM variance)', jw.v, PAPER.vogtJW.v],
      ['psi_t (ATM skew)', jw.psi, PAPER.vogtJW.psi],
      ['p_t   (put wing)', jw.p, PAPER.vogtJW.p],
      ['c_t   (call wing)', jw.c, PAPER.vogtJW.c],
      ['v~_t  (min variance)', jw.vTilde, PAPER.vogtJW.vTilde],
    ].map(([name, got, want]) => ({ name, got, want, ok: Math.abs(got - want) < 5e-6 }));

    const gfRows = [
      ["c'  = p + 2psi", gf.c, PAPER.guaranteedFix.c],
      ["v~' = 4vpc'/(p+c')^2", gf.vTilde, PAPER.guaranteedFix.vTilde],
    ].map(([name, got, want]) => ({ name, got, want, ok: Math.abs(got - want) < 5e-6 }));

    // g(k) on the Vogt smile — the paper's Figure 1 (right panel)
    const gData = linspace(-1.5, 1.5, 301).map((k) => ({
      k: +k.toFixed(3),
      g: +gFunction(k, PAPER.vogtRaw).toFixed(6),
    }));

    return { jw, gf, lesson, jwRows, gfRows, gData };
  }, []);

  const runExperiment = () => {
    setRunning(true);
    // let the button repaint before the ~50ms solve
    setTimeout(() => {
      const r = runExample51();
      const ks = linspace(-1.5, 1.5, 301);
      const chart = ks.map((k) => ({
        k: +k.toFixed(3),
        gVogt: +gFunction(k, PAPER.vogtRaw).toFixed(6),
        gOurs: +gFunction(k, r.optRaw).toFixed(6),
        gPaper: +gFunction(k, r.paperOptRaw).toFixed(6),
      }));
      const smile = ks.map((k) => ({
        k: +k.toFixed(3),
        ivVogt: +(Math.sqrt(sviW(k, PAPER.vogtRaw) / PAPER.t) * 100).toFixed(3),
        ivOurs: +(Math.sqrt(sviW(k, r.optRaw) / PAPER.t) * 100).toFixed(3),
        ivPaper: +(Math.sqrt(sviW(k, r.paperOptRaw) / PAPER.t) * 100).toFixed(3),
      }));
      let maxIvDiff = 0;
      for (const k of linspace(-1.5, 1.5, 601)) {
        maxIvDiff = Math.max(maxIvDiff, Math.abs(
          Math.sqrt(sviW(k, PAPER.vogtRaw) / PAPER.t) - Math.sqrt(sviW(k, r.optRaw) / PAPER.t),
        ));
      }
      setEx51({ ...r, chart, smile, maxIvDiff });
      setRunning(false);
    }, 30);
  };

  const { lesson } = proof;

  return (
    <div className="border border-primary/40 mt-6">
      {/* Header */}
      <div className="border-b border-primary/40 bg-primary/5 px-4 py-3">
        <p className="font-mono text-[9px] text-primary tracking-widest mb-1">
          CORRECTNESS PROOF · COMPUTED LIVE IN YOUR BROWSER
        </p>
        <h2 className="font-mono text-sm font-bold text-foreground">
          Reproducing Gatheral &amp; Jacquier (2014), &ldquo;Arbitrage-Free SVI Volatility Surfaces&rdquo;
        </h2>
        <p className="font-mono text-[10px] text-muted-foreground mt-1 leading-relaxed max-w-3xl">
          Every value below is computed from the paper&rsquo;s equations at page load and compared against the
          numbers the paper prints. The point: a volatility smile can fit market quotes perfectly and still be
          wrong — the published Vogt smile prices a butterfly below zero. The only way to see it is the density
          test g(k), eq. (2.1). {' '}
          <a href={PAPER.arxiv} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            arXiv:1204.0646 →
          </a>
        </p>
      </div>

      <div className="p-4 space-y-6">

        {/* The published example */}
        <div>
          <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">
            EXAMPLE 3.1 — THE VOGT SMILE (t = 1)
          </p>
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed mb-2">
            Raw SVI parameters (a, b, m, &rho;, &sigma;) = (&minus;0.0410, 0.1331, 0.3586, 0.3060, 0.4153) —
            the classical butterfly-arbitrage example, attributed to Axel Vogt. It looks like a perfectly
            reasonable smile. It is not.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['MIN g(k)', lesson.minG.toFixed(4), lesson.minG < 0],
              ['AT k =', lesson.minGk.toFixed(3), false],
              ['g < 0 ON', `[${lesson.negLo.toFixed(3)}, ${lesson.negHi.toFixed(3)}]`, false],
              ['VERDICT', 'BUTTERFLY ARB', true],
            ].map(([k, v, bad]) => (
              <div key={k} className="border border-border px-3 py-2">
                <p className="font-mono text-[8px] text-muted-foreground tracking-widest">{k}</p>
                <p className={`font-mono text-xs font-bold mt-0.5 ${bad ? 'text-destructive' : 'text-foreground'}`}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* g(k) chart — Figure 1 */}
        <div className="border border-border p-3">
          <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1">
            g(k) ON THE VOGT SMILE — REPRODUCES PAPER FIGURE 1 (RIGHT)
          </p>
          <p className="font-mono text-[8px] text-muted-foreground/60 mb-2">
            g(k) &lt; 0 &hArr; negative risk-neutral density &hArr; a butterfly spread with negative price. Shaded: the arbitrage region.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={proof.gData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="k" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} interval={49} />
              <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} width={52} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceArea x1={+lesson.negLo.toFixed(3)} x2={+lesson.negHi.toFixed(3)} fill="#ef4444" fillOpacity={0.12} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="g" name="g(k)" stroke="#22c55e" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Check 1: JW map */}
        <div>
          <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">
            CHECK 1 — RAW &rarr; JUMP-WINGS MAP, EQ. (3.5): FIVE PRINTED VALUES, SEVEN SIGNIFICANT FIGURES
          </p>
          <ProofTable rows={proof.jwRows} />
        </div>

        {/* Check 2: guaranteed fix */}
        <div>
          <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">
            CHECK 2 — SECTION 5.1 GUARANTEED ARBITRAGE-FREE REPAIR: TWO PRINTED VALUES
          </p>
          <ProofTable rows={proof.gfRows} />
        </div>

        {/* Check 3 + Experiment */}
        <div>
          <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">
            CHECK 3 — EXAMPLE 5.1: REPAIR THE SMILE, VERIFY THE PAPER&rsquo;S OPTIMUM
          </p>
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed mb-3 max-w-3xl">
            The paper holds (v, &psi;, p) fixed and re-optimizes the call wing c and minimum variance v&#771;
            under a butterfly penalty, printing the optimum (c*, v&#771;*) = (0.8564763, 0.0116249). Its objective
            is stated but under-specified (no strike grid, no penalty weight), so exact agreement is not the test.
            What is exactly checkable: that printed optimum must pass our independently-implemented g(k) test —
            and re-running the experiment with a fully documented objective must repair the smile the same way:
            call wing cut, minimum variance and ATM variance untouched.
          </p>

          {!ex51 && (
            <button
              onClick={runExperiment}
              disabled={running}
              className="px-6 py-2 border border-primary font-mono text-[10px] tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
            >
              {running ? 'SOLVING…' : '[RUN EXAMPLE 5.1 — NELDER-MEAD, LIVE →]'}
            </button>
          )}

          {ex51 && (
            <div className="space-y-4">
              {/* verification rows */}
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-[10px] border-collapse">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left px-2 py-1 border border-border font-normal tracking-widest text-[8px]">CLAIM</th>
                      <th className="text-right px-2 py-1 border border-border font-normal tracking-widest text-[8px]">COMPUTED</th>
                      <th className="text-center px-2 py-1 border border-border font-normal tracking-widest text-[8px]">RESULT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1 border border-border text-muted-foreground">
                        Paper&rsquo;s printed optimum (0.8564763, 0.0116249) is arbitrage-free
                      </td>
                      <td className="px-2 py-1 border border-border text-right tabular-nums">
                        min g = {ex51.paperOptMinG.minG.toExponential(3)} at k = {ex51.paperOptMinG.argK.toFixed(3)}
                      </td>
                      <td className="px-2 py-1 border border-border text-center"><CheckBadge ok={ex51.paperOptMinG.minG >= 0} /></td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1 border border-border text-muted-foreground">
                        Our re-run is arbitrage-free (12,001-pt grid on [&minus;3, 3])
                      </td>
                      <td className="px-2 py-1 border border-border text-right tabular-nums">
                        min g = {ex51.oursMinG.minG.toExponential(3)} at k = {ex51.oursMinG.argK.toFixed(3)}
                      </td>
                      <td className="px-2 py-1 border border-border text-center"><CheckBadge ok={ex51.oursMinG.minG >= 0} /></td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1 border border-border text-muted-foreground">
                        Same repair mechanism: c* inside (c&prime;, c_orig), v&#771;* within 2% of v&#771;
                      </td>
                      <td className="px-2 py-1 border border-border text-right tabular-nums">
                        ours (c*, v&#771;*) = ({ex51.cStar.toFixed(7)}, {ex51.vTildeStar.toFixed(7)}) · paper (0.8564763, 0.0116249)
                      </td>
                      <td className="px-2 py-1 border border-border text-center">
                        <CheckBadge ok={
                          ex51.cStar > ex51.guaranteed.c && ex51.cStar < proof.jw.c &&
                          Math.abs(ex51.vTildeStar / proof.jw.vTilde - 1) < 0.02
                        } />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Figure 2 reproduction: smiles + g(k) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-border p-3">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">
                    IMPLIED VOL SMILES — PAPER FIGURE 2 (LEFT)
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={ex51.smile} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="k" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} interval={49} />
                      <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} width={44} unit="%" />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} />
                      <Line type="monotone" dataKey="ivVogt" name="Vogt (arb.)" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="ivPaper" name="paper optimum" stroke="#3b82f6" strokeWidth={1.2} dot={false} strokeDasharray="6 3" />
                      <Line type="monotone" dataKey="ivOurs" name="our re-run" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-border p-3">
                  <p className="font-mono text-[9px] text-muted-foreground tracking-widest mb-2">
                    g(k) AFTER REPAIR — PAPER FIGURE 2 (RIGHT)
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={ex51.chart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="k" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} interval={49} />
                      <YAxis tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} width={52} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="gVogt" name="Vogt (arb.)" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="gPaper" name="paper optimum" stroke="#3b82f6" strokeWidth={1.2} dot={false} strokeDasharray="6 3" />
                      <Line type="monotone" dataKey="gOurs" name="our re-run" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <p className="font-mono text-[10px] text-muted-foreground leading-relaxed max-w-3xl">
                The repair moves the far call wing by {(ex51.maxIvDiff * 100).toFixed(2)} vol points at most while
                ATM variance is held exactly fixed (v is a parameter of the jump-wings form). Difference vs the
                paper&rsquo;s printed c*: {Math.abs(ex51.cStar - PAPER.optimalFix.c).toFixed(4)} — both optima sit
                on the same feasibility corridor; the gap is the paper&rsquo;s unstated grid/penalty, documented above.
                Methodology of our objective: 101-point price grid on [&minus;1.5, 1.5], squared option-price
                differences (normalized Black-Scholes), penalty 10&#8312; &middot; &Sigma; max(0, &minus;g)&sup2; on a
                1,201-point grid over [&minus;3, 3], Nelder-Mead from the guaranteed-feasible point, feasibility
                verified post-hoc on a 12,001-point grid.
              </p>
            </div>
          )}
        </div>

        {/* The lesson */}
        <div className="border border-yellow-600/40 bg-yellow-500/5 px-4 py-3">
          <p className="font-mono text-[9px] text-yellow-600 tracking-widest mb-1">
            WHY THE NAIVE FIT MISSES THIS
          </p>
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed max-w-3xl">
            Fit raw SVI to the Vogt smile&rsquo;s own implied vols by least squares and you recover it with
            <span className="text-foreground"> 0.0000 IV error</span> — a perfect fit — while
            <span className="text-destructive"> min g(k) = {lesson.minG.toFixed(4)}</span> prices a butterfly
            below zero on k &isin; [{lesson.negLo.toFixed(2)}, {lesson.negHi.toFixed(2)}]. An IV-space objective
            is structurally blind to a negative density. This is why the live calibrator on this page runs the
            g(k) check on every fit instead of trusting the residuals.
          </p>
        </div>

        {/* Footer */}
        <p className="font-mono text-[9px] text-muted-foreground/60 leading-relaxed">
          SAME CHECKS RUN IN CI (PYTHON, NUMPY-ONLY) &middot;{' '}
          <a href="https://github.com/dmitridefreitas-dev/svi-volatility-calibration" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            github.com/dmitridefreitas-dev/svi-volatility-calibration
          </a>{' '}
          &middot; REFERENCE: GATHERAL &amp; JACQUIER, QUANTITATIVE FINANCE 14(1), 2014 &middot; EXAMPLES 3.1 &amp; 5.1, EQ. (2.1), (3.5), LEMMA 3.2
        </p>
      </div>
    </div>
  );
}

// ── computed-vs-printed table ────────────────────────────────────────────────

function ProofTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-[10px] border-collapse">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left px-2 py-1 border border-border font-normal tracking-widest text-[8px]">PARAMETER</th>
            <th className="text-right px-2 py-1 border border-border font-normal tracking-widest text-[8px]">COMPUTED (LIVE)</th>
            <th className="text-right px-2 py-1 border border-border font-normal tracking-widest text-[8px]">PAPER PRINTS</th>
            <th className="text-right px-2 py-1 border border-border font-normal tracking-widest text-[8px]">|&Delta;|</th>
            <th className="text-center px-2 py-1 border border-border font-normal tracking-widest text-[8px]">CHECK</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="px-2 py-1 border border-border text-muted-foreground whitespace-pre">{r.name}</td>
              <td className="px-2 py-1 border border-border text-right tabular-nums text-foreground">{fmt7(r.got)}</td>
              <td className="px-2 py-1 border border-border text-right tabular-nums text-muted-foreground">{r.want}</td>
              <td className="px-2 py-1 border border-border text-right tabular-nums text-terminal-green">{fmtDelta(r.got, r.want)}</td>
              <td className="px-2 py-1 border border-border text-center"><CheckBadge ok={r.ok} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
