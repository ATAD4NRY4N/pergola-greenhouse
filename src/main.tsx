import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";
import { hasConvex } from "./lib/backend";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

// Without a deployment the app runs fully local, so the Convex provider is only
// mounted when there is something to talk to.
const tree = (
  <StrictMode>
    <App />
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(
  hasConvex && url ? (
    <ConvexAuthProvider client={new ConvexReactClient(url)}>
      {tree}
    </ConvexAuthProvider>
  ) : (
    tree
  ),
);