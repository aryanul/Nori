/**
 * Wipe the entire `nori` MongoDB database.
 *
 * Drops every collection — users, accounts, sessions, workspaces, nodes,
 * connections, threads, activities, etc. Anyone signed in gets logged out
 * on next request; every workspace is gone.
 *
 * Usage:
 *   npx tsx scripts/wipe-db.ts
 *
 * Requires the operator to type "wipe nori" exactly at the prompt — there
 * is no --yes flag, on purpose. Reads MONGODB_URI from .env.local.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { MongoClient } from "mongodb";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const DB_NAME = "nori";
const CONFIRM_PHRASE = "wipe nori";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  const collections = await db.listCollections().toArray();
  if (collections.length === 0) {
    console.log(`Database "${DB_NAME}" has no collections — nothing to wipe.`);
    await client.close();
    return;
  }

  const counts = await Promise.all(
    collections.map(async (c) => ({
      name: c.name,
      count: await db.collection(c.name).countDocuments(),
    })),
  );

  console.log(`\nAbout to DROP every collection in database "${DB_NAME}":\n`);
  for (const { name, count } of counts) {
    console.log(`  - ${name.padEnd(28)} ${count} docs`);
  }
  const total = counts.reduce((s, c) => s + c.count, 0);
  console.log(`\n  Total: ${total} documents across ${counts.length} collections.\n`);
  console.log(`This is permanent. Type "${CONFIRM_PHRASE}" to proceed.`);

  const rl = readline.createInterface({ input, output });
  const answer = (await rl.question("> ")).trim();
  rl.close();

  if (answer !== CONFIRM_PHRASE) {
    console.log("Aborted — nothing was deleted.");
    await client.close();
    process.exit(0);
  }

  console.log("\nDropping collections…");
  for (const { name } of counts) {
    await db.collection(name).drop();
    console.log(`  dropped ${name}`);
  }
  console.log("\nDone. Database is empty.");
  await client.close();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
