# Szabálytár

[English](README.md) · [Magyar](README.hu.md)

## Rövid összefoglaló

A Szabálytár otthon futtatható társasjáték-szabálykönyvtár. A jelenlegi változat reszponzív adminfelületet ad a szabályanyagok gyűjtéséhez, feldolgozásához, kereséséhez, ellenőrzéséhez és közzétételéhez. Docker Compose-zal indul, angol és magyar felülettel; az alapértelmezett nyelv az angol.

## Funkciók

- Játékok felvétele és szerkesztése: kiadás, leírás és a szabálykönyv nyelve.
- PDF, TXT, Markdown, PNG, JPG és WebP feltöltése vagy szöveg közvetlen beillesztése.
- PDF-ek és képek feldolgozása Doclinggal és OCR-rel, külön háttérfolyamatban.
- Elérhető NVIDIA GPU előnyben részesítése; GPU hiányában CPU, GPU-s konverziós hiba után egyszeri CPU-s újrapróbálkozás.
- Kinyert szabályrészek ellenőrzése forrásoldalakkal, kulcsszavas kereséssel és eredeti ábrákkal.
- Ellenőrzött változat közzététele. Újrafeldolgozáskor a korábban közzétett változat az új jóváhagyásáig megmarad.
- Választható angol és magyar nyelv az adminfelületen, párbeszédablakokban, ellenőrző üzenetekben, API-hibákban és feldolgozási állapotokban. A böngésző megjegyzi a választást.
- Tartós adatbázis-, dokumentum- és modellvolume-ok.
- Szerveroldali munkamenettel védett adminműveletek és dokumentumletöltések.

## Bemutatás

1. Jelentkezz be, és válaszd az **Új játék** gombot. Add meg a címet, kiadást, a szabálykönyv nyelvét és az opcionális leírást.
2. Nyisd meg a játékot, majd válaszd a **Szabályanyag feltöltése** gombot. Válassz fájlokat vagy a **Szöveg beillesztése** lehetőséget. A Markdown-címek segítik a tagolást.
3. Hagyd bekapcsolva a **Feldolgozás indítása a feltöltés után** lehetőséget, vagy indítsd el később kézzel. A dokumentum mellett megjelenik a folyamat és az esetleges hiba.
4. A feldolgozás végén nyisd meg az **Ellenőrzés** nézetet. Keress a szövegben, ellenőrizd a forrásoldalakat és ábrákat; szükség esetén töltsd le az eredetit.
5. Az **Ellenőriztem, közzéteszem** gombbal hagyd jóvá a változatot. Az **Újrafeldolgozás** új változatot készít, a korábbi közzétett továbbra is elérhető.

A nyelvválasztó a belépésnél, az adminfejlécben és a párbeszédablakokban is elérhető. A felület nyelvének megváltoztatása nem fordítja le és nem módosítja a feltöltött szabálykönyveket, játékneveket, leírásokat vagy képaláírásokat. A szabálykönyv nyelve külön adat.

Jelenlegi korlátok: alapértelmezetten 50 MB fájlonként, 100 oldal dokumentumonként, 30 perces feldolgozási időkorlát. Több feltöltött kép külön dokumentumként kerül be. A forráshely a PDF tényleges oldalsorszáma, nem a nyomtatott oldalcímke. Az OCR eredményét embernek is ellenőriznie kell.

Az AI-válaszok, szemantikus embeddingek, automatikus szabálykönyv-fordítás, hangos kérdések és a játékosok kérdezőfelülete későbbi fejlesztések. A teljes szöveges keresés működik, a pgvector a későbbi szemantikus kereséshez elő van készítve.

### Összetevők

| Mappa | Feladat |
| --- | --- |
| `frontend/` | React, TypeScript és Vite adminfelület; angol/magyar fordítási fájlok |
| `backend/app/` | FastAPI API, belépés, OCR-feldolgozó és PostgreSQL-alapú worker |
| `backend/migrations/` | Verziózott adatbázis-migrációk |
| `backend/tests/` | Backend-integrációs és feldolgozási ellenőrzések |
| `e2e/` | Chromium-ellenőrzések az adminfolyamathoz és nyelvváltáshoz |
| `infra/` | Docker Compose, Dockerfile-ok, Caddy és setup/indító scriptek |
| `docs/` | Implementációs terv és ellenőrzési jegyzetek |

## Az alkalmazás futtatása

### 1. Előfeltételek

Minden parancsot a projekt gyökerében futtass. Docker, Compose plugin és Linux konténerek szükségesek. Windowson Docker Desktop WSL2 backenddel; Proxmoxon egy Linux virtuális gépben futó Docker használható.

GPU nélkül is működik az alkalmazás. NVIDIA-gyorsításhoz támogatott driver és Dockerből elérhető GPU szükséges. Linuxon NVIDIA Container Toolkit is kell; Proxmox virtuális gépben GPU passthrough-t is be kell állítani. A mellékelt image NVIDIA CUDA-t támogat, AMD/Intel GPU-runtime-ot nem tartalmaz. Működő CUDA nélkül CPU-ra vált.

