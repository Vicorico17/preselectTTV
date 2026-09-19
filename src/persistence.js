import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const enabled = !process.env.VERCEL;
const filename = resolve(process.env.PICK_PREDICT_DATA_FILE || ".data/pick-predict.json");

export async function loadSnapshot() {
  if (!enabled) return null;
  try { return JSON.parse(await readFile(filename, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export async function saveSnapshot(snapshot) {
  if (!enabled) return;
  await mkdir(dirname(filename), { recursive: true });
  await writeFile(filename, JSON.stringify(snapshot, null, 2));
}

export const persistenceMode = enabled ? "local-file" : "serverless-memory";
