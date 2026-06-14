#!/usr/bin/env node
/**
 * Load the staged data exports (supabase/data/*.sql) into Postgres over a
 * direct connection. Needed only for the two large catalog files
 * (07_Requirement, 18_RequirementChangeLog) — everything else was loaded
 * via the Supabase MCP on 2026-06-12.
 *
 * Usage:
 *   # 'pg' is pure JS; install it anywhere and point NODE_PATH at it, e.g.:
 *   cd /tmp/prisma-scratch && npm i pg && cd -
 *   NODE_PATH=/tmp/prisma-scratch/node_modules \
 *     node scripts/load-postgres-data.mjs "$DATABASE_URL" supabase/data/07_Requirement.sql supabase/data/18_RequirementChangeLog.sql
 *
 * The connection string comes from the Supabase dashboard (project
 * permitpro-pms → Connect → Session pooler) with the database password.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client } = require("pg");

const [url, ...files] = process.argv.slice(2);
if (!url || files.length === 0) {
  console.error("usage: load-postgres-data.mjs <DATABASE_URL> <file.sql> [...]");
  process.exit(1);
}

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  for (const file of files) {
    const sql = readFileSync(file, "utf8");
    // Statements are one-per-line INSERTs; run in batches inside a transaction.
    // Strip whole comment lines first so a leading "-- table: N rows" header
    // can't ride along with (and disqualify) the first INSERT segment.
    const statements = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .split(";\n")
      .filter((s) => s.trim());
    await client.query("BEGIN");
    let done = 0;
    const CHUNK = 200; // multi-statement batches: one round trip per chunk
    for (let i = 0; i < statements.length; i += CHUNK) {
      await client.query(statements.slice(i, i + CHUNK).join(";\n") + ";");
      done = Math.min(i + CHUNK, statements.length);
      console.log(`${file}: ${done}/${statements.length}`);
    }
    await client.query("COMMIT");
    console.log(`${file}: ${done} statements applied`);
  }
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
