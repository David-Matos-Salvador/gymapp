---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples."
---

# UI/UX Pro Max — Premium Design Intelligence

Comprehensive design guide for web and mobile applications at a premium production bar. Contains 50+ styles, 161 color palettes, 57 font pairings, 161 product types with reasoning rules, 99 UX guidelines, and 25 chart types across 10 technology stacks. Searchable database with priority-based recommendations. Fully adopts the **impeccable premium standard**: design brief-first process, mock fidelity inventory, atmospheric motion, typographic rigor, eight-state interaction coverage, and the AI slop test gate at every deliverable.

## Premium Design Philosophy

These laws are non-negotiable. They separate shipped-quality work from AI-template work.

### The AI Slop Test

If someone could look at this interface and say "AI made that" without doubt, it's failed.

- **First-order reflex check**: Could someone guess the theme + palette from the category alone? ("healthcare → white + teal", "finance → navy + gold", "crypto → neon on black", "observability → dark blue"). If yes, rework the scene sentence and color strategy until the answer isn't obvious from the domain.
- **Second-order reflex check**: Could someone guess the aesthetic family from category-plus-anti-references? ("AI workflow tool not SaaS-cream → editorial-typographic", "fintech not navy-and-gold → terminal-native dark mode"). If yes, it's the trap one tier deeper. Rework until both answers are not obvious.
- **Slop signs to hunt and eliminate**: templated card grids with icon-title-subtitle, gradient text, glassmorphism as default, side-stripe borders on cards, the hero-metric template (big number + small label + supporting stats), generic loading copypasta ("Teaching robots to dance", "Consulting the magic 8-ball").

### Absolute Bans

Match-and-refuse. If you're about to write any of these, rewrite with different structure.

| Ban | Replacement |
|-----|-------------|
| Side-stripe borders (>1px colored accent on cards, list items, callouts) | Full borders, background tints, leading numbers/icons, or nothing |
| Gradient text (`background-clip: text` + gradient) | Single solid color; emphasis via weight or size |
| Glassmorphism as default (blur cards used decoratively) | Rare and purposeful, or nothing |
| Hero-metric template (big number + small label + supporting stats + gradient accent) | Any other information display |
| Identical card grids (same-size cards with icon + heading + text, repeated endlessly) | Vary composition; use cards only when content is truly distinct and actionable |
| Modal as first thought (without exhausting inline/progressive alternatives) | Expand-in-place, inline edit, drawer, or nothing |
| Bounce or elastic easing curves | `cubic-bezier(0.25, 1, 0.5, 1)` quart-out or equivalent |
| Em dashes (—) in copy | Commas, colons, semicolons, periods, or parentheses |
| Nested cards (cards inside cards) | Spacing, typography, subtle dividers for hierarchy within a card |

### Color Strategy

Pick a strategy before picking colors. Four steps on the commitment axis:

| Strategy | Coverage | When to Use |
|----------|----------|-------------|
| **Restrained** | Tinted neutrals + one accent ≤10% | Product default; tools, dashboards |
| **Committed** | One saturated color carries 30–60% of the surface | Brand default; identity-driven pages |
| **Full palette** | 3–4 named roles, each used deliberately | Brand campaigns; product data viz |
| **Drenched** | The surface IS the color | Brand heroes; campaign pages |

- Use OKLCH. Reduce chroma as lightness approaches 0 or 100; high chroma at extremes looks garish.
- Never use `#000` or `#fff`. Tint every neutral toward the brand hue (chroma 0.005–0.01 is enough).
- The "one accent ≤10%" rule is Restrained only. Committed / Full palette / Drenched exceed it on purpose.

### Theme Decision: The Physical Scene Sentence

Dark vs. light is never a default. Before choosing, write one sentence of physical context: who uses this, where, under what ambient light, in what mood. If the sentence doesn't force the answer, it's not concrete enough.

"SRE glancing at incident severity on a 27-inch monitor at 2am in a dim room" forces the answer. "Observability dashboard" does not.

### Register: Brand vs Product

Every design task is **brand** (design IS the product: landing pages, marketing, portfolios) or **product** (design SERVES the product: app UI, dashboards, tools).

| Aspect | Brand Register | Product Register |
|--------|---------------|-----------------|
| Motion | Orchestrated page-load sequences, staggered reveals, scroll-driven | 150–250ms transitions; motion conveys state: feedback, reveal, loading |
| Color | Committed / Full palette / Drenched encouraged | Restrained default; upgrade only when the surface earns it |
| Typography | Typographic risk: enormous display, italic cuts, mixed cases | Fixed rem scales, spatial predictability for container-based layouts |
| Delight | Distributed: copy voice, section transitions, discovery rewards, seasonal | At specific moments: completion, first-time actions, error recovery, milestones |
| Imagery | Mandatory when the brief implies it (hotel, food, fashion, travel, photography) | Zero imagery can be correct; voice carried through typography and structure |

## When to Apply

This Skill should be used when the task involves **UI structure, visual design decisions, interaction patterns, or user experience quality control** at a premium production bar.

### Must Use

- Designing new pages (Landing Page, Dashboard, Admin, SaaS, Mobile App)
- Creating or refactoring UI components (buttons, modals, forms, tables, charts, etc.)
- Choosing color schemes, typography systems, spacing standards, or layout systems
- Reviewing UI code for user experience, accessibility, or visual consistency
- Implementing navigation structures, animations, or responsive behavior
- Making product-level design decisions (style, information hierarchy, brand expression)
- Improving perceived quality, clarity, or usability of interfaces
- Pre-launch UI quality optimization to premium production bar
- Aligning cross-platform design (Web / iOS / Android)

### Recommended

- UI looks "not professional enough" but the reason is unclear
- Receiving feedback on usability or experience
- Building design systems or reusable component libraries
- Interface needs to survive the AI slop test
- Motion or interaction quality needs to feel premium rather than adequate

### Skip

- Pure backend logic development
- Only involving API or database design
- Performance optimization unrelated to the interface
- Infrastructure or DevOps work
- Non-visual scripts or automation tasks

**Decision criteria**: If the task will change how a feature **looks, feels, moves, or is interacted with**, this Skill should be used.

## Premium Design Process

The critical insight: most AI-generated UIs fail not because of bad code, but because of skipped thinking. Don't jump to "here's a card grid." Understand deeply first. Build to a premium bar. Iterate in-browser.

### Phase 1: Shape the Design

Before any code, produce a **design brief**. This is a structured artifact that guides implementation through discovery, not guesswork.

**Brief structure:**

1. **Feature Summary** (2–3 sentences): What this is, who it's for, what it needs to accomplish.
2. **Primary User Action**: The single most important thing a user should do or understand here.
3. **Design Direction**: Color strategy (Restrained / Committed / Full palette / Drenched) + the physical scene sentence that forces theme + 2–3 named anchor references (specific products, brands, objects — not adjectives like "modern" or "clean").
4. **Scope**: Fidelity (sketch / mid-fi / high-fi / production-ready), breadth (one screen / a flow / a surface), interactivity, time intent.
5. **Layout Strategy**: What gets emphasis, what's secondary, how information flows. Describe hierarchy and rhythm, not CSS.
6. **Key States**: List every state needed: default, empty, loading, error, success, edge cases. For each, note what the user needs to see and feel.
7. **Interaction Model**: How users interact. What happens on click, hover, scroll. What feedback they get. The flow from entry to completion.
8. **Content Requirements**: What copy, labels, empty state messages, error messages, and microcopy are needed.
9. **Recommended References**: Which design dimensions need deeper research.
10. **Open Questions**: Anything unresolved that the implementer should resolve during build.

### Phase 2: Generate Design System

Run `--design-system` to get comprehensive recommendations with reasoning:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This searches domains in parallel (product, style, color, landing, typography), applies reasoning rules from `ui-reasoning.csv`, and returns a complete design system: pattern, style, colors, typography, effects, plus anti-patterns to avoid.

