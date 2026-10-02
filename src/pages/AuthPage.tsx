import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { Button, Card, Input, Label } from "../components/ui";
import { hasConvex } from "../lib/backend";
import { Leaf, ArrowLeft, Loader2, ArrowRight } from "lucide-react";

type Flow = "signIn" | "signUp";

export function AuthPage() {
  if (!hasConvex) return <LocalAuth />;
  return <CloudAuth />;
}

/**
 * No deployment configured: the designer is fully usable, it just keeps
 * designs in this browser. Say so plainly instead of showing a broken form.
 */
function LocalAuth() {
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") ?? "/designer";

  return (
    <Shell>
      <Card className="p-6">
        <span className="flex size-10 items-center justify-center rounded-lg border border-canopy-800 bg-canopy-900/40 text-canopy-300">
          <Leaf className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-bark-50">
          No account needed
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-bark-400">
          This workspace has no Convex deployment connected, so the designer
          runs in local mode. Everything works — dimensions, drawings, cut list
          and sourcing — and your saved designs stay in this browser.
        </p>
        <p className="mt-4 rounded-md border border-slate-bark-800 bg-slate-bark-950/60 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-slate-bark-400">
          Want your layouts to follow you between devices? Add a Convex
          deployment URL in Settings → Environment and sign-in turns itself on.
        </p>
        <Link to={returnTo} className="mt-5 block">
          <Button variant="primary" className="w-full">
            Open the designer
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </Card>
    </Shell>
  );
}

function CloudAuth() {
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") ?? "/designer";
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (isAuthenticated && !isLoading && !done) {
    // Convex clears the token asynchronously; bounce as soon as we know.
    window.location.replace(returnTo);
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn("password", {
        flow,
        email,
        password,
        ...(flow === "signUp" && name ? { name } : {}),
      });
      if (res.redirect) {
        window.location.href = res.redirect.toString();
        return;
      }
      setDone(true);
      window.location.replace(returnTo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/^Error:\s*/, "")
          : "Could not sign you in",
      );
      setBusy(false);
    }
  };

  return (
    <Shell>
      <Card className="p-6">
        <span className="flex size-10 items-center justify-center rounded-lg border border-canopy-800 bg-canopy-900/40 text-canopy-300">
          <Leaf className="size-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-bark-50">
          {flow === "signIn" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-bark-400">
          Saves your layout so you can come back to it after the next trip to
          the merchants.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3.5">
          {flow === "signUp" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                autoComplete="name"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete={
                flow === "signIn" ? "current-password" : "new-password"
              }
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={busy || done}>
            {busy || done ? <Loader2 className="size-4 animate-spin" /> : null}
            {done
              ? "Signed in — redirecting"
              : flow === "signIn"
                ? "Sign in"
                : "Sign up"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setFlow(flow === "signIn" ? "signUp" : "signIn");
            setError(null);
          }}
          className="mt-5 w-full text-center text-[12px] text-slate-bark-400 transition-colors hover:text-canopy-300"
        >
          {flow === "signIn"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>
      </Card>

      <p className="mt-6 text-center font-mono text-[10px] leading-relaxed text-slate-bark-600">
        Your layout stays in your own account. Nothing is shared.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bp-grid relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-bark-950 px-5 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 60% at 50% 0%, rgba(54,165,108,0.18), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-bark-500 transition-colors hover:text-canopy-300"
        >
          <ArrowLeft className="size-3" />
          Back
        </Link>
        {children}
      </div>
    </div>
  );
}