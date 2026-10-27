// Maps a project ID (from the projects table) to its store adapter.

import { sampleAdapter } from "./sample";
import type { StoreAdapter } from "./types";

const adapters: Record<string, StoreAdapter> = {
  sample: sampleAdapter,
};

export function getAdapter(projectId: string): StoreAdapter {
  const adapter = adapters[projectId];
  if (!adapter) throw new Error(`No store adapter for project "${projectId}"`);
  return adapter;
}

export type * from "./types";
