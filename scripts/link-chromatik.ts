#!/usr/bin/env bun
// Point Chromatik's Fixtures, Projects and Scripts folders, and the Video pattern's LaserphileVideo
// folder, at this repo, so Chromatik loads and saves straight into it and a `git pull` updates what
// Chromatik sees.
//
//   bun scripts/link-chromatik.ts [path to the Chromatik folder, default ~/Chromatik]
//
// Fixtures links to fixtures/, Projects to projects/, Scripts to scripts/ and LaserphileVideo to videos/.
// Whole folders are linked, not single files, because a fixture's file name is the type name projects
// store, and the link keeps those names exactly as they are in the repo.
//
// Safe to re-run. A link already pointing here is left alone, a link pointing anywhere else is
// replaced, and a real folder is renamed to <Name>.bak.<date-time> first, so nothing is deleted.
import { existsSync, lstatSync, readlinkSync, renameSync, symlinkSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const repo = resolve(import.meta.dir, "..");
const chromatik = resolve(Bun.argv[2] ?? join(homedir(), "Chromatik"));
const links: [string, string][] = [
  ["Fixtures", "fixtures"],
  ["Projects", "projects"],
  ["Scripts", "scripts"],
  ["LaserphileVideo", "videos"],
];

if (!existsSync(chromatik)) {
  console.error(`No Chromatik folder at ${chromatik}. Start Chromatik once to create it, or pass its path.`);
  process.exit(1);
}

const pad = (n: number) => String(n).padStart(2, "0");
const now = new Date();
const stamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}-${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;

let problems = 0;
for (const [name, folder] of links) {
  const from = join(repo, folder);
  const to = join(chromatik, name);
  const stat = (() => {
    try {
      return lstatSync(to);
    } catch {
      return null;
    }
  })();

  try {
    if (stat?.isSymbolicLink()) {
      const current = resolve(chromatik, readlinkSync(to));
      if (current === from) {
        console.log(`ok        ${name} -> ${from}`);
        continue;
      }
      unlinkSync(to);
      console.log(`relinking ${name}, was ${current}`);
    } else if (stat) {
      const backup = `${to}.bak.${stamp}`;
      renameSync(to, backup);
      console.log(`moved     ${name} to ${backup}`);
    }
    // A junction needs no Developer Mode on Windows. Elsewhere the type is ignored.
    symlinkSync(from, to, "junction");
    console.log(`linked    ${name} -> ${from}`);
  } catch (error: any) {
    console.error(`failed    ${name}: ${error.message}`);
    problems++;
  }
}

process.exitCode = problems ? 1 : 0;
