import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/storage.js", import.meta.url),
  "utf8",
);
const { createStudentStorage, STORAGE_KEY, BACKUP_KEY } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const saved = {
  profile: { name: "Айдана", group: "IT-24" },
  lessons: [{ id: "lesson" }],
  tasks: [{ id: "task", done: true }],
  materials: [{ id: "material", notes: "Конспект" }],
};
function device() {
  const disk = new Map();
  return {
    disk,
    async getItem(k) {
      return disk.get(k) ?? null;
    },
    async setItem(k, v) {
      disk.set(k, v);
    },
  };
}
test("all student data survives a new storage instance", async () => {
  const adapter = device();
  await createStudentStorage(adapter).save(saved);
  assert.deepEqual(await createStudentStorage(adapter).load(), saved);
  assert.equal(adapter.disk.get(STORAGE_KEY), adapter.disk.get(BACKUP_KEY));
});
test("legacy installations keep data at original key", async () => {
  const adapter = device();
  adapter.disk.set(STORAGE_KEY, JSON.stringify(saved));
  assert.deepEqual(await createStudentStorage(adapter).load(), saved);
});
test("backup recovers corrupt or absent primary without overwriting original", async () => {
  const adapter = device();
  await createStudentStorage(adapter).save(saved);
  adapter.disk.set(STORAGE_KEY, "broken");
  assert.deepEqual(await createStudentStorage(adapter).load(), saved);
  assert.equal(adapter.disk.get(STORAGE_KEY), "broken");
  adapter.disk.delete(STORAGE_KEY);
  assert.deepEqual(await createStudentStorage(adapter).load(), saved);
});
test("unreadable data is reported rather than silently replaced with defaults", async () => {
  const adapter = device();
  adapter.disk.set(STORAGE_KEY, "broken");
  await assert.rejects(createStudentStorage(adapter).load());
  assert.equal(adapter.disk.get(STORAGE_KEY), "broken");
});
test("failed writes are reported and do not prevent a later retry", async () => {
  const adapter = device();
  const original = adapter.setItem;
  adapter.setItem = async () => {
    throw Error("disk full");
  };
  const storage = createStudentStorage(adapter);
  await assert.rejects(storage.save(saved));
  adapter.setItem = original;
  await storage.save(saved);
  assert.deepEqual(await storage.load(), saved);
});
test("concurrent writes are committed in requested order", async () => {
  const adapter = device();
  const original = adapter.setItem;
  adapter.setItem = async (k, v) => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    return original(k, v);
  };
  const storage = createStudentStorage(adapter);
  const next = { ...saved, tasks: [] };
  await Promise.all([storage.save(saved), storage.save(next)]);
  assert.deepEqual(await storage.load(), next);
});