**Persist for hierarchical retrieval across sessions:**

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

This creates `design-system/MASTER.md` (global source of truth) and optionally `design-system/pages/<page>.md` for per-page overrides. When building a specific page, check its page file first; if it exists, its rules override the Master.

### Phase 3: Visual Direction

When building net-new surfaces at mid-fi or higher fidelity, generate visual direction probes _before_ implementation. Generate 2–4 distinct directions that differ in primary visual direction (hierarchy, topology, density, typographic voice, or color strategy), not just palette tweaks. Pick a winner and summarize what carries into code and what doesn't.

**Mock fidelity inventory**: Before building, inventory the approved mock's major visible ingredients:
- Hero silhouette and dominant composition
- Signature motifs (devices, portraits, charts, badges, texture, insets)
- Nav and primary CTA treatment
- Section sequence, especially the second fold
- Image-native content the concept depends on
- Typography, density, color/material treatment, and motion cues

For each ingredient, decide how it will be implemented: semantic HTML/CSS/SVG, generated asset, sourced project asset, icon library, canvas/WebGL, or an explicitly accepted omission. Treat the mock as a **north star**, not a screenshot to trace. Do not rasterize core UI text. But if the live result lacks the mock's major visible ingredients, it's wrong.

### Phase 4: Build to Production Quality

Build in deliberate passes so structure, visual system, states, motion, and responsive behavior each get dedicated attention.

**Production bar:**

- Real or realistic content. Remove placeholder copy, placeholder images, dead links, fake controls, and unused scaffold before presenting.
- Preserve the approved mock's major ingredients. Missing hero objects, downgraded CTA/nav treatment, or generic replacements for distinctive motifs are blocking defects.
- Build semantically first: real headings, landmarks, labels, form associations, button/link semantics, accessible names, and state announcements.
- Calibrate spacing, alignment, grid placement, and vertical rhythm deliberately. Do not accept default gaps, arbitrary margins, unbalanced whitespace, or accidental optical misalignment.
- Typography must be intentional: chosen font loading strategy, clear hierarchy, readable measure, stable line breaks, tuned wrapping, and no overflow at mobile or large desktop sizes.
- Design realistic state coverage: default, hover, focus-visible, active, disabled, loading, error, success, empty, overflow, long text, short text, and first-run states.
- Interaction quality must feel finished: keyboard paths, touch targets ≥44×44px, feedback timing, scroll behavior, transitions between states, and no hover-only functionality.
- Make motion feel premium: use atmospheric blur, filter, mask, shadow, or reveal effects when they improve the experience; avoid casual layout-property animation, bound expensive effects, verify smoothness in-browser, respect reduced motion.
- Preserve maintainability: reusable local patterns, clear component boundaries, project conventions, no rasterized UI text, and no hard-coded one-off hacks.

### Phase 5: Browser-Based Iteration

Do not stop after the first implementation pass. Open the result in a browser and inspect screenshots, not just DOM output.

**Required viewport pass**: mobile narrow, tablet or small laptop, desktop wide. For each, check for: overlap, clipping, weak hierarchy, off-grid alignment, awkward whitespace, cramped controls, unreadable type, broken imagery, hover-only functionality, layout shift, and text overflow.

**Critique-and-fix loop** — repeat until no material issues remain against this checklist:

1. Does it match the design brief? Compare the live result against every section.
2. Does it match the approved mock? Compare against the mock fidelity inventory. Missing major ingredients are P0 defects.
3. Does it pass the AI slop test? If someone saw this and said "AI made this" immediately, it needs more design intention.
4. Check against all absolute bans. Fix any anti-pattern violations.
5. Check every state. Navigate through empty, error, loading, and edge case states. Each one should feel intentional.
6. Check responsive behavior. The design should adapt compositionally, not merely shrink.
7. Check craft details: spacing consistency, optical alignment, type hierarchy, color contrast, image quality, icon coherence, interactive feedback, motion timing, and focus treatment.
8. Check performance: no obviously oversized images, avoidable layout thrash, blocking animations, or heavy assets without reason.

**The exit bar**: the rendered result looks intentional at all viewports, all expected states are handled, no placeholders remain unless explicitly accepted, and the implementation quality would be defensible in a high-end studio review.

## Rule Categories by Priority

*For human/AI reference: follow priority 1→10 to decide which rule category to focus on first; use `--domain <Domain>` to query details when needed.*

| Priority | Category | Impact | Domain | Key Checks (Must Have) | Anti-Patterns (Avoid) |
|----------|----------|--------|--------|------------------------|------------------------|
| 0 | **Design Brief** | CRITICAL | process | Shape confirmed, mock fidelity inventory, color strategy chosen, theme scene sentence written | Jumping to code without a confirmed brief; treating a summary as a design brief |
| 1 | **Accessibility** | CRITICAL | `ux` | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels, Focus-visible rings (never `outline: none` without replacement) | Removing focus rings, Icon-only buttons without labels, Empty alt text on meaningful images |
| 2 | **Touch & Interaction** | CRITICAL | `ux` | Min size 44×44px, 8px+ spacing, Loading feedback, All eight interactive states designed | Reliance on hover only, Instant state changes (0ms), Placeholder-only labels |
| 3 | **AI Slop Test** | CRITICAL | all | Interface doesn't read as AI-generated; category-reflex check passed at both altitudes; zero absolute ban violations | Side-stripe borders, gradient text, glassmorphism as default, hero-metric template, identical card grids, modal as first thought |
| 4 | **Performance** | HIGH | `ux` | WebP/AVIF, Lazy loading, Reserve space (CLS < 0.1), 60fps target on target devices | Layout thrashing, Cumulative Layout Shift, Animating `width`/`height`/`top`/`left` |
| 5 | **Style Selection** | HIGH | `style`, `product` | Match product type, Consistency, SVG icons (no emoji), Color strategy matches register | Mixing flat & skeuomorphic randomly, Emoji as icons, Timid palettes on brand surfaces |
| 6 | **Layout & Responsive** | HIGH | `ux` | Mobile-first, 4pt base spacing system, No horizontal scroll, Consistent max-width, Self-adjusting grids (`auto-fit, minmax`) | Horizontal scroll, Fixed px container widths, Disable zoom, Cards-inside-cards, Same padding everywhere |
| 7 | **Typography & Color** | MEDIUM | `typography`, `color` | Base 16px, Line-height 1.5–1.75 for body, Semantic color tokens (OKLCH, no raw hex), Modular scale ≥1.25 ratio | Text < 12px body, Gray-on-gray, Raw hex in components, Flat type scales (1.1× apart), Too many font sizes too close together |
| 8 | **Animation & Motion** | MEDIUM | `ux` | 100/300/500 rule, Exponential easing (quart-out/quint-out/expo-out), Motion conveys meaning, Stagger sequence 30–50ms per item, Atmosphere via blur/filter/mask when smooth | Bounce/elastic curves, Decorative-only animation, Animating layout properties, No reduced-motion support, Blocking interaction during animation |
| 9 | **Forms & Feedback** | MEDIUM | `ux` | Visible labels, Error near field, Helper text, Progressive disclosure, Validate on blur (not keystroke), Undo > Confirm for destructive actions | Placeholder-only label, Errors only at top, Overwhelm upfront, Confirmation dialogs for reversible actions |
| 10 | **Navigation Patterns** | HIGH | `ux` | Predictable back, Bottom nav ≤5, Deep linking, Semantic z-index scale, Current location highlighted | Overloaded nav, Broken back behavior, No deep links, Arbitrary z-index values (e.g. `z-index: 9999`) |
| 11 | **Charts & Data** | LOW | `chart` | Legends, Tooltips, Accessible colors, Table alternative for accessibility | Relying on color alone to convey meaning, Pie/donut for >5 categories |

