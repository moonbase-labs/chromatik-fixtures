<div align="center">

# 🔺 chromatik-fixtures

**[Chromatik](https://chromatik.co/) fixtures and projects for the TeleCortex LED dome.**

Open the dome in Chromatik with three commands, and map it on site from your phone.

</div>

---

## 🚀 Quick start

You need [Chromatik](https://chromatik.co/), [Bun](https://bun.sh/) and git. Start Chromatik once first so `~/Chromatik` exists.

```bash
git clone https://github.com/moonbase-labs/chromatik-fixtures.git
cd chromatik-fixtures
bun scripts/link-chromatik.ts   # links Chromatik's folders to this repo
```

Then in Chromatik, open **Projects → TelecortexThreePanels**.

Nothing is installed from npm, and from now on a `git pull` updates what Chromatik sees.

<details>
<summary><b>Installing Bun</b></summary>

- **Mac or Linux:** `curl -fsSL https://bun.sh/install | bash`
- **Windows:** `powershell -c "irm bun.sh/install.ps1 | iex"`

</details>

<details>
<summary><b>The link script</b></summary>

```bash
bun scripts/link-chromatik.ts                      # links ~/Chromatik
bun scripts/link-chromatik.ts /path/to/Chromatik   # or another Chromatik folder
```

It turns Chromatik's `Fixtures`, `Projects` and `Scripts` folders into links to this repo's `fixtures/`, `projects/` and `scripts/`, so Chromatik loads from the repo and saves back into it.

- Anything already in those folders is kept, renamed to `<Name>.bak.<date-time>`.
- It's safe to re-run.
- To undo it, delete the link and rename the `.bak` folder back.
- On Windows the links are directory junctions, so Developer Mode isn't needed.

</details>

## 📦 What's inside

| Fixture | What it is | LEDs |
|---|---|---|
| `TelecortexPanelLarge` | One large panel | 316 |
| `TelecortexPanelSmall` | One small panel | 260 |
| `TelecortexPanelLargeFlat` | A large panel laid flat | 316 |
| `TelecortexDomeOG` | The original 12-panel section | 3,288 |
| `TelecortexDomeUpper` | The upper dome: 18 panels, without the bottom ring or door | 4,960 |
| `LEDPortalTriangle300` | An LEDPortal triangle, over sACN | 300 |

| Project | What it lays out |
|---|---|
| `TelecortexThreePanels` | Three panels, each on its own Pi. **Start here** |
| `TelecortexDomeOG` | The original 12-panel section |
| `TelecortexDomeUpperPanels` | The upper dome, one fixture per panel. Panels are on placeholder Pi outputs until the dome is mapped |

Video, Shader and the other Laserphile patterns come from [chromatik-plugins](https://github.com/moonbase-labs/chromatik-plugins). You don't need them to open these projects.

## 🗺️ Mapping the dome on site

Panels go into the scaffold in any order and plug into whichever Pi output is nearest. The mapper works out which output feeds each panel, and which way round each large panel was mounted.

1. **Turn Chromatik's output off**, since both send to the same Pis. Then run:

   ```bash
   bun mapper/server.ts
   ```

2. **Open the printed address on a phone** on the dome's network, and stand under the dome.
3. **For each output:** tap the panel that lit, tap its red corner, then confirm green and blue are where the map shows them. Tap **Nothing lit** if the output is unused.
4. **Check whole dome.** Colour should sweep smoothly round the compass, brighter lower down. A panel that breaks the pattern is in the wrong place or turned wrong: redo it from the output list.
5. **Build project.** This writes `projects/TelecortexDomeUpperMapped.lxp`. Commit and push it, along with `mappings/TelecortexDomeUpper.json`, so everyone gets the dome as installed.

> [!TIP]
> **Light everything** shows each Pi's panels in that Pi's colour. A dark panel isn't getting through, and a panel in the wrong colour is plugged into a different Pi.

Progress saves after every tap, so restarting the mapper picks up where it left off.

## 🛠️ Troubleshooting

<details>
<summary><b>Nothing reaches the Pis</b></summary>

- **Join the dome's network.** Pis are reached by name, e.g. `frosty-frost.local`. Linux needs Avahi's `nss-mdns` for that; otherwise use the Pi's IP address from the router.
- **On a Mac, allow Local Network access** for Chromatik, and for the terminal running the mapper: System Settings → Privacy & Security → Local Network, then restart that app. Until then, sends fail with `EHOSTUNREACH`.
- **One address repeating `No route to host`** in Chromatik's log means that Pi is off, or off the network.

</details>

<details>
<summary><b>A panel stays dark, or Chromatik reports collisions</b></summary>

A panel only sends when its output is on: the fixture's **Enabled** switch, or that panel's **Output** switch inside `TelecortexDomeUpper`.

In a project the mapper built, panels it hasn't mapped yet sit on `127.0.0.1` channel 0 with output off, so they still show in the preview. Turn two of them on and Chromatik reports `collisions in channel 0`. Give each one a host and channel of its own first, or finish mapping them.

</details>

<details>
<summary><b>The dome previews but won't send</b></summary>

Chromatik's FREE licence only sends network output for models of 1,000 points or fewer. A single panel or `TelecortexThreePanels` fits; either whole dome needs a paid tier.

</details>

<details>
<summary><b>The mapper page won't load on the phone</b></summary>

Allow incoming connections for `bun` when macOS asks, and check the phone is on the same network as the laptop.

</details>

## 📄 Licence

MIT. See [LICENSE](LICENSE).

<div align="center">
<sub>Made in Perth 🌏 by <a href="https://github.com/moonbase-labs">Moonbase Labs</a>.</sub>
</div>