Az első build több GB CUDA- és dokumentumfeldolgozó függőséget tölt le. Az első PDF-/képfeldolgozás további modelleket is letölthet, ezért internetet igényel. A modellek a következő futtatásokhoz megmaradnak. Az egyszerű szöveg feldolgozásához nincs szükség OCR-modellekre.

### 2. Indítás automatikus GPU-felismeréssel

Windows PowerShell:

```powershell
./infra/start.ps1
```

Linux/Proxmox virtuális gép:

```sh
sh infra/start.sh
```

Az indító szükség esetén létrehozza az `infra/.env` fájlt, felépíti az image-eket, és ideiglenes konténerben CUDA-műveletet futtat. Sikeres próba esetén az `infra/compose.gpu.yaml` kiegészítővel indul; egyébként CPU-s konfigurációt választ. A meglévő belépési adatok megmaradnak.

Nyisd meg a [http://localhost:8080](http://localhost:8080) címet. A kezdeti felhasználónév `admin`. A generált jelszót az `infra/.env` fájl `ADMIN_PASSWORD` mezőjében találod. Ezt a fájlt kezeld titokként, és ne tedd verziókezelésbe.

### 3. Beállítások

Módosítsd az `infra/.env` fájlt, majd futtasd újra az indítót.

| Változó | Alapérték | Feladat |
| --- | --- | --- |
| `APP_BIND_ADDRESS` | `127.0.0.1` | A Docker hoston publikált cím |
| `APP_PORT` | `8080` | HTTP-port a hoston |
| `ADMIN_USERNAME` | `admin` | Admin felhasználónév |
| `ADMIN_PASSWORD` | Generált | Adminjelszó; legalább 12 karakter |
| `POSTGRES_PASSWORD` | Generált | Adatbázisjelszó; az adatbázis-volume-mal együtt őrizd meg |
| `COOKIE_SECURE` | `false` | HTTPS használatakor `true` |
| `MAX_UPLOAD_MB` | `50` | Szerveroldali feltöltési méretkorlát |
| `MAX_DOCUMENT_PAGES` | `100` | PDF-/képfeldolgozás oldalkorlátja |
| `PROCESSING_DEVICE` | `auto` | Használható CUDA előnyben; `cpu` esetén CPU-ra kényszerítés |

A felület nyelve böngészőben tárolt választás, alapértelmezetten angol. Az API-kliensek `Accept-Language: en` vagy `Accept-Language: hu` fejlécet küldhetnek. A hibák és feldolgozási üzenetek állandó kódot és lefordított szöveget is tartalmaznak. Nem támogatott nyelvnél angolra váltunk.

### 4. Kézi Compose-indítás

Ha még nincs `.env`, előbb generáld a belépési adatokat a `./infra/setup.ps1` vagy `sh infra/setup.sh` paranccsal.

CPU/GPU nélküli konténer:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml up --build -d
```

NVIDIA GPU:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml -f infra/compose.gpu.yaml up --build -d
```

Az alap Compose-fájl nem kér GPU-t. Az automatikus felismeréshez az indítóscriptet használd. GPU-s worker kézi újralétrehozásakor mindkét Compose-fájlt add meg, hogy a GPU-hozzáférés megmaradjon.

A worker minden PDF-/képfeldolgozás előtt ellenőrzi a CUDA-t. GPU-n a Docling és a RapidOCR is PyTorchot használ; CPU-n az OCR ONNX Runtime-mal fut. GPU-s konverziós hiba után egyszer CPU-n újrapróbáljuk a feldolgozást. Ha CPU-n is sikertelen, normál hibaállapot jelenik meg. A TXT/Markdown feldolgozás nem használ GPU-t.

A RapidOCR súlyfájljai a `/models/docling/rapidocr` könyvtárban tárolódnak. A registry SHA-256 értékeivel ellenőrizzük őket, és atomikusan mentjük. A csomaggal érkező CPU-modelleket letöltés nélkül átvesszük. A GPU-modellek letöltéséhez friss ModelScope CDN-linket kérünk, egy újrapróbálkozással. A feladatonkénti `processing.log` az eszközválasztást és fallback-hibát, az `acceleration.json` a sikeresen használt eszközt és OCR backendet rögzíti.

### 5. Elérés a helyi hálózatról

Állítsd be az `APP_BIND_ADDRESS=0.0.0.0` értéket, indítsd újra az alkalmazást, majd telefonról, tabletről vagy számítógépről nyisd meg a `http://<szerver-ip>:8080` címet. Szükség szerint engedélyezd a választott portot a host tűzfalán.

A jelenlegi Compose-konfiguráció HTTP-t szolgál ki. Tartós Proxmox-telepítéshez belső DNS és megbízható HTTPS szükséges: az `infra/Caddyfile` `:80` címét cseréld a belső hostnévre, engedélyezd a `tls internal` beállítást, publikáld a HTTPS-portot a Compose-ban, és tedd tartóssá a Caddy `/data` és `/config` könyvtárait. A klienseszközökön tedd megbízhatóvá a Caddy gyökértanúsítványát, és állítsd be a `COOKIE_SECURE=true` értéket. A HTTPS külön konfigurációs lépés, az alapindító nem kapcsolja be.

### 6. Állapot, frissítés és leállítás

```sh
# Szolgáltatások és naplók
docker compose --env-file infra/.env -f infra/compose.yaml ps
docker compose --env-file infra/.env -f infra/compose.yaml logs -f api worker

# Leállítás az adatok megőrzésével
docker compose --env-file infra/.env -f infra/compose.yaml down
```

Forrás- vagy konfigurációmódosítás után futtasd újra a `./infra/start.ps1` vagy `sh infra/start.sh` indítót. Az API indítása előtt az adatbázis-migrációk automatikusan lefutnak.

A `database`, `documents` és `models` volume-ok normál leállításkor és újraépítéskor megmaradnak. A `down -v` eltávolítaná őket. Az adatbázist, a `documents` volume-ot és az `infra/.env` fájlt együtt mentsd; a modellek újra letölthetők. Automatikus mentési és visszaállítási eljárás még nem készült.

### 7. Ellenőrzések futtatása

Előbb indítsd el az alkalmazást, majd:

```sh
# Backendtesztek külön, ideiglenes adatbázissal
docker compose --env-file infra/.env -f infra/compose.yaml --profile test run --build --no-deps --rm tests

# Böngészős ellenőrzés a futó alkalmazáson: angol, magyar, desktop és mobil
docker compose --env-file infra/.env -f infra/compose.yaml --profile e2e run --build --no-deps --rm e2e

# Szintetikus PDF/kép OCR-próba az aktív workeren
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.smoke_processing
```

A böngészős képek és a létrehozott tesztjáték azonosítója a `test-results/` mappába kerülnek. A böngészős/OCR-próba `__e2e__` kezdetű játékot hoz létre. Az OCR-próba az azonosítóját `SMOKE_GAME_ID` néven kiírja. Csak ezeket a próbaadatokat távolítsd el a pontos azonosítójukkal:

```powershell
$testGame = (Get-Content test-results/created-game.json | ConvertFrom-Json).id
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e $testGame
```

Linuxon olvasd ki az azonosítót a `test-results/created-game.json` fájlból, és helyettesítsd be a `<test-game-id>` helyére. OCR-próbához a kiírt `SMOKE_GAME_ID` értéket használd:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e <test-game-id>
```

A törlőscript visszautasítja a tesztelőtag nélküli játékokat. A backendtesztek a saját ideiglenes adatbázisukat futtatás után eltávolítják.

### 8. Hibaelhárítás

- **Nem használ GPU-t:** ellenőrizd a host driverét és a Docker GPU-hozzáférését. Sikertelen CUDA-próbánál CPU-val indul. A `PROCESSING_DEVICE=cpu` szándékosan letiltja a GPU-feldolgozást.
- **Az első OCR lassú:** valószínűleg modelleket tölt le. Nézd meg a worker és a feladat feldolgozási naplóját. A meglévő modelleket újra felhasználjuk.
- **Egy dokumentum sikertelen:** ellenőrizd a formátumot, méretet, oldalszámot és olvashatóságot, majd indítsd újra. A korábbi közzétett változat megmarad.
- **Nem sikerül belépni:** ellenőrizd az `infra/.env` `ADMIN_USERNAME` és `ADMIN_PASSWORD` értékét, majd konfigurációváltozás után indítsd újra az alkalmazást.
- **Mobilról nem elérhető:** ellenőrizd a bind címet, szerver IP-jét és tűzfalát; a `127.0.0.1` csak a hoston enged hozzáférést.

Az API és a PostgreSQL belső szolgáltatások. A Caddy szolgálja ki a frontendet, és ugyanazon eredeten továbbítja az `/api` kéréseket. Az admincookie HttpOnly, 12 órás; a munkamenet-tokenek hash formában tárolódnak. A worker tartós PostgreSQL-feladatokat foglal megújítható lease-szel és foglalási tokennel, majd a kinyert tartalmat és a sikeres állapotot egy tranzakcióban menti.

## Hivatkozott dokumentáció

- [FastAPI fájlfeltöltés és hibák](https://fastapi.tiangolo.com/tutorial/request-files/)
- [React context](https://react.dev/reference/react/useContext)
- [Docling](https://github.com/docling-project/docling)
- [pgvector](https://github.com/pgvector/pgvector)
- [Docker Compose GPU-támogatás](https://docs.docker.com/compose/how-tos/gpu-support/)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
