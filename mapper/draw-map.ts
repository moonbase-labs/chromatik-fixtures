#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { DOOR_HUB, cornerPositions, loadDome, planPosition } from "./lib/dome";
import { loadMapping } from "./lib/mapping";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    project: { type: "string", default: "projects/TelecortexDomeUpperPanels.lxp" },
    mapping: { type: "string", default: "mappings/TelecortexDomeUpper.json" },
    out: { type: "string", default: "docs/dome-map.svg" },
    wired: { type: "string", default: "" },
  },
});

const root = resolve(import.meta.dir, "..");
const projectPath = resolve(root, values.project);
const outPath = resolve(root, values.out);

const PI_COLOURS = ["#2a78d6", "#d4b000", "#c2457f", "#1baf7a", "#eb6834"];
const UNMAPPED_COLOUR = "#d9d8d4";
const SURFACE = "#fcfcfb";
const INK = "#0b0b0b";
const INK_SECONDARY = "#52514e";

const WIDTH = 980;
const MAP_SCALE = 560;
const MAP_TOP = 150;
const ROW_HEIGHT = 30;
const COLUMNS = [70, 250, 400, 550, 700, 850];

const dome = await loadDome(root);
const mapping = await loadMapping(resolve(root, values.mapping));
const project = await Bun.file(projectPath).json();
const wired = new Set(values.wired.split(",").map((slot) => slot.trim().toLowerCase()).filter(Boolean));

if (mapping.pis.length > PI_COLOURS.length) {
  throw new Error(`only ${PI_COLOURS.length} Pi colours are defined, and the mapping lists ${mapping.pis.length} Pis`);
}

const pis = mapping.pis.map((pi, index) => ({ ...pi, colour: PI_COLOURS[index] }));
const assignmentFor = new Map<string, { pi: string; channel: number }>();

for (const fixture of project.model.fixtures) {
  const slot = String(fixture.parameters.tags).split(",").at(-1);
  const pi = pis.find((candidate) => candidate.host === fixture.jsonParameters.host);

  if (slot && pi && fixture.parameters.enabled) {
    assignmentFor.set(slot, { pi: pi.name, channel: fixture.jsonParameters.opcChannel });
  }
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const point = ([x, y]: [number, number]) => `${x.toFixed(1)},${y.toFixed(1)}`;
const mirrored = ([x, y]: [number, number]): [number, number] => [-x, y];

const planCorners = dome.slots.flatMap((slot) => cornerPositions(dome, slot).map((corner) => mirrored(planPosition(corner))));
const minX = Math.min(...planCorners.map(([x]) => x));
const maxX = Math.max(...planCorners.map(([x]) => x));
const minY = Math.min(...planCorners.map(([, y]) => y));
const maxY = Math.max(...planCorners.map(([, y]) => y));

const mapBottom = MAP_TOP + (maxY - minY) * MAP_SCALE;
const mapMiddle = (MAP_TOP + mapBottom) / 2;
const offsetX = WIDTH / 2 - ((minX + maxX) / 2) * MAP_SCALE;

const toSvg = (planPoint: [number, number]): [number, number] => {
  const [x, y] = mirrored(planPoint);

  return [offsetX + x * MAP_SCALE, MAP_TOP + (maxY - y) * MAP_SCALE];
};

const panels = dome.slots
  .map((slot) => {
    const corners = cornerPositions(dome, slot).map((corner) => point(toSvg(planPosition(corner)))).join(" ");
    const [centreX, centreY] = toSvg(planPosition(slot.centre));
    const assignment = assignmentFor.get(slot.id);
    const colour = assignment ? pis.find((pi) => pi.name === assignment.pi)?.colour : UNMAPPED_COLOUR;
    const caption = assignment ? `${assignment.pi} ${assignment.channel}` : "not mapped";
    const outline = wired.has(slot.id)
      ? `<polygon points="${corners}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
      : "";

    return `
  <g>
    <polygon points="${corners}" fill="${colour}" stroke="${SURFACE}" stroke-width="4" stroke-linejoin="round"/>
    ${outline}
    <text x="${centreX.toFixed(1)}" y="${(centreY - 4).toFixed(1)}" class="panel">${slot.id.toUpperCase()}</text>
    <text x="${centreX.toFixed(1)}" y="${(centreY + 13).toFixed(1)}" class="output">${escape(caption)}</text>
  </g>`;
  })
  .join("");

const [doorX] = toSvg(planPosition(DOOR_HUB));
const mapLeft = offsetX + minX * MAP_SCALE;
const mapRight = offsetX + maxX * MAP_SCALE;

const compass = `
  <text x="${WIDTH / 2}" y="${MAP_TOP - 18}" class="compass">N</text>
  <text x="${(mapLeft - 36).toFixed(1)}" y="${(mapMiddle + 6).toFixed(1)}" class="compass">E</text>
  <text x="${(mapRight + 36).toFixed(1)}" y="${(mapMiddle + 6).toFixed(1)}" class="compass">W</text>
  <path d="M ${(doorX - 20).toFixed(1)} ${(mapBottom + 26).toFixed(1)} h 40" stroke="${INK_SECONDARY}" stroke-width="3" stroke-linecap="round"/>
  <text x="${doorX.toFixed(1)}" y="${(mapBottom + 50).toFixed(1)}" class="compass">DOOR (S)</text>`;

const tableTop = mapBottom + 120;

const tableHeader = ["Pi", ...Array.from({ length: 4 }, (_, channel) => `output ${channel}`)]
  .map((label, index) => `<text x="${COLUMNS[index] + (index === 0 ? 24 : 0)}" y="${tableTop.toFixed(1)}" class="header">${label}</text>`)
  .join("");

const tableRows = pis
  .map((pi, rowIndex) => {
    const y = tableTop + 4 + (rowIndex + 1) * ROW_HEIGHT;

    const cells = Array.from({ length: pi.channels }, (_, channel) => {
      const slot = [...assignmentFor].find(([, assignment]) => assignment.pi === pi.name && assignment.channel === channel)?.[0];
      const weight = slot && wired.has(slot) ? ' font-weight="700"' : "";

      return slot
        ? `<text x="${COLUMNS[channel + 1]}" y="${y.toFixed(1)}" class="cell"${weight}>${slot.toUpperCase()}</text>`
        : `<text x="${COLUMNS[channel + 1]}" y="${y.toFixed(1)}" class="cell spare">spare</text>`;
    });

    return `
  <rect x="${COLUMNS[0]}" y="${(y - 14).toFixed(1)}" width="16" height="16" rx="4" fill="${pi.colour}"/>
  <text x="${COLUMNS[0] + 24}" y="${y.toFixed(1)}" class="cell">${escape(pi.name)}</text>
  ${cells.join("")}`;
  })
  .join("");

const height = Math.ceil(tableTop + 4 + (pis.length + 1) * ROW_HEIGHT + 30);

const subtitle = wired.size
  ? `Default Pi outputs. Thick outline = real wiring (${[...wired].map((slot) => slot.toUpperCase()).join(", ")}); the rest are placeholders until the mapper runs.`
  : `Pi outputs from ${relative(root, projectPath)}.`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" width="${WIDTH}" height="${height}" font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">
  <style>
    .title { font-size: 26px; font-weight: 700; fill: ${INK}; }
    .subtitle { font-size: 15px; fill: ${INK_SECONDARY}; }
    .panel { font-size: 15px; font-weight: 700; fill: ${INK}; text-anchor: middle; }
    .output { font-size: 11.5px; fill: ${INK}; text-anchor: middle; }
    .compass { font-size: 16px; font-weight: 700; fill: ${INK_SECONDARY}; text-anchor: middle; }
    .header { font-size: 13px; font-weight: 700; fill: ${INK_SECONDARY}; }
    .cell { font-size: 14px; fill: ${INK}; }
    .spare { fill: ${INK_SECONDARY}; }
  </style>
  <rect width="${WIDTH}" height="${height}" fill="${SURFACE}"/>
  <text x="40" y="52" class="title">TeleCortex upper dome, seen from below</text>
  <text x="40" y="80" class="subtitle">${escape(subtitle)}</text>
  ${compass}
  ${panels}
  ${tableHeader}
  ${tableRows}
</svg>
`;

await mkdir(dirname(outPath), { recursive: true });
await Bun.write(outPath, svg);
console.log(`Drew ${relative(root, projectPath)} to ${relative(process.cwd(), outPath)}`);