## Premium Motion Design

### The 100/300/500 Rule

Timing matters more than easing. These durations feel right:

| Duration | Use Case | Examples |
|----------|----------|----------|
| **100–150ms** | Instant feedback | Button press, toggle, color change, haptic-linked events |
| **200–300ms** | State changes | Menu open, tooltip, hover states, form transitions |
| **300–500ms** | Layout changes | Accordion, modal, drawer, expand/collapse |
| **500–800ms** | Entrance animations | Page load, hero reveals, staggered sequences |

Exit animations are faster than entrances—use ~75% of enter duration (exit-faster-than-enter).

### Exponential Easing Curves

Never use default `ease`. It's a compromise that's rarely optimal.

| Curve | Use For | CSS |
|-------|---------|-----|
| **ease-out-quart** | Entering elements (recommended default) | `cubic-bezier(0.25, 1, 0.5, 1)` |
| **ease-out-quint** | Slightly more dramatic entrances | `cubic-bezier(0.22, 1, 0.36, 1)` |
| **ease-out-expo** | Snappy, confident entrances | `cubic-bezier(0.16, 1, 0.3, 1)` |
| **ease-in** | Elements leaving | `cubic-bezier(0.7, 0, 0.84, 0)` |
| **ease-in-out** | State toggles (there → back) | `cubic-bezier(0.65, 0, 0.35, 1)` |

**Bounce and elastic curves are banned.** They were trendy in 2015, now feel tacky and amateurish. Real objects decelerate smoothly; they don't bounce. Overshoot effects draw attention to the animation itself rather than the content.

### Premium Motion Materials

Transform and opacity are reliable defaults, not the whole palette. Premium interfaces need atmospheric properties:

| Material | Use Case |
|----------|----------|
| **Transform / opacity** | Movement, press feedback, simple reveals, list choreography |
| **Blur / filter / backdrop-filter** | Focus pulls, depth, glass or lens effects, softened entrances, atmospheric transitions |
| **Clip path / masks** | Wipes, reveals, editorial cropping, product-like transitions |
| **Shadow / glow / color filters** | Energy, affordance, focus, warmth, active state |
| **Grid-template rows / FLIP-style transforms** | Expanding and reflowing layout without animating `height` directly |

The hard rule is not "transform and opacity only." It's: avoid animating layout-driving properties casually (`width`, `height`, `top`, `left`, margins), keep expensive effects bounded to small or isolated areas, and verify in-browser that the result is smooth on the target viewports. If blur/filter makes the interaction feel significantly more premium and remains smooth, use it.

### Animation Strategy Layers

- **Hero moment**: The ONE signature animation (page load, hero section, key interaction).
- **Feedback layer**: Which interactions need acknowledgment.
- **Transition layer**: Which state changes need smoothing.
- **Delight layer**: Where personality enhances without blocking.

One well-orchestrated experience beats scattered animations everywhere. Focus on high-impact moments.

### Perceived Performance

- **The 80ms threshold**: The brain buffers sensory input for ~80ms. Anything under 80ms feels instant and simultaneous. This is the target for micro-interactions.
- **Preemptive start**: Begin transitions immediately while loading (skeleton UI, iOS app zoom).
- **Optimistic UI**: Update the interface immediately, handle failures gracefully. Use for low-stakes actions, never for payments or destructive operations.
- **Easing affects perceived duration**: Ease-in (accelerating toward completion) makes tasks feel shorter because the peak-end effect weights final moments heavily.

### Reduced Motion

Not optional. Vestibular disorders affect ~35% of adults over 40.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Preserve functional animations (progress bars, loading spinners — slowed down, focus indicators) without spatial movement. Motion that conveys state should use opacity-only crossfades when reduced motion is preferred.

## Premium Typography

### Vertical Rhythm

Line-height is the base unit for ALL vertical spacing. If body text has `line-height: 1.5` on `16px` type (= 24px), spacing values should be multiples of 24px. Text and space share a mathematical foundation — this creates subconscious harmony.

### Modular Scale

Use fewer sizes with more contrast. A 5-size system covers most needs:

| Role | Typical Size | Use Case |
|------|-------------|----------|
| xs | 0.75rem | Captions, legal |
| sm | 0.875rem | Secondary UI, metadata |
| base | 1rem (16px minimum) | Body text |
| lg | 1.25–1.5rem | Subheadings, lead text |
| xl+ | 2–4rem | Headlines, hero text |

Scale ratio: ≥1.25 between steps (major third, perfect fourth, perfect fifth). Flat scales (1.1× apart) read as uncommitted.

### Font Selection

The non-obvious truth: you often don't need a second font. One well-chosen family in multiple weights creates cleaner hierarchy than two competing typefaces. Only add a second font when you need genuine contrast (e.g., display headlines + body serif).

When pairing, contrast on multiple axes: Serif + Sans (structure), Geometric + Humanist (personality), Condensed display + Wide body (proportion). Never pair fonts that are similar but not identical — they create visual tension without clear hierarchy.

