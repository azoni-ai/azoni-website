# azoni.ai Portfolio — Prioritized Build Plan

_Generated from a multi-agent audit (visual design, technical/SEO/a11y, depth/completeness) + synthesis, 2026-07-21._

## 1. Verdict

The site is a genuinely impressive *system* — live commit stats, an agent-activity pulse, a RAG chatbot, and consolidated live-ops surfaces — but it undersells the engineer behind it. The infrastructure and IA are ~80% of the way to senior-polished; the gaps are credibility gaps, not plumbing gaps. Two things hold it back most: (a) the project detail pages are catalog blurbs with no code links, no screenshots, and no case-study depth, so the strongest engineering claims are unverifiable assertions; and (b) there is no About/story, no articulated "how I work with AI" narrative, and no clear conversion ask — the exact content a hiring manager reads to decide on a senior/AI candidate. On top of that sits a thin layer of finishable polish: residual blue tokens on a "warm" site, missing OG image and per-route titles, a 788 KB main bundle bloated by an eagerly-imported game, and WCAG contrast failures on the signature mono labels.

## 2. Themes

- **T1 — Content is underselling real work (biggest gap).** Detail pages are an identical thin template; flagship infra/AI projects have no live link, no repo, no screenshots. → 2-3 flagship projects rebuilt as real case studies (Problem → Constraints → Approach → Architecture → Outcomes → Retrospective) with ≥1 screenshot each and something verifiable to click.
- **T2 — Missing the person and the pitch (About / method / conversion).** No About page, no career-arc narrative, no articulated AI-assisted-dev method, no "what I'm looking for" CTA, contradictory experience numbers, current role missing from timeline.
- **T3 — Credibility substantiation (proof, skills, accuracy).** Orphaned skills data renders nowhere; no social proof; some headline metrics stale/unverifiable (MacroMarket "187 foods" vs 294).
- **T4 — Brand consistency: residual blue + rainbow accents.** Retired blue still in core tokens; career timeline + "How it runs" inject saturated logo/agent colors.
- **T5 — SEO / social / a11y hygiene.** No per-route titles, no OG/Twitter image, no robots/sitemap, 404-ing icons, muted labels failing AA contrast, no skip link, focus rings removed.
- **T6 — Performance & dead code.** 15.5k-line game eagerly bundled into main (788 KB), ~6 first-paint requests, >1 MB PNGs, dead components/CSS/data.
- **T7 — Visual rhythm micro-polish.** Drifting chip radii, eyebrow tracking, heading hierarchy, grid gap.

## 3. Prioritized backlog

### Iteration 1 — Highest impact (credibility + cheap wins)
- **[M][high] Kill residual blue at the token root.** `--accent-hover` → darker coral, `--accent-subtle` → coral-mix; grep-replace `#60a5fa` / `rgba(107,138,253,*)` fills. Do first.
- **[S][high] Lazy-load SpellBrigade** in `App.jsx` (drops the game out of the 788 KB main chunk).
- **[S][high] Add OG/Twitter image** — 1200×630 `/images/og-card.png` + meta.
- **[M][high] Per-route titles + descriptions** (react-helmet-async or React 19 native head hoisting).
- **[L][high] Rebuild 2-3 flagship projects as case studies** (`caseStudy`/`sections` schema field, render in ProjectDetail; render screenshot). Target FaB Stats, EmbedRoute, agent/MCP stack.
- **[M][high] Add an About page** with a real first-person bio story (replace `/about`→home redirect).
- **[M][high] Write "How I work with AI"** page or Home section — the method behind the on-page proof.
- **[S][high] Fix experience contradictions + add current role** (one number everywhere; Dec 2024–Present as top timeline entry; date ranges).
- **[S][med] Add a "Work with me" / contact section** (role type + focus + availability, email, resume/GitHub/LinkedIn).

