import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Leaf } from "lucide-react";
import { Landing } from "./pages/Landing";
import { AuthPage } from "./pages/AuthPage";
import { RequireAuth } from "./components/RequireAuth";

// The workspace is a separate chunk from the landing page, so first paint does
// not carry the drawing engine and panel code.
const Designer = lazy(() =>
  import("./components/Designer").then((m) => ({ default: m.Designer })),
);

function DesignerFallback() {
  return (
    <div className="bp-grid flex min-h-screen items-center justify-center bg-slate-bark-950">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg border border-canopy-800 bg-canopy-900/40 text-canopy-300">
          <Leaf className="size-5" />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-bark-500">
          Loading workspace
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/designer"
          element={
            <RequireAuth>
              <Suspense fallback={<DesignerFallback />}>
                <Designer />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}