System fonts are underrated: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` looks native, loads instantly, and is highly readable.

### Font Loading Strategy

- **`swap`**: Shows fallback text immediately, swaps when web font arrives. Good for brand-critical fonts.
- **`optional`**: Uses fallback if web font misses a ~100ms load budget. Zero layout shift. Pick when stability matters more than branded font.
- **Variable fonts** for 3+ weights/styles: a single file is usually smaller than three static files, gives fractional weight control. For 1–2 weights, static is fine.
- **Preload only the critical weight**: typically the regular-weight body font used above the fold.

Match fallback metrics to minimize layout shift using `size-adjust`, `ascent-override`, `descent-override`, and `line-gap-override`.

### Fluid Type Guidelines

Use fluid `clamp(min, preferred, max)` for headings on marketing/content pages. Keep `max-size ≤ ~2.5 × min-size`. Use fixed `rem` scales for app UIs, dashboards, and data-dense interfaces (no major app design system uses fluid type in product UI). Bound your clamp(): wider ratios break browser zoom and reflow.

### Light-on-Dark Compensation

Light text on dark backgrounds needs compensation on three axes: bump line-height by 0.05–0.1, add a touch of letter-spacing (0.01–0.02em), optionally step the body weight up one notch (regular → medium). The perceived weight drops across all three; fix all three.

### Rendering Polish

```css
h1, h2, h3 { text-wrap: balance; }
article p { text-wrap: pretty; }
.tabular-data { font-variant-numeric: tabular-nums; }
body { font-optical-sizing: auto; font-kerning: normal; }
```

ALL-CAPS tracking: add 5–12% letter-spacing (`0.05em` to `0.12em`) to short all-caps labels, eyebrows, and small headings.

## Premium Information Architecture

### Visual Hierarchy — The Squint Test

Blur your eyes (or screenshot and blur). Can you still identify the most important element, the second most important, and clear groupings? If everything looks the same weight blurred, you have a hierarchy problem.

Hierarchy through multiple dimensions — don't rely on size alone:

| Tool | Strong Hierarchy | Weak Hierarchy |
|------|-----------------|----------------|
| Size | 3:1 ratio or more | < 2:1 ratio |
| Weight | Bold vs Regular | Medium vs Regular |
| Color | High contrast | Similar tones |
| Position | Top/left (primary) | Bottom/right |
| Space | Surrounded by whitespace | Crowded |

The best hierarchy uses 2–3 dimensions at once.

### Cards Are Not Required

Spacing and alignment create visual grouping naturally. Use cards only when content is truly distinct and actionable, items need visual comparison in a grid, or content needs clear interaction boundaries. Never nest cards inside cards.

### Z-Index Management

Define a semantic z-index scale: `dropdown (100) → sticky (200) → modal-backdrop (300) → modal (400) → toast (500) → tooltip (600)`. Never use arbitrary numbers like `z-index: 9999`.

### Progressive Disclosure

Reveal complex options progressively. Don't overwhelm users upfront. Match how much is revealed when, compared to neighboring features. A settings page exposing 40 fields when the rest of the app reveals 5 at a time is drift.

## Premium Interaction Design

### The Eight Interactive States

Every interactive element needs these designed:

| State | When | Visual Treatment |
|-------|------|-----------------|
| Default | At rest | Base styling |
| Hover | Pointer over (not touch) | Subtle lift, color shift |
| Focus | Keyboard/programmatic focus | Visible ring, 2–3px, high contrast, offset from element |
| Active | Being pressed | Pressed in, darker, scale 0.97 |
| Disabled | Not interactive | Reduced opacity (0.38–0.5), cursor change, semantic attribute |
| Loading | Processing | Spinner, skeleton, progress indicator |
| Error | Invalid state | Red border, icon, message near field |
| Success | Completed | Green check, confirmation, brief feedback |

Missing states create confusion and broken experiences. The common miss: designing hover without focus, or vice versa.

### Focus Rings Done Right

Never `outline: none` without replacement. Use `:focus-visible` to show focus only for keyboard users:

```css
button:focus { outline: none; }
button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
```

Focus ring design: high contrast (3:1 minimum against adjacent colors), 2–3px thick, offset from element (not inside it), consistent across all interactive elements.

### Undo > Confirm

Undo is better than confirmation dialogs for reversible actions. Users click through confirmations mindlessly. Remove from UI immediately, show undo toast, actually delete after toast expires. Use confirmation only for truly irreversible actions (account deletion), high-cost actions, or batch operations.

### Touch Targets

Minimum 44×44px interactive area on touch devices (iOS HIG) / 48×48dp (Material Design). Expand hit area beyond visual bounds if needed. Use padding or pseudo-elements to extend tap targets for small icons.

## Quick Reference

### 1. Accessibility (CRITICAL)

- `color-contrast` — Minimum 4.5:1 ratio for normal text (large text 3:1); Material Design
- `focus-states` — Visible focus rings on interactive elements (2–4px); never `outline: none` without replacement
- `alt-text` — Descriptive alt text for meaningful images
- `aria-labels` — aria-label for icon-only buttons; accessibilityLabel in native (Apple HIG)
- `keyboard-nav` — Tab order matches visual order; full keyboard support; roving tabindex for component groups
- `form-labels` — Use label with for attribute; placeholders aren't labels
- `skip-links` — Skip to main content for keyboard users
- `heading-hierarchy` — Sequential h1→h6, no level skip
- `color-not-only` — Don't convey info by color alone (add icon/text)
- `dynamic-type` — Support system text scaling; avoid truncation as text grows
- `reduced-motion` — Respect prefers-reduced-motion; provide beautiful static alternative
- `voiceover-sr` — Meaningful accessibilityLabel/accessibilityHint; logical reading order
- `escape-routes` — Provide cancel/back in modals and multi-step flows
- `toast-accessibility` — Toasts must not steal focus; use aria-live="polite"
- `aria-live-errors` — Form errors use aria-live region or role="alert"

### 2. Touch & Interaction (CRITICAL)

- `touch-target-size` — Min 44×44pt (iOS) / 48×48dp (Android); extend hit area beyond visual bounds if needed
- `touch-spacing` — Minimum 8px/8dp gap between touch targets
- `hover-vs-tap` — Use click/tap for primary interactions; don't rely on hover alone
- `loading-buttons` — Disable button during async operations; show spinner or progress
- `error-feedback` — Clear error messages near problem; state cause + how to fix
- `cursor-pointer` — Add cursor-pointer to clickable elements (Web)
- `gesture-conflicts` — Avoid horizontal swipe on main content; prefer vertical scroll
- `tap-delay` — Use touch-action: manipulation to reduce 300ms delay (Web)
- `press-feedback` — Visual feedback on press (ripple/highlight; scale 0.97)
- `haptic-feedback` — Use haptic for confirmations and important actions; avoid overuse
- `safe-area-awareness` — Keep primary touch targets away from notch, Dynamic Island, gesture bar
- `no-precision-required` — Avoid requiring pixel-perfect taps on small icons
- `gesture-discoverability` — Hint at gesture existence; always provide visible fallback controls
- `eight-interactive-states` — Design default, hover, focus, active, disabled, loading, error, success for every interactive element

### 3. Performance (HIGH)

- `image-optimization` — Use WebP/AVIF, responsive images (srcset/sizes), lazy load non-critical assets
- `image-dimension` — Declare width/height or use aspect-ratio to prevent layout shift (CLS)
- `font-loading` — Use font-display: swap/optional; match fallback metrics to minimize shift
- `font-preload` — Preload only critical fonts; avoid preloading every variant
- `critical-css` — Prioritize above-the-fold CSS
- `lazy-loading` — Lazy load non-hero components via dynamic import / route-level splitting
- `bundle-splitting` — Split code by route/feature to reduce initial load and TTI
- `third-party-scripts` — Load third-party scripts async/defer; audit and remove unnecessary ones
- `reduce-reflows` — Avoid frequent layout reads/writes; batch DOM reads then writes
- `content-jumping` — Reserve space for async content to avoid layout jumps (CLS)
- `virtualize-lists` — Virtualize lists with 50+ items
- `main-thread-budget` — Keep per-frame work under ~16ms for 60fps
- `progressive-loading` — Use skeleton screens / shimmer instead of long blocking spinners for >1s operations
- `debounce-throttle` — Use debounce/throttle for high-frequency events (scroll, resize, input)
- `will-change` — Add only when animation is imminent (:hover, .animating); don't use preemptively

### 4. Style Selection (HIGH)

- `style-match` — Match style to product type (use `--design-system` for recommendations)
- `consistency` — Use same style across all pages
- `no-emoji-icons` — Use SVG icons (Heroicons, Lucide), not emojis
- `color-strategy` — Choose strategy before colors: Restrained / Committed / Full palette / Drenched
- `effects-match-style` — Shadows, blur, radius aligned with chosen style
- `platform-adaptive` — Respect platform idioms (iOS HIG vs Material): navigation, controls, typography, motion
- `state-clarity` — Make hover/pressed/disabled states visually distinct
- `elevation-consistent` — Use a consistent elevation/shadow scale; avoid random shadow values
- `dark-mode-pairing` — Design light/dark variants together; test contrast separately
- `icon-style-consistent` — Use one icon set/visual language (stroke width, corner radius) across the product
- `system-controls` — Prefer native/system controls over fully custom ones
- `blur-purpose` — Use blur to indicate background dismissal (modals, sheets), not as decoration
- `primary-action` — Each screen should have only one primary CTA; secondary actions visually subordinate
- `tinted-neutrals` — Never use pure `#000` or `#fff`; tint every neutral toward the brand hue (OKLCH, chroma 0.005–0.01)

### 5. Layout & Responsive (HIGH)

- `viewport-meta` — width=device-width initial-scale=1 (never disable zoom)
- `mobile-first` — Design mobile-first, then scale up
- `breakpoint-consistency` — Use systematic breakpoints (e.g. 375 / 768 / 1024 / 1440)
- `readable-font-size` — Minimum 16px body text on mobile (avoids iOS auto-zoom)
- `line-length-control` — Mobile 35–60 chars per line; desktop 60–75 chars; use `max-width: 65ch`
- `horizontal-scroll` — No horizontal scroll on mobile
- `spacing-scale` — Use 4pt base spacing system: 4, 8, 12, 16, 24, 32, 48, 64, 96px (not 8pt — too coarse)
- `container-width` — Consistent max-width on desktop
- `z-index-management` — Define semantic z-index scale (dropdown → sticky → modal-backdrop → modal → toast → tooltip)
- `fixed-element-offset` — Fixed navbar/bottom bar must reserve safe padding for underlying content
- `self-adjusting-grid` — Use `repeat(auto-fit, minmax(280px, 1fr))` for breakpoint-free responsive grids
- `viewport-units` — Prefer min-h-dvh over 100vh on mobile
- `orientation-support` — Keep layout readable in landscape
- `visual-hierarchy` — Establish hierarchy via size, spacing, contrast, position — not color alone
- `squint-test` — Blur test for hierarchy; if everything looks the same weight, fix it
- `cards-not-required` — Spacing and alignment create visual grouping naturally; use cards only when justified
- `no-nested-cards` — Never nest cards inside cards
- `optical-alignment` — Text at margin-left:0 looks indented; use negative margin (-0.05em) to optically align

