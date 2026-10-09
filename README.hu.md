# Szabálytár

[English](README.md) · [Magyar](README.hu.md)

## Gyorsindítás

A Szabálytár legegyszerűbben az előre elkészített Docker-képfájlokkal indítható el. Ehhez egy **x86-64 (AMD64) architektúrájú számítógép**, Linux-konténereket futtató Docker és a Compose v2 szükséges. Az alapértelmezett kiadás a gép processzorát használja, így videokártyára nincs szükség.

1. Csomagold ki a **0.1.0-s kiadás ZIP-fájlját**, vagy másold a projekt [`release`](release/README.hu.md) mappáját a saját gépedre.
2. Nyisd meg a csomagban található `.env` fájlt. Ha a mappát a Git-tárolóból másoltad, előbb készíts másolatot a `.env.example` fájlról `.env` néven. Linuxon erre a `cp .env.example .env`, PowerShellben a `Copy-Item .env.example .env` parancs használható.
3. A `POSTGRES_PASSWORD` mezőbe írj egy saját, véletlenszerű jelszót, amely legalább 32 karakterből áll. Csak az angol ábécé betűit, számokat, aláhúzást (`_`) és kötőjelet (`-`) használj. Ha szeretnéd bekapcsolni az OpenAI szolgáltatásait, az `OPENAI_API_KEY` mezőbe a saját API-kulcsodat írd. Ezt üresen is hagyhatod: a dokumentumok feldolgozása és a helyi kulcsszavas keresés így is működik. A kiadási csomag nem tartalmaz előre megadott API-kulcsot.
4. Nyiss egy terminált ebben a mappában, majd futtasd az alábbi parancsot:

```sh
docker compose up -d
```

Ezután megnyithatod a [Szabály keresése](http://localhost:8080) vagy a [Szabálykönyv feldolgozása](http://localhost:8080/admin) felületet. A Docker automatikusan letölti a `0.1.0` verzióhoz tartozó képfájlokat a [`zalerix` Docker Hub-fiókból](https://hub.docker.com/u/zalerix), ezért a forráskódot nem kell lefordítanod.

A gyűjtemény adatai külön Docker-kötetekben maradnak meg leállítás után is. A kitöltött `.env` fájlt őrizd meg a későbbi frissítésekhez, és ne oszd meg másokkal. Az alkalmazás alapértelmezetten csak azon a gépen érhető el, amelyen fut. Belépést nem kér.

A további beállításokról, a frissítésről, a helyi hálózati elérésről és az NVIDIA-videokártyák használatáról a [kiadási útmutatóban](release/README.hu.md) olvashatsz. Az új verziók elkészítését és közzétételét egy [külön, angol nyelvű leírás](docs/releases.md) mutatja be.

## Mire használható?

A Szabálytár a saját gépeden vagy otthoni szervereden tárolja a társasjátékaid szabálykönyveit. Válassz egy játékot, majd tedd fel a kérdésedet. Az alkalmazás megkeresi a kapcsolódó szabályokat, és az eredeti szövegrészleteket a forrásukkal együtt mutatja meg. Ha beállítod az OpenAI-kulcsodat, magyarázatot is kérhetsz a találatokhoz.

A szabályanyagokat külön felületen töltheted fel és dolgozhatod fel. A sikeresen elkészült szabályok automatikusan megjelennek a keresőben. A felület angolul és magyarul is használható, első indításkor angol nyelven jelenik meg.

## Főbb lehetőségek

- A kereső és a gyűjteménykezelő telefonon, táblagépen és számítógépen is használható. A kérdéshez kiválaszthatod a játékot és a használni kívánt szabálykönyveket.
- A helyi kulcsszavas kereséshez nem kell API-kulcs. Az OpenAI bekapcsolásával a felület választott nyelvén kaphatsz magyarázatot, az eredeti szabályokra mutató hivatkozásokkal.
- A kérdésedet be is mondhatod, ha beállítottad az OpenAI-t, és a böngésző engedélyezi a mikrofon használatát. A felismert szöveget elküldés előtt javíthatod.
- Megnyithatod az eredeti dokumentumokat és szabályrészleteket, a hivatkozott oldalakon található ábrákat pedig kinagyíthatod.
- Felvehetsz új játékokat, és szerkesztheted a nevüket, kiadásukat, leírásukat, valamint a szabálykönyvük nyelvét.
- PDF-, TXT-, Markdown-, PNG-, JPG- és WebP-fájlokat tölthetsz fel. A szabályszöveget közvetlenül is beillesztheted.
- A PDF-ek és képek szövegét a Docling és az optikai karakterfelismerés (OCR) dolgozza fel. Ez külön szolgáltatásban, a háttérben történik.
- A feldolgozási naplóban követheted az aktuális lépést, az eltelt időt, az egyes szövegcsomagok feldolgozását, a külső hívásokat és az esetleges hibákat. A napló időpontokat és modellneveket is megjelenít.
- Az OpenAI segítségével angolra, magyarra vagy mindkét nyelvre lefordíthatod a kinyert szabályokat. A PostgreSQL és a pgvector többnyelvű, jelentésalapú keresést tesz lehetővé. Az eredeti szöveg és a forráshivatkozások eközben megmaradnak.
- A **Fordítás és keresés frissítése** gombbal a már feldolgozott szövegből készíthetsz új fordítást és keresési adatokat. Ehhez nem kell újra elvégezni a karakterfelismerést.
- Megfelelő beállításokkal a feldolgozás NVIDIA-videokártyát is használhat. Ha nincs használható GPU, a gép processzorán fut. A GPU-n sikertelen átalakítást egyszer CPU-n is megpróbálja.
- A feldolgozott szövegben kulcsszavakra kereshetsz, és az eredeti oldalak, illetve ábrák segítségével ellenőrizheted az eredményt.
- A sikeresen feldolgozott változatok automatikusan elérhetővé válnak. Újrafeldolgozáskor a korábbi szabályokat addig használhatod, amíg az új változat el nem készül.
- Az angol és a magyar felület között bármikor válthatsz. A nyelvválasztás a párbeszédablakokra, az adatellenőrzési üzenetekre, az API-hibákra és a feldolgozási állapotokra is vonatkozik. A böngésző megjegyzi a beállítást.
- Az adatbázis, a dokumentumok és a letöltött modellek külön, tartós Docker-kötetekben tárolódnak.
- A két felület között a felső menüben válthatsz. Nincs bejelentkezés, ezért a gyűjteményt bárki kezelheti, aki eléri az alkalmazást az otthoni hálózaton.

## Használat

### Kérdés feltevése

1. Nyisd meg a [keresőfelületet](http://localhost:8080), válassz egy játékot, majd nézd át a **Használt szabálykönyvek** listáját. Itt csak a már közzétett szabályok közül választhatsz.
2. Írd be a kérdésedet. Ha a hangbevitel elérhető, legfeljebb 60 másodperces felvételt készíthetsz. A felvétel leállítása után ellenőrizd a felismert szöveget, és szükség esetén javítsd ki.
3. Kattints a **Kérdés elküldése** gombra. API-kulcs nélkül az eredeti szabályok kapcsolódó részleteit kapod meg. Az OpenAI bekapcsolásával magyarázat is készül, amelyből megnyithatod a hivatkozott forrásokat. Ha a rendelkezésre álló szabályok nem elegendők a válaszhoz, vagy ellentmondanak egymásnak, a felület ezt jelzi.
4. A **Forrás megnyitása** gombbal elolvashatod az eredeti részletet, és megnyithatod a dokumentumot. PDF esetén a hivatkozás az oldalszámot, szöveges dokumentumnál az adott szakaszt jelöli. A kapcsolódó oldalakon található ábrák kinagyíthatók.
5. A játék vagy a kiválasztott szabálykönyvek megváltoztatásakor a korábbi kérdések törlődnek. A böngésző az utolsó hat kérdést őrzi meg az oldal újratöltéséig. Az alkalmazás minden kérdésre külön válaszol, a korábbi kérdéseket és válaszokat nem veszi figyelembe. A már elkészült válaszokat a felület nyelvének megváltoztatása nem fordítja le.

### A gyűjtemény kezelése

1. Nyisd meg a [gyűjteménykezelőt](http://localhost:8080/admin), és kattints az **Új játék** gombra. Add meg a játék nevét, kiadását és a szabálykönyv nyelvét. Leírást is írhatsz hozzá.
2. Nyisd meg a játék adatlapját, majd válaszd a **Szabályanyag feltöltése** lehetőséget. Fájlokat tölthetsz fel, vagy használhatod a **Szöveg beillesztése** lehetőséget. Beillesztett szövegnél a Markdown-címsorok segítenek a szabályok tagolásában.
3. A **Szabálykönyv nyelve** mezőben add meg a forrás nyelvét, a **Használat nyelve** mezőben pedig válaszd ki, milyen nyelven szeretnéd használni a szabályokat. Ha a kettő megegyezik, nincs szükség fordításra. A **Feldolgozás indítása a feltöltés után** beállítással a feldolgozás rögtön elindul, de később kézzel is elindíthatod. Az adatlap alján található **Feldolgozási naplóban** követheted a folyamatot.
4. A sikeresen feldolgozott szabályok automatikusan elérhetővé válnak. A **Szabályok megtekintése** gombbal kereshetsz a szövegben, és megnézheted a kinyert ábrákat. Az **Eredeti letöltése** gombbal az eredeti fájlt érheted el.
5. Az **Újrafeldolgozás** ismét beolvassa és feldolgozza a forrásfájlt. A **Fordítás és keresés frissítése** csak a fordításokat és a bővített kereséshez szükséges adatokat készíti el újra. A korábbi változat mindaddig használható marad, amíg az új sikeresen el nem készül. Az éppen nem használható műveletek gombjai inaktívak.

A felület nyelvét a fejlécben és a párbeszédablakokban is megváltoztathatod. Ez a feltöltött szabálykönyvek szövegét, a játékok nevét, a leírásokat és a képaláírásokat nem módosítja. A szabálykönyv nyelvét a dokumentum adatai között kell megadni.

### Korlátok és a találatok értelmezése

Alapértelmezetten egy fájl legfeljebb 50 MB-os, egy dokumentum legfeljebb 100 oldalas lehet. Egy feldolgozásra legfeljebb 30 perc áll rendelkezésre. Ha több képet töltesz fel, mindegyik külön dokumentumként kerül a gyűjteménybe. A PDF-ekre mutató hivatkozások a fájl tényleges oldalsorrendjét követik, amely eltérhet az oldalakra nyomtatott számozástól. A karakterfelismerés eredményét érdemes az eredeti dokumentummal összevetni.

A keresés a többnyelvű kulcsszavas találatokat a szövegek jelentésbeli hasonlóságával egészíti ki. Nagyobb könyveknél a találatok szomszédos részleteit és a legjobban illeszkedő, összefüggő fejezeteket is figyelembe veszi. Legfeljebb két, a szövegben szereplő oldalhivatkozást is követ, hogy a kapcsolódó eljárások és azok folytatásai bekerülhessenek a válaszhoz használt anyagba.

A válasz elkészítéséhez legfeljebb 160 eredeti szövegrészletet és összesen 32 000 karaktert használ fel, a címsorokat is beleszámítva. Bekapcsolt AI mellett a kisebb szabálykönyvek teljes szövegét átadja a modellnek, ha az legfeljebb 40 részletből áll, és belefér a 32 000 karakteres keretbe. A keresés és a magyarázat elkészítésének ideje a válasz mellett látható.

A `gpt-6-luna` és a `gpt-6-sol` modellek legfeljebb 40 szövegrészlet esetén alacsony, ennél nagyobb szövegmennyiségnél közepes következtetési beállítást használnak. A válaszban csak olyan forrásazonosító szerepelhet, amelyet a modell megkapott. Az alkalmazás ezeket külön is ellenőrzi. A fordítások és a témákat leíró kulcsszavak a keresést segítik, a magyarázatok azonban az eredeti szabályokra hivatkoznak.

A találatokból így is kimaradhat egy távolabbi fejezetben szereplő kivétel. A forráshivatkozások ellenőrzése önmagában nem garantálja a magyarázat helyességét. Az eltérő nyomtatott oldalszámozás megnehezítheti a megfelelő oldal megtalálását. A kártyák és ábrák pontosabb összerendelése, a telepíthető webalkalmazás (PWA), valamint az egymásra épülő kérdések kezelése későbbi fejlesztésként szerepel a tervekben.

### A projekt felépítése

| Mappa | Tartalom |
| --- | --- |
| `frontend/` | A React, TypeScript és Vite alapú webes felületek, valamint az angol és magyar fordítások |
| `backend/app/` | A FastAPI alapú kiszolgáló, a karakterfelismerés és az adatbázishoz kapcsolódó háttérfeldolgozó |
| `backend/migrations/` | Az adatbázis szerkezetét frissítő, verziózott módosítások |
| `backend/tests/` | A kiszolgáló és a feldolgozás működését ellenőrző tesztek |
| `e2e/` | A webes felületeket és a nyelvváltást Chromium böngészővel ellenőrző tesztek |
| `infra/` | A Docker és a Caddy beállításai, valamint a telepítést és indítást segítő parancsfájlok |
| `docs/` | Fejlesztési tervek és az ellenőrzések eredményei |

## Futtatás a forráskódból

Az alábbi útmutató akkor hasznos, ha a projekt forráskódjából szeretnéd felépíteni az alkalmazást. Ha csak használni szeretnéd a Szabálytárat, a fenti gyorsindítást kövesd.

### 1. Szükséges eszközök

A parancsokat a projekt gyökérmappájában futtasd. Dockerre, a Compose bővítményre és Linux-konténerekre lesz szükséged. Windows alatt a Docker Desktop WSL2-alapú működését használd. Proxmoxon a Dockert egy Linuxot futtató virtuális gépre telepítheted.

A Proxmoxra történő telepítést és a későbbi karbantartást a [külön útmutató](infra/proxmox/README.hu.md) mutatja be. Az ottani CPU-s indító nem telepíti a használaton kívüli CUDA-függőségeket.

NVIDIA-videokártya használatához megfelelő illesztőprogram és a Docker számára elérhető GPU szükséges. Linuxon ehhez az NVIDIA Container Toolkit is kell. Proxmox esetén a videokártyát közvetlenül hozzá kell rendelni a virtuális géphez (GPU passthrough). A mellékelt Docker-képfájl NVIDIA CUDA-t támogat, AMD- és Intel-videokártyákhoz nem tartalmaz gyorsítást. Használható CUDA hiányában a feldolgozás a gép processzorán fut.

Az első összeállítás során több gigabájtnyi CUDA- és dokumentumfeldolgozó csomag töltődhet le. Az első PDF vagy kép feldolgozásakor további modellekre is szükség lehet, ezért ezekhez internetkapcsolat kell. A letöltött modelleket az alkalmazás megőrzi a későbbi használathoz. Egyszerű szöveges dokumentumok feldolgozásához nincs szükség karakterfelismerő modellekre.

### 2. Indítás és a videokártya felismerése

Windows alatt, PowerShellben:

```powershell
./infra/start.ps1
```

Linuxon vagy a Proxmox virtuális gépén:

```sh
sh infra/start.sh
```

Az indító szükség esetén létrehozza az `infra/.env` fájlt, majd felépíti az alkalmazás Docker-képfájljait. Ezután egy ideiglenes konténerben kipróbálja a CUDA működését. Ha a próba sikeres, az `infra/compose.gpu.yaml` kiegészítő beállításait is használja. Ha nem, CPU-val indítja a feldolgozót. A meglévő beállításaidat megőrzi.

A [keresőfelület](http://localhost:8080) és a [gyűjteménykezelő](http://localhost:8080/admin) belépés nélkül megnyitható. A felső menü **Szabály keresése** és **Szabálykönyv feldolgozása** pontjával válthatsz közöttük. Az `infra/.env` fájl bizalmas adatokat tartalmazhat, ezért ne oszd meg, és ne tedd a Git-tárolóba.

#### Fordítás és bővített keresés

Meglévő szabálykönyvnél a **Fordítás és keresés frissítése** gombbal készítheted el a fordításokat és a jelentésalapú kereséshez szükséges adatokat. Ezután a **Szabályok megtekintése** gombbal nézheted meg az eredményt. Az **AI-fordítás** részt lenyitva elolvashatod a felület nyelvéhez tartozó fordítást, ha az elkészült. A sikeresen feldolgozott új változat automatikusan megjelenik a keresőben. Addig a korábbi változat marad használható.

Új dokumentum feltöltésekor az AI-feldolgozás automatikusan lefut, ha engedélyezve van, és beállítottál API-kulcsot. A **Szabálykönyv nyelve** mezőben a forrás nyelvét, a **Használat nyelve** mezőben az angolt, a magyart vagy mindkettőt választhatod ki. Fordítás csak akkor készül, ha a választott nyelv eltér a forrásétól. Magyar szabályok magyar nyelvű használatához például nem készül fordítás, angol szabályok magyar nyelvű használatához viszont igen. Az eredeti szöveg feldolgozása és kereshetővé tétele mindkét esetben megtörténik.

Az alkalmazás a nyelvválasztást a dokumentumhoz menti, és újrafeldolgozáskor is ezt használja. A korábban feltöltött dokumentumok megtartják az eddigi kétnyelvű beállításukat. A fordításhoz és a keresési adatok előállításához a szövegrészletek az OpenAI-hoz kerülnek, a képek helyben maradnak. Ha az AI-feldolgozás hibát jelez, az eredeti szöveg megmarad, és a felületen figyelmeztetés jelenik meg.

#### A feldolgozási napló

A napló két másodpercenként frissül. Az öt legutóbbi feldolgozás közül választhatsz, a **Napló követése** gombbal pedig a legfrissebb eseményhez görgethetsz. Egyszerre legfeljebb 250 esemény látható. Ezekből kiderül, mennyi ideig tartott a szöveg kinyerése, a fordítás és a keresési adatok elkészítése. Külső API-hívás közben az aktuális lépés eltelt idejét is követheted.

A naplóbejegyzések a feldolgozott változat fájljaival együtt maradnak meg, és azok törlésekor tűnnek el. A dokumentum szövege és a szolgáltató nyers válasza nem kerül a naplóba.

Az AI-feldolgozás egy hívásban legfeljebb 32 szabályrészletet és összesen 10 000 karaktert küld el, a címsorokat is beleszámítva. Az eredeti részleteket és hivatkozásokat külön-külön megőrzi. Fordítás csak a szükséges nyelvekre készül. A `gpt-6-luna` fordítási hívásainál a `reasoning.effort=none` beállítás csökkenti a kiegészítő feldolgozás idejét. A teljes időt a dokumentum mérete, a szöveg kinyerése és az API válaszideje is befolyásolja. A mérések az angol nyelvű [ellenőrzési jegyzetben](docs/processing-validation.md) találhatók.

### 3. Beállítások

A beállításokat az `infra/.env` fájlban módosíthatod. A változtatások alkalmazásához futtasd újra az indítót.

| Változó | Alapérték | Mire szolgál? |
| --- | --- | --- |
| `APP_BIND_ADDRESS` | `127.0.0.1` | Meghatározza, a gép melyik hálózati címén érhető el az alkalmazás. |
| `APP_PORT` | `8080` | Az alkalmazás HTTP-portja a gépen. |
| `POSTGRES_PASSWORD` | Automatikusan generált | Az adatbázis jelszava. A meglévő adatbázis mellett őrizd meg változatlanul. |
| `MAX_UPLOAD_MB` | `50` | Egy feltöltött fájl legnagyobb mérete megabájtban. |
| `MAX_DOCUMENT_PAGES` | `100` | A PDF-ek és képek feldolgozásának oldalszámkorlátja. |
| `PROCESSING_DEVICE` | `auto` | Az `auto` előnyben részesíti a használható CUDA-t, a `cpu` mindig a processzort használja. |
| `OPENAI_API_KEY` | Üres | Az OpenAI-kulcs. Üresen az alkalmazás helyi szabálykeresést végez. |
| `OPENAI_PROCESSING_MODEL` | `gpt-6-luna` | A szabályfordításhoz és a kétnyelvű témakulcsszavak előállításához használt modell. |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | A jelentésalapú kereséshez használt modell, amely 1536 dimenziós vektorokat készít. |
| `AI_PROCESSING_ENABLED` | `true` | Engedélyezi az AI-alapú fordítást és a keresési adatok elkészítését, ha van API-kulcs. |
| `AI_MAX_CHUNKS` | `2000` | Egy AI-feldolgozásban kezelhető szabályrészletek legnagyobb száma. |
| `AI_MAX_CHARACTERS` | `600000` | Egy AI-feldolgozásban kezelhető eredeti szöveg legnagyobb hossza karakterben. |
| `OPENAI_ANSWER_MODEL` | `gpt-6-luna` | A magyarázatokhoz használt, strukturált választ adó Responses API-modell. |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-transcribe` | A hangfelvételek szöveggé alakításához használt modell. |

A felület nyelvét a böngésző tárolja, az alapértelmezett nyelv az angol. Az API-t közvetlenül használó kliensek az `Accept-Language: en` vagy az `Accept-Language: hu` fejlécben kérhetnek angol, illetve magyar üzeneteket. A hibákhoz és a feldolgozási üzenetekhez állandó azonosító és lefordított szöveg is tartozik. Nem támogatott nyelv megadásakor az alkalmazás angolra vált.

#### A magyarázatok és a hangbevitel bekapcsolása

Az `infra/.env` fájl `OPENAI_API_KEY` mezőjébe írd be a saját kulcsodat. A telepítést segítő parancsfájlok megőrzik a meglévő beállításokat. Ha egy régebbi `.env` fájlból hiányoznak az OpenAI-hoz tartozó mezők, a fenti táblázat alapján pótold őket. A kulcsot kizárólag a kiszolgálón add meg, a webes felület beállításaiba ne kerüljön bele.

A változtatás érvényesítéséhez az API és a feldolgozó konténerét is újra létre kell hozni:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml up --build --no-deps -d api worker
```

Ha a feldolgozó NVIDIA-videokártyát használ, a parancsban add meg az `-f infra/compose.gpu.yaml` kiegészítőt is. Ezután frissítsd a kereső oldalát a böngészőben. A korábban feltöltött, nagyobb könyveknél a **Fordítás és keresés frissítése** művelettel kapcsolhatod be a többnyelvű, jelentésalapú keresést. Az elkészült változat automatikusan elérhetővé válik.

A **Bővített keresés kész** állapot azt jelzi, hogy minden szövegrészlethez elkészültek a szükséges fordítások és keresési vektorok. A **Bővített keresés részben kész** állapotnál ezeknek csak egy része áll rendelkezésre. Ha a dokumentum túllépi az AI-feldolgozás beállított korlátait, a kinyert eredeti szabályok akkor is megmaradnak.

A fordítás, a keresési adatok előállítása, a magyarázatok és a beszédfelismerés fizetős OpenAI-hívásokat használhatnak. A magyarázathoz a kérdés és a kiválasztott szabályrészletek, a beszédfelismeréshez a hangfelvétel jut el a szolgáltatóhoz. A generált válaszoknál az alkalmazás `store=false` beállítást küld. A hangfelvételeket és a kérdéselőzményeket nem menti az adatbázisba. A szolgáltatói adatkezelésre az OpenAI-fiókod beállításai vonatkoznak.

Az OpenAI használatához érvényes kulcsra, a választott modellekhez való hozzáférésre és internetkapcsolatra van szükség. Ha a szolgáltató nem érhető el, az eredeti szabályszöveg helyi keresése továbbra is működik.

A kérdések és a beszédfelismerési kérések közös korlátja percenként 12 kérés az API által látott klienscímenként. A mellékelt közvetítő szolgáltatás miatt az otthoni eszközök az API felől ugyanarról a címről jelentkeznek, így ezt a keretet közösen használják. Egyszerre legfeljebb két szolgáltatói hívás futhat. A hívások időkorlátja 45 másodperc, automatikus újrapróbálkozás nincs. Egy válasz legfeljebb 1800 kimeneti tokenből állhat. Ezek a korlátok nem helyettesítik az OpenAI-fiókban beállítható költési keretet.

A mikrofon használatához HTTPS-kapcsolat vagy `localhost` cím, megfelelő böngésző és mikrofonengedély kell. Ha telefonról, egyszerű HTTP-kapcsolaton éred el a szerver IP-címét, a kérdést beírhatod, de a mikrofont nem használhatod. A felvétel 60 másodperc után leáll, a hangfeltöltés méretkorlátja 10 MB. A felismert szöveget elküldés előtt javíthatod. Androidon és iOS-en a mikrofon működését a végleges, megbízható HTTPS-kapcsolaton külön is ellenőrizni kell.

### 4. Indítás közvetlenül a Compose segítségével

Ha még nincs `infra/.env` fájlod, a `./infra/setup.ps1` vagy a `sh infra/setup.sh` paranccsal hozd létre a beállításokat és az adatbázis jelszavát.

Indítás videokártya nélkül:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml up --build -d
```

Indítás NVIDIA-videokártyával:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml -f infra/compose.gpu.yaml up --build -d
```

Az alapbeállítás nem kér hozzáférést a videokártyához. Ha automatikus felismerést szeretnél, használd az indító parancsfájlokat. A GPU-val működő feldolgozó újralétrehozásakor mindig add meg mindkét Compose-fájlt.

A feldolgozó minden PDF és kép átalakítása előtt ellenőrzi a CUDA működését. GPU-n a Docling és a RapidOCR is PyTorchot használ, CPU-n a karakterfelismerést az ONNX Runtime végzi. Ha az átalakítás GPU-n sikertelen, az alkalmazás egyszer CPU-n is megpróbálja. Ha ez sem sikerül, hibát jelez. A TXT- és Markdown-fájlok feldolgozása nem használ GPU-t.

A RapidOCR modellfájljai a `/models/docling/rapidocr` könyvtárban tárolódnak. Az alkalmazás a közzétett SHA-256 ellenőrzőösszegekkel ellenőrzi őket, és csak a teljes letöltés után teszi őket elérhetővé. A csomagban már megtalálható CPU-modelleket külön letöltés nélkül használja. A GPU-modellek letöltéséhez friss ModelScope CDN-hivatkozást kér, és hiba esetén egyszer újrapróbálkozik. Az egyes feladatok `processing.log` fájlja rögzíti az eszközválasztást és a CPU-ra váltáshoz vezető hibákat. Az `acceleration.json` fájlból kiolvasható, melyik eszköz és karakterfelismerő rendszer végezte el sikeresen a feldolgozást.

### 5. Elérés az otthoni hálózatról

Az `infra/.env` fájlban állítsd az `APP_BIND_ADDRESS` értékét `0.0.0.0`-ra, majd indítsd újra az alkalmazást. Ezután a hálózat más eszközeiről is megnyithatod a `http://<szerver-ip>:8080` címet. Szükség esetén engedélyezd a választott portot a szerver tűzfalán.

A mellékelt beállítás HTTP-kapcsolatot használ. Ha Proxmoxon HTTPS-elérést szeretnél, állíts be belső DNS-nevet, majd az `infra/Caddyfile` fájl `:80` címét cseréld erre a névre, és kapcsold be a `tls internal` beállítást. A Compose-ban tedd elérhetővé a HTTPS-portot, és gondoskodj a Caddy `/data` és `/config` könyvtárának tartós tárolásáról. A klienseszközökön a Caddy gyökértanúsítványát is megbízhatóvá kell tenni. A HTTPS beállítása külön lépés, az alapindító nem végzi el.

### 6. Állapot, frissítés és leállítás

```sh
# Szolgáltatások és naplók
docker compose --env-file infra/.env -f infra/compose.yaml ps
docker compose --env-file infra/.env -f infra/compose.yaml logs -f api worker

# Leállítás az adatok megőrzésével
docker compose --env-file infra/.env -f infra/compose.yaml down
```

Ha módosítottad a forráskódot vagy a beállításokat, futtasd újra a `./infra/start.ps1` vagy a `sh infra/start.sh` indítót. Az adatbázis szükséges frissítései az API elindítása előtt automatikusan lefutnak.

A `database`, `documents` és `models` Docker-kötetek normál leállításkor és újraépítéskor megmaradnak. A `down -v` parancs viszont törli őket. Biztonsági mentéskor az adatbázist, a `documents` kötetet és az `infra/.env` fájlt együtt őrizd meg. A modellek szükség esetén újra letölthetők. Az automatikus mentés és visszaállítás még nem része az alkalmazásnak.

### 7. Ellenőrzések futtatása

Az alkalmazás elindítása után az alábbi parancsokkal ellenőrizheted a működését:

```sh
# A kiszolgáló tesztjei külön, ideiglenes adatbázisban futnak.
docker compose --env-file infra/.env -f infra/compose.yaml --profile test run --build --no-deps --rm tests

# A webes felületek ellenőrzése angolul és magyarul, több képernyőméreten.
docker compose --env-file infra/.env -f infra/compose.yaml --profile e2e run --build --no-deps --rm e2e

# Karakterfelismerés ellenőrzése mesterséges PDF-ekkel és képekkel.
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.smoke_processing
```

A böngészős ellenőrzések képernyőképei a `test-results/` mappába kerülnek. A létrehozott tesztjátékok azonosítóit a gyűjteménykezelő ellenőrzése a `created-game.json`, a kereső ellenőrzése a `player-created-games.json` fájlba menti.

A böngészős tesztekben a magyarázatok és a hangátiratok előre megadott tesztválaszok, ezért nem használnak fizetős szolgáltatói keretet. A hangrögzítéshez a Chromium szimulált mikrofonja szolgáltatja a hangot. A kiszolgáló tesztjei a valódi OpenAI SDK-t használják, de a hálózati válaszokat tesztadatokkal helyettesítik.

A böngészős és az OCR-próbák `__e2e__` kezdetű játékokat hoznak létre. Az OCR-próba `SMOKE_GAME_ID` néven kiírja a saját tesztjátékának azonosítóját. A takarításhoz mindig ezeket a pontos azonosítókat használd:

```powershell
$testGame = (Get-Content test-results/created-game.json | ConvertFrom-Json).id
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e $testGame

$playerGames = Get-Content test-results/player-created-games.json | ConvertFrom-Json
foreach ($playerGame in $playerGames) {
    docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e $playerGame
}
```

Linuxon olvasd ki az azonosítót a `test-results/created-game.json` fájlból, és írd a `<test-game-id>` helyére. Az OCR-próba után a kiírt `SMOKE_GAME_ID` értéket használd:

```sh
docker compose --env-file infra/.env -f infra/compose.yaml exec -T worker python -m scripts.cleanup_e2e <test-game-id>
```

A törlést végző parancsfájl csak a megadott előtaggal kezdődő tesztjátékokat távolítja el. A kiszolgáló tesztjei a saját ideiglenes adatbázisukat a futtatás végén automatikusan törlik.

### 8. Hibaelhárítás

- **A feldolgozás nem használja a videokártyát.** Ellenőrizd az illesztőprogramot és azt, hogy a Docker hozzáfér-e a GPU-hoz. Ha a CUDA-próba sikertelen, a feldolgozás CPU-n indul. A `PROCESSING_DEVICE=cpu` beállítás mindig letiltja a GPU használatát.
- **Az első karakterfelismerés lassú.** Ilyenkor gyakran a szükséges modellek letöltése zajlik. A feldolgozó szolgáltatás és az adott feladat naplójában követheted, mi történik. A már letöltött modelleket a későbbi feldolgozások újra felhasználják.
- **Egy dokumentum feldolgozása sikertelen.** Ellenőrizd a fájl formátumát, méretét, oldalszámát és olvashatóságát, majd indítsd el újra a feldolgozást. A korábbi közzétett változat továbbra is használható.
- **Telefonról nem nyílik meg az alkalmazás.** Ellenőrizd a szerver IP-címét, a tűzfalat és az `APP_BIND_ADDRESS` beállítást. A `127.0.0.1` cím csak azon a gépen enged hozzáférést, amelyen az alkalmazás fut.

### A szolgáltatások kapcsolata

Az API és a PostgreSQL csak a belső konténerhálózaton érhető el. A webes felületet a Caddy szolgálja ki, és ugyanazon a címen továbbítja az `/api` kéréseket is. Az `/api/play` végpontok a játékosok számára csak a közzétett anyagokat adják vissza. A gyűjteménykezelő végpontjai a még nem közzétett anyagokhoz és az adatok módosításához is hozzáférést biztosítanak, belépés nélkül. Az alkalmazás ezért megbízható otthoni hálózaton való használatra készült.

A háttérfeldolgozó az adatbázisban tárolt feladatokat időkorlátos, megújítható foglalással és egyedi foglalási azonosítóval veszi át. A kinyert tartalmat és a sikeres feldolgozás állapotát egyetlen adatbázis-tranzakcióban menti.

## További dokumentáció

- [Az AI-funkciók megvalósítása és ellenőrzése (angol)](docs/ai-validation.md)
- [Fájlfeltöltés és hibakezelés a FastAPI-ban](https://fastapi.tiangolo.com/tutorial/request-files/)
- [A React context használata](https://react.dev/reference/react/useContext)
- [Keresési vektorok készítése az OpenAI-val](https://developers.openai.com/api/docs/guides/embeddings)
- [Strukturált válaszok az OpenAI API-ban](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Hangfelvételek szöveggé alakítása](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Docling](https://github.com/docling-project/docling)
- [pgvector](https://github.com/pgvector/pgvector)
- [GPU használata a Docker Compose-zal](https://docs.docker.com/compose/how-tos/gpu-support/)
- [A Caddy közvetítő szolgáltatásának beállítása](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
