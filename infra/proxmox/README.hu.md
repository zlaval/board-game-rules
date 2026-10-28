# Telepítés Proxmox VM-be

[English](README.md) · [Magyar](README.hu.md)

A Szabálytárat külön Ubuntu Server 24.04 LTS virtuális gépben futtasd. A Docker a VM-be kerül. Az alábbi mappa és erőforrásméretek példák; a saját szerveredhez válassz megfelelő értékeket.

## A virtuális gép előkészítése

Ellenőrizd a szabad CPU-t, memóriát, tárhelyet, hálózati hidakat és VM-azonosítókat. Kiindulásnak 4 vCPU, 4 GiB RAM és 80 GiB lemez használható; az OCR igénye a dokumentumoktól függ. Válassz szabad VM-azonosítót és meglévő hálózati hidat, használj SSH-kulcsot és QEMU Guest Agentet. Igény szerint engedélyezd a gazdagéppel együtt indulást, a routerben pedig foglald le a VM DHCP-címét.

Cloud image használatakor hivatalos Ubuntu-képfájlt tölts le, ellenőrizd az ellenőrzőösszegét, importáld a lemezét, és állíts be Cloud-Init meghajtót a saját SSH-kulcsoddal és hálózati adataiddal. GPU-hoz PCI-átadás, vendég NVIDIA-illesztőprogram és NVIDIA Container Toolkit is szükséges. CPU-feldolgozáshoz nincs szükség GPU-beállításra.

## Előre elkészített képfájlok telepítése

Klónozd a tárolót egy választott mappába, például az `/opt/ruleshelf` alá. A telepítőt **az Ubuntu VM-ben** futtasd:

```sh
sudo sh /opt/ruleshelf/infra/proxmox/bootstrap-ubuntu.sh
cd /opt/ruleshelf/release
sudo cp .env.example .env
sudo chmod 600 .env
sudoedit .env
```

Add meg a saját `POSTGRES_PASSWORD` értékedet, szükség esetén az `OPENAI_API_KEY` kulcsot, megbízható LAN-eléréshez pedig az `APP_BIND_ADDRESS=0.0.0.0` beállítást. Ezután:

```sh
sudo docker compose up -d
sudo docker compose ps
curl --fail http://127.0.0.1:8080/api/health
```

A telepítő a Docker hivatalos Ubuntu tárolójából telepíti az Engine-t, a Buildxet, a Compose-t és a vendégügynököt. A kiadás kész CPU-képfájlokat tölt le, és nem tartalmaz tesztszolgáltatásokat. Az NVIDIA-változatot és a frissítést a [kiadási útmutató](../../release/README.hu.md) írja le.

A felületek a `http://<vm-ip>:8080` és `http://<vm-ip>:8080/admin` címeken érhetők el. Nincs bejelentkezés, ezért megbízható hálózaton használd. Telefonos mikrofonhoz a telefon által megbízhatónak elfogadott tanúsítvánnyal rendelkező HTTPS-közvetítőt állíts be. Az alap Compose HTTP-t szolgál ki.

## Forrásból építés

Fejlesztéshez a tároló gyökeréből futtatott `sudo sh infra/proxmox/start-cpu.sh` CPU-függőségekkel épít. A `sudo sh infra/start.sh` CUDA-képes feldolgozót épít, és ellenőrzi a GPU-hozzáférést. Ezek az `infra/.env` fájlt és a kiadástól eltérő Compose-projektet használnak. Lásd a [fejlesztési és tesztelési útmutatót](../../docs/development.md); a két beállítás közötti váltás nem másolja át az adatokat.

## Adatok és karbantartás

Az adatbázist, a dokumentumkötetet és a privát konfigurációt együtt mentsd. Költözéshez az API írásainak és a háttérfeldolgozásnak a szüneteltetése alatt készíts összetartozó mentést. A modellcache átmásolható vagy újra letölthető. A visszaállítás üres célkötetekbe, az API és a worker indulása előtt történjen; az eredeti mentést a sikeres ellenőrzésig őrizd meg.

Frissítéskor maradjon ugyanaz a telepítési mappa és projektnév. Tartsd meg a `.env` fájlt, frissítsd a kiadás fájljait és a `RULESHELF_VERSION` értékét, majd a kiadás mappájában futtasd a `sudo docker compose pull` és `sudo docker compose up -d` parancsot. NVIDIA használatakor add meg a `-f compose.yaml -f compose.gpu.yaml` kapcsolókat is.

A Docker a VM-mel indul, az alkalmazás konténerei `unless-stopped` beállítást használnak. A `sudo docker compose down` megőrzi a köteteket, a `down -v` viszont törli a gyűjteményt. Telepítés vagy visszaállítás után ellenőrizd a szolgáltatásokat, a két felületet és a közzétett könyvtárat.

## Hivatkozások

- [Proxmox Cloud-Init](https://pve.proxmox.com/wiki/Cloud-Init_Support)
- [Docker Engine Ubuntu alatt](https://docs.docker.com/engine/install/ubuntu/)
- [Az alkalmazás beállításai](../../README.hu.md)
