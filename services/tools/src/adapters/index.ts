// Builds each project's store adapter from its row in projects: `adapter` names the kind of store
// API and `adapter_config` holds that project's settings (e.g. its API URL). Onboarding a store on
// a supported platform is a new row, not new code.

import { sql } from "../db";
import { choppaddiAdapter, type ChoppaddiConfig } from "./choppaddi";
import { sampleAdapter } from "./sample";
import type { StoreAdapter } from "./types";

const factories: Record<string, (config: Record<string, unknown>) => StoreAdapter> = {
  sample: () => sampleAdapter,
  choppaddi: (config) => choppaddiAdapter(config as ChoppaddiConfig),
};

// Rows are re-read at most once a minute. An adapter keeps its own caches (Choppaddi's vendor
// list), so it is rebuilt only when its project row changes.
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; row: string; adapter: StoreAdapter }>();

export async function getAdapter(projectId: string): Promise<StoreAdapter> {
  const hit = cache.get(projectId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.adapter;
  const [row] = await sql<{ adapter: string; adapter_config: Record<string, unknown> }[]>`
    select adapter, adapter_config from projects where id = ${projectId}`;
  if (!row) throw new Error(`Unknown project "${projectId}"`);
  const factory = factories[row.adapter];
  if (!factory) throw new Error(`Project "${projectId}" uses unknown adapter "${row.adapter}"`);
  const key = JSON.stringify(row);
  const adapter = hit?.row === key ? hit.adapter : factory(row.adapter_config);
  cache.set(projectId, { at: Date.now(), row: key, adapter });
  return adapter;
}

export type * from "./types";
