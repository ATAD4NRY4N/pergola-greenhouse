import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { DEFAULT_DESIGN, buildModel } from "../lib/model";
import { Axonometric } from "../components/views/Axonometric";
import { Badge, Button, Card } from "../components/ui";
import { SUPPLIERS } from "../lib/suppliers";
import {
  Leaf,
  ArrowRight,
  Move3d,
  ListChecks,
  MapPin,
  Layers,
  Boxes,
  DoorOpen,
  Triangle,
  Sparkles,
} from "lucide-react";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export function Landing() {
  const model = useMemo(() => buildModel(DEFAULT_DESIGN), []);
  const [yaw, setYaw] = useState(-38);

  return (
    <div className="min-h-screen bg-slate-bark-950">
      {/* ---------------- nav ---------------- */}
      <header className="sticky top-0 z-40 border-b border-slate-bark-800/70 bg-slate-bark-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5">
          <span className="flex items-center gap-2 text-canopy-300">
            <Leaf className="size-5" />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.22em]">
              Polyframe
            </span>
          </span>
          <nav className="ml-6 hidden items-center gap-5 text-xs text-slate-bark-400 md:flex">
            <a href="#spec" className="transition-colors hover:text-canopy-200">
              The spec
            </a>
            <a href="#adjust" className="transition-colors hover:text-canopy-200">
              What you can change
            </a>
            <a href="#source" className="transition-colors hover:text-canopy-200">
              Where to buy
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/auth?returnTo=/designer">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth?returnTo=/designer">
              <Button variant="primary" size="sm">
                Open the designer
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- hero ---------------- */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 20% -10%, rgba(54,165,108,0.16), transparent 60%), radial-gradient(90% 60% at 90% 10%, rgba(50,158,180,0.12), transparent 60%)",
          }}
        />
        <div className="bp-grid pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-24">
          <motion.div initial="hidden" animate="show" variants={fade} transition={{ duration: 0.6 }}>
            <Badge tone="green" className="mb-5">
              <Sparkles className="size-3" />
              Runcorn · Widnes · Cheshire
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-slate-bark-50 sm:text-5xl lg:text-6xl">
              Your pergola-greenhouse,
              <span className="block bg-gradient-to-r from-canopy-300 via-glass-300 to-brass-300 bg-clip-text text-transparent">
                drawn before you buy a thing.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-bark-300">
              A lean-to greenhouse built the way you actually build it: SHS posts
              on the corners and the perimeter only, a C purlin ring around all
              four sides, Z purlins carrying the roof, and 8 &times; 4 ft
              twinwall polycarbonate on top and in the doors. Drag the
              dimensions, watch the frame and the sheets redraw, and get a real
              cut list.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth?returnTo=/designer">
                <Button variant="primary" size="lg">
                  Start designing
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#spec">
                <Button variant="outline" size="lg">
                  See the fixed spec
                </Button>
              </a>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-bark-800 bg-slate-bark-800">
              {[
                ["8.5 m", "default width"],
                ["8.0 / 7.0", "left / right depth"],
                [`${model.stats.totalSheets}`, "polycarb sheets"],
              ].map(([v, k]) => (
                <div key={k} className="bg-slate-bark-950 px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-bark-500">
                    {k}
                  </dt>
                  <dd className="mt-1 font-mono text-lg text-canopy-200 tnum">{v}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* live preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <Card className="overflow-hidden bg-slate-bark-900/50">
              <div className="flex items-center gap-2 border-b border-slate-bark-800 px-4 py-2.5">
                <span className="size-2 rounded-full bg-red-400/70" />
                <span className="size-2 rounded-full bg-brass-400/70" />
                <span className="size-2 rounded-full bg-canopy-400/70" />
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-bark-500">
                  axonometric · drag to rotate
                </span>
              </div>
              <div className="bp-grid bg-slate-bark-950/60">
                <Axonometric
                  model={model}
                  showSheets
                  showSteel
                  width={620}
                  height={430}
                  yaw={yaw}
                  tilt={58}
                  onYaw={setYaw}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-bark-800 px-4 py-2.5">
                {[
                  ["#cfe3d8", "SHS posts"],
                  ["#8fd9ab", "C purlin ring"],
                  ["#7ecfb0", "Z purlins"],
                  ["#e0b05c", "sliding doors"],
                ].map(([c, t]) => (
                  <span
                    key={t}
                    className="flex items-center gap-1.5 font-mono text-[10px] text-slate-bark-400"
                  >
                    <span
                      className="inline-block h-0.5 w-4 rounded"
                      style={{ background: c }}
                    />
                    {t}
                  </span>
                ))}
                <span className="ml-auto font-mono text-[10px] text-slate-bark-500 tnum">
                  {model.roofPitchDeg.toFixed(1)}° fall · {model.posts.length} posts
                </span>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ---------------- spec ---------------- */}
      <section id="spec" className="border-t border-slate-bark-800/70 bg-slate-bark-900/20">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHeading
            eyebrow="Fixed by the brief"
            title="The build is decided. The dimensions are yours."
            body="Everything below is baked into the model so the drawings and the cut list only ever describe something you could actually get built."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Layers className="size-5" />,
                title: "8 × 4 ft polycarbonate",
                body: "Twinwall or triplewall, 2438 × 1219 mm, used for the roof, the fixed panels and the doors — so every offcut is reusable.",
              },
              {
                icon: <Boxes className="size-5" />,
                title: "Perimeter posts only",
                body: "SHS on all four corners and spaced along each edge. Nothing stands in the middle of the growing space.",
              },
              {
                icon: <Triangle className="size-5" />,
                title: "C ring + Z roof",
                body: "C purlins wrap the perimeter and frame the walls. Z purlins and Z girders carry the roof between them.",
              },
              {
                icon: <DoorOpen className="size-5" />,
                title: "Sliding polycarb doors",
                body: "Front and left. Each leaf is a trimmed sheet in a metal casing, hung on track wheels off the C purlin above.",
              },
              {
                icon: <Triangle className="size-5" />,
                title: "Two open sides",
                body: "The back leans on the log cabin and the right on the brick wall and timber fence. Structure only, no cladding.",
              },
              {
                icon: <MapPin className="size-5" />,
                title: "Sourced locally",
                body: "A shortlist of Runcorn, Widnes and nearby counters, with what each one is actually for.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                variants={fade}
                transition={{ duration: 0.45, delay: i * 0.05 }}
              >
                <Card className="h-full p-5 transition-colors hover:border-canopy-800">
                  <span className="flex size-10 items-center justify-center rounded-lg border border-canopy-800/60 bg-canopy-900/40 text-canopy-300">
                    {f.icon}
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-slate-bark-100">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-bark-400">
                    {f.body}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- adjustable ---------------- */}
      <section id="adjust" className="border-t border-slate-bark-800/70">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <SectionHeading
                eyebrow="Adjustable"
                title="Twelve things to move, everything else recalculates"
                body="Change a dimension and the post spacing, purlin centres, sheet count, cut lengths and the corner angles all update together."
              />
              <div className="mt-8 space-y-2">
                {[
                  ["Overall width and both depths", "Left side stays the deep one"],
                  ["Eave heights at each end", "Sets the mono-pitch fall"],
                  ["Post spacing and SHS size", "On the perimeter and corners only"],
                  ["C purlin ring size and build", "Single, or doubled front and back"],
                  ["Z purlin section and centres", "Plus how many primary girders"],
                  ["Door leaves, size and position", "Front and left, one sheet or two"],
                  ["Rigid or adjustable per corner", "Lock 90° where you can"],
                ].map(([a, b]) => (
                  <div
                    key={a}
                    className="flex items-start gap-3 rounded-lg border border-slate-bark-800 bg-slate-bark-900/40 px-4 py-3"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-canopy-400" />
                    <div>
                      <p className="text-[13px] text-slate-bark-200">{a}</p>
                      <p className="font-mono text-[10px] text-slate-bark-500">{b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="space-y-3"
            >
              <Check title="Corner fixing per corner">
                Back corners sit against your log cabin and the brick wall, so
                they&apos;re genuinely 90° and take a rigid plate. Make the two
                depths equal and the front squares up too. Leave them different
                and the front corners skew — the model tells you the exact angle
                and insists on an adjustable gusset there.
              </Check>
              <Check title="Sheet layout, honestly">
                Roof sheets are laid 2438 mm across the width and counted down
                the depth. Sheets that overhang the trapezoid are flagged as
                cut, so the shop knows how many whole ones you actually need.
              </Check>
              <Check title="Cut list you can hand over">
                Every C and Z length includes its mitre allowance, the posts
                come as one cut length, and the fixings are counted with 10%
                spare. Copy it straight into a merchant&apos;s order.
              </Check>
              <Check title="Checks before you commit">
                Purlin span against an indicative capacity, door leaf against
                the low eave, and every corner against its fixing. Warnings,
                not surprises.
              </Check>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- how ---------------- */}
      <section className="border-t border-slate-bark-800/70 bg-slate-bark-900/20">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHeading eyebrow="How it works" title="Three steps, then builders" />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                n: "01",
                icon: <Move3d className="size-5" />,
                title: "Set the space",
                body: "Walk the garden, get the width and both depths, and the height you can work at off the existing walls.",
              },
              {
                n: "02",
                icon: <ListChecks className="size-5" />,
                title: "Tune the frame",
                body: "Move the post centres, purlin sizes, door positions and corner fixings until the warnings clear.",
              },
              {
                n: "03",
                icon: <MapPin className="size-5" />,
                title: "Buy it locally",
                body: "Take the cut list to the merchants around Runcorn and Widnes, with the sourcing list as your round.",
              },
            ].map((s) => (
              <Card key={s.n} className="p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg border border-canopy-800/60 bg-canopy-900/40 text-canopy-300">
                    {s.icon}
                  </span>
                  <span className="font-mono text-3xl text-slate-bark-800">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-5 text-sm font-semibold text-slate-bark-100">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-bark-400">
                  {s.body}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- sourcing teaser ---------------- */}
      <section id="source" className="border-t border-slate-bark-800/70">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHeading
            eyebrow="Local"
            title="Everything within a short drive of Runcorn"
            body="A working shortlist of the counters that normally stock this kind of build — and what to ask each of them for."
          />
          <div className="mt-10 flex flex-wrap gap-2">
            {[...new Set(SUPPLIERS.map((s) => s.name))]
              .slice(0, 10)
              .map((n) => (
                <span
                  key={n}
                  className="rounded-full border border-slate-bark-700 bg-slate-bark-900 px-3.5 py-1.5 font-mono text-xs text-slate-bark-300"
                >
                  {n}
                </span>
              ))}
            <span className="rounded-full border border-canopy-800 bg-canopy-900/40 px-3.5 py-1.5 font-mono text-xs text-canopy-300">
              + {SUPPLIERS.length - 10} more in the app
            </span>
          </div>
        </div>
      </section>

      {/* ---------------- final CTA ---------------- */}
      <section className="relative overflow-hidden border-t border-slate-bark-800/70">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(100% 120% at 50% 0%, rgba(54,165,108,0.18), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-bark-50 sm:text-4xl">
            Start with 8.5 by 8. Then move every number until it fits.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-relaxed text-slate-bark-400">
            The designer saves your layout, so you can come back to it after the
            next trip to the merchants and change one thing at a time.
          </p>
          <Link to="/auth?returnTo=/designer" className="mt-9 inline-block">
            <Button variant="primary" size="lg">
              Open the designer
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-bark-800/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-center sm:flex-row sm:items-center sm:text-left">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-canopy-400">
            <Leaf className="size-3.5" />
            Polyframe
          </span>
          <p className="flex-1 font-mono text-[10px] leading-relaxed text-slate-bark-600">
            Indicative planning tool. Span and load checks are guidance only —
            confirm every section against the manufacturer&apos;s tables and get a
            structural sign-off before you build. Supplier details change;
            confirm locally before travelling.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={fade}
      transition={{ duration: 0.5 }}
      className="max-w-2xl"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-canopy-400">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-slate-bark-50 sm:text-4xl">
        {title}
      </h2>
      {body && (
        <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-bark-400">
          {body}
        </p>
      )}
    </motion.div>
  );
}

function Check({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-canopy-400" />
        <h3 className="text-[13px] font-semibold text-slate-bark-100">{title}</h3>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-bark-400">{children}</p>
    </Card>
  );
}