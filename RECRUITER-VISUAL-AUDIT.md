# Recruiter-Facing Visual & Accessibility Audit
**Site:** mysite.dmitridefreitas.com · DDF·TERMINAL
**Date:** 2026-06-21
**Reviewer:** Claude (code-level audit + production build verification)

> Scope: how the site reads to a recruiter (clarity, trust signals, accessibility),
> plus concrete layout/UX bugs. Items marked **[FIXED]** are already applied in this
> branch (pending your local review). Items marked **[RECOMMEND]** are proposals for
> your sign-off before I touch them.

---

## A. BUGS FIXED IN THIS PASS  — needs your local check

### A1. Pop-up windows getting cut off  **[FIXED]**
This is the bug you saw: open RESEARCH → a project → scroll to **"05. ARTIFACTS"** and
the bottom of the window was clipped off-screen. It affected several modals, not just one.

Root cause (two separate problems):
1. **`CompetencyModal` and `SkillDetailModal`** (the cards on the About page) had
   `overflow-hidden` and **no maximum height**. On any short window — laptops, and
   especially phones — the content taller than the screen was simply chopped with no
   way to scroll to it. These are the worst offenders because they're tall (stat grids,
   applications, key features, footer).
2. **`ProjectDetailModal` and `ExperienceModal`** capped height with `vh` units.
   On mobile, `vh` counts the area *behind* the browser's address/nav bars, so the
   bottom ~10–15% (i.e. the ARTIFACTS section and the report links) sat underneath the
   browser chrome and looked cut off.

Fixes applied:
- Added a **safety net on the base dialog** (`src/components/ui/dialog.jsx`):
  every modal site-wide now gets `max-h-[90dvh]`, internal scrolling, and a small
  side margin on phones. No future modal can be clipped.
- Switched the four modals from `vh` → **`dvh` (dynamic viewport height)**, which
  correctly accounts for mobile browser bars.
- Removed the `overflow-hidden` traps on the two About-page modals so they scroll.

Files: `ui/dialog.jsx`, `CompetencyModal.jsx`, `SkillDetailModal.jsx`,
`ProjectDetailModal.jsx`, `ExperienceModal.jsx`.
**Please verify:** open the About page modals and a project modal on a phone (or a
short browser window) and confirm you can reach the bottom of each.

---

## B. HIGH-IMPACT RECRUITER ISSUES  — recommend fixing next

### B1. The "GitHub" button says *"Profile link coming soon"*  **[RECOMMEND]**
`Header.jsx` → the GH button fires a toast: *"Profile link coming soon."* For a
quant-dev / data-science candidate, a missing GitHub is a visible red flag — it's the
first thing many technical recruiters check. Options, best first:
1. Link a real GitHub profile (even a curated one with 3–4 pinned repos).
2. If there's genuinely no public code, **remove the GH button** rather than advertise
   its absence. Right now it actively draws attention to the gap.

### B2. The curated `/recruiter` page is hidden  **[RECOMMEND]**
You built a `/recruiter` page — headshot, status badges, one-click resume, top-5 tools,
quick facts, contact — which is *exactly* what a recruiter wants on one screen. But it
is **not linked anywhere in the nav**, so nobody will find it. Recommend either:
- Add a subtle "FOR RECRUITERS" link in the header, **or**
- Make it the destination of a prominent CTA on the home hero.
This is the single highest-leverage change for your stated audience.

### B3. Navigation information architecture is confusing  **[RECOMMEND]**
- The nav item labeled **"RESEARCH" actually goes to `/projects`**.
- Meanwhile a real `/research` section exists (Deflated Sharpe, SVI Calibration,
  HMM Regime Detection) that is **orphaned** — not reachable from the main nav.
- Recruiters can't tell "Research" (projects) from "Research" (the research pages).

Recommend: rename the nav item to **"PROJECTS"** (it points at /projects), and add a
separate **"RESEARCH"** entry for `/research` — or fold them into one clear menu.

### B4. Label inconsistency in the reading-mode toggle  **[RECOMMEND]**
Desktop header shows `VIEW: SIMPLE / QUANT`; the mobile menu shows `VIEW: EXEC / QUANT`
for the same toggle. Pick one word ("SIMPLE" or "EXEC") so it doesn't look like two
different features. (`Header.jsx` lines ~79 and ~210.)

