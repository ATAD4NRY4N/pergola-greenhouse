import { Designer } from "./components/Designer";

/**
 * The designer is the whole app: one screen, no accounts, no marketing pages.
 * Any URL (including /designer bookmarks) renders the workspace.
 */
export default function App() {
  return <Designer />;
}
