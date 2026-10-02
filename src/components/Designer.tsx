import { useCallback } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { DesignerApp } from "./DesignerApp";
import { useLocalStore, type DesignStore } from "../lib/stores";
import { hasConvex } from "../lib/backend";
import { useConvexStore } from "./convexStore";

/**
 * The designer runs against Convex when a deployment is configured and falls
 * back to browser-local storage otherwise. Both paths render the same UI, so
 * switching a deployment on later changes nothing about the design itself.
 */
export function Designer() {
  if (!hasConvex) return <LocalDesigner />;
  return <CloudDesigner />;
}

function LocalDesigner() {
  const store = useLocalStore();
  return <DesignerApp store={store} sessionLabel="this browser" />;
}

function CloudDesigner() {
  const store: DesignStore = useConvexStore();
  const { signOut } = useAuthActions();
  const onSignOut = useCallback(() => {
    void signOut();
  }, [signOut]);
  return <DesignerApp store={store} sessionLabel="account" onSignOut={onSignOut} />;
}