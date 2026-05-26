# V3 Layout Spec

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Topbar  [GlobalSearch ........]  [data][ai][news][chart] [SYS] [theme] │
├─────────────┬────────────────────────────────────────────┬───────────────┤
│             │                                            │               │
│  Sidebar    │   Main content                             │  Right rail   │
│             │   (page-specific panels, cards)            │  (optional)   │
│             │                                            │               │
│             │                                            │               │
├─────────────┴────────────────────────────────────────────┴───────────────┤
│                        MobileDrawer (mobile only)                         │
└──────────────────────────────────────────────────────────────────────────┘
```

## Components
- `AppLayout` — flex container. Sidebar | (Topbar / Main / optional rightRail). Mounts `MobileDrawer`.
- `Sidebar` — vertical navigation, persistent on `md+`. Active state matches `pathname.startsWith(prefix)` for nested routes (Reports).
- `Topbar` — server component. Shows global ticker search (client island), 4 mode badges, system status pill, theme toggle.
- `MobileDrawer` — hamburger-triggered slide-in drawer, shows on `<md`. Hidden on desktop.
- `PanelSection` — title row + optional toolbar + content. The unit of "card-style" content composition.
- `FilterBar` — generic group-of-segmented-controls used on `/ideas`, `/news`, `/watchlist`, `/symbols`.

## Right rail
- Reserved for some pages via the `rightRail` prop on `AppLayout`. Currently the Ideas/News pages use a 2-column grid instead of the `rightRail` slot for tighter control. The slot remains available for future pages.

## Responsive
- `<md`: Sidebar hidden, MobileDrawer (hamburger) visible, right-rail collapses into main column or drops out.
- `md`–`lg`: Sidebar visible, no right rail.
- `xl+`: Right rail (where applicable) appears.

## Color & status
Tokens defined in `globals.css`:
- `--bull` — long / ok / worked
- `--bear` — short / failed / critical
- `--warn` — stale / mixed / warning
- `--info` — neutral / info
- `--neutral` — unknown / muted

`StatusBadge` maps soft-enum strings to these tokens. Unknown values fall through to `muted`, never crash.
