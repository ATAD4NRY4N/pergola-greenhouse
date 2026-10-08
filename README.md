# Polyframe — hybrid pergola / greenhouse designer

A single-user planning and build tool for the lean-to greenhouse-and-pergola build:
SHS posts on the corners and perimeter only, a C purlin ring around all four sides,
Z purlins and Z girders carrying the roof, and 8 × 4 ft twinwall polycarbonate for
the roof and the sliding doors.

The plan starts at **8.5 m wide × 8.0 m deep on the left, 7.0 m on the right**, with the
back against a log cabin and the right side against a brick wall / timber fence — so those
two sides carry structure only, and the front and right runs are sliding doors.

There are no accounts and no cloud: the designer is the whole app, and plans are kept in
this browser's local storage.

## What it does

- **Live drawings** — draggable axonometric with orbit, eye-level tilt and zoom, plan, all
  four perimeter elevations and cross-section, generated from one parametric model.
- **Adjustable dimensions** — width, both depths, both eaves, post size and spacing, C purlin
  ring, Z purlin section and centres, girder count, sheet type, door count/position,
  roof overhang and knee braces.
- **Corner fixings** — each corner is independently locked to a rigid 90° plate or an
  adjustable gusset. The model computes the real interior angle and refuses to let a rigid
  plate sit on a skewed corner.
- **Framing optimiser** — once the footprint, door count, roof load and steel grade are
  confirmed, one click sizes the Z purlins, girder count and perimeter post count to the
  lightest standard arrangement that still passes the screens: material is cut until the
  structure is safe, never past it.
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
- **Saved designs** — keep as many layout variants as you like in this browser.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4. Everything runs in the browser.

## Scripts

```bash
bun install
bun run dev        # http://localhost:5173
bun run typecheck  # tsc -b --noEmit
bun test           # engine + render smoke tests
```

## A note on the numbers

The span and capacity checks are indicative planning guidance, calibrated against common
cold-formed Z and C purlin tables. Confirm every section against the manufacturer's load
tables and get a structural sign-off before you build.
