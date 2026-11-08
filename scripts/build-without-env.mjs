// Runs `next build` with every app setting blanked, exactly like a fresh fork (and CI).
// Blank values stop Next from loading them from .env.local, so a page that wrongly reads
// settings at build time fails the e2e tests locally instead of only in CI.
// Setting names come from .env.example.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const keys = readFileSync(new URL("../.env.example", import.meta.url), "utf8")
  .split("\n")
  .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
  .filter(Boolean);

const env = { ...process.env, ...Object.fromEntries(keys.map((key) => [key, ""])) };
const result = spawnSync("npx", ["next", "build"], { stdio: "inherit", env, shell: process.platform === "win32" });
process.exit(result.status ?? 1);