---

## C. ACCESSIBILITY & READABILITY  — affects how "clear" the site feels

### C1. Font sizes are very small  **[RECOMMEND]**
The terminal aesthetic leans heavily on `text-[8px]`, `text-[9px]`, `text-[10px]`
monospace. That's well below the ~12–16px readability floor. A recruiter skimming for
30 seconds on a laptop has to squint. Suggest bumping the *body/content* tiers up one
notch (labels can stay small, but project descriptions, metrics, and contact details
should be ≥12px). Keep the look — just raise the smallest content text.

### C2. Low-contrast text fails WCAG AA  **[RECOMMEND]**
- Dark theme `--muted-foreground` is ~48% lightness on a near-black background, and the
  code frequently layers opacity on top (`text-muted-foreground/30`, `/40`, `/50`,
  `/60`). The `/30` and `/40` footnotes are effectively invisible and fail the 4.5:1
  AA ratio (and 3:1 even for large text).
- Recommend: raise `--muted-foreground` lightness a few points and reserve sub-50%
  opacity for purely decorative text only. Tiny + faint together is the core "hard to
  read" problem.

### C3. Decorative dotted leaders & separators
The dotted "·······" leaders in the project modal and various `/20`–`/40` divider lines
are fine decoratively, but make sure no actual *information* is rendered at those low
contrasts (e.g. the proficiency numbers, dates).

---

## D. PERFORMANCE  — first impression speed

### D1. Bundle size is heavy  **[RECOMMEND]**
Production build: main JS **1.6 MB** (478 KB gzip) + the **IV-Surface page 4.8 MB**
(1.47 MB gzip, from Plotly + three.js). On a phone or slow connection the first paint
is slow — recruiters bounce. IV-Surface is already lazy-loaded (good); consider:
- Lazy-load Plotly only when a chart is actually rendered.
- Code-split the 3D `Library` and other three.js pages the same way.
- A lighter charting lib for simple plots would cut the most weight.

---

## E. WHAT'S WORKING WELL  (keep)
- Consistent, distinctive "Bloomberg terminal" visual identity.
- Strong SEO/OG metadata on key pages (title, description, canonical, og:image).
- `/recruiter` page content is genuinely well-structured for the audience (just hidden).
- Resume is one click from the header and most pages.
- `overflow-x: clip` on body prevents accidental horizontal scroll globally.
- Project modals correctly hide "VIEW SOURCE CODE" when no code link exists.

---

## PRIORITY ORDER (suggested)
1. **A1 modal cut-offs** — done, verify locally.
2. **B1 GitHub button** — quick, high trust impact.
3. **B2 surface the /recruiter page** — highest leverage for your audience.
4. **B3 nav IA (Projects vs Research)** — removes confusion.
5. **C1/C2 font size + contrast** — broad readability win.
6. **D1 bundle size** — speed.
7. **B4 label consistency** — quick polish.

---

# RECRUITABILITY PASS — 2026-07-03  (all applied + verified)

## Applied
- **Header (desktop):** RESUME is now a solid filled primary button; RECRUITER
  highlighted next to it; LN/GH text buttons replaced with real LinkedIn/GitHub
  icons; nav raised 10px → 11px. Mobile menu: real icons, VIEW label unified to
  SIMPLE (was EXEC/SIMPLE mismatch — closes B4).
- **Home hero:** simplified to three primary CTAs (VIEW PROJECTS / RESUME /
  CONTACT) + "RECRUITER? EVERYTHING YOU NEED ON ONE PAGE →" funnel link (closes
  B2 at the hero level). THESES/LIVE DCF/RISK+α demoted into the position card
  as quiet links. Redundant tiny CV.PDF badge removed. Executive summary raised
  to 16px.
- **Typography/contrast floor (closes C1/C2):** global CSS overrides in
  `index.css` remap `text-[7px]`→9px, `text-[8px]`/`text-[9px]`→10px and lift
  `text-muted-foreground/20–50` opacities to ≥0.5 site-wide (hits all 24 lab
  pages without touching call sites). Dark `--muted-foreground` 62%→71%
  lightness, `--border` 9%→13%; brown 68%→74%. Added `:focus-visible` outline
  for keyboard users.
