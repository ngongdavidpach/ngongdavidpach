import { promises as fs } from "fs";
import path from "path";
import type { Database } from "./types";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "junubpay.json");

function dbPath(): string {
  return process.env.JUNUB_DB_PATH || DEFAULT_DB_PATH;
}

function emptyDb(): Database {
  return {
    users: [],
    beneficiaries: [],
    providers: [],
    transactions: [],
    ledger: [],
    auditLogs: [],
    meta: {
      schemaVersion: 1,
      seededAt: new Date().toISOString(),
      sspRate: 1450,
    },
  };
}

// Module-level cache. The dev server can reload modules, so we read lazily and
// re-validate against disk when the cache is empty.
let cache: Database | null = null;
let loading: Promise<Database> | null = null;

async function load(): Promise<Database> {
  if (cache) return cache;
  if (loading) return loading;

  loading = (async () => {
    const file = dbPath();
    try {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const raw = await fs.readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Database;
      // Light validation / migration safety.
      cache = {
        ...emptyDb(),
        ...parsed,
        meta: { ...emptyDb().meta, ...(parsed.meta || {}) },
      };
      return cache;
    } catch (err: unknown) {
      // File missing or corrupt — start fresh.
      cache = emptyDb();
      await persist(cache);
      return cache;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

/** Atomically persist the current database to disk. */
export async function persist(db: Database): Promise<void> {
  const file = dbPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, file);
}

/**
 * Read-only access to the database. Returns the live object — never mutate it
 * directly in a way that should be persisted; use `mutate` for writes.
 */
export async function getDb(): Promise<Database> {
  return load();
}

/**
 * Apply a mutation to the database and persist the result atomically.
 * Returns whatever the mutator produces.
 */
export async function mutate<T>(
  fn: (db: Database) => T | Promise<T>,
): Promise<T> {
  const db = await load();
  const result = await fn(db);
  await persist(db);
  return result;
}

/** Re-read from disk (used by tooling/scripts). */
export async function reload(): Promise<Database> {
  cache = null;
  return load();
}

/** Generate a sortable, collision-resistant id. */
export function makeId(prefix = ""): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${prefix ? "_" : ""}${ts}${rand}`;
}