### 6. Typography & Color (MEDIUM)

- `line-height` — Use 1.5–1.75 for body text
- `line-length` — Limit to 65–75 characters per line
- `font-pairing` — Match heading/body font personalities; one family is often enough
- `font-scale` — Consistent type scale with ≥1.25 ratio between steps
- `modular-scale` — 5-size system: xs (0.75rem), sm (0.875rem), base (1rem), lg (1.25–1.5rem), xl+ (2–4rem)
- `contrast-readability` — Darker text on light backgrounds; no pure gray text
- `color-semantic` — Define semantic color tokens (primary, secondary, error, surface, on-surface) not raw hex in components
- `color-dark-mode` — Dark mode uses desaturated/lighter tonal variants, not inverted colors; test contrast separately
- `color-accessible-pairs` — Foreground/background pairs must meet 4.5:1 (AA) or 7:1 (AAA); use OKLCH
- `color-not-decorative-only` — Functional color (error red, success green) must include icon/text
- `light-on-dark-compensation` — Bump line-height +0.05–0.1, add letter-spacing +0.01–0.02em, optionally step weight up one notch
- `vertical-rhythm` — Line-height as base unit for all vertical spacing
- `font-loading-strategy` — Swap for brand fonts, optional for zero-shift, variable for 3+ weights
- `system-fonts-underrated` — Consider `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` for apps where performance > personality
- `fluid-type-bound` — `max-size ≤ ~2.5 × min-size`; wider ratios break zoom and reflow
- `number-tabular` — Use tabular/monospaced figures for data columns, prices, timers
- `truncation-strategy` — Prefer wrapping over truncation; when truncating use ellipsis and provide full text via tooltip/expand
- `all-caps-tracking` — Add 5–12% letter-spacing to short all-caps labels and small headings
- `rendering-polish` — `text-wrap: balance` for headings, `text-wrap: pretty` for prose, `font-optical-sizing: auto`, `font-variant-numeric: tabular-nums`
- `tinted-neutrals` — No pure gray or pure black; add subtle color tint (OKLCH chroma 0.005–0.01)
- `gray-on-color` — Never put gray text on colored backgrounds; use a shade of that color or transparency

### 7. Animation & Motion (MEDIUM)

- `duration-100-150ms` — Instant feedback: button press, toggle, color change, haptic-linked events
- `duration-200-300ms` — State changes: menu open, tooltip, hover, form transitions
- `duration-300-500ms` — Layout changes: accordion, modal, drawer, expand/collapse
- `duration-500-800ms` — Entrance animations: page load, hero reveals, staggered sequences
- `exit-faster-than-enter` — Exit animations ~75% of enter duration
- `ease-out-quart` — `cubic-bezier(0.25, 1, 0.5, 1)` — recommended default for entering
- `ease-out-quint` — `cubic-bezier(0.22, 1, 0.36, 1)` — slightly more dramatic
- `ease-out-expo` — `cubic-bezier(0.16, 1, 0.3, 1)` — snappy, confident
- `ease-in` — `cubic-bezier(0.7, 0, 0.84, 0)` — elements leaving
- `no-bounce-elastic` — Never bounce or elastic curves; they feel dated and tacky
- `transform-performance` — Use transform/opacity for reliable movement
- `premium-motion-materials` — Use blur, filter, backdrop-filter, clip-path, masks, shadow, glow when verified smooth
- `no-layout-animation` — Avoid animating `width`, `height`, `top`, `left`, margins casually
- `loading-states` — Show skeleton or progress indicator when loading exceeds 300ms
- `motion-meaning` — Every animation must express a cause-effect relationship
- `stagger-sequence` — Stagger list/grid item entrance by 30–50ms per item; not all at once
- `spring-physics` — Prefer spring/physics-based curves over linear for natural feel
- `interruptible` — Animations must be interruptible; user tap/gesture cancels in-progress animation immediately
- `no-blocking-animation` — Never block user input during an animation
- `fade-crossfade` — Use crossfade for content replacement within the same container
- `scale-feedback` — Subtle scale (0.95–1.05) on press for tappable cards/buttons
- `modal-motion` — Modals/sheets should animate from their trigger source (scale+fade or slide-in)
- `navigation-direction` — Forward: left/up; backward: right/down — keep direction logically consistent
- `80ms-threshold` — Our brains buffer sensory input for ~80ms; target this for micro-interactions
- `optimistic-ui` — Update interface immediately, handle failures gracefully; low-stakes only
- `reduced-motion` — Respect prefers-reduced-motion; provide beautiful static alternative; use opacity-only crossfades

### 8. Forms & Feedback (MEDIUM)

- `input-labels` — Visible label per input (not placeholder-only)
- `error-placement` — Show error below the related field; state cause + how to fix
- `submit-feedback` — Loading then success/error state on submit
- `required-indicators` — Mark required fields (e.g. asterisk)
- `empty-states` — Helpful message and action when no content
- `toast-dismiss` — Auto-dismiss toasts in 3–5s
- `undo-support` — Allow undo for destructive or bulk actions; undo > confirm for reversible actions
- `confirmation-dialogs` — Confirm only for truly irreversible actions (account deletion), high-cost, or batch operations
- `input-helper-text` — Persistent helper text below complex inputs, not just placeholder
- `disabled-states` — Reduced opacity (0.38–0.5) + cursor change + semantic attribute
- `progressive-disclosure` — Reveal complex options progressively; don't overwhelm upfront
- `inline-validation` — Validate on blur (not keystroke); show error only after user finishes input
- `input-type-keyboard` — Use semantic input types (email, tel, number) to trigger correct mobile keyboard
- `password-toggle` — Provide show/hide toggle for password fields
- `autofill-support` — Use autocomplete attributes so the system can autofill
- `success-feedback` — Confirm completed actions with brief visual feedback (checkmark, toast, color flash)
- `error-recovery` — Error messages must include a clear recovery path (retry, edit, help link)
- `multi-step-progress` — Multi-step flows show step indicator or progress bar; allow back navigation
- `form-autosave` — Long forms should auto-save drafts to prevent data loss
- `focus-management` — After submit error, auto-focus the first invalid field
- `error-summary` — For multiple errors, show summary at top with anchor links to each field
- `touch-friendly-input` — Mobile input height ≥44px
- `destructive-emphasis` — Destructive actions use semantic danger color (red), visually separated from primary actions
- `contrast-feedback` — Error and success state colors must meet 4.5:1 contrast ratio

### 9. Navigation Patterns (HIGH)

