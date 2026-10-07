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

Ez az admin és a helyi dokumentumfeldolgozás első változata. A fordítás, szemantikus embeddingkészítés, forrásos AI-kérdezés és hangbevitel a következő fejlesztési szakaszokhoz tartozik. Az embeddingmező és a pgvector bővítmény elő van készítve.

Az ábrákat és a kinyert szöveget meg lehet nézni és a változatot jóvá lehet hagyni; a kinyert szöveg, fordítás és ábrakivágás kézi javítófelülete még nem része ennek a verziónak. Több kép külön dokumentumként kezelhető. A forráshely PDF-oldalsorszám; a nyomtatott oldalszám automatikus felismerése későbbi feladat.

Az OCR és az ábrakinyerés ellenőrzése szintetikus bemeneteken történt. Saját, összetett társasjáték-szabálykönyvekkel külön minőségi próba szükséges.

Az alkalmazás helyi fejlesztői HTTP-elérése `http://localhost:8080`. A Proxmoxra költöztetéshez és a mobilos éles használathoz szükséges HTTPS-konfiguráció a README-ben leírt következő üzemeltetési lépés.

