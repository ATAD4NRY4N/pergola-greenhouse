import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  designs: defineSchema({
    name: v.optional(v.string()),
    // Snapshot of the parametric design. Kept as a JSON blob so the
    // designer schema can evolve without a migration.
    design: v.any(),
    summary: v.optional(v.string()),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  sourcedItems: defineSchema({
    userId: v.id("users"),
    designId: v.optional(v.id("designs")),
    key: v.string(),
    label: v.string(),
    done: v.boolean(),
  }).index("by_user", ["userId"]),
});
