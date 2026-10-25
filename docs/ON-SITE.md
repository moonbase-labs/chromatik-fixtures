# On site: network and troubleshooting

Last verified 2026-10-25 with all five Pis on the Archer and the phone tether carrying their internet.

## How it's wired

```
phone (Ethernet tethering) ── USB-C Ethernet adapter ── Archer VR600 [LAN4/WAN]
Archer [LAN1] ── switch ── five Pis (eth0 only, Wi-Fi is disabled)
Archer Wi-Fi TP-Link_AB7A ── show laptop, mapper phone
```

| | |
|---|---|
| Archer LAN | 192.168.0.0/24, gateway and admin at 192.168.0.1 (tplinkmodem.net) |
| Archer Wi-Fi | `TP-Link_AB7A` (2.4 GHz) and `TP-Link_AB7A_5G`. Password is on the sticker underneath |
| Archer WAN | Wireless Router Mode, Dynamic IP. The phone leases it a 10.58.90.x address |
| Pis to Chromatik | OPC over UDP port 42069, four outputs per Pi on channels 0 to 3 |
| Internet | Only balena needs it (dashboard, deploys, SSH). Chromatik to the Pis is all local, so the panels run with the phone off |

| Pi | eth0 MAC | Lease on 2026-10-25 | balena UUID |
|---|---|---|---|
| frosty-frost | B8:27:EB:F5:B9:9E | 192.168.0.105 | 9300646 |
| large-starfish | B8:27:EB:89:B3:BB | 192.168.0.103 | c1a0fbb |
| pretty-violet | B8:27:EB:52:C4:55 | 192.168.0.106 | 9dbb756 |
| red-mountain | B8:27:EB:77:F2:59 | 192.168.0.102 | fd6fe29 |
| small-castle | B8:27:EB:4F:FF:00 | 192.168.0.104 | 0ad985d |

Fixtures address the Pis as `<name>.local`, so the leases can move without breaking anything. To pin them anyway: Archer, Advanced > Network > DHCP Server > Address Reservation, using the MACs above.

## Five-minute check

```bash
traceroute -n -m 3 1.1.1.1      # hop 1 192.168.0.1, hop 2 10.58.90.x: phone path is up
ping -c1 red-mountain.local     # answers from 192.168.0.x: that Pi is on the Archer LAN
dns-sd -B _ssh._tcp local.      # all five names appear: every Pi is on the wire
balena device list --fleet gh_vanbujm/moonbase-cortex-next
```

## Symptoms

| Symptom | Likely cause | Fix |
|---|---|---|
| Laptop has no internet | Ethernet tethering switches itself off every time the adapter is unplugged, or the phone is flat | Phone: Mobile Hotspot and Tethering > Ethernet tethering. Keep the phone on a power passthrough hub |
| A Pi name resolves to anything other than 192.168.0.x | A second cable on the switch into another network, or IPTV port bridging on the Archer | The switch carries only the Pis and one uplink to LAN1. Archer: Advanced > Network > IPTV off, every port set to Internet. Then unplug and replug the Pi's cable |
| A Pi is missing from the mDNS list | Power or cable | Check its red LED and the switch port light, then power-cycle it |
| A Pi answers mDNS but not ping | Still booting, or holding a lease from another network | Unplug and replug its cable |
| Balena says offline or reduced functionality, but the Pis answer locally | No internet via the phone, or the carrier is blocking Cloudlink | The panels don't care. Only matters if you need to deploy |
| Undervoltage flag on a Pi in balena | Its power supply or cable | Swap the supply. pretty-violet showed it on 2026-10-25 and cleared after a reboot |
| Name resolves on the Mac but Chromatik logs `EHOSTUNREACH` | macOS Local Network permission | See the README's troubleshooting |

## Balena

- Fleet `gh_vanbujm/moonbase-cortex-next`: https://dashboard.balena-cloud.com/fleets/2409181/summary
- Wi-Fi is off at firmware level through the fleet config var `RESIN_HOST_CONFIG_dtoverlay = "spi1-2cs","disable-wifi"` (id 2738253). To turn it back on, which reboots all five:

  ```bash
  balena env rename 2738253 spi1-2cs --config
  ```

- Production images, so SSH needs a key on the account first: `balena ssh-key add`. Then `balena device ssh <uuid>` through the cloud, or `balena device ssh 192.168.0.x` on the LAN. The host OS listens on port 22222.

## Archer from scratch

If the Archer has been reset: Advanced > Operation Mode > Wireless Router Mode, then Advanced > Network > Internet > Dynamic IP, then Advanced > Network > IPTV off with every LAN port set to Internet. Phone adapter alone in LAN4/WAN, the Pis' switch in LAN1.