### Iteration 2 — Polish & depth
- **[S][med] Warm the career timeline accents** (desaturate logo hexes → amber/sage/coral-muted).
- **[S][med] Constrain the "How it runs" agent palette** to warm-adjacent set.
- **[S][med] Fix the off-brand "New activity" button** (coral fill, dark ink, pill radius).
- **[S][med] Fix muted-label contrast (AA)** — lighten `--text-muted`/`--text-warm-muted` to ≈#8a8278.
- **[S][med] Surface a skills section** (or delete the dead data) — each strong claim links to proving project.
- **[M][med] Add social proof** — 2-4 short attributed quotes.
- **[S][med] Reconcile / soften unverifiable metrics** (MacroMarket 187→294; make no-link counts checkable or soften).
- **[S][med] Give no-link featured projects something to click** (repo, demo, redacted write-up).
- **[S][low] Robots + sitemap.**
- **[S][low] Fix icons/manifest 404s + theme-color.**

### Iteration 3 — Technical / nice-to-have
- **[M][med] Consolidate Home first-paint fetches** (preserve quota-safe cached-summary patterns — do NOT reintroduce listeners).
- **[M][low] Delete dead components + CSS + data** (HeroStats, ProjectShowcase, ProjectCard, InteractiveBackground, showcases, ui beams; dead `.projects-grid`/`.project-card` CSS; project-stories.js after trimming Admin).
- **[S][low] Consolidate the id scheme** across projects.js / sites.js.
- **[M][low] Optimize images** (hashmaps.png 1.46MB, dustbunny.png 1.19MB → WebP/AVIF).
- **[S][low] a11y: skip link + visible focus rings.**
- **[S][low] Projects error state.**
- **[S][low] Direct-link the pulse footer** to `/live?view=commits|activity`.
- **[S][low] Micro-polish batch** (chip radii, eyebrow tracking, "Selected work" eyebrow, product-grid gap, `.text-gradient` rename).

## 4. New things to add
- **About page** (`/about`) — first-person narrative arc.
- **"How I work with AI"** — the method behind the live proof.
- **2-3 real case studies** via new `caseStudy` schema field.
- **Skills section** grouped by domain, each claim linking to the proving project.
- **References / testimonials block.**
- **"Work with me" CTA.**
- **Infra hygiene files:** robots.txt, sitemap.xml, real favicon/logo192/logo512, static OG card.

## 5. Design direction
- **Voice.** First-person, senior, specific, modest about numbers — evidence over adjectives. AI angle = method with guardrails, not gimmick.
- **Typography.** Fraunces serif headings; mono eyebrows at one spec — 0.72rem / 0.18em everywhere.
- **Color.** Strictly coral (#ff7a5c) + amber + sage on warm near-black (#13110f). Coral CTAs = dark ink (#18110e). Zero raw blue anywhere.
- **Spacing.** Generous, editorial. Product grid gap `--space-lg`. Non-pill chips one radius; `--radius-full` for pills only.
- **Motion.** Restrained — live pulse/activity is the only "alive" motion.
- **Accessibility as a first-class design constraint.** Body/label text ≥4.5:1; visible coral focus rings; skip link.

## 6. Risks / do-not-break
- Live-data plumbing joins through `sites.js.boardProjectId` — id changes must be atomic + verified.
- Preserve quota-safe fetch patterns (no real-time listeners / per-visitor Firestore reads on Home/Board).
- Don't regress the `/live` consolidation or the `/activity /commits /leaderboard` redirects.
- SpellBrigade lazy-load must keep `/game` working (Suspense boundary).
- `project-stories.js` is imported only by dead components ProjectShowcase.jsx and HeroStats.jsx (both on the delete list) — remove them together; Admin.jsx no longer imports it.
- Mobile: hand-check at 320–390px (no headless verification available).
- Don't over-invest in empty vanity widgets (stars/comments).
- Accuracy is a trust lever — verify any new metric against the live source.
