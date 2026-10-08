# Admin implementáció és ellenőrzés

Dátum: 2026-10-07.

## Elkészült

- React/TypeScript adminfelület asztali és mobilos elrendezéssel.
- Adminbelépés, szerveroldali munkamenetek és kijelentkezés.
- Játék felvétele, szerkesztése, kiadás és nyelv megadása.
- PDF-, szöveg- és képfeltöltés; közvetlen szabályszöveg-beillesztés.
- Külön worker és PostgreSQL-ben tárolt, foglalási tokennel védett feldolgozási feladatok.
- Docling PDF-/képfeldolgozás OCR-rel, szöveges szabályrészekkel és forráshelyekkel.
- Eredeti ábrák tárolása és előnézete.
- Teljes szöveges keresési index és dokumentumon belüli kulcsszavas ellenőrző keresés.
- Előnézet, közzététel és újrafeldolgozás. A korábbi közzétett változat külön megnyitható marad.
- Az `infra` mappában Docker Compose, API/worker/frontend Dockerfile-ok, Caddy és titokgeneráló setup.
- Tartós adatbázis-, dokumentum- és modellvolume-ok.

## Elvégzett ellenőrzések

- Frontend TypeScript-ellenőrzés és Vite production build: sikeres.
- Backend Ruff kódellenőrzés: sikeres.
- 14 integrációs teszt elkülönített, utána eltávolított PostgreSQL-tesztadatbázissal: sikeres.
- A tesztek ellenőrzik a jogosultságokat, az eredetellenőrzést, játékkezelést, feltöltési korlátokat, duplikációkat, feldolgozást, keresést, közzétételt, változatváltást, lejárt foglalás visszavételét és az elavult worker kizárását.
- Valódi Chromium böngészőben a teljes adminfolyamat: belépés → játékfelvétel → szövegfeltöltés → worker → keresés → közzététel → újrafeldolgozás → korábbi közzétett változat megnyitása → kijelentkezés. Sikeres, JavaScript-futási hiba nélkül.
- Mobilos nézet 390 × 844 méretben: nincs vízszintes túlcsordulás. Ez böngészős méretemuláció, nem fizikai telefonos átvétel.
- A futó API-n és workeren szintetikus PDF-próba: 1 oldal, 2 szabályrész, 2 eredeti ábra; a forrásoldal megmaradt, a képek PNG-ként letölthetők.
- Szintetikus PNG OCR-próba: 1 oldal, a képen szereplő szabályszöveg kinyerhető, a forrásoldal megmaradt.
- A végleges worker tartós cache-konfigurációjával a PDF/OCR-próba ismét sikeres.
- A fejlesztési próba-játékokat és hozzájuk tartozó fájlokat célzottan eltávolítottuk.

A tesztfuttató jelenleg egy Starlette figyelmeztetést ad a httpx-alapú TestClient későbbi kivezetéséről. A tesztek sikeresek; az éles API nem használja ezt a tesztklienst.

## Aktuális határok

Az admin és a helyi dokumentumfeldolgozás mellett már elkészült a kérdezőfelület, opcionális forrásos OpenAI-magyarázattal és hangátirattal. A szabálykönyv-fordítás és szemantikus embeddingkészítés még hátravan. Az embeddingmező és a pgvector bővítmény elő van készítve. A kérdezőfelület ellenőrzéseit a `docs/player-validation.md` rögzíti; az admin a `/admin` útvonalon érhető el.

Az ábrákat és a kinyert szöveget meg lehet nézni és a változatot jóvá lehet hagyni; a kinyert szöveg, fordítás és ábrakivágás kézi javítófelülete még nem része ennek a verziónak. Több kép külön dokumentumként kezelhető. A forráshely PDF-oldalsorszám; a nyomtatott oldalszám automatikus felismerése későbbi feladat.

Az OCR és az ábrakinyerés ellenőrzése szintetikus bemeneteken történt. Saját, összetett társasjáték-szabálykönyvekkel külön minőségi próba szükséges.

Az alkalmazás helyi fejlesztői HTTP-elérése `http://localhost:8080`. A Proxmoxra költöztetéshez és a mobilos éles használathoz szükséges HTTPS-konfiguráció a README-ben leírt következő üzemeltetési lépés.

## GPU-feldolgozás és CPU-fallback

