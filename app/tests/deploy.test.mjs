import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

/** Runs the real deployment script against isolated files and simulated commands. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "waldmohr-deploy-test-"));
  const repo = join(root, "repo");
  const ops = join(root, "ops");
  const dest = join(root, "dest");
  const bin = join(root, "bin");
  for (const dir of [join(repo, "app"), ops, dest, bin]) mkdirSync(dir, { recursive: true });
  for (const name of ["package.json", "package-lock.json"]) writeFileSync(join(repo, "app", name), "{}");
  writeFileSync(join(dest, "family.json"), "private calendar");
  const log = join(root, "commands");
  const stub = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_LOG, command + ' ' + args.join(' ') + '\\n');
if (command === 'git') {
  if (args[0] === 'status' && process.env.TEST_DIRTY) console.log(' M local-file');
  if (args[0] === 'rev-parse') console.log(process.env.TEST_COMMIT || 'commit-a');
}
if (command === 'node') console.log('v22.0.0');
if (command === 'npm') {
  if (args[0] === '--version') console.log('10.0.0');
  if (args[0] === 'ci') {
    fs.mkdirSync('node_modules/.bin', { recursive: true });
    fs.writeFileSync('node_modules/.package-lock.json', '{}');
    for (const tool of ['vite', 'tsc']) fs.writeFileSync('node_modules/.bin/' + tool, '', { mode: 0o755 });
  }
  if (args.join(' ') === 'run build' && process.env.TEST_FAIL_BUILD) process.exit(1);
}
if (command === 'rsync') {
  if (!args.includes('--exclude=family.json')) process.exit(2);
  if (process.env.TEST_FAIL_PUBLISH) process.exit(1);
  fs.writeFileSync(path.join(process.env.TEST_DEST, 'index.html'), 'published');
}
`;
  for (const name of ["git", "npm", "node", "rsync", "flock"]) writeFileSync(join(bin, name), stub, { mode: 0o755 });
  return {
    repo, ops, dest,
    run(extra = {}) {
      writeFileSync(log, "");
      let failed = false;
      try {
        execFileSync("bash", [resolve("ops/deploy.sh"), repo, dest, ops], {
          env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_DEST: dest, TEST_LOG: log, ...extra },
          stdio: "pipe",
        });
      } catch (error) {
        if (typeof error.status !== "number") throw error;
        failed = true;
      }
      return { failed, log: readFileSync(log, "utf8") };
    },
  };
}

test("first run publishes and preserves the private calendar; unchanged runs skip work", () => {
  const f = fixture();
  const first = f.run();
  assert.equal(first.failed, false);
  assert.match(first.log, /npm ci/);
  assert.equal(readFileSync(join(f.ops, "published-commit"), "utf8"), "commit-a\n");
  assert.equal(readFileSync(join(f.dest, "family.json"), "utf8"), "private calendar");
  const second = f.run();
  assert.equal(second.failed, false);
  assert.doesNotMatch(second.log, /npm |rsync /);
});

test("new commits reuse dependencies, but changed lockfiles install them again", () => {
  const f = fixture();
  assert.equal(f.run().failed, false);
  const changed = f.run({ TEST_COMMIT: "commit-b" });
  assert.equal(changed.failed, false);
  assert.doesNotMatch(changed.log, /npm ci/);
  assert.match(changed.log, /npm run build/);
  writeFileSync(join(f.repo, "app/package-lock.json"), '{"changed":true}');
  const lockChange = f.run({ TEST_COMMIT: "commit-c" });
  assert.equal(lockChange.failed, false);
  assert.match(lockChange.log, /npm ci/);
});

test("failed builds and failed publishes retry without recording a successful commit", () => {
  for (const failure of ["TEST_FAIL_BUILD", "TEST_FAIL_PUBLISH"]) {
    const f = fixture();
    assert.equal(f.run({ [failure]: "1" }).failed, true);
    assert.equal(existsSync(join(f.ops, "published-commit")), false);
    const retry = f.run();
    assert.equal(retry.failed, false);
    assert.match(retry.log, /npm run build/);
    assert.equal(readFileSync(join(f.ops, "published-commit"), "utf8"), "commit-a\n");
  }
});

test("dirty checkouts stop before fetching or publishing", () => {
  const f = fixture();
  const result = f.run({ TEST_DIRTY: "1" });
  assert.equal(result.failed, true);
  assert.doesNotMatch(result.log, /git fetch|npm |rsync /);
});

test("missing published output forces rebuilding even at the recorded commit", () => {
  const f = fixture();
  writeFileSync(join(f.ops, "published-commit"), "commit-a\n");
  const result = f.run();
  assert.equal(result.failed, false);
  assert.match(result.log, /npm run build/);
});
