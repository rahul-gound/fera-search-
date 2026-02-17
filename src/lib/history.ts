import { openDB, type IDBPDatabase } from "idb";
import type { HistoryItem } from "./types";

const DB_NAME = "fera-search";
const STORE = "history";
const DB_VERSION = 1;
const MAX_ITEMS = 20;

function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("time", "time");
      }
    },
  });
}

export async function addHistoryItem(item: Omit<HistoryItem, "id">): Promise<void> {
  const db = await getDB();
  await db.add(STORE, item);

  // Keep only latest MAX_ITEMS
  const all = await db.getAllFromIndex(STORE, "time");
  if (all.length > MAX_ITEMS) {
    const toDelete = all.slice(0, all.length - MAX_ITEMS);
    const tx = db.transaction(STORE, "readwrite");
    for (const old of toDelete) {
      await tx.store.delete(old.id!);
    }
    await tx.done;
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(STORE, "time");
  return all.reverse(); // newest first
}

export async function clearHistory(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE);
}
