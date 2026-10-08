import { useCallback, useEffect, useState } from "react";
import { DEFAULT_DESIGN, type Design } from "./model";

export interface SavedDesign {
  id: string;
  name: string;
  summary?: string;
  design: unknown;
  updatedAt: number;
  createdAt: number;
}

export interface DesignStore {
  designs: SavedDesign[];
  ready: boolean;
  save: (args: {
    id: string | null;
    name: string;
    summary: string;
    design: Design;
  }) => Promise<string>;
  remove: (id: string) => Promise<void>;
}

const KEY = "polyframe.designs.v1";

function readAll(): SavedDesign[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedDesign[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: SavedDesign[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota or private mode — the in-memory copy still works this session */
  }
}

/** Browser-local design storage — no accounts, no cloud. */
export function useLocalStore(): DesignStore {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDesigns(readAll());
    setReady(true);
  }, []);

  // Keep multiple tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setDesigns(readAll());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback<DesignStore["save"]>(async (args) => {
    const now = Date.now();
    const list = readAll();
    let id = args.id;
    if (id && list.some((d) => d.id === id)) {
      writeAll(
        list.map((d) =>
          d.id === id
            ? {
                ...d,
                name: args.name,
                summary: args.summary,
                design: args.design,
                updatedAt: now,
              }
            : d,
        ),
      );
    } else {
      id = `local-${now}-${Math.random().toString(36).slice(2, 8)}`;
      writeAll([
        { ...args, id, design: args.design, createdAt: now, updatedAt: now },
        ...list,
      ]);
    }
    setDesigns(readAll());
    return id as string;
  }, []);

  const remove = useCallback(async (id: string) => {
    writeAll(readAll().filter((d) => d.id !== id));
    setDesigns(readAll());
  }, []);

  return { designs, ready, save, remove };
}

export function coerceDesign(raw: unknown): Design {
  const saved = raw && typeof raw === "object" ? (raw as Partial<Design>) : {};
  return {
    ...DEFAULT_DESIGN,
    ...saved,
    doorTrimDepth: saved.doorTrimDepth ?? DEFAULT_DESIGN.doorTrimDepth,
    doorTrimGauge: saved.doorTrimGauge ?? DEFAULT_DESIGN.doorTrimGauge,
  };
}