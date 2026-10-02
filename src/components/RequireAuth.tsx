import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useConvexAuth } from "@convex-dev/auth/react";
import { hasConvex } from "../lib/backend";
import { Leaf } from "lucide-react";

export function RequireAuth({ children }: { children: ReactNode }) {
  if (!hasConvex) return <>{children}</>;
  return <ConvexGate>{children}</ConvexGate>;
}

function ConvexGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="bp-grid flex min-h-screen items-center justify-center bg-slate-bark-950">
        <div className="flex flex-col items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg border border-canopy-800 bg-canopy-900/40 text-canopy-300">
            <Leaf className="size-5" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-bark-500">
            Checking your session
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <>{children}</>;
}