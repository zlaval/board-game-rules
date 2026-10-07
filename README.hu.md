# Szabálytár

[English](README.md) · [Magyar](README.hu.md)

## Rövid összefoglaló

A Szabálytár otthon futtatható társasjáték-szabálykönyvtár. A játékos játékot választ és kérdez a közzétett szabályokról; a válasz mellett eredeti szabályrészletek és forráshivatkozások jelennek meg. Az admin külön felületen gyűjti, feldolgozza, ellenőrzi és közzéteszi a szabályanyagokat. Docker Compose-zal indul, angol és magyar felülettel; az alapértelmezett nyelv az angol.

## Funkciók

- Reszponzív kérdezőfelület telefonra, tabletre és számítógépre, játék- és szabálykönyvválasztással.
- Helyi kulcsszavas keresés API-kulcs nélkül; opcionális OpenAI-magyarázat a választott felületnyelven, ellenőrzött forráshivatkozásokkal.
- Mikrofonos felvétel és javítható beszédátirat, ha az OpenAI és a biztonságos böngészőkörnyezet elérhető.
- Eredeti szabályrészek és dokumentumok megnyitása; a hivatkozott oldalakról származó ábrák nagyítása.
- Játékok felvétele és szerkesztése: kiadás, leírás és a szabálykönyv nyelve.
- PDF, TXT, Markdown, PNG, JPG és WebP feltöltése vagy szöveg közvetlen beillesztése.
- PDF-ek és képek feldolgozása Doclinggal és OCR-rel, külön háttérfolyamatban.
- Elérhető NVIDIA GPU előnyben részesítése; GPU hiányában CPU, GPU-s konverziós hiba után egyszeri CPU-s újrapróbálkozás.
- Kinyert szabályrészek ellenőrzése forrásoldalakkal, kulcsszavas kereséssel és eredeti ábrákkal.
- Ellenőrzött változat közzététele. Újrafeldolgozáskor a korábban közzétett változat az új jóváhagyásáig megmarad.
- Választható angol és magyar nyelv az adminfelületen, párbeszédablakokban, ellenőrző üzenetekben, API-hibákban és feldolgozási állapotokban. A böngésző megjegyzi a választást.
- Tartós adatbázis-, dokumentum- és modellvolume-ok.
- Szerveroldali munkamenettel védett adminműveletek és még nem közzétett anyagok. A közzétett tartalom a beállított helyi címen adminbelépés nélkül olvasható.

## Bemutatás

### Kérdezz a játékról