- `bottom-nav-limit` — Bottom navigation max 5 items; use labels with icons
- `drawer-usage` — Use drawer/sidebar for secondary navigation, not primary actions
- `back-behavior` — Back navigation must be predictable and consistent; preserve scroll/state
- `deep-linking` — All key screens must be reachable via deep link / URL for sharing and notifications
- `nav-label-icon` — Navigation items must have both icon and text label; icon-only nav harms discoverability
- `nav-state-active` — Current location must be visually highlighted (color, weight, indicator)
- `nav-hierarchy` — Primary nav (tabs/bottom bar) vs secondary nav (drawer/settings) clearly separated
- `modal-escape` — Modals and sheets must offer clear close/dismiss affordance
- `search-accessible` — Search must be easily reachable; provide recent/suggested queries
- `breadcrumb-web` — Web: use breadcrumbs for 3+ level deep hierarchies
- `state-preservation` — Navigating back must restore previous scroll position, filter state, input
- `gesture-nav-support` — Support system gesture navigation without conflict
- `overflow-menu` — When actions exceed available space, use overflow/more menu
- `adaptive-navigation` — Large screens (≥1024px) prefer sidebar; small screens use bottom/top nav
- `back-stack-integrity` — Never silently reset the navigation stack
- `navigation-consistency` — Navigation placement must stay the same across all pages
- `avoid-mixed-patterns` — Don't mix Tab + Sidebar + Bottom Nav at the same hierarchy level
- `modal-vs-navigation` — Modals must not be used for primary navigation flows
- `focus-on-route-change` — After page transition, move focus to main content for screen reader users
- `persistent-nav` — Core navigation must remain reachable from deep pages
- `destructive-nav-separation` — Dangerous actions visually and spatially separated from normal nav items

### 10. Charts & Data (LOW)

- `chart-type` — Match chart type to data type (trend → line, comparison → bar, proportion → pie/donut)
- `color-guidance` — Use accessible color palettes; avoid red/green only pairs for colorblind users
- `data-table` — Provide table alternative for accessibility
- `pattern-texture` — Supplement color with patterns, textures, or shapes
- `legend-visible` — Always show legend; position near the chart
- `tooltip-on-interact` — Provide tooltips/data labels on hover (Web) or tap (mobile)
- `axis-labels` — Label axes with units and readable scale
- `responsive-chart` — Charts must reflow or simplify on small screens
- `empty-data-state` — Show meaningful empty state when no data exists
- `loading-chart` — Use skeleton or shimmer placeholder while chart data loads
- `animation-optional` — Chart entrance animations must respect prefers-reduced-motion
- `large-dataset` — For 1000+ data points, aggregate or sample; provide drill-down
- `number-formatting` — Use locale-aware formatting for numbers, dates, currencies
- `touch-target-chart` — Interactive chart elements must have ≥44pt tap area or expand on touch
- `no-pie-overuse` — Avoid pie/donut for >5 categories; switch to bar chart
- `contrast-data` — Data lines/bars vs background ≥3:1; data text labels ≥4.5:1
- `legend-interactive` — Legends should be clickable to toggle series visibility
- `direct-labeling` — For small datasets, label values directly on the chart
- `tooltip-keyboard` — Tooltip content must be keyboard-reachable
- `sortable-table` — Data tables must support sorting with aria-sort
- `data-density` — Limit information density per chart; split into multiple if needed
- `trend-emphasis` — Emphasize data trends over decoration; avoid heavy gradients/shadows
- `gridline-subtle` — Grid lines low-contrast (e.g. gray-200)
- `focusable-elements` — Interactive chart elements must be keyboard-navigable
- `screen-reader-summary` — Provide text summary or aria-label describing key insight
- `error-state-chart` — Data load failure must show error message with retry action

## How to Use

Search specific domains using the CLI tool below.

### Prerequisites

Check if Python is installed:

```bash
python3 --version || python --version
```

If Python is not installed, install it based on user's OS:

**macOS:**
```bash
brew install python3
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install python3
```

**Windows:**
```powershell
winget install Python.Python.3.12
```

### Workflow

| Scenario | Trigger Examples | Start From |
|----------|-----------------|------------|
| **New project / page** | "Build a landing page", "Build a dashboard" | Phase 1 (shape) → Phase 2 (design system) |
| **New component** | "Create a pricing card", "Add a modal" | Phase 2 (design system) → Phase 3 (domain search) |
| **Choose style / color / font** | "What style fits a fintech app?", "Recommend a color palette" | Phase 2 (design system) |
| **Review existing UI** | "Review this page for UX issues", "Check accessibility" | AI Slop Test + Quick Reference checklist |
| **Fix a UI bug** | "Button hover is broken", "Layout shifts on load" | Quick Reference → relevant section |
| **Improve / optimize** | "Make this faster", "Improve mobile experience" | Phase 2 (design system) → domain search |
| **Implement dark mode** | "Add dark mode support" | Phase 3 (domain: style "dark mode") |
| **Add charts / data viz** | "Add an analytics dashboard chart" | Phase 3 (domain: chart) |
| **Stack best practices** | "React performance tips", "SwiftUI navigation" | Phase 4 (stack search) |

### Step 1: Analyze User Requirements

Extract key information from user request:
- **Product type**: Entertainment, Tool, Productivity, or hybrid
- **Target audience**: Specific context (role, environment, frequency, emotional state)
- **Style keywords**: Not just adjectives — physical-object words that describe how it should feel
- **Stack**: Project's tech stack (React Native, Next.js, etc.)
- **Register**: Brand (design IS the product) vs Product (design SERVES the product)

### Step 2: Generate Design System (REQUIRED)

**Always start with `--design-system`** to get comprehensive recommendations with reasoning:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This command:
1. Searches domains in parallel (product, style, color, landing, typography)
2. Applies reasoning rules from `ui-reasoning.csv` to select best matches
3. Returns complete design system: pattern, style, colors, typography, effects
4. Includes anti-patterns to avoid

**Example:**
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --design-system -p "Serenity Spa"
```

**Persist for hierarchical retrieval:**

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

This creates `design-system/MASTER.md` and optionally page-level overrides. When building a specific page, check its page file first; its rules override the Master.

### Step 3: Supplement with Detailed Searches

After getting the design system, use domain searches for additional details:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

| Need | Domain | Example |
|------|--------|---------|
| Product type patterns | `product` | `--domain product "entertainment social"` |
| More style options | `style` | `--domain style "glassmorphism dark"` |
| Color palettes | `color` | `--domain color "entertainment vibrant"` |
| Font pairings | `typography` | `--domain typography "playful modern"` |
| Chart recommendations | `chart` | `--domain chart "real-time dashboard"` |
| UX best practices | `ux` | `--domain ux "animation accessibility"` |
| Alternative fonts | `typography` | `--domain typography "elegant luxury"` |
| Individual Google Fonts | `google-fonts` | `--domain google-fonts "sans serif popular variable"` |
| Landing structure | `landing` | `--domain landing "hero social-proof"` |
| Stack performance | `react` | `--domain react "rerender memo list"` |
| App interface a11y | `web` | `--domain web "accessibilityLabel touch safe-areas"` |
| AI prompt / CSS keywords | `prompt` | `--domain prompt "minimalism"` |

### Step 4: Stack Guidelines

Get implementation-specific best practices for the project's stack:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack <stack-name>
```

### Step 5: Apply Premium Bar

After generating the design system:
1. Write the physical scene sentence to force theme decision
2. Choose color strategy (Restrained / Committed / Full palette / Drenched)
3. Apply the AI slop test at both altitudes
4. Verify no absolute bans are violated
5. Confirm all eight interactive states are designed for every interactive element
6. Verify motion uses exponential easing, respects reduced-motion, and 100/300/500 durations
7. Run browser-based iteration (mobile narrow / tablet / desktop wide)

## Search Reference

### Available Domains

| Domain | Use For | Example Keywords |
|--------|---------|------------------|
| `product` | Product type recommendations | SaaS, e-commerce, portfolio, healthcare, beauty, service |
| `style` | UI styles, colors, effects | glassmorphism, minimalism, dark mode, brutalism |
| `typography` | Font pairings, Google Fonts | elegant, playful, professional, modern |
| `color` | Color palettes by product type | saas, ecommerce, healthcare, beauty, fintech, service |
| `landing` | Page structure, CTA strategies | hero, hero-centric, testimonial, pricing, social-proof |
| `chart` | Chart types, library recommendations | trend, comparison, timeline, funnel, pie |
| `ux` | Best practices, anti-patterns | animation, accessibility, z-index, loading |
| `google-fonts` | Individual Google Fonts lookup | sans serif, monospace, japanese, variable font, popular |
| `react` | React/Next.js performance | waterfall, bundle, suspense, memo, rerender, cache |
| `web` | App interface guidelines (iOS/Android/React Native) | accessibilityLabel, touch targets, safe areas, Dynamic Type |
| `prompt` | AI prompts, CSS keywords | (style name) |

