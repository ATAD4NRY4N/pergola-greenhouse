import { DesignerApp } from "./DesignerApp";
import { useLocalStore } from "../lib/stores";

/**
 * The designer is a single-user tool: one workspace with plans kept in this
 * browser's local storage. No accounts, no cloud.
 */
export function Designer() {
  const store = useLocalStore();
  return <DesignerApp store={store} />;
}