1. Nyisd meg a [kérdezőfelületet](http://localhost:8080), válassz játékot, és ellenőrizd a **Használt szabálykönyvek** listát. Csak közzétett változat választható.
2. Írd be a kérdésedet. Ha a hangbevitel engedélyezett, rögzíts legfeljebb 60 másodpercet, állítsd le, majd ellenőrizd és javítsd a felismert szöveget elküldés előtt.
3. Válaszd a **Kérdés elküldése** gombot. API-kulcs nélkül a kapcsolódó eredeti szabályrészeket kapod. Beállított OpenAI mellett magyarázat és forrásgombok jelennek meg; hiányos vagy ellentmondó forrásnál ezt jelzi a felület.
4. A **Forrás megnyitása** gombbal nézd át az eredeti részletet, és nyisd meg a dokumentumát. PDF-nél oldalszám, szövegnél stabil szakaszhivatkozás jelenik meg. Az adott oldalakról származó eredeti ábrák nagyíthatók.
5. Játék- vagy szabálykönyvváltáskor a korábbi kérdések törlődnek. Az utolsó hat kérdés újratöltésig a memóriában marad; minden kérdés önálló, a korábbi beszélgetés nem ad kontextust. Nyelvváltáskor a már elkészült válasz az eredeti nyelvén marad.

### Gyűjtemény kezelése

1. Nyisd meg az [adminfelületet](http://localhost:8080/admin), jelentkezz be, és válaszd az **Új játék** gombot. Add meg a címet, kiadást, a szabálykönyv nyelvét és az opcionális leírást.
2. Nyisd meg a játékot, majd válaszd a **Szabályanyag feltöltése** gombot. Válassz fájlokat vagy a **Szöveg beillesztése** lehetőséget. A Markdown-címek segítik a tagolást.
3. Hagyd bekapcsolva a **Feldolgozás indítása a feltöltés után** lehetőséget, vagy indítsd el később kézzel. A dokumentum mellett megjelenik a folyamat és az esetleges hiba.
4. A feldolgozás végén nyisd meg az **Ellenőrzés** nézetet. Keress a szövegben, ellenőrizd a forrásoldalakat és ábrákat; szükség esetén töltsd le az eredetit.
5. Az **Ellenőriztem, közzéteszem** gombbal hagyd jóvá a változatot. Az **Újrafeldolgozás** új változatot készít, a korábbi közzétett továbbra is elérhető.

A nyelvválasztó a kérdezőfelületen, a belépésnél, az adminfejlécben és a párbeszédablakokban is elérhető. A felület nyelvének megváltoztatása nem fordítja le és nem módosítja a feltöltött szabálykönyveket, játékneveket, leírásokat vagy képaláírásokat. A szabálykönyv nyelve külön adat.

Jelenlegi korlátok: alapértelmezetten 50 MB fájlonként, 100 oldal dokumentumonként, 30 perces feldolgozási időkorlát. Több feltöltött kép külön dokumentumként kerül be. A forráshely a PDF tényleges oldalsorszáma, nem a nyomtatott oldalcímke. Az OCR eredményét embernek is ellenőriznie kell.

A keresés jelenleg kulcsszavas, szókezdetekkel és szomszédos szakaszokkal, így a közeli példák és kivételek is bekerülhetnek. Bekapcsolt AI mellett a kisebb kiválasztott szabálykönyvek teljes szövegét adjuk át, legfeljebb 40 keresési darabig és 32 000 szöveg-/címkarakterig; nagyobb anyagnál korlátozott keresési részleteket. A többnyelvű szemantikus keresés, automatikus szabálykönyv-fordítás, pontos kártya-/ábrakapcsolatok, PWA-telepítés és beszélgetési kontextus későbbi feladatok. A teljes szöveges keresés működik, a pgvector elő van készítve. Nagy idegen nyelvű könyvnél szükség lehet az eredeti szakkifejezésekre. A forrásazonosítókat ellenőrizzük, de a válaszminőséget saját szabálykönyveken is értékelni kell.

### Összetevők

| Mappa | Feladat |
| --- | --- |
| `frontend/` | React, TypeScript és Vite kérdező-/adminfelület; angol/magyar fordítási fájlok |
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

A [http://localhost:8080](http://localhost:8080) címen a kérdezőfelület, a [http://localhost:8080/admin](http://localhost:8080/admin) címen az admin érhető el. A kezdeti admin felhasználónév `admin`. A generált jelszót az `infra/.env` fájl `ADMIN_PASSWORD` mezőjében találod. Ezt a fájlt kezeld titokként, és ne tedd verziókezelésbe.

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
| `OPENAI_API_KEY` | Üres | Szerveroldali OpenAI-kulcs; üresen csak helyi szabálykeresés |
| `OPENAI_ANSWER_MODEL` | `gpt-4.1-mini` | Strukturált kimenetet támogató Responses API-modell |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-transcribe` | Beszédfelismerési modell |

A felület nyelve böngészőben tárolt választás, alapértelmezetten angol. Az API-kliensek `Accept-Language: en` vagy `Accept-Language: hu` fejlécet küldhetnek. A hibák és feldolgozási üzenetek állandó kódot és lefordított szöveget is tartalmaznak. Nem támogatott nyelvnél angolra váltunk.

#### Magyarázat és hangbevitel bekapcsolása

Az `infra/.env` fájlban helyben állítsd be az `OPENAI_API_KEY` értékét. A setup megőrzi a meglévő fájlokat; régebbi fájlhoz szükség esetén add hozzá a fenti három OpenAI-beállítást. A kulcs ne kerüljön a frontend konfigurációjába. A beállítás alkalmazásához csak az API-t kell újralétrehozni:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml up --build --no-deps -d api
```

Frissítsd a kérdezőfelületet. A magyarázathoz a kérdés és a kiválasztott szabályrészletek, a beszédfelismeréshez a hangfelvétel kerül az OpenAI-hoz. A generált válaszokhoz `store=false` beállítást küldünk. Az alkalmazás sem a hangot, sem a kérdéselőzményeket nem menti adatbázisba; a szolgáltatói adatkezelésre az OpenAI-fiókod beállításai érvényesek. Érvényes kulcs, modellhozzáférés és internet szükséges. Szolgáltatói hibánál az eredeti szabályszöveg keresése marad használható.

A kérdezés és beszédfelismerés közös korlátja percenként 12 kérés az API által látott klienscímenként. A mellékelt proxy mögött a háztartási eszközök közös címét használjuk. Legfeljebb két szolgáltatói hívás fut egyszerre, 45 másodperces időkorláttal és automatikus újrapróbálás nélkül; a válasz legfeljebb 1800 kimeneti token. Ez nem pénzügyi költési plafon; a szolgáltatói keretet külön állítsd be.

A mikrofonhoz HTTPS vagy `localhost`, támogatott böngésző és mikrofonengedély kell. Telefonról a szerver IP-jére irányuló egyszerű HTTP-elérésnél írott kérdés működik, mikrofon nem. A felvétel 60 másodperc után leáll; a feltöltési korlát 10 MB. Az átirat elküldés előtt javítható. Valódi Android/iOS eszközön, megbízható helyi HTTPS-sel külön telepítési átvétel szükséges.

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
- **Nem sikerül belépni:** ellenőrizd az `infra/.env` `ADMIN_USERNAME` és `ADMIN_PASSWORD` értékét, majd konfigurációváltozás után indítsd újra az alkalmazást.
- **Mobilról nem elérhető:** ellenőrizd a bind címet, szerver IP-jét és tűzfalát; a `127.0.0.1` csak a hoston enged hozzáférést.

Az API és a PostgreSQL belső szolgáltatások. A Caddy szolgálja ki a frontendet, és ugyanazon eredeten továbbítja az `/api` kéréseket. Az `/api/play` csak közzétett anyagot ad az otthoni játékosoknak; az adminvégpontok belépést kérnek. Az admincookie HttpOnly, 12 órás; a munkamenet-tokenek hash formában tárolódnak. A worker tartós PostgreSQL-feladatokat foglal megújítható lease-szel és foglalási tokennel, majd a kinyert tartalmat és a sikeres állapotot egy tranzakcióban menti.

## Hivatkozott dokumentáció

- [FastAPI fájlfeltöltés és hibák](https://fastapi.tiangolo.com/tutorial/request-files/)
- [React context](https://react.dev/reference/react/useContext)
- [OpenAI strukturált kimenet](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI hangfelvétel átírása](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Docling](https://github.com/docling-project/docling)
- [pgvector](https://github.com/pgvector/pgvector)
- [Docker Compose GPU-támogatás](https://docs.docker.com/compose/how-tos/gpu-support/)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
