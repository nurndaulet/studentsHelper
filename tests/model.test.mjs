import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/model.js", import.meta.url),
  "utf8",
);
const {
  validDate,
  validTime,
  validateLesson,
  validateTask,
  upcomingTasks,
  weekDay,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("dates reject nonexistent days and accept leap years", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("abc"), false);
});
test("lesson time validation and overlaps preserve adjacent slots", () => {
  assert.equal(validTime("24:00"), false);
  assert.equal(validTime("09:30"), true);
  const a = { id: "a", title: "Math", day: 0, start: "09:00", end: "10:00" };
  assert.ok(validateLesson({ ...a, start: "09:30" }, [a]));
  assert.equal(
    validateLesson({ ...a, start: "10:00", end: "11:00" }, [a]),
    null,
  );
  assert.equal(validateLesson(a, [a], "a"), null);
  assert.equal(validateLesson({ ...a, day: 1 }, [a]), null);
  assert.ok(validateLesson({ ...a, end: "08:00" }, []));
});
test("tasks require title and valid deadline", () => {
  assert.ok(validateTask({ title: " ", due: "2026-10-20" }));
  assert.ok(validateTask({ title: "Essay", due: "2026-13-01" }));
  assert.equal(validateTask({ title: "Essay", due: "2026-10-20" }), null);
});
test("dashboard deadlines omit completed tasks and sort ascending without mutation", () => {
  const tasks = [
    { id: 1, due: "2026-10-22", done: false },
    { id: 2, due: "2026-10-19", done: true },
    { id: 3, due: "2026-10-20", done: false },
  ];
  assert.deepEqual(
    upcomingTasks(tasks).map((x) => x.id),
    [3, 1],
  );
  assert.equal(tasks[0].id, 1);
});
test("Monday-first calendar handles Sunday", () => {
  assert.equal(weekDay(new Date(2026, 9, 18)), 6);
  assert.equal(weekDay(new Date(2026, 9, 19)), 0);
});
