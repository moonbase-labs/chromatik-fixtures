# chromatik-fixtures

Notes for coding agents. The README is written for people setting up and mapping the dome; this covers conventions, development and the hardware.

## Layout

```
fixtures/   .lxf fixture definitions, one fixture per file
projects/   .lxp Chromatik projects built from them
mapper/     on-site tool that works out which Pi output feeds which panel (Bun, TypeScript)
mappings/   which output feeds which panel, written by the mapper
scripts/    setup helpers, e.g. link-chromatik.ts
videos/     not in git: a local folder, or a link to a cloud folder via --videos; Chromatik sees it as LaserphileVideo
docs/       the README's dome map, drawn by mapper/draw-map.ts
```

## Conventions

- Files are named `<Rig><Part><Variant>` in PascalCase, e.g. `TelecortexPanelLarge`.
- Projects refer to clips as `LaserphileVideo/<clip>`, never by absolute path, so they resolve on any machine that has run the link script. `demo-bars.mp4` is the test clip from chromatik-plugins and has to be in the videos folder too.
- A fixture's file name is its type name, and every project stores it (`jsonFixtureType` and `fixtureType`). Renaming a fixture means updating every project that uses it. The link script links whole folders, not files, for the same reason.
- Units are millimetres, z is up. Plan view: +x is east, +y is north. The door is the 5-way hub due south, opposite BU.
- The original 12 panels keep their TeleCortex OG names (BU, BRD, SLIU, ...). Panels added since are named by compass point: BSE is the big south-east panel, SEN the small panel at the east hub on its north side.
- A large panel fits three ways round, a small panel only one.
- In the `*Panels` projects each panel is its own fixture, so the Panel Transforms effect in chromatik-plugins can rotate one at a time. The slot id is the last fixture tag (`telecortex,og,large,bu`), and the mapper relies on that.
- In `TelecortexDomeUpper.lxf` and `TelecortexDomeUpperPanels.lxp`, only BU, SLIU and SRIU are on the outputs that really feed them. The other 15 panels were spread round-robin over the free outputs as placeholders until the mapper is run; the two files agree.
- Each Pi has four outputs, OPC channels 0 to 3. `TelecortexDomeOG`'s five hosts are the five current Pis, but which panel each one drives there is historical; the mapper is the source of truth.

### Fixture details

| Fixture | Notes |
|---|---|
| `TelecortexPanelLarge`, `TelecortexPanelSmall` | Oriented as the panel sits on the dome, first pixel at the origin |
| `TelecortexPanelLargeFlat` | Built from the `telecortex-opc-sender` config |
| `TelecortexDomeOG` | Five hosts with four channels each |
| `TelecortexDomeUpper` | A host, channel and output switch per panel |

## Mapper development

- `bun test` runs the mapper's tests.
- To try it without hardware: run `bun mapper/fake-pi.ts 42070 42071`, copy the mapping to `mappings/Test.json`, and change its first two Pis' hosts to `127.0.0.1:42070` and `127.0.0.1:42071`. Then run `bun mapper/server.ts --mapping mappings/Test.json`. A project is named after its mapping, so this builds `projects/TestMapped.lxp` and leaves the real one alone.
- The Pis the mapper tries are listed in the mapping JSON. Edit it if a Pi's host changes.
- `bun mapper/draw-map.ts` draws `docs/dome-map.svg`, the README's map, from a project (the template by default) as seen from below. The current copy was drawn with `--wired bu,sliu,sriu` to outline the three panels on real outputs; after mapping, draw from `projects/TelecortexDomeUpperMapped.lxp` without it. Pi colours follow the order of Pis in the mapping and were validated as a set of five, so a sixth Pi needs a new colour.

## Related repo

Plugins (Video, Shader, Panel Transforms, MCP) live in [moonbase-labs/chromatik-plugins](https://github.com/moonbase-labs/chromatik-plugins). An older clone of it named `chromatik` may sit alongside; it stops before Shader, Touch and Transforms landed, so read `chromatik-plugins`.

## The Pis

- balena fleet `gh_vanbujm/moonbase-cortex-next` (id 2409181), device type `raspberrypi3-64`. Its release runs the OPC server on UDP 42069 and maps `/dev/spidev0.0`, `0.1`, `1.0` and `1.1` into the container.
- Five Pis, each answering at `<device name>.local`: frosty-frost, large-starfish, pretty-violet, small-castle, red-mountain.
- The old fleet, `gh_vanbujm/moonbase-cortex` (id 1466494, 32-bit `raspberrypi3`), is retired. Matched by eth0 MAC: lingering-brook is now frosty-frost, cold-thunder is large-starfish, snowy-breakfast is pretty-violet, and quiet-hill and fierce-notebook (one Pi registered twice) are small-castle. red-mountain is new hardware.
- Use the balena CLI: `brew install balena-cli`, then `balena login --web`. The Homebrew build runs on Node 26 and warns that it wants Node 24; it still works.
- The images are production, so SSH to a Pi's host OS needs a key on the balena account.

## Adding or reflashing a Pi

1. Download one image from the fleet's **Add Device**; it works for every Pi of the same type.
2. Once the Pi registers, power-cycle it. On balenaOS 9.0.2 a fresh Pi applies the SPI boot config, schedules a reboot, then blocks on its own update lock: the container can't start without `/dev/spidev*`, which only appears after that reboot. `balena device reboot --force` is refused with `Supervisor locked`.
3. Set its hostname to its device name. Until then it answers at the first seven characters of its UUID.

   ```bash
   curl -X POST https://api.balena-cloud.com/supervisor/v1/device/host-config \
     -H "Authorization: Bearer $(cat ~/.balena/token)" \
     -H "Content-Type: application/json" \
     --data '{"uuid":"<uuid>","method":"PATCH","data":{"network":{"hostname":"<device name>"}}}'
   ```

4. Add it to `DEFAULT_PIS` in `mapper/lib/mapping.ts`, to `mappings/TelecortexDomeUpper.json`, and to any fixture or project that addresses it.
