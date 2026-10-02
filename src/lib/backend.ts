/**
 * Whether a Convex deployment is configured for this workspace.
 *
 * When `VITE_CONVEX_URL` is absent the app runs in local mode: everything
 * works, designs are kept in the browser, and the cloud save / account
 * features stay switched off. Add the variable in Settings -> Environment and
 * they turn themselves on.
 */
const raw =
  (import.meta.env.VITE_CONVEX_URL as string | undefined)?.trim() ?? "";

export const CONVEX_URL = raw;

export const hasConvex = raw.length > 0 && /^https?:\/\//.test(raw);