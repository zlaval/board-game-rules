# Szabálytár

[English](README.md) · [Magyar](README.hu.md)

## Gyorsindítás — kész image-ekkel

Csomagold ki a **0.1.0 kiadás ZIP-jét**, vagy másold a [`release/`](release/README.hu.md) mappát. Docker és Compose v2 kell Linux-konténerekkel, **x86-64 / AMD64** gépen; az alapfeldolgozó CPU-t használ.

1. Nyisd meg a release mappát. A ZIP-ben már van `.env`; Gitből használva másold a `.env.example` fájlt `.env` néven (`cp .env.example .env` vagy PowerShellben `Copy-Item .env.example .env`).
2. Töltsd ki a `.env` fájlt: saját, legalább 32 karakteres véletlen `POSTGRES_PASSWORD` jelszó kell (csak betűk, számok, `_` és `-`). Opcionálisan add meg **a saját** `OPENAI_API_KEY` kulcsodat; üresen helyi keresés és kinyerés használható. A csomag nem tartalmaz privát kulcsot.
3. Ebben a mappában futtasd:

```sh
docker compose up -d
```

A [Szabály keresése](http://localhost:8080) és a [Szabálykönyv feldolgozása](http://localhost:8080/admin) felületen használhatod. Az image-ek a [`zalerix` Docker Hub-fiókból](https://hub.docker.com/u/zalerix) töltődnek le, rögzített `0.1.0` verzióval. Nem kell forráskódot fordítani vagy GPU-t használni. Az adatok Docker-volume-okban megmaradnak; a kitöltött `.env` fájlt kezeld titokként, és frissítéskor őrizd meg. Az alkalmazás nem kér belépést, alapból csak localhoston érhető el.

A [kiadási útmutató](release/README.hu.md) bemutatja a beállításokat, frissítést, hálózati elérést és az opcionális NVIDIA-image-et. Az [új verzió publikálása](docs/releases.md) külön dokumentált. Az alábbi részek a forráskódból történő helyi futtatásról és fejlesztésről szólnak.

## Rövid összefoglaló

A Szabálytár otthon futtatható társasjáték-szabálykönyvtár. A játékos játékot választ és kérdez a közzétett szabályokról; a válasz mellett eredeti szabályrészletek és forráshivatkozások jelennek meg. Az admin külön felületen gyűjti és feldolgozza a szabályanyagokat; a sikeresen feldolgozott változatok automatikusan közzétételre kerülnek. Docker Compose-zal indul, angol és magyar felülettel; az alapértelmezett nyelv az angol.

## Funkciók

- Reszponzív kérdezőfelület telefonra, tabletre és számítógépre, játék- és szabálykönyvválasztással.
- Helyi kulcsszavas keresés API-kulcs nélkül; opcionális OpenAI-magyarázat a választott felületnyelven, ellenőrzött forráshivatkozásokkal.
- Mikrofonos felvétel és javítható beszédátirat, ha az OpenAI és a biztonságos böngészőkörnyezet elérhető.
- Eredeti szabályrészek és dokumentumok megnyitása; a hivatkozott oldalakról származó ábrák nagyítása.
- Játékok felvétele és szerkesztése: kiadás, leírás és a szabálykönyv nyelve.
- PDF, TXT, Markdown, PNG, JPG és WebP feltöltése vagy szöveg közvetlen beillesztése.
- PDF-ek és képek feldolgozása Doclinggal és OCR-rel, külön háttérfolyamatban.
- Terminálszerű feldolgozási napló időbélyegekkel, aktuális lépéssel, eltelt idővel, csomagszámokkal, API-várakozással, modellnevekkel és hibákkal.
- Beállított OpenAI mellett a kinyert szabályok fordítása a választott használati nyelvekre (angol, magyar vagy mindkettő), többnyelvű szemantikus index PostgreSQL/pgvector alapon. Az eredeti szöveg és forráshely megmarad.
- **Fordítás és keresés frissítése** a már kinyert szabálykönyvön újabb OCR nélkül; a kész változat automatikusan használható.
- Elérhető NVIDIA GPU előnyben részesítése; GPU hiányában CPU, GPU-s konverziós hiba után egyszeri CPU-s újrapróbálkozás.
- Kinyert szabályrészek ellenőrzése forrásoldalakkal, kulcsszavas kereséssel és eredeti ábrákkal.
- Sikeres változatok automatikus közzététele. Újrafeldolgozáskor a korábbi változat az új sikeres elkészültéig megmarad.
- Választható angol és magyar nyelv az adminfelületen, párbeszédablakokban, ellenőrző üzenetekben, API-hibákban és feldolgozási állapotokban. A böngésző megjegyzi a választást.
- Tartós adatbázis-, dokumentum- és modellvolume-ok.
- Belépés nélkül elérhető kérdező- és adminfelület, két felső menüponttal. Az adminműveleteket mindenki eléri, aki az otthoni hálózaton hozzáfér az alkalmazáshoz.

## Bemutatás

### Kérdezz a játékról

1. Nyisd meg a [kérdezőfelületet](http://localhost:8080), válassz játékot, és ellenőrizd a **Használt szabálykönyvek** listát. Csak közzétett változat választható.
2. Írd be a kérdésedet. Ha a hangbevitel engedélyezett, rögzíts legfeljebb 60 másodpercet, állítsd le, majd ellenőrizd és javítsd a felismert szöveget elküldés előtt.
3. Válaszd a **Kérdés elküldése** gombot. API-kulcs nélkül a kapcsolódó eredeti szabályrészeket kapod. Beállított OpenAI mellett magyarázat és forrásgombok jelennek meg; hiányos vagy ellentmondó forrásnál ezt jelzi a felület.
4. A **Forrás megnyitása** gombbal nézd át az eredeti részletet, és nyisd meg a dokumentumát. PDF-nél oldalszám, szövegnél stabil szakaszhivatkozás jelenik meg. Az adott oldalakról származó eredeti ábrák nagyíthatók.
5. Játék- vagy szabálykönyvváltáskor a korábbi kérdések törlődnek. Az utolsó hat kérdés újratöltésig a memóriában marad; minden kérdés önálló, a korábbi beszélgetés nem ad kontextust. Nyelvváltáskor a már elkészült válasz az eredeti nyelvén marad.

### Gyűjtemény kezelése

1. Nyisd meg az [adminfelületet](http://localhost:8080/admin), és válaszd az **Új játék** gombot. Add meg a címet, kiadást, a szabálykönyv nyelvét és az opcionális leírást.
2. Nyisd meg a játékot, majd válaszd a **Szabályanyag feltöltése** gombot. Válassz fájlokat vagy a **Szöveg beillesztése** lehetőséget. A Markdown-címek segítik a tagolást.
3. Válaszd ki a **Szabálykönyv nyelve** és **Használat nyelve** mezőket. Egyező nyelveknél kimarad a fordítás. Hagyd bekapcsolva a **Feldolgozás indítása a feltöltés után** lehetőséget, vagy indítsd el később kézzel. A játékoldal alján a **Feldolgozási napló** mutatja a részleteket.
4. Sikeres feldolgozás után a szabályok automatikusan elérhetők. A **Szabályok megtekintése** gombbal kereshetsz a kinyert szövegben és megnézheted az ábrákat; az **Eredeti letöltése** megnyitja a forrásfájlt.
5. Az **Újrafeldolgozás** ismét beolvassa a fájlt; a **Fordítás és keresés frissítése** csak a fordításokat és a bővített keresést frissíti. A korábbi változat az új sikeres elkészültéig elérhető marad. A nem használható műveletek le vannak tiltva.

A nyelvválasztó a közös fejlécben és a párbeszédablakokban is elérhető. A felület nyelvének megváltoztatása nem fordítja le és nem módosítja a feltöltött szabálykönyveket, játékneveket, leírásokat vagy képaláírásokat. A szabálykönyv nyelve külön adat.

Jelenlegi korlátok: alapértelmezetten 50 MB fájlonként, 100 oldal dokumentumonként, 30 perces feldolgozási időkorlát. Több feltöltött kép külön dokumentumként kerül be. A forráshely a PDF tényleges oldalsorszáma, nem a nyomtatott oldalcímke. Az OCR eredményét embernek is ellenőriznie kell.

A keresés többnyelvű kulcsszavas találatokat és pgvector-alapú szemantikus hasonlóságot egyesít. Nagyobb könyvnél hozzáveszi a szomszédos töredékeket és a legjobb összefüggő fejezeteket, majd legfeljebb két szöveges oldalhivatkozás alapján a kapcsolódó eljárásokat és folytató oldalaikat. A kontextus továbbra is legfeljebb 32 000 szöveg-/címkarakter és 160 eredeti töredék. Bekapcsolt AI mellett a kisebb kiválasztott szabálykönyvek teljes szövegét adjuk át, legfeljebb 40 rész és 32 000 karakter esetén. A válasz mellett látható a keresés és magyarázat ideje. A `gpt-6-luna`/`gpt-6-sol` magyarázatok legfeljebb 40 töredéknél alacsony, nagyobb kontextusnál közepes következtetési beállítást használnak; a válaszséma csak átadott forrásazonosítókat enged, ezeket külön is ellenőrizzük. A fordítások és témakulcsszavak a keresést segítik, de a magyarázatok mindig az eredeti szabályra hivatkoznak. Az oldalhivatkozások keresése jelenleg a PDF tényleges oldalsorszámait használja, így eltérő nyomtatott számozásnál elvétheti a céloldalt. A pontos kártya-/ábrakapcsolatok, PWA és beszélgetési kontextus későbbi feladatok. Távoli kivételek kimaradhatnak; a forrásazonosítók ellenőrzése nem bizonyítja minden magyarázat helyességét.

### Összetevők

| Mappa | Feladat |
| --- | --- |
| `frontend/` | React, TypeScript és Vite kérdező-/adminfelület; angol/magyar fordítási fájlok |
| `backend/app/` | FastAPI API, OCR-feldolgozó és PostgreSQL-alapú worker |
| `backend/migrations/` | Verziózott adatbázis-migrációk |
| `backend/tests/` | Backend-integrációs és feldolgozási ellenőrzések |
| `e2e/` | Chromium-ellenőrzések az adminfolyamathoz és nyelvváltáshoz |
| `infra/` | Docker Compose, Dockerfile-ok, Caddy és setup/indító scriptek |
| `docs/` | Implementációs terv és ellenőrzési jegyzetek |

## Az alkalmazás futtatása

### 1. Előfeltételek

Minden parancsot a projekt gyökerében futtass. Docker, Compose plugin és Linux konténerek szükségesek. Windowson Docker Desktop WSL2 backenddel; Proxmoxon egy Linux virtuális gépben futó Docker használható.

Az otthoni Proxmox VM telepítését és karbantartását a [külön útmutató](infra/proxmox/README.hu.md) írja le. A CPU-indító a nem használt CUDA-függőségek nélkül épít.

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

Az indító szükség esetén létrehozza az `infra/.env` fájlt, felépíti az image-eket, és ideiglenes konténerben CUDA-műveletet futtat. Sikeres próba esetén az `infra/compose.gpu.yaml` kiegészítővel indul; egyébként CPU-s konfigurációt választ. A meglévő beállítások megmaradnak.

A [http://localhost:8080](http://localhost:8080) címen a kérdezőfelület, a [http://localhost:8080/admin](http://localhost:8080/admin) címen az admin érhető el. Az admin nem kér belépést. A felső **Szabály keresése** és **Szabálykönyv feldolgozása** menüponttal válthatsz a felületek között. Az `infra/.env` fájlt kezeld titokként, és ne tedd verziókezelésbe.

Meglévő szabálykönyvnél válaszd a dokumentum **Fordítás és keresés frissítése**, majd **Szabályok megtekintése** gombját. Az **AI-fordítás** részben a felület nyelvén olvashatod a fordítást. A sikeresen elkészült új változat automatikusan közzétételre kerül; addig a korábbi változat marad használatban. Új feltöltésnél az AI-szakasz automatikusan fut, ha engedélyezett. Feltöltéskor válaszd ki a **Szabálykönyv nyelve** és **Használat nyelve** mezőket (angol, magyar vagy mindkettő). Fordítás csak a forrásétól eltérő, kiválasztott nyelvekre készül: magyar → magyar esetén teljesen kimarad; angol → magyar esetén csak magyar fordítás készül. Az eredeti szöveg feldolgozása és indexelése továbbra is lefut. A választást a dokumentumhoz mentjük, és újrafeldolgozáskor is használjuk. A korábbi dokumentumok megtartják az eddigi két nyelvű beállítást. A szövegrészletek indexelésre és a szükséges fordításra az OpenAI-hoz kerülnek; a képek helyben maradnak. AI-hiba esetén az eredeti szöveg megmarad, a felület figyelmeztet.

A feldolgozási napló két másodpercenként frissül. Az öt legutóbbi feladat közül választhatsz; a **Napló követése** a legújabb eseményekhez görget. Legfeljebb 250 esemény látszik, köztük a kinyerés, fordítás és indexelés időmérései. API-hívás közben az aktuális lépés eltelt ideje is megjelenik. Az események a feldolgozott változat fájljaival együtt maradnak meg azok törléséig. Nyers API-kimenet és dokumentumszöveg nem kerül ebbe a naplóba.

Az AI-feldolgozás legfeljebb 32 szabályrészt és 10 000 forrás-/címkaraktert rendez egy csomagba, az eredeti részek és hivatkozások megőrzésével. Fordítás csak a szükséges célnyelvekre készül; a `gpt-6-luna` fordítási hívások `reasoning.effort=none` beállítást használnak. Ez csökkenti a hívások többletidejét, de a teljes feldolgozási idő függ a dokumentum kinyerésétől, méretétől és az API válaszidejétől. A mérések az angol [ellenőrzési jegyzetben](docs/processing-validation.md) találhatók.

### 3. Beállítások

Módosítsd az `infra/.env` fájlt, majd futtasd újra az indítót.

| Változó | Alapérték | Feladat |
| --- | --- | --- |
| `APP_BIND_ADDRESS` | `127.0.0.1` | A Docker hoston publikált cím |
| `APP_PORT` | `8080` | HTTP-port a hoston |
| `POSTGRES_PASSWORD` | Generált | Adatbázisjelszó; az adatbázis-volume-mal együtt őrizd meg |
| `MAX_UPLOAD_MB` | `50` | Szerveroldali feltöltési méretkorlát |
| `MAX_DOCUMENT_PAGES` | `100` | PDF-/képfeldolgozás oldalkorlátja |
| `PROCESSING_DEVICE` | `auto` | Használható CUDA előnyben; `cpu` esetén CPU-ra kényszerítés |
| `OPENAI_API_KEY` | Üres | Szerveroldali OpenAI-kulcs; üresen csak helyi szabálykeresés |
| `OPENAI_PROCESSING_MODEL` | `gpt-6-luna` | Szabályfordítás és két nyelvű témakulcsszavak |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Többnyelvű szemantikus modell, 1536 dimenzió |
| `AI_PROCESSING_ENABLED` | `true` | AI-fordítás és indexelés beállított kulccsal |
| `AI_MAX_CHUNKS` | `2000` | Szabályrészek maximális száma AI-feladatonként |
| `AI_MAX_CHARACTERS` | `600000` | Eredeti szöveg maximális karakterszáma AI-feladatonként |
| `OPENAI_ANSWER_MODEL` | `gpt-6-luna` | Strukturált kimenetet támogató Responses API-modell |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-transcribe` | Beszédfelismerési modell |

A felület nyelve böngészőben tárolt választás, alapértelmezetten angol. Az API-kliensek `Accept-Language: en` vagy `Accept-Language: hu` fejlécet küldhetnek. A hibák és feldolgozási üzenetek állandó kódot és lefordított szöveget is tartalmaznak. Nem támogatott nyelvnél angolra váltunk.

#### Magyarázat és hangbevitel bekapcsolása

Az `infra/.env` fájlban helyben állítsd be az `OPENAI_API_KEY` értékét. A setup megőrzi a meglévő fájlokat; régebbi fájlhoz szükség esetén add hozzá a fenti OpenAI-beállításokat. A kulcs ne kerüljön a frontend konfigurációjába. A beállítás alkalmazásához az API-t és a workert is újra kell létrehozni:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml up --build --no-deps -d api worker
```

GPU-s worker esetén a fenti parancsban add meg az `-f infra/compose.gpu.yaml` kiegészítőt is. A beállítás az API és a worker újraindítása után érvényes. Meglévő nagy könyvnél az **AI-feldolgozás** és közzététel teszi elérhetővé a többnyelvű szemantikus keresést. A fordítás és indexelés fizetős OpenAI-hívásokat használhat. Az **AI-indexelt** állapot minden részhez a szükséges fordításokat és embeddinget jelez; a **Részleges AI-index** csak részben elkészült adatokat. A korlát túllépése nem törli a kinyert szabályokat.

Frissítsd a kérdezőfelületet. A magyarázathoz a kérdés és a kiválasztott szabályrészletek, a beszédfelismeréshez a hangfelvétel kerül az OpenAI-hoz. A generált válaszokhoz `store=false` beállítást küldünk. Az alkalmazás sem a hangot, sem a kérdéselőzményeket nem menti adatbázisba; a szolgáltatói adatkezelésre az OpenAI-fiókod beállításai érvényesek. Érvényes kulcs, modellhozzáférés és internet szükséges. Szolgáltatói hibánál az eredeti szabályszöveg keresése marad használható.

A kérdezés és beszédfelismerés közös korlátja percenként 12 kérés az API által látott klienscímenként. A mellékelt proxy mögött a háztartási eszközök közös címét használjuk. Legfeljebb két szolgáltatói hívás fut egyszerre, 45 másodperces időkorláttal és automatikus újrapróbálás nélkül; a válasz legfeljebb 1800 kimeneti token. Ez nem pénzügyi költési plafon; a szolgáltatói keretet külön állítsd be.

A mikrofonhoz HTTPS vagy `localhost`, támogatott böngésző és mikrofonengedély kell. Telefonról a szerver IP-jére irányuló egyszerű HTTP-elérésnél írott kérdés működik, mikrofon nem. A felvétel 60 másodperc után leáll; a feltöltési korlát 10 MB. Az átirat elküldés előtt javítható. Valódi Android/iOS eszközön, megbízható helyi HTTPS-sel külön telepítési átvétel szükséges.

### 4. Kézi Compose-indítás

Ha még nincs `.env`, előbb generáld az adatbázisjelszót a `./infra/setup.ps1` vagy `sh infra/setup.sh` paranccsal.

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

A jelenlegi Compose-konfiguráció HTTP-t szolgál ki. Tartós Proxmox-telepítéshez belső DNS és megbízható HTTPS szükséges: az `infra/Caddyfile` `:80` címét cseréld a belső hostnévre, engedélyezd a `tls internal` beállítást, publikáld a HTTPS-portot a Compose-ban, és tedd tartóssá a Caddy `/data` és `/config` könyvtárait. A klienseszközökön tedd megbízhatóvá a Caddy gyökértanúsítványát. A HTTPS külön konfigurációs lépés, az alapindító nem kapcsolja be.

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

# Admin/kérdező ellenőrzés: angol, magyar, desktop, mobil és tablet
docker compose --env-file infra/.env -f infra/compose.yaml --profile e2e run --build --no-deps --rm e2e

# Szintetikus PDF/kép OCR-próba az aktív workeren
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.smoke_processing
```

A böngészős képek a `test-results/` mappába, a tesztjáték-azonosítók a `created-game.json` (admin) és `player-created-games.json` (kérdező) fájlokba kerülnek. A böngészős AI-válaszok és átiratok tesztválaszok, nem fogyasztanak szolgáltatói keretet; a rögzítés Chromium szintetikus mikrofonját használja. A backendtesztek valódi OpenAI SDK-val, teszt HTTP-válaszokkal futnak. A böngészős/OCR-próba `__e2e__` kezdetű játékokat hoz létre. Az OCR-próba az azonosítóját `SMOKE_GAME_ID` néven kiírja. Csak ezeket a próbaadatokat távolítsd el a pontos azonosítójukkal:

```powershell
$testGame = (Get-Content test-results/created-game.json | ConvertFrom-Json).id
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e $testGame

$playerGames = Get-Content test-results/player-created-games.json | ConvertFrom-Json
foreach ($playerGame in $playerGames) {
    docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e $playerGame
}
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
- **Mobilról nem elérhető:** ellenőrizd a bind címet, szerver IP-jét és tűzfalát; a `127.0.0.1` csak a hoston enged hozzáférést.

Az API és a PostgreSQL belső szolgáltatások. A Caddy szolgálja ki a frontendet, és ugyanazon eredeten továbbítja az `/api` kéréseket. Az `/api/play` csak közzétett anyagot ad az otthoni játékosoknak; az adminvégpontok belépés nélkül elérhetők, az írási műveletekkel és a még nem közzétett anyagokkal együtt, megbízható otthoni hálózatra. A worker tartós PostgreSQL-feladatokat foglal megújítható lease-szel és foglalási tokennel, majd a kinyert tartalmat és a sikeres állapotot egy tranzakcióban menti.

## Hivatkozott dokumentáció

- [AI-megvalósítás és ellenőrzés (angol)](docs/ai-validation.md)
- [FastAPI fájlfeltöltés és hibák](https://fastapi.tiangolo.com/tutorial/request-files/)
- [React context](https://react.dev/reference/react/useContext)
- [OpenAI embeddingek](https://developers.openai.com/api/docs/guides/embeddings)
- [OpenAI strukturált kimenet](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI hangfelvétel átírása](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Docling](https://github.com/docling-project/docling)
- [pgvector](https://github.com/pgvector/pgvector)
- [Docker Compose GPU-támogatás](https://docs.docker.com/compose/how-tos/gpu-support/)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

