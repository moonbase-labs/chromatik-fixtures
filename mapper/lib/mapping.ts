// A mapping: which slot each Pi output feeds, and how each panel is turned. Saved as JSON in
// mappings/ after every change, so a dropped laptop loses nothing.
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Rotation } from "./dome";

export interface Pi {
  /** The balena device name. Outputs are keyed by it, so it can move to a new address. */
  name: string;
  /** `name.local`, an IP, or either with `:port` for a stand-in Pi. */
  host: string;
  channels: number;
}

export interface Assignment {
  slot: string;
  rotation: Rotation;
  /** "mismatch" when the corner colours were not where a panel built like the others would put them. */
  check: "ok" | "mismatch";
}

/** Nothing recorded yet, a panel, or checked and found to have nothing on it. */
export type OutputState = Assignment | "empty";

export interface Mapping {
  layout: "TelecortexDomeUpper";
  pis: Pi[];
  outputs: Record<string, OutputState>;
  updated?: string;
}

export interface Output {
  key: string;
  pi: string;
  host: string;
  channel: number;
}

export const DEFAULT_PIS: Pi[] = [
  { name: "frosty-frost", host: "frosty-frost.local", channels: 4 },
  { name: "large-starfish", host: "large-starfish.local", channels: 4 },
  { name: "pretty-violet", host: "pretty-violet.local", channels: 4 },
  { name: "small-castle", host: "small-castle.local", channels: 4 },
  { name: "red-mountain", host: "red-mountain.local", channels: 4 },
];

export const outputKey = (pi: string, channel: number) => `${pi}:${channel}`;

export const listOutputs = (mapping: Mapping): Output[] =>
  mapping.pis.flatMap((pi) =>
    Array.from({ length: pi.channels }, (_, channel) => ({ key: outputKey(pi.name, channel), pi: pi.name, host: pi.host, channel })),
  );

export const newMapping = (pis: Pi[] = DEFAULT_PIS): Mapping => ({
  layout: "TelecortexDomeUpper",
  pis: structuredClone(pis),
  outputs: {},
});

export async function loadMapping(path: string): Promise<Mapping> {
  const file = Bun.file(path);
  return (await file.exists()) ? file.json() : newMapping();
}

export async function saveMapping(path: string, mapping: Mapping) {
  mapping.updated = new Date().toISOString();
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, JSON.stringify(mapping, null, 2) + "\n");
}

/**
 * Record what `key` feeds. A slot is fed by one output only, so if another output held this slot it
 * is cleared, and its key is returned.
 */
export function assign(mapping: Mapping, key: string, state: OutputState): string | null {
  let moved: string | null = null;
  if (state !== "empty") {
    for (const [other, existing] of Object.entries(mapping.outputs)) {
      if (other !== key && existing !== "empty" && existing.slot === state.slot) {
        delete mapping.outputs[other];
        moved = other;
      }
    }
  }
  mapping.outputs[key] = state;
  return moved;
}

/** The output feeding `slot`, if any. */
export function outputForSlot(mapping: Mapping, slot: string): string | null {
  const found = Object.entries(mapping.outputs).find(([, s]) => s !== "empty" && s.slot === slot);
  return found ? found[0] : null;
}
