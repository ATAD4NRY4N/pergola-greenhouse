import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/** All designs belonging to the signed-in user, newest first. */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("designs"),
      name: v.optional(v.string()),
      summary: v.optional(v.string()),
      design: v.any(),
      updatedAt: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("designs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/** Insert a new design, or overwrite an existing one the user owns. */
export const save = mutation({
  args: {
    id: v.optional(v.id("designs")),
    name: v.string(),
    summary: v.optional(v.string()),
    design: v.any(),
  },
  returns: v.id("designs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You need to be signed in to save a design.");

    const now = Date.now();
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.userId !== userId) {
        throw new Error("That design does not belong to you.");
      }
      await ctx.db.patch(args.id, {
        name: args.name,
        design: args.design,
        summary: args.summary,
        updatedAt: now,
      });
      return args.id;
    }

    return await ctx.db.insert("designs", {
      userId,
      name: args.name,
      design: args.design,
      summary: args.summary,
      updatedAt: now,
      createdAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("designs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You need to be signed in.");
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== userId) {
      throw new Error("That design does not belong to you.");
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

export const rename = mutation({
  args: { id: v.id("designs"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You need to be signed in.");
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== userId) {
      throw new Error("That design does not belong to you.");
    }
    await ctx.db.patch(args.id, { name: args.name, updatedAt: Date.now() });
    return null;
  },
});
