# Szabálytár – RuleShelf

[English](README.md) · [Magyar](README.hu.md)

A Szabálytár saját szerveren futtatható társasjáték-szabálykönyvtár. Tölts fel szabálykönyveket, válassz játékot, majd kérdezz a szabályokról. A válaszokhoz eredeti szövegrészletek, oldalszámok és kapcsolódó ábrák tartoznak. A kereső és a gyűjteménykezelő angolul és magyarul használható.

## Gyorsindítás

Egy **x86-64 / AMD64** számítógép, Linux-konténereket futtató Docker és Compose v2 szükséges. Windowson a Docker Desktop WSL2-alapú működése használható. Az alapértelmezett feldolgozó CPU-n fut; videokártya és forrásból fordítás nem szükséges.

Klónozd a tárolót, majd lépj a kiadás mappájába:

```sh
git clone https://github.com/zlaval/board-game-rules.git
cd board-game-rules/release
cp .env.example .env
```

PowerShellben az utolsó lépéshez a `Copy-Item .env.example .env` parancsot használd. A kiadási ZIP kicsomagolása is megfelelő; abban már benne van a kitöltendő `.env` sablon.

1. A `.env` fájl `POSTGRES_PASSWORD` mezőjébe írj legalább 32 karakteres véletlenszerű jelszót. Csak betűt, számot, `_` és `-` jelet használj.
2. Igény szerint add meg a saját `OPENAI_API_KEY` értékedet. Üres kulccsal a dokumentumfeldolgozás és a helyi kulcsszavas keresés használható.
3. Indítsd el az alkalmazást:

```sh
docker compose up -d
```

