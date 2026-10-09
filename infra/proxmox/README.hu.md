# Proxmox-telepítés

[English](README.md) · [Magyar](README.hu.md)

A Szabálytár külön Ubuntu Server 24.04 LTS virtuális gépben fut.
A Docker a VM-be kerül, a Proxmox gazdagépre nem kell telepíteni.

## Telepített gép

| Beállítás | Érték |
| --- | --- |
| Proxmox | `pve`, `192.168.1.100`, Proxmox VE 9.1.1 |
| VM | `103`, `ruleshelf`, a gazdagéppel együtt indul |
| Operációs rendszer | Ubuntu Server 24.04 LTS |
| Erőforrások | 4 CPU, 4 GiB RAM, 80 GiB lemez, 2 GiB swap |
| Tároló / hálózati híd | `local-lvm` / `vmbr0` |
| IP-cím | DHCP: `192.168.1.80` |
| MAC-cím DHCP-foglaláshoz | `BC:24:11:26:D6:EE` |
| Alkalmazás mappája | `/opt/ruleshelf` |
| SSH-felhasználó | `ubuntu`, kulcsos belépés és sudo |
| Feldolgozó | CPU; a szerveren Intel UHD 620 van, támogatott NVIDIA GPU nincs |
| Időzóna | `Europe/Budapest` |

A routerben érdemes a MAC-címhez lefoglalni a `192.168.1.80` címet.
A játékosfelület: `http://192.168.1.80:8080`, az admin: `http://192.168.1.80:8080/admin`.

## Új telepítés

Előbb ellenőrizd a Proxmox erőforrásait, a szabad VM-azonosítót, a tárolót,
a hálózati hidat és a GPU-hozzárendeléseket. Hivatalos Ubuntu cloud image-ből,
ellenőrzött SHA-256-tal hozz létre VM-et, Cloud-Init meghajtóval, SSH-kulccsal,
engedélyezett QEMU Guest Agenttel és automatikus indulással. A meglévő vendégek
hozzárendeléseit hagyd meg. A gép kezdetben DHCP-t használhat.

Másold a projektet a VM `/opt/ruleshelf` mappájába, a `.git`, `node_modules`,
tesztkimenetek és `.env` nélkül. A telepítőt **az Ubuntu VM-ben** futtasd:

```sh
sudo sh /opt/ruleshelf/infra/proxmox/bootstrap-ubuntu.sh
cd /opt/ruleshelf
sudo sh infra/setup.sh
sudo sed -i 's/^APP_BIND_ADDRESS=.*/APP_BIND_ADDRESS=0.0.0.0/' infra/.env
sudo sh infra/proxmox/start-cpu.sh
```

A telepítő a Docker hivatalos Ubuntu tárolójából telepíti az Engine-t,
a Buildxet, a Compose-t és a vendégügynököt. A CPU-indító a
`compose.cpu.yaml` fájllal CPU PyTorch-ot épít, így a CUDA-függőségeket nem
kell letölteni. Ezt az override-ot ne kombináld a GPU-s Compose fájllal.
NVIDIA GPU-s gépen a fő README szerinti `infra/start.sh` indítót használd.

Az `infra/.env` legyen csak root által olvasható (`chmod 600`). Az OpenAI-kulcs
külön, SSH-n vihető át: a `set-openai-key.py` egyetlen `OPENAI_API_KEY=` sort
fogad a standard bemeneten, nem írja ki a titkot, és atomikusan frissíti a
konfigurációt. A modell alapértelmezése `gpt-6-luna`.

## Meglévő könyvtár átvitele

A forrás API-jának és workerének szüneteltetése alatt készíts PostgreSQL
`pg_dump` mentést, és archiváld a dokumentumvolume-ot. A modellcache is
átvihető az újabb letöltések elkerüléséhez. Az eredeti adatokat őrizd meg.
A visszaállítás az új VM üres volume-jaiba történjen, az API és worker indulása
előtt. Logikai adatbázis-visszaállításnál az új VM saját adatbázis-jelszava
használható. Mentéshez az adatbázist, dokumentumokat és konfigurációt együtt
őrizd meg.

## Indítás, frissítés és ellenőrzés

```sh
ssh ubuntu@192.168.1.80
cd /opt/ruleshelf
sudo sh infra/proxmox/start-cpu.sh
sudo docker compose --env-file infra/.env -f infra/compose.yaml -f infra/compose.cpu.yaml ps
curl --fail http://127.0.0.1:8080/api/health
```

A Docker a VM indulásakor elindul; a konténerek `unless-stopped` beállítással
újraindulnak. Leállításhoz ugyanezekkel a Compose fájlokkal használd a `down`
parancsot, `-v` nélkül, hogy az adatok megmaradjanak.

Ellenőrizd az admin- és kérdezőfelületet, valamint átvitt adatok esetén a
közzétett könyvtárat. Ehhez nem kell OCR-t vagy fizetős AI-hívást indítani.
Az alaptelepítés HTTP-t használ; mobilos mikrofonhoz külön megbízható HTTPS
szükséges. Az admin bejelentkezés nélkül érhető el az otthoni hálózaton.

## Hivatkozások

- [Proxmox Cloud-Init](https://pve.proxmox.com/wiki/Cloud-Init_Support)
- [Docker Engine Ubuntu alatt](https://docs.docker.com/engine/install/ubuntu/)
- [Az alkalmazás dokumentációja](../../README.hu.md)
