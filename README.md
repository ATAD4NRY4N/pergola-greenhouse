# Polyframe — hybrid pergola / greenhouse designer

A parametric designer for the lean-to greenhouse-and-pergola build: SHS posts on the
corners and perimeter only, a C purlin ring around all four sides, Z purlins and Z
girders carrying the roof, and 8 × 4 ft twinwall polycarbonate for the roof, the fixed
panels and the sliding doors.

The plan starts at **8.5 m wide × 8.0 m deep on the left, 7.0 m on the right**, with the
back against a log cabin and the right side against a brick wall / timber fence — so those
two sides carry structure only.

## What it does

- **Live drawings** — draggable axonometric with orbit, eye-level tilt and zoom, plan, all
  four perimeter elevations and cross-section, generated from one parametric model.
- **Adjustable dimensions** — width, both depths, both eaves, post size and spacing, C purlin
  ring, Z purlin section and centres, girder count, sheet type, door count/size/position,
  roof overhang and knee braces.
- **Corner fixings** — each corner is independently locked to a rigid 90° plate or an
  adjustable gusset. The model computes the real interior angle and refuses to let a rigid
  plate sit on a skewed corner.
- **Sheet layout** — roof sheets are laid 2438 mm across the width, counted down the depth,
  and any sheet that overhangs the trapezoid is flagged as cut.
- **Cut list** — every C, Z and SHS length with its mitre allowance, plus sheets, doors,
  wheels, casing, hangers and fixings. One-click copy for the merchant.
- **Checks** — purlin span against an indicative capacity, door leaf against the low eave,
  every corner against its fixing, roof fall and post spacing.
- **Sourcing** — a shortlist of Runcorn, Widnes and nearby Deeside / Flintshire counters with
  what to ask each for, and a tick-off list.
- **Build plan** — measured corner and post set-out coordinates, side lengths and diagonals,
  plus a staged assembly checklist and site-safety / structural-review reminders.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Convex (schema + auth + queries are in
`src/convex`)

## Scripts

```bash
bun install
bun run dev        # http://localhost:5173
bun run typecheck  # tsc -b --noEmit
bun test           # engine + render smoke tests
bun convex dev --once   # push the Convex backend (needs a deployment)
```

## Cloud saving and accounts

The app runs with no backend configured: everything works and designs are saved to
`localStorage` in the browser.

To switch on accounts and cloud saving:

1. Create a Convex deployment and add `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` in
   **Settings → Environment**.
2. Run `bun convex dev --once` to generate `src/convex/_generated` and push the schema.
3. Reload. Sign-in and cloud saving turn themselves on; the design model is unchanged.

The frontend never imports the generated API directly — it references the functions by name
(`src/components/convexStore.ts`) so it compiles with or without a deployment.

## A note on the numbers

The span and capacity checks are indicative planning guidance, calibrated against common
cold-formed Z and C purlin tables. Confirm every section against the manufacturer's load
tables and get a structural sign-off before you build.