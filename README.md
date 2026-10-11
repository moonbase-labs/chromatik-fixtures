# chromatik-fixtures

[Chromatik](https://chromatik.co/) fixtures and projects for the TeleCortex dome, plus the LEDPortal triangle.

```
fixtures/   .lxf fixture definitions, one fixture per file
projects/   .lxp Chromatik projects built from them
mapper/     on-site tool that works out which Pi output feeds which panel
mappings/   which output feeds which panel, written by the mapper
scripts/    setup helpers
```

## Setup

You need three things:

- **[Chromatik](https://chromatik.co/)**, the lighting software everything here is for.
- **[Bun](https://bun.sh/)**, which runs the setup script and the mapper. On a Mac or Linux, `curl -fsSL https://bun.sh/install | bash`. On Windows, `powershell -c "irm bun.sh/install.ps1 | iex"`.
- **git**, to get the repo and keep it up to date.

Then:

```bash
git clone https://github.com/moonbase-labs/chromatik-fixtures.git
cd chromatik-fixtures
bun scripts/link-fixtures.ts
```

That's all the installing there is: nothing comes from npm. In Chromatik, open any project in `projects/`. `TelecortexThreePanels` is a good first one.

To get the latest, `git pull` in the repo. Fixtures update in Chromatik on their own; re-run the link script only when one has been added, renamed or removed.

### The link script

`scripts/link-fixtures.ts` symlinks every fixture into `~/Chromatik/Fixtures/`, which is why a `git pull` updates what Chromatik sees. Re-running it links new fixtures and clears links to ones that have gone. It never overwrites a file you have edited there, and is safe to run any number of times. On Windows, symlinks need Developer Mode turned on.

The links go straight into `Fixtures/`, not a subfolder, so the type names match what the projects expect.

### Plugins

Video, Shader, Panel Transforms and the other Laserphile patterns come from [chromatik-plugins](https://github.com/moonbase-labs/chromatik-plugins), whose README covers installing them. You don't need any of them to open the projects here.

### Talking to the dome

- **Join the dome's network.** Chromatik sends to the Raspberry Pis over it, using OPC.
- **Pis are reached by name**, e.g. `lingering-brook.local`. A Mac resolves these out of the box, and Linux does with Avahi's `nss-mdns`. If a name won't resolve, put the Pi's IP address in its place, from the router's device list.
- **On a Mac, allow Local Network access.** macOS blocks each app from the local network until you allow it. That applies to Chromatik, and to the terminal you run the mapper in. Turn it on in System Settings → Privacy & Security → Local Network, then restart that app. Until you do, nothing reaches the Pis and the mapper reports `EHOSTUNREACH`.
- **Licence.** Chromatik's FREE licence only sends network output for models of 1,000 points or fewer. A single panel or `TelecortexThreePanels` fits. Either whole dome needs a paid tier, though everything previews without one.

## Naming

Files are named `<Rig><Part><Variant>` in PascalCase, e.g. `TelecortexPanelLarge`, `TelecortexDomeUpper`.

Chromatik uses a fixture's file name as its type name, and a project stores that type name for every fixture in it. Renaming a fixture therefore means updating every project that uses it (`jsonFixtureType` and `fixtureType`).

## Fixtures

| Fixture | What it is | LEDs | Output |
|---|---|---|---|
| `TelecortexPanelLarge` | One large (BBB) panel, oriented as it sits on the dome, first pixel at the origin | 316 | OPC |
| `TelecortexPanelSmall` | One small (AAB) panel, likewise | 260 | OPC |
| `TelecortexPanelLargeFlat` | A large panel laid flat, built from the `telecortex-opc-sender` config | 316 | OPC |
| `TelecortexDomeOG` | The original 12-panel dome section, five hosts with four channels each | 3,288 | OPC |
| `TelecortexDomeUpper` | The dome minus its bottom ring and the door: 18 panels, host and channel per panel | 4,960 | OPC |
| `LEDPortalTriangle300` | LEDPortal 300-pixel triangle on a hex grid | 300 | sACN |

## Projects

| Project | What it lays out |
|---|---|
| `TelecortexThreePanels` | BU, SLIU and SRIU, each its own panel fixture, addressed to the Pi that drives it |
| `TelecortexDomeOG` | The `TelecortexDomeOG` fixture |
| `TelecortexDomeUpperPanels` | The same 18 panels as `TelecortexDomeUpper`, each its own panel fixture |

Placing each panel as its own fixture is what lets the Panel Transforms effect in [chromatik-plugins](https://github.com/moonbase-labs/chromatik-plugins) rotate one panel at a time during calibration.

## Mapping the dome on site

Panels go into the scaffold in any order and plug into whichever Pi output is nearest. Panels of a size are interchangeable, so what Chromatik needs is which output feeds each slot, and which of three ways round each large panel was mounted. A small panel only fits one way.

```bash
bun mapper/server.ts
```

Turn Chromatik's output off first, since both send to the same Pis. Then open the printed address on a phone on the same network and stand under the dome. If the phone can't load the page, allow incoming connections for `bun` when macOS asks.

1. **Start mapping.** One output lights its panel dim white. Tap that panel on the map, or **Nothing lit** if the output is unused.
2. **Tap the red corner.** The panel's corners light red, green and blue; red is where its data cable enters.
3. **Confirm.** The map shows where green and blue should be. If they are somewhere else, the panel is wired differently from the others: save it flagged and check it later.
4. **Check whole dome** once every output is done. Colour sweeps round the compass and gets brighter lower down, so a panel in the wrong place or turned wrong breaks the pattern. Redo it from the output list.
5. **Build project** writes `projects/TelecortexDomeUpperMapped.lxp`: every panel its own fixture, addressed to its output and turned as mounted.

**Light everything** lights every output at once, each Pi in its own colour, to check connections before or after mapping: a dark panel isn't getting through, and a panel in the wrong colour is plugged into a different Pi than expected.

Progress saves to `mappings/TelecortexDomeUpper.json` after every tap, so restarting picks up where it left off. The Pis to try are listed in that file; edit it if one has a different host. The map can be drawn as seen from inside or from above. Once the dome is mapped, commit and push the mapping and the built project, so everyone else gets the dome as it's installed.

To try it without hardware, run `bun mapper/fake-pi.ts 42070 42071` and copy the mapping to `mappings/Test.json`. In the copy, change the first two Pis' hosts to `127.0.0.1:42070` and `127.0.0.1:42071`. Then run `bun mapper/server.ts --mapping mappings/Test.json`. A project is named after its mapping, so this one builds `projects/TestMapped.lxp` and leaves the real one alone. `bun test` runs the mapper's tests.

## Dome conventions

- Units are millimetres, and z is up.
- Plan view: +x is east, +y is north. The door is the 5-way hub due south, opposite BU.
- Each Raspberry Pi is addressed as `<balena device name>.local`, e.g. `lingering-brook.local`. Each has four outputs, OPC channels 0 to 3. quiet-hill has not been renamed yet, so it is still addressed by IP.
- The original 12 panels keep their TeleCortex OG names (BU, BRD, SLIU, ...). Panels added since are named by compass point: BSE is the big south-east panel, SEN the small panel at the east hub on its north side.