- **Mobile overflow bugs (fixed + machine-verified):** OptionsChain (home) now
  stacks to one column below `sm` and its tab bar scrolls; /projects and /news
  filter tabs wrap. 0 horizontal overflow across 8 pages × desktop/mobile.
- **Competencies marquee:** seamless loop (was a hard jump at -3000px), solid
  fade edges, label on solid background, 11px text.
- **Cards:** ProjectCard abstract 12→14px, metrics/stack/footer 10→11px.

## Tooling
- `tools/ui-audit.mjs` — CDP-based audit harness (Edge headless): screenshots
  every page at desktop 1440px + mobile 390px, detects horizontal overflow and
  names the offending elements. Run: `node tools/ui-audit.mjs --theme dark`
  (serve-local.js must be running on :4000). Output in `tools/shots/`.

## Verified
- 16/16 page×viewport combos: no horizontal overflow (was broken on /, /projects, /news mobile).
- Brown theme spot-checked (home, projects) — consistent.
- Mobile hamburger menu, contact form, news feed screenshot-verified.
- ESLint clean on all edited files. Reading mode already defaults to SIMPLE for
  new visitors. Light theme is archived in ThemeContext (dark/brown only).
- IV-Surface chunk is 1.70 MB (down from the 4.8 MB noted in D1); main bundle
  unchanged at 1.6 MB — D1 remains the main open item.

---

# PERFORMANCE + CONTACT-FORM PASS — 2026-07-04  (all applied + verified)

## Code splitting (closes D1)
- Route-level lazy loading in `App.jsx`: every page except the Home landing
  page is now a `React.lazy` chunk behind Suspense. **Main bundle 1,620 KB →
  503 KB (gzip 478 → 163 KB, −66%).** recharts (325 KB) now loads only on
  chart pages; quiz data (74 KB), IC Vault (73 KB), and 20+ lab tools each
  split into 8–30 KB chunks. Plotly (1.7 MB) stays isolated to /lab/iv-surface.
- Added `ErrorBoundary.jsx` around the route tree: a crashed page or a stale
  lazy chunk after a redeploy shows a RELOAD/HOME card instead of blanking the
  site.
- Headshot `IMG_1948.jpeg` downscaled 828×1792 (827 KB) → 600×1299 (64 KB).
- `apiServerClient` now treats 127.0.0.1/[::1] as local, not just localhost.

## Contact form — WAS BROKEN IN PRODUCTION (root cause found)
Symptom: submitting on the live site hangs on "TRANSMITTING DATA..." forever.
1. `GMAIL_USER` / `GMAIL_PASSWORD` / `RECIPIENT_EMAIL` are **empty** in .env
   and (evidently) on Render → nodemailer throws EAUTH "Missing credentials".
2. `src/routes/contact.js` had no try/catch — Express 4 does not catch async
   errors, so the request **hung forever** instead of returning 500.
Fixes: route hardened (config check → fast 503, try/catch → 502, SMTP
timeouts, HTML-escaping, reply-to); frontend adds a 75 s abort timeout and
honest error toasts pointing to direct email.
**REMAINING USER ACTION — email cannot send until you do this:**
1. Google Account → Security → 2-Step Verification → App passwords → create
   one for "Mail".
2. Render dashboard → newsapi service → Environment: set `GMAIL_USER`
   (your gmail), `GMAIL_PASSWORD` (the 16-char app password),
   `RECIPIENT_EMAIL` (where inquiries should arrive). Save → auto-redeploys.
3. Same values in the local `.env` if you want the form working locally.

## Verified
- 42/42 routes pass direct-load sweep (renders, no exceptions, no overflow,
  no stuck LOADING states) — `tools/ui-audit.mjs --all`.
- SPA click-through nav across all main-site pages: no exceptions; lazy
  chunk loading works mid-session, including the 1.7 MB IV-Surface chunk.
- Contact route now answers in <50 ms with a clear error when unconfigured
  (was: infinite hang). Render cold start measured at ~22 s — the frontend
  timeout accommodates it.
- ESLint clean.