Nyisd meg a [Szabály keresése](http://localhost:8080) vagy a [Szabálykönyv feldolgozása](http://localhost:8080/admin) felületet. A Compose a **0.1.1** verzió képfájljait tölti le a [Docker Hubról](https://hub.docker.com/u/zalerix). A kiadás csak az adatbázist, az API-t, a feldolgozót és a webes felületet indítja. A tesztkörnyezet külön, a forráskódban található.

Az alkalmazás nem kér bejelentkezést: aki eléri, a gyűjteményt is kezelheti. Alapértelmezetten csak a szervergépről érhető el. Megbízható otthoni hálózathoz állítsd az `APP_BIND_ADDRESS` értékét `0.0.0.0`-ra, indítsd újra a Compose-t, majd másik eszközön nyisd meg a `http://<szerver-ip>:8080` címet. A mikrofonhoz a böngészők általában localhost címet vagy megbízható HTTPS-kapcsolatot és engedélyt kérnek.

## A gyűjtemény használata

1. A **Szabálykönyv feldolgozása** felületen hozz létre játékot, és add meg a kiadást, a nyelvet és az opcionális leírást.
2. A **Szabályanyag feltöltése** gombbal tölts fel PDF-, TXT-, Markdown-, PNG-, JPG- vagy WebP-fájlt, vagy illessz be szöveget. Válaszd ki a szabálykönyv és a használat nyelvét.
3. Kövesd a feldolgozási naplót. A sikeresen feldolgozott szabályok automatikusan megjelennek a keresőben.
4. A **Szabály keresése** felületen válassz játékot és szabálykönyveket, majd írj kérdést. Bekapcsolt hangfunkciónál legfeljebb 60 másodpercet rögzíthetsz; az átirat küldés előtt javítható.
5. A válasz forrásainál megnyithatod az eredeti szöveget, dokumentumot és ábrákat. Újrafeldolgozás közben a korábbi közzétett változat megmarad, amíg az új sikeresen el nem készül.

API-kulcs nélkül a keresés eredeti szabályrészleteket ad vissza. Az OpenAI magyarázatot, fordítást, jelentésalapú keresést és hangátiratot biztosít. A kulcs a szerveren marad. Ezek a funkciók szöveget, kérdést vagy hangfelvételt küldenek az OpenAI-nak, és költséggel járhatnak. Az adatbázis nem tárol hangfelvételeket vagy kérdéselőzményeket; a böngésző frissítésig az utolsó hat önálló kérdést őrzi meg.

Az alapértelmezett korlát **200 MB fájlonként**, **100 oldal dokumentumonként** és **30 perc feldolgozási idő**. Több kép külön dokumentumként kerül be. Az OCR és az AI eredményét ellenőrizni kell; a hivatkozások ellenőrzése nem garantálja minden magyarázat helyességét. Az oldalszámok a PDF tényleges oldalaira vonatkoznak. Beszélgetéses visszakérdezés, PWA-telepítés és a kinyert tartalom kézi szerkesztése jelenleg nem érhető el.

## Beállítások és üzemeltetés

Módosítsd a `release/.env` fájlt, majd a `release/` mappában futtasd újra a `docker compose up -d` parancsot.

| Változó | Alapérték | Jelentés |
| --- | --- | --- |
| `RULESHELF_VERSION` | `0.1.1` | Az alkalmazás képfájljainak közös verziója |
| `APP_BIND_ADDRESS` | `127.0.0.1` | A szerveren elérhető hálózati cím |
| `APP_PORT` | `8080` | HTTP-port |
| `POSTGRES_PASSWORD` | Kötelező | Az adatbázissal együtt megőrzendő jelszó |
| `MAX_UPLOAD_MB` | `200` | Az API és a webes közvetítő feltöltési korlátja |
| `MAX_DOCUMENT_PAGES` | `100` | A dokumentumfeldolgozás oldalkorlátja |
| `OPENAI_API_KEY` | Üres | Opcionális, szerveren tárolt OpenAI-kulcs |
| `OPENAI_ANSWER_MODEL` | `gpt-6-luna` | A magyarázat modellje |
| `OPENAI_PROCESSING_MODEL` | `gpt-6-luna` | A fordítás és keresési kulcsszavak modellje |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | A keresés 1536 dimenziós vektorainak modellje |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-transcribe` | A hangátirat modellje |
| `AI_PROCESSING_ENABLED` | `true` | AI-feldolgozás, ha rendelkezésre áll kulcs |
| `AI_MAX_CHUNKS` | `2000` | Az AI-feldolgozás szakaszkorlátja |
| `AI_MAX_CHARACTERS` | `600000` | Az AI-feldolgozás karakterkorlátja |

```sh
docker compose ps
docker compose logs -f api worker
docker compose down
```

A `database`, `documents` és `models` kötetek normál leállításkor megmaradnak. Az adatbázisról, a dokumentumkötetről és a saját `.env` fájlról együtt készíts mentést. A `docker compose down -v` a köteteket és a gyűjteményt is törli.

NVIDIA-gyorsításhoz add meg mindkét kiadási Compose-fájlt:

```sh
docker compose -f compose.yaml -f compose.gpu.yaml up -d
```

Ehhez támogatott NVIDIA-illesztőprogram és Docker GPU-hozzáférés kell; Linuxon az NVIDIA Container Toolkit is szükséges. AMD/Intel GPU-gyorsítás és natív ARM64-képfájl jelenleg nincs. Az első PDF vagy kép feldolgozása további modelleket tölthet le, amelyeket a modellkötet megőriz.

Frissítéskor őrizd meg a `.env` fájlt, cseréld le a kiadás fájljait, állítsd át a `RULESHELF_VERSION` értékét, majd futtasd a `docker compose pull` és `docker compose up -d` parancsot. A kötetek megőrzéséhez maradjon ugyanaz a telepítési mappa és projektnév. GPU használatakor minden parancshoz add meg a GPU-fájlt is. Az adatbázis-módosítások automatikusan lefutnak.

## Dokumentáció

- [Telepítés, frissítés és képfájlok](release/README.hu.md)
- [Forrásból futtatás és elkülönített tesztelés (angol)](docs/development.md)
- [Telepítés Proxmox VM-be](infra/proxmox/README.hu.md)
- [Kiadás készítése (angol)](docs/releases.md) és [változáslista (angol)](docs/changelog.md)
- [Gyűjteménykezelés](docs/admin-validation.md), [kereső](docs/player-validation.md), [AI](docs/ai-validation.md), [feldolgozás](docs/processing-validation.md) és [keresési működés](docs/retrieval-validation.md)
- [Architektúra és további tervek](docs/implementation-plan.md)

## A tároló felépítése

| Mappa | Tartalom |
| --- | --- |
| `frontend/` | React/TypeScript/Vite felületek és fordítások |
| `backend/app/` | FastAPI API, dokumentumfeldolgozás és háttérfeldolgozó |
| `backend/migrations/` | Adatbázis-módosítások |
| `backend/tests/` | Backend integrációs és feldolgozási tesztek |
| `e2e/` | Böngészős tesztek és kiadási ellenőrzések |
| `infra/` | Forrásból építés, külön teszt-Compose, indító- és kiadási segédek |
| `release/` | Előre elkészített képfájlokat használó telepítési csomag |
| `docs/` | Általános használati, fejlesztői és karbantartói dokumentáció |
