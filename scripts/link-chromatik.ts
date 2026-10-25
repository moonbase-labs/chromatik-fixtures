#!/usr/bin/env bun
// Point Chromatik's Fixtures, Projects and Scripts folders, and the Video pattern's LaserphileVideo
// folder, at this repo, so Chromatik loads and saves straight into it and a `git pull` updates what
// Chromatik sees.
//
//   bun scripts/link-chromatik.ts [path to the Chromatik folder, default ~/Chromatik] [--videos <folder>]
//
// Fixtures links to fixtures/, Projects to projects/, Scripts to scripts/ and LaserphileVideo to videos/.
// Whole folders are linked, not single files, because a fixture's file name is the type name projects
// store, and the link keeps those names exactly as they are in the repo.
//
// videos/ is not in git. With --videos it becomes a link to that folder, such as a cloud storage folder;
// without it, it is an ordinary local folder.
//
// Safe to re-run. A link already pointing at the right place is left alone, a link pointing anywhere
// else is replaced, and a real folder is renamed to <Name>.bak.<date-time> first, so nothing is deleted.
import { lstatSync, mkdirSync, readlinkSync, renameSync, statSync, symlinkSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: { videos: { type: "string" } },
  allowPositionals: true,
});

const repo = resolve(import.meta.dir, "..");
const chromatik = resolve(positionals[0] ?? join(homedir(), "Chromatik"));
const videos = join(repo, "videos");
const videosSource = values.videos ? resolve(values.videos) : null;

const links: [string, string][] = [
  ["Fixtures", "fixtures"],
  ["Projects", "projects"],
  ["Scripts", "scripts"],
  ["LaserphileVideo", "videos"],
];

const isFolder = (path: string) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

const entryAt = (path: string) => {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
};

if (!isFolder(chromatik)) {
  console.error(`No Chromatik folder at ${chromatik}. Start Chromatik once to create it, or pass its path.`);
  process.exit(1);
}

if (videosSource && !isFolder(videosSource)) {
  console.error(`No folder at ${videosSource} to keep the videos in.`);
  process.exit(1);
}

const pad = (value: number) => String(value).padStart(2, "0");
const now = new Date();
const stamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}-${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;

let problems = 0;

const link = (name: string, from: string, to: string) => {
  const existing = entryAt(to);

  try {
    if (existing?.isSymbolicLink()) {
      const current = resolve(to, "..", readlinkSync(to));

      if (current === from) {
        console.log(`ok        ${name} -> ${from}`);
        return;
      }

      unlinkSync(to);
      console.log(`relinking ${name}, was ${current}`);
    } else if (existing) {
      const backup = `${to}.bak.${stamp}`;

      renameSync(to, backup);
      console.log(`moved     ${name} to ${backup}`);
    }

    try {
      symlinkSync(from, to, "junction");
    } catch (error) {
      if (process.platform !== "win32") {
        throw error;
      }

      symlinkSync(from, to, "dir");
    }

    console.log(`linked    ${name} -> ${from}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const hint = process.platform === "win32" ? " Turn on Developer Mode and run this again." : "";

    console.error(`failed    ${name}: ${reason}.${hint}`);
    problems++;
  }
};

if (videosSource) {
  link("videos", videosSource, videos);
} else if (!entryAt(videos)) {
  mkdirSync(videos);
  console.log(`created   videos, a local folder. Pass --videos to keep them somewhere else.`);
}

for (const [name, folder] of links) {
  link(name, join(repo, folder), join(chromatik, name));
}

process.exitCode = problems ? 1 : 0;
