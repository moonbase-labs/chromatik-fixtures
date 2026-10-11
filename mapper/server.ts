#!/usr/bin/env bun
// Panel mapper: lights each Pi output in turn while someone under the dome taps, on a phone, where it
// lit. The result is saved to mappings/TelecortexDomeUpper.json and turned into a Chromatik project,
// projects/TelecortexDomeUpperMapped.lxp.
//
//   bun mapper/server.ts
//
// Turn Chromatik's output off first: both send to the same Pis.
import { networkInterfaces } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import index from "./index.html";
import { loadDome } from "./lib/dome";
import { loadMapping, saveMapping } from "./lib/mapping";
import { OpcSender } from "./lib/opc";
import { buildProject } from "./lib/project";
import { type Action, Session } from "./lib/session";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    port: { type: "string", default: "4269" },
    mapping: { type: "string" },
  },
});

const root = resolve(import.meta.dir, "..");
const mappingPath = values.mapping ? resolve(values.mapping) : join(root, "mappings", "TelecortexDomeUpper.json");
// Named after the mapping, so trying out a second mapping never overwrites the first one's project.
const projectPath = join(root, "projects", `${basename(mappingPath, ".json")}Mapped.lxp`);

const dome = await loadDome(root);
const mapping = await loadMapping(mappingPath);
const sender = await OpcSender.create();
const session = new Session(dome, mapping, (m) => saveMapping(mappingPath, m), sender, (m) => buildProject(root, dome, m, projectPath));
await session.resolvePis();

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: Number(values.port),
  routes: {
    "/": index,
    "/api/dome": { GET: () => Response.json(session.domeView()) },
    "/api/state": { GET: () => Response.json(session.state()) },
    "/api/action": { POST: async (req) => Response.json(await session.act((await req.json()) as Action)) },
  },
  development: { hmr: true, console: true },
});

// On site, a bug in one tick must not end the session: log it and carry on.
setInterval(() => {
  try {
    session.tick();
  } catch (error) {
    console.error(error);
  }
}, 250);
setInterval(() => session.resolvePis(), 15_000);

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => `http://${a!.address}:${server.port}`);
console.log(`Mapping ${relative(process.cwd(), mappingPath)}, builds ${relative(process.cwd(), projectPath)}`);
for (const pi of session.state().pis) console.log(`  ${pi.name.padEnd(16)} ${pi.host.padEnd(24)} ${pi.address ?? "NOT FOUND"}`);
console.log(`Open on a phone on the same network:\n  ${addresses.join("\n  ") || `http://localhost:${server.port}`}`);

// Leave the dome dark on the way out rather than frozen on whatever the mapper last showed.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await session.act({ type: "stop" });
    for (let i = 0; i < 3; i++) session.tick();
    process.exit(0);
  });
}
