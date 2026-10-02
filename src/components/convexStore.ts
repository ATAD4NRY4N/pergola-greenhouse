import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import type { Design } from "../lib/model";
import type { DesignStore, SavedDesign } from "../lib/stores";

/**
 * Convex-backed store. Function references are built by name so the module
 * compiles before `convex dev --once` has generated the typed API, and so the
 * app still builds in workspaces with no deployment configured.
 */
const listDesigns = makeFunctionReference<"query">("designs:list");
const saveDesign = makeFunctionReference<"mutation">("designs:save");
const deleteDesign = makeFunctionReference<"mutation">("designs:remove");

type Row = {
  _id: string;
  name?: string;
  summary?: string;
  design: unknown;
  updatedAt: number;
  createdAt: number;
};

export function useConvexStore(): DesignStore {
  const rows = useQuery(listDesigns) as Row[] | undefined;
  const save = useMutation(saveDesign);
  const remove = useMutation(deleteDesign);

  const designs: SavedDesign[] = (rows ?? []).map((r) => ({
    id: r._id,
    name: r.name ?? "Untitled",
    summary: r.summary,
    design: r.design,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
  }));

  const doSave = useCallback<DesignStore["save"]>(
    async (args) => {
      const id = await save({
        id: args.id ? (args.id as GenericId<"designs">) : undefined,
        name: args.name,
        summary: args.summary,
        design: args.design as unknown as Record<string, unknown>,
      });
      return id as string;
    },
    [save],
  );

  const doRemove = useCallback(
    async (id: string) => {
      await remove({ id: id as GenericId<"designs"> });
    },
    [remove],
  );

  return { designs, ready: rows !== undefined, save: doSave, remove: doRemove };
}

export type { Design };