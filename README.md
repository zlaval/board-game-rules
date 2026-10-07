# Szabálytár

Otthon futtatható társasjáték-szabálygyűjtemény. Az első megvalósított rész az admin: játékfelvétel és -szerkesztés, szabályanyag feltöltése, háttérfeldolgozás, szöveges előnézet, kulcsszavas ellenőrző keresés, eredeti ábrák és jóváhagyott változat közzététele.

## Indítás Dockerrel

PowerShellből, a projekt gyökerében:

```powershell
./infra/setup.ps1
docker compose --env-file infra/.env -f infra/compose.yaml up --build -d
```

Linuxon:

```sh
sh infra/setup.sh
docker compose --env-file infra/.env -f infra/compose.yaml up --build -d
```

Adminfelület: <http://localhost:8080>. Felhasználónév: `admin`. A generált jelszó az `infra/.env` fájl `ADMIN_PASSWORD` mezője. A setup meglévő `.env` fájlt nem ír felül. Titkokat ne verziókezelj.

Az első build a CPU-s dokumentumfeldolgozó függőségek miatt több percet igényelhet. A PDF-/képfeldolgozás első indításakor a Docling/OCR modellek letöltése további időt vehet igénybe és internetet igényel. A modellek külön Docker-volume-ban maradnak meg. A szövegfeldolgozásnak nincs modellletöltési igénye.

## Adminfolyamat

1. Jelentkezz be, és adj hozzá egy játékot a kiadással és nyelvvel.
2. Nyisd meg a játékot, és tölts fel PDF, TXT, Markdown, PNG, JPG vagy WebP fájlt; szöveget közvetlenül is beilleszthetsz.
3. Indíts feldolgozást, vagy hagyd bekapcsolva az automatikus indítást.
4. Az ellenőrzésre kész dokumentumnál nyisd meg az előnézetet. Ellenőrizd a kinyert szöveget, a forráshelyeket és az eredeti ábrákat.
5. Tedd közzé a jóváhagyott változatot.

A feltöltési korlát alapértelmezetten 50 MB, a dokumentumé 100 oldal, a feldolgozás időkorlátja 30 perc. A közzététel csak a sikeresen feldolgozott változatokra engedélyezett. Újrafeldolgozás alatt a korábbi közzétett változat megmarad; az új változat külön ellenőrzést igényel. Egy dokumentumhoz egyszerre csak egy feldolgozás indítható.

Több feltöltött kép jelenleg külön dokumentumként kezelhető; egy közös, sorrendezett képkönyv későbbi fejlesztés. A nyomtatott oldalszám felismerése helyett jelenleg a PDF valódi oldalsorszámát őrizzük meg. Az OCR minőségét az adminnak ellenőriznie kell. Ez a verzió még nem tartalmaz fordítást, szemantikus embeddingkészítést, AI-kérdezést vagy hangbevitelt. A teljes szöveges keresési index elkészül; a pgvector bővítmény és embeddingmező a későbbi fejlesztés alapja.

## Felépítés

```text
frontend/             React + TypeScript + Vite adminfelület
backend/app/          FastAPI API, dokumentumfeldolgozó és worker
backend/migrations/   Verziózott PostgreSQL-migrációk
backend/tests/        API- és worker-integrációs ellenőrzések
e2e/                  Valódi böngészős adminfolyamat-ellenőrzés
infra/                Compose, Dockerfile-ok, Caddy és konfiguráció
docs/                 Implementációs terv
```

A PostgreSQL-t és az API-t nem publikáljuk külön portra. A frontend Caddy-n keresztül, azonos eredeten éri el az API-t. Az adminmunkamenet HttpOnly cookie, lejárata 12 óra; a munkamenet-tokenek hash formájában kerülnek az adatbázisba. Az API ellenőrzi az író kérések Origin fejlécét. Az eredeti és a feldolgozott fájlok jogosultságellenőrzött API-n keresztül érhetők el.

A worker PostgreSQL-feladatokat foglal, és rendszeresen megújítja a foglalását. Megszakadt munka a foglalás lejárta után visszavehető. A feldolgozás külön folyamatban fut, 30 perces időkorláttal. A foglalási token megakadályozza, hogy egy korábban megszakadt worker utólag egy új próbálkozás eredményét felülírja. A keresési darabok, ábrák és sikeres állapot egy tranzakcióban kerülnek be.

## Parancsok

```powershell
# Állapot és naplók
docker compose --env-file infra/.env -f infra/compose.yaml ps
docker compose --env-file infra/.env -f infra/compose.yaml logs -f api worker

# Integrációs tesztek: külön, ideiglenes adatbázissal
docker compose --env-file infra/.env -f infra/compose.yaml --profile test run --build --rm tests

# Böngészős ellenőrzés a futó alkalmazáson, desktop és mobil méretben
docker compose --env-file infra/.env -f infra/compose.yaml --profile e2e run --build --rm e2e

# A böngészős teszt saját próbaadatának eltávolítása
$testGame = (Get-Content test-results/created-game.json | ConvertFrom-Json).id
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e $testGame

# Szintetikus PDF- és képes OCR-ellenőrzés
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.smoke_processing

# Leállítás; a feltöltések és az adatbázis megmaradnak
docker compose --env-file infra/.env -f infra/compose.yaml down
```

A `down -v` eltávolítaná az adatvolume-okat; a normál leállításhoz ne használd. Mentésnél az adatbázis, a `documents` volume és az `infra/.env` együtt szükséges. A modellek újra letölthetők.

A böngészős teszt képernyőképei a nem verziókezelt `test-results` mappába kerülnek. Ez a teszt a futó alkalmazásban hoz létre egy `__e2e__` nevű próba-játékot; az azonosító a `created-game.json` fájlban van. A PDF/OCR-próba a saját játékazonosítóját `SMOKE_GAME_ID` néven kiírja. A `scripts.cleanup_e2e` kizárólag egy pontos azonosítóval megadott, ilyen jelölésű próba-játékot töröl; a PDF/OCR-próba után is ezzel távolítható el a kiírt azonosítóhoz tartozó adat.

## Helyi hálózat és későbbi Proxmox-telepítés

A fejlesztői indítás alapértelmezetten csak a saját gépen érhető el. Helyi hálózatos használathoz az `infra/.env` fájlban `APP_BIND_ADDRESS=0.0.0.0` állítható be; szükség szerint engedélyezd a portot a tűzfalon. Ezt az első HTTP-s adminverziót megbízható hálózatban használd.

Az éles Proxmox-telepítéshez belső névfeloldás és megbízható HTTPS szükséges. A Caddyfile-ban a `:80` helyére a kiszolgált belső hostnév kerülhet, `tls internal` használatával. Ehhez a Compose-ban HTTPS-portot és tartós Caddy `/data` és `/config` volume-okat is konfigurálni kell; a Caddy gyökértanúsítványát a klienseszközökön megbízhatóvá kell tenni. HTTPS esetén `COOKIE_SECURE=true`. A teljes éles HTTPS-telepítés külön szakasz; a jelen indítás helyi fejlesztői HTTP.

## Dokumentációs alapok

- [FastAPI fájlfeltöltés](https://fastapi.tiangolo.com/tutorial/request-files/)
- [Docling](https://github.com/docling-project/docling)
- [React effektusok](https://react.dev/learn/synchronizing-with-effects)
- [PostgreSQL / pgvector](https://github.com/pgvector/pgvector)
- [Docker Compose indítási sorrend](https://docs.docker.com/compose/how-tos/startup-order/)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