### Available Stacks

| Stack | Focus |
|-------|-------|
| `react-native` | Components, Navigation, Lists |
| `nextjs` | Server Components, Routing, Data Fetching |
| `react` | State, Performance, Patterns |
| `tailwind` | Utility-first styling, Responsive |
| `shadcn` | shadcn/ui component library |
| `swiftui` | iOS native components, Navigation |
| `flutter` | Cross-platform, Material Design |

## Output Formats

```bash
# ASCII box (default) - best for terminal display
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown - best for documentation
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown
```

## Tips for Better Results

### Query Strategy

- Use **multi-dimensional keywords** — combine product + industry + tone + density: `"entertainment social vibrant content-dense"` not just `"app"`
- Try different keywords for the same need: `"playful neon"` → `"vibrant dark"` → `"content-first minimal"`
- Use `--design-system` first for full recommendations, then `--domain` to deep-dive any dimension
- Always add `--stack <stack-name>` for implementation-specific guidance

### Common Sticking Points

| Problem | What to Do |
|---------|------------|
| Can't decide on style/color | Re-run `--design-system` with different keywords; then pin decisions via `--persist` |
| Dark mode contrast issues | Quick Reference §6: `color-dark-mode` + `light-on-dark-compensation` + `color-accessible-pairs` |
| Animations feel unnatural | Premium Motion Design: `ease-out-quart` + `exit-faster-than-enter` + `spring-physics` |
| Form UX is poor | Quick Reference §8: `inline-validation` + `error-clarity` + `focus-management` |
| Navigation feels confusing | Quick Reference §9: `nav-hierarchy` + `bottom-nav-limit` + `back-behavior` |
| Layout breaks on small screens | Quick Reference §5: `mobile-first` + `self-adjusting-grid` + `viewport-units` |
| Performance / jank | Quick Reference §3: `virtualize-lists` + `main-thread-budget` + `debounce-throttle` |
| Looks like AI made it | AI Slop Test: category-reflex check at both altitudes + absolute bans scan |
| Margins/spacing feel off | 4pt base spacing system; vertical rhythm: spacing = multiples of line-height |
| Type feels flat / uncommitted | Modular scale ≥1.25 ratio; fewer sizes, more contrast; hierarchy via 2–3 dimensions |

## Pre-Delivery Premium Checklist

Before delivering UI code, verify these items. This is the production bar — the difference between "it works" and "it ships."

### Design Intent & Distinctiveness
- [ ] AI slop test passed at both altitudes (first-order + second-order reflex checks)
- [ ] Zero absolute ban violations (side-stripe borders, gradient text, glassmorphism-as-default, hero-metric template, identical card grids, modal-as-first-thought, bounce/elastic easing)
- [ ] Design brief confirmed and live result matches every section
- [ ] Color strategy explicitly chosen (Restrained / Committed / Full palette / Drenched)
- [ ] Theme decided via physical scene sentence, not category default
- [ ] Color uses OKLCH; no pure `#000` or `#fff`; neutrals tinted toward brand hue

### Visual Quality
- [ ] No emojis used as icons (SVG icons from a consistent family)
- [ ] All icons come from a coherent library with consistent stroke width and style
- [ ] Semantic theme tokens used consistently (no ad-hoc per-screen hardcoded colors)
- [ ] Pressed-state visuals do not shift layout bounds or cause jitter
- [ ] Spacing uses 4pt base system: 4, 8, 12, 16, 24, 32, 48, 64, 96px
- [ ] Vertical rhythm: spacing values are multiples of base line-height
- [ ] Visual hierarchy passes the squint test at all viewports
- [ ] No nested cards; cards used only when justified
- [ ] Gray text never on colored backgrounds; tinted neutrals throughout

### Typography
- [ ] Modular scale with ≥1.25 ratio between steps (5-size system)
- [ ] Base body text ≥16px (no text < 12px)
- [ ] Line-height 1.5–1.75 for body text; light-on-dark compensation applied if applicable
- [ ] Line length capped at 65–75ch; `text-wrap: balance` on headings
- [ ] Font loading strategy defined (swap/optional); critical weight preloaded; fallback metrics matched
- [ ] Fluid type bounded: max-size ≤ ~2.5 × min-size
- [ ] ALL-CAPS tracking: +5–12% letter-spacing on short caps labels
- [ ] Tabular numbers for data columns, prices, timers

### Motion
- [ ] All durations follow 100/300/500 rule; exits ~75% of enter duration
- [ ] Exponential easing used (ease-out-quart default); zero bounce/elastic curves
- [ ] Motion conveys meaning (cause-effect), not decoration
- [ ] Premium motion materials used where verified smooth (blur, filter, backdrop-filter, clip-path, masks)
- [ ] No layout-property animation (`width`, `height`, `top`, `left`, margins)
- [ ] Reduced motion respected; beautiful static alternative provided
- [ ] Stagger sequences 30–50ms per item; total capped at ~500ms
- [ ] Animations are interruptible; no blocking interaction during animation

### Interaction
- [ ] All eight interactive states designed for every interactive element (default, hover, focus, active, disabled, loading, error, success)
- [ ] Focus rings visible (2–3px, high contrast, offset); never `outline: none` without replacement
- [ ] Touch targets meet minimum (≥44×44pt iOS / ≥48×48dp Android)
- [ ] Micro-interaction timing in 100–150ms range for instant feedback
- [ ] Undo provided for reversible destructive actions; confirmation dialogs only for truly irreversible actions
- [ ] Validate on blur, not keystroke; errors state cause + how to fix
- [ ] Gesture interactions have visible fallback controls
- [ ] Screen reader focus order matches visual order; interactive labels descriptive
- [ ] Keyboard navigation works; roving tabindex for component groups

### Light/Dark Mode
- [ ] Primary text contrast ≥4.5:1 in both light and dark mode
- [ ] Secondary text contrast ≥3:1 in both light and dark mode
- [ ] Dividers/borders and interaction states distinguishable in both modes
- [ ] Modal/drawer scrim opacity strong enough for foreground legibility (40–60% black)
- [ ] Both themes tested before delivery (not inferred from a single theme)

### Layout & Responsive
- [ ] Safe areas respected for headers, tab bars, and bottom CTA bars
- [ ] Scroll content not hidden behind fixed/sticky bars
- [ ] Verified on mobile narrow, tablet, and desktop wide (portrait + landscape)
- [ ] Self-adjusting grids (`auto-fit, minmax`) for breakpoint-free responsiveness
- [ ] Semantic z-index scale (not arbitrary values like `z-index: 9999`)
- [ ] No horizontal scroll at any viewport
- [ ] Disabled zoom NOT used (`user-scalable=no` breaks WCAG)

### Content & Copy
- [ ] Every word earns its place; no restated headings, no intros that repeat the title
- [ ] No em dashes (use commas, colons, semicolons, periods, or parentheses)
- [ ] Loading messages are product-specific, not generic AI filler
- [ ] Copy personality matches brand and context
- [ ] No placeholder content, dead links, fake controls, or unused scaffold
- [ ] Alt text is part of the voice, not an afterthought

### Code Quality
- [ ] No console logs, commented-out code, or unused imports in production
- [ ] Type safety: no `any` or ignored errors
- [ ] Proper ARIA labels and semantic HTML
- [ ] Reusable local patterns; no hard-coded one-off hacks
- [ ] Design system tokens used; no ad-hoc values that should be tokens

### Performance
- [ ] No layout shift on load (CLS); reserve space for async content
- [ ] Images optimized (WebP/AVIF, responsive srcset, lazy below fold)
- [ ] `will-change` used sparingly (only when animation is imminent)
- [ ] No obviously oversized images or heavy assets without reason
- [ ] Lists with 50+ items virtualized

### Accessibility
- [ ] All meaningful images/icons have accessibility labels
- [ ] Form fields have visible labels, hints, and clear error messages
- [ ] Color is not the only indicator of state or meaning
- [ ] Reduced motion and dynamic text size supported without layout breakage
- [ ] Accessibility traits/roles/states announced correctly
- [ ] Skip link to main content provided

## Project-Specific Premium Design: Gym-App

The gym-app project operates under the **Cinematic Technical Minimalism** premium standard:

### Design DNA
- **Dark Mode First**: near-blacks (`#050506`, `#020203`) + deep indigos. Not "dark because tools look cool" — dark because the user is focused in a gym environment, often in dim or artificial light, with brief, high-intensity interactions between sets.
- **Atmospheric Depth**: layered backgrounds with varying opacities, blur intensities, and subtle noise textures. Animated ambient light sources that simulate light pools. Every shadow uses multiple layers; every gradient is dithered to prevent banding.
- **Premium Native Feel**: the interface should feel like a native iOS/Android app, not a web-wrapper. Use precise haptic feedback (Impact Light/Medium) on every Pressable event. The hardware should feel alive in the user's hand.
- **Spring-less Precision**: eschew bouncy animations for sophisticated `cubic-bezier(0.16, 1, 0.3, 1)` curves. Every interaction has a physical, grounded quality.
- **Physical Scene**: "A gym-goer checking their next set in a dim, sweat-scented room between exercises, phone in one hand, brief focused glances at the screen."

### Component Standards
- Cards are surface layers with atmospheric depth (RGBA overlays, not solid backgrounds)
- Pressable elements pair visual feedback (scale 0.97, opacity shift) with haptic feedback
- Sticky headers use `backdrop-blur` for glass-like separation from scrolling content
- Dropdowns use `AnimatePresence` + `framer-motion` with 150ms duration, scale+fade entrance from trigger source
- Safe areas respected; touch targets ≥44pt with hitSlop expansion when needed
- No sound without explicit opt-in; sound used for tactical feedback (not decoration)

### Color System
- `bg-deep #020203` — screen background, tab bar base
- `bg-base #050506` — primary view container
- `bg-elevated #0a0a0c` — modals, sheets, surface cards
- `surface rgba(255,255,255,0.05)` — card backgrounds, list items
- Accent: soft "glow" sources (`#5E6AD2`) to guide the thumb
- Accent yellow for moments of energy and completion

See `design-system/MASTER.md` (when persisted) for the complete token system.

---

## Common Rules for Professional UI

These are frequently overlooked issues that make UI look unprofessional.
Scope notice: The rules below are for App UI (iOS/Android/React Native/Flutter), not desktop-web interaction patterns.

### Icons & Visual Elements

| Rule | Standard | Avoid |
|------|----------|--------|
| **No Emoji as Structural Icons** | Use vector-based icons (Lucide, react-native-vector-icons) | Emojis for navigation, settings, or system controls |
| **Vector-Only Assets** | SVG or platform vector icons that scale cleanly and support theming | Raster PNG icons that blur or pixelate |
| **Stable Interaction States** | Color, opacity, or elevation transitions for press states without changing layout bounds | Layout-shifting transforms that move surrounding content |
| **Consistent Icon Sizing** | Define icon sizes as design tokens (icon-sm, icon-md = 24pt, icon-lg) | Mixing arbitrary values like 20pt / 24pt / 28pt randomly |
| **Stroke Consistency** | Consistent stroke width within the same visual layer | Mixing thick and thin stroke styles arbitrarily |
| **Filled vs Outline Discipline** | One icon style per hierarchy level | Mixing filled and outline icons at same hierarchy level |
| **Icon Alignment** | Align icons to text baseline; consistent padding | Misaligned icons or inconsistent spacing |
| **Icon Contrast** | Follow WCAG: 4.5:1 for small elements, 3:1 minimum for larger UI glyphs | Low-contrast icons that blend into background |

### Interaction (App)

| Rule | Do | Don't |
|------|----|----- |
| **Tap feedback** | Clear pressed feedback (ripple/opacity/elevation) within 80–150ms | No visual response on tap |
| **Animation timing** | Micro-interactions 150–300ms with exponential easing | Instant transitions or slow animations (>500ms) |
| **Accessibility focus** | Screen reader focus order matches visual order; descriptive labels | Unlabeled controls or confusing focus traversal |
| **Disabled state clarity** | Use disabled semantics, reduced emphasis, no tap action | Controls that look tappable but do nothing |
| **Touch target minimum** | ≥44×44pt (iOS) or ≥48×48dp (Android); expand hit area when icon is smaller | Tiny tap targets or icon-only hit areas without padding |
| **Gesture conflict prevention** | One primary gesture per region; avoid nested tap/drag conflicts | Overlapping gestures causing accidental actions |
| **Semantic native controls** | Use native interactive primitives (Button, Pressable) with proper accessibility roles | Generic containers used as primary controls without semantics |
| **Haptic feedback** | Haptics for confirmations and important actions (paired with visual feedback) | Haptics on every interaction; overuse causes fatigue |

### Light/Dark Mode Contrast

| Rule | Do | Don't |
|------|----|----- |
| **Surface readability (light)** | Cards/surfaces clearly separated from background with sufficient opacity/elevation | Overly transparent surfaces that blur hierarchy |
| **Text contrast (light)** | Body text contrast ≥4.5:1 against light surfaces | Low-contrast gray body text |
| **Text contrast (dark)** | Primary text contrast ≥4.5:1; secondary ≥3:1 on dark surfaces | Dark mode text that blends into background |
| **Light-on-dark compensation** | Bump line-height +0.05–0.1, add letter-spacing +0.01–0.02em, step weight up one notch | Only fixing contrast ratio; perceived weight drops on all three axes |
| **Border and divider visibility** | Separators visible in both themes | Theme-specific borders disappearing in one mode |
| **State contrast parity** | Pressed/focused/disabled states equally distinguishable in light and dark themes | Defining interaction states for one theme only |
| **Token-driven theming** | Semantic color tokens mapped per theme across all surfaces/text/icons | Hardcoded per-screen hex values |
| **Scrim and modal legibility** | Modal scrim strong enough to isolate foreground content (40–60% black) | Weak scrim that leaves background visually competing |

### Layout & Spacing

| Rule | Do | Don't |
|------|----|----- |
| **Safe-area compliance** | Respect top/bottom safe areas for all fixed headers, tab bars, and CTA bars | Placing fixed UI under notch, status bar, or gesture area |
| **4pt spacing system** | 4, 8, 12, 16, 24, 32, 48, 64, 96px | Random spacing increments with no rhythm |
| **Vertical rhythm** | All spacing values as multiples of base line-height | Spacing unrelated to typographic rhythm |
| **Consistent content width** | Predictable content width per device class | Mixing arbitrary widths between screens |
| **Readable text measure** | Long-form text at 45–75ch; `max-width: 65ch` on desktop | Full-width long text that hurts readability |
| **Adaptive gutters** | Horizontal insets increase on larger widths and in landscape | Same narrow gutter on all device sizes/orientations |
| **Scroll and fixed element coexistence** | Bottom/top content insets so lists aren't hidden behind fixed bars | Scroll content obscured by sticky headers/footers |
| **Visual hierarchy** | Hierarchy via size + weight + color + position + space (2–3 dimensions at once) | Size alone for hierarchy; everything the same weight |
