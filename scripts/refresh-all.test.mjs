import { test } from "node:test";
import assert from "node:assert/strict";
import { runAdapters } from "./refresh-all.mjs";

test("runAdapters runs every adapter even when one fails", () => {
  const ran = [];
  const failures = runAdapters(["a", "b", "c"], (name) => {
    ran.push(name);
    return name === "b" ? 1 : 0;
  });

  assert.deepEqual(ran, ["a", "b", "c"]);
  assert.deepEqual(failures, ["b"]);
});

test("runAdapters returns no failures when all succeed", () => {
  const failures = runAdapters(["a", "b"], () => 0);
  assert.deepEqual(failures, []);
});
