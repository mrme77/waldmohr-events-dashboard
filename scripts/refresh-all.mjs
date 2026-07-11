import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));

const adapters = [
  "refresh-events.mjs",
  "refresh-news.mjs",
  "refresh-trash.mjs",
  "refresh-holidays.mjs",
  "refresh-fleamarkets.mjs",
  "refresh-kmc.mjs",
  "refresh-kmc-trips.mjs",
  "refresh-family.mjs",
];

/**
 * Runs each adapter via `run` and collects which ones failed, without
 * letting one failure stop the rest.
 *
 * @param {string[]} names Adapter script filenames.
 * @param {(name: string) => number} run Runs one adapter, returns its exit code.
 * @returns {string[]} Names of adapters whose exit code was non-zero.
 */
export function runAdapters(names, run) {
  const failures = [];
  for (const name of names) {
    console.log(`\n> ${name}`);
    if (run(name) !== 0) failures.push(name);
  }
  return failures;
}

/**
 * Runs every refresh adapter to completion, isolating one adapter's
 * failure (e.g. an upstream site being down) from the rest so a single
 * dead source doesn't block cached data for everything else.
 *
 * @returns {void}
 */
function main() {
  const failures = runAdapters(adapters, (name) => {
    const result = spawnSync(process.execPath, [`${scriptsDir}${name}`], {
      stdio: "inherit",
    });
    return result.status ?? 1;
  });

  console.log("\n--- refresh summary ---");
  for (const adapter of adapters) {
    console.log(`${failures.includes(adapter) ? "FAIL" : "ok"}  ${adapter}`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} adapter(s) failed: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
