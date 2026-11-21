# Global Design Rule — Single Consistent UI

Every dashboard page (member, coach, admin, super-admin) must share the same visual patterns.
No custom per-role designs are allowed — the app is one product, not four.

## Layout

```tsx
<div className="container mx-auto px-4 py-6 md:py-8 space-y-8">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
    <p className="text-muted-foreground">{subtitle}</p>
  </div>
  {/* stat cards grid */}
  {/* content cards grid */}
</div>
```

## Stat cards

Use `StatCard` component wrapped in `<motion.div>`. Grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` (or `lg:grid-cols-4`).

`StatCard(icon: icon, iconColor: "text-gold", borderColor: "border-t-accent-yellow")` — accent-yellow is the default.
Use `borderColor: "border-t-primary"` ONLY for secondary/metric cards.

## Section cards

Standard `<Card>` with:
- `<CardHeader>`: `<CardTitle>` + icon (`text-gold`)
- `<CardContent>`: list items or empty state
- List items: `flex items-center gap-3 rounded-lg border p-3`

## Icons

- Primary accent: `text-gold` / `bg-accent-yellow/10`
- **Contrast (#229):** `#ffd700` is only a background (buttons, badges, borders). Text and icons use `text-gold` (dark gold with AA contrast in light theme, same yellow in dark). Never `text-primary` or `text-accent-yellow`.
- Muted: `text-muted-foreground`
- Status badges: `bg-emerald-500/10 text-emerald-600` (active), `bg-destructive/10 text-destructive` (expired)

## Prohibited

- Gradient banners (`bg-gradient-to-br`, `from-*/to-*`) on dashboard cards
- Decorative circles/blurs (`blur-3xl`, `rounded-full bg-*/5`)
- Custom color sets (orange-500, purple-500, etc.) instead of accent-yellow
- "Quick action" cards with colored icon boxes — use plain buttons or links
- Non-standard card types that don't exist in other dashboards