- A worker CUDA-s PyTorch 2.14.1 / torchvision 0.29.1 csomagokkal épül; az alapértelmezett választás automatikus.
- Az új PowerShell/Linux indítók valódi CUDA-művelettel ellenőrzik a konténer GPU-képességét. NVIDIA GPU esetén a Compose GPU-kiegészítőjét választják; GPU nélkül CPU-n indítanak.
- A Docling és a RapidOCR torch backend GPU-n fut. GPU hiányában ONNX Runtime CPU OCR-t használunk; GPU-s konverziós hiba után a teljes konverziót egyszer CPU-n újrapróbáljuk.
- A modellek súlyfájljai SHA-256 ellenőrzéssel, atomikus mentéssel kerülnek a tartós cache-be. A wheel csomaggal érkező CPU-modelleket letöltés nélkül használjuk fel.
- Valódi PDF és PNG feldolgozás a futó API-workeren, NVIDIA RTX 3090 GPU-val: sikeres. Mindkét `acceleration.json` eszköze `cuda:0`, OCR backendje `torch`, `cpu_fallback=false`. Az oldalszámok és a PDF két eredeti ábrája megmaradtak.
- Ugyanaz a végleges CUDA-s worker image GPU-átadás nélkül, külön ideiglenes konténerben: a PNG OCR sikeres, automatikusan `cpu` / `onnxruntime` eszközzel és backenddel.
- A GPU-s próba során feltárt RapidOCR Path-konfigurációs hibát és lejárt ModelScope CDN-linket javítottuk.
- 24 backendteszt: sikeres. Az új esetek a CUDA kernelpróbát, GPU-hiányt/hibát, CPU-kényszerítést, egyszeri fallbacket, CPU-hiba továbbadását, sérült cache javítását, checksum-ellenőrzést és atomikus letöltést ellenőrzik.
- Ruff ellenőrzés, PowerShell és Linux shell indítószintaxis: sikeres. A PowerShell indító ténylegesen GPU-val indította az alkalmazást.

## Angol és magyar nyelv

- Az alapértelmezett README angol; a `README.hu.md` magyar. Mindkettő rövid összefoglalóval kezdődik, funkciólistával és bemutatással folytatódik, majd részletes futtatási útmutatót ad.
- Az adminfelület alapértelmezett nyelve angol, magyar böngészőbeállítás mellett is. A belépésnél, az adminfejlécben és a párbeszédablakokban is választható magyar; a választást a böngésző megjegyzi.
- A feliratok, súgók, hozzáférhetőségi címkék, ellenőrző üzenetek, hibák és feldolgozási állapotok két nyelven jelennek meg. Az API az `Accept-Language` fejlécet használja, és stabil állapot- és hibakódokat is visszaad.
- Nyelvváltáskor megmaradnak a kitöltött űrlapok, a szabálykönyv nyelvi adatai és az eredeti szabályszöveg. A már látható hibaüzenetek azonnal nyelvet váltanak. A korábbi magyar feldolgozási állapotok is fordíthatók.
- 29 backendteszt és a TypeScript/Vite build sikeres. Az új tesztek a nyelvválasztást, az API-hibákat, a feldolgozási üzeneteket, a régi állapotokat és az eredeti szöveg megőrzését ellenőrzik.
- Chromiumban a teljes adminfolyamat mindkét nyelven sikeres, JavaScript-hiba nélkül. A 390 × 844-es mobilnézetben nincs vízszintes túlcsordulás. Képernyőképek: `test-results/admin-desktop-en.png`, `admin-mobile-en.png`, `admin-mobile-hu.png`, `admin-preview-hu.png`, `login-hu.png`.
- A végleges API és worker mellett az új PDF- és PNG-próba is sikeres: mindkettő `cuda:0` / `torch` eszközzel futott, CPU-fallback nélkül; a PDF két eredeti ábrája és a forrásoldalak megmaradtak.
- Az ellenőrzésekhez létrehozott saját próba-játékokat és dokumentumokat célzottan eltávolítottuk.


## Frissítés: admin belépés eltávolítása

Az otthoni használathoz az adminfelület és az admin API belépés nélkül érhető el. A közös felső menü Kérdezés és Admin pontja vált a nézetek között. A korábbi belépésre és kijelentkezésre vonatkozó ellenőrzések történeti állapotot írnak le.

Ellenőrzés: frontend build; 4 célzott API-teszt elkülönített adatbázisban (belépés nélküli olvasás/írás, origin-ellenőrzés, szerkesztés és lokalizált hiba); Chromium menüváltás angolul és magyarul, 1366/768/390/320 px méretben. Nem futott OCR, dokumentumfeldolgozás vagy OpenAI-kérés. A gyors böngészőpróba: `e2e/navigation.mjs` (`npm run test:navigation`).
