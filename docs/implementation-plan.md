# Társasjáték-szabálykereső — implementációs terv

Állapot: tervezett, implementáció még nem indult.

## Cél és kiindulás

Otthoni Proxmoxon futó, elsősorban mobilról használható webalkalmazás. A felhasználó játékot és szabálykészletet választ, írásban vagy hanggal kérdez, majd magyar magyarázatot kap ellenőrizhető forráshelyekkel és a szabálykönyvből származó kapcsolódó ábrákkal. Az admin gépről játékokat és szabályanyagokat kezel.

Elfogadott technológiai irány:

- Frontend: React, TypeScript, Vite; reszponzív felület és PWA-képességek.
- Backend: Python, FastAPI.
- Adatbázis és keresés: PostgreSQL, pgvector, teljes szöveges keresés.
- Dokumentumfeldolgozás: Docling, szükség szerinti OCR.
- Háttérmunka: külön Python worker; kezdetben PostgreSQL-ben tárolt tartós feladatok.
- Fájlok: helyi, tartós fájltároló.
- Külső AI: OpenAI API fordításhoz, embeddingekhez, magyarázathoz és beszédfelismeréshez.
- Üzemeltetés: Linux VM a Proxmoxon, Docker Compose, Caddy, belső HTTPS-elérés.

Tervezési feltételezés: egy háztartás, kevés egyidejű felhasználó. A kapacitás, a játékok száma és a mobilplatformok még nem ismertek. A konkrét csomagverziókat, API-sémákat és modelleket az érintett implementációs szakasz előtt aktuális dokumentáció alapján választjuk ki.

## Kötelező működési szabályok

1. A keresés kizárólag a kiválasztott játék, kiadás és engedélyezett szabályanyagok körében történhet.
2. A feltöltés eredetije megmarad; a fordítás és a feldolgozott változat visszavezethető rá.
3. A keresési darabokhoz fejezet, forráshely és szükség szerint oldalon belüli koordináták tartoznak. Szöveges forrásnál stabil szakaszazonosító helyettesíti az oldalszámot.
4. Az AI csak az átadott források alapján magyarázhat. A korábbi beszélgetés a kérdés értelmezéséhez használható, szabálybizonyítékként nem.
5. Hiányos forrásnál vagy ellentmondásnál a válasz ezt jelzi; nem talál ki szabályt vagy forráshelyet.
6. A hivatkozás és az ábra csak a backend által ellenőrzött, a kiválasztott szabálykészlethez tartozó azonosító lehet.
7. Az új feldolgozási változat adminellenőrzésig nem kereshető. Újrafeldolgozás alatt a korábbi közzétett változat használható marad.
8. Az OpenAI-kulcs a szerveren marad. Az OpenAI-t használó funkciók internetet igényelnek; a releváns adatok külső szolgáltatáshoz kerülnek.

## 1. Követelmények és referenciaanyagok

Teendők:

- Felmérni a Proxmox CPU/RAM/GPU és tárhely lehetőségeit, a várható játékszámot és az Android/iOS használatot.
- Eldönteni az olvasói hozzáférés módját, az admin belépését és az API-költési keretet.
- Kiválasztani 3–5 jogszerűen használható szabályanyagot: szöveges PDF, szkennelt PDF, fotók/képek és szöveg; legyen köztük nem magyar és sok ábrát tartalmazó anyag.
- Összegyűjteni 20–30 ismert válaszú kérdést, beleértve kivételeket, tagadásokat, ábrahivatkozásokat, hiányzó szabályt és kiadások közötti eltérést.
- A kérdésekhez rögzíteni az elvárt szabályrészt, választ és szükség esetén az ábrát.

Eredmény: referenciaanyagok, ellenőrzőkérdések és rögzített MVP-határ.

Kész, ha: a próbaanyagok elérhetők, az elvárt válaszok forráshelyei ismertek, a fő használati és infrastruktúra-feltételezések dokumentáltak.

## 2. Dokumentumfeldolgozási és keresési próba

Ez még a teljes felület és admin megépítése előtt történik.

Teendők:

- Kipróbálni a Doclingot a referenciaanyagokon: olvasási sorrend, OCR, táblázatok, apró ikonok, oldalszámok és képek.
- Megőrizni a strukturált kimenetet, oldalképeket, forráshelyeket és ábrákat.
- Kipróbálni a szabályegységek szerinti darabolást: a példák és kivételek összekapcsolása a szabállyal, fejezeti kontextus megőrzése.
- Összevetni a kulcsszavas, vektoros és egyesített találatokat a referencia-kérdéseken.
- Ellenőrizni, hogy a magyar kérdésekhez az idegen nyelvű eredeti és a magyar fordítás megfelelő találatokat adnak-e.
- Feljegyezni a feldolgozási időt, memóriaigényt és API-felhasználást.
- Dokumentálni, mely hibák javíthatók automatikusan, és hol kell adminjavítás vagy teljes oldalkép.

Eredmény: rövid mérési jegyzőkönyv és indokolt feldolgozási/keresési beállítások.

Kész, ha: a kiválasztott megoldás a forráshelyeket megőrzi, a fő nehézségek és tartalék megoldások ismertek. Elégtelen eredménynél itt módosítjuk az eszközválasztást.

## 3. Architektúra és adatmodell rögzítése

Tervezett fő komponensek: frontend, API, worker, PostgreSQL, fájltároló és HTTPS-belépési pont. Az API és a worker közös alkalmazási logikát használhat, külön folyamatban futva.

Fő adatfogalmak:

- Játék, kiadás, kiegészítő és választható szabálykészlet.
- Forrásdokumentum: típus, nyelv, szerep (alapszabály/kiegészítő/errata), ellenőrzőösszeg, eredeti fájl.
- Feldolgozási változat és állapot; aktív közzétett változat.
- Szabályegység és keresési darab: fejezeti útvonal, eredeti szöveg, magyar fordítás, kapcsolódó szabályegységek.
- Forráshely: PDF-oldal, nyomtatott oldalszám, koordináták vagy stabil szöveges szakaszazonosító.
- Ábra: eredeti kivágás, forráshely, képaláírás, leírás és szabálykapcsolatok.
- Játékonkénti szójegyzék.
- Feldolgozási feladat, próbálkozások, hibák és időzítések.
- Beszélgetés, kérdés, válasz és hivatkozások, ha a megőrzést engedélyezzük.
- Admin és munkamenet; AI-használati események.

Rögzítendő szerződések:

- Feltöltés, feldolgozási állapot, javítás, közzététel, játéklista, keresés, kérdezés, hangfeltöltés, forrás- és képmegnyitás.
- A források elsőbbsége és a konfliktuskezelés; eltérő kiadások nem keverhetők automatikusan.
- Fájlméret- és formátumkorlátok, megőrzési szabályok, törlés és újraindexelés.
- Válaszformátum: magyarázat, bizonyítottsági állapot, forrásazonosítók és képazonosítók.
- Az embeddingmodell és feldolgozási konfiguráció verziózása; ezek változásakor újraindexelési szabály.

Eredmény: architektúra-ábra, adatmodell és API-szerződések.

Kész, ha: a feldolgozási és kérdezési folyamat, a források határa és a változatváltás egyértelmű.

## 4. Projektalap és fejlesztői környezet

Teendők:

- Verziókezelés és projektstruktúra kialakítása a frontendnek, backendnek, workernek és telepítésnek.
- Függőségek verziórögzítése, adatbázis-migrációk és konfigurációs minta.
- Fejlesztői Compose-környezet PostgreSQL-lel, pgvectorral és tartós tárolóval.
- API- és worker-egészségellenőrzés, strukturált naplózás és kérés-/feladatazonosítók.
- Az adminmunkamenetek és jogosultságellenőrzés alapja.
- Automatikus formázási, típusellenőrzési és célzott tesztelési folyamat.

Eredmény: dokumentáltan elindítható üres alkalmazás.

Kész, ha: a frontend eléri az API-t, az API és a worker eléri az adatbázist és a tárolót, a migrációk lefutnak.

## 5. Első végig működő változat: egy játék, szöveg, írott kérdés

Teendők:

- Játék és kiadás felvétele, szöveges szabály feltöltése, feldolgozása és közzététele.
- Szabályegységek tárolása és keresése a kiválasztott játékra szűkítve.
- OpenAI-alapú magyar magyarázat készítése a megtalált részletekből.
- Forrásazonosítók backendellenőrzése és kattintható forrásrészletek.
- Hiányzó bizonyíték, API-hiba és időtúllépés kezelése.
- A kiválasztott játék és szabálykészlet látható megjelenítése a kérdezési felületen.

Eredmény: a feltöltéstől a forrásos válaszig működő teljes folyamat.

Kész, ha: a referencia-kérdések megfelelő forrásrészeket kapnak, hiányzó szabálynál nincs kitalált válasz, más játék szabálya nem kerül a találatokba.

## 6. Tartós háttérfeldolgozás, PDF és OCR

Teendők:

- A feldolgozás bekötése a külön workerbe és tartós feladatokba.
- Feladatfoglalás, időkorlátos foglalás, újrapróbálás és megszakadt munkák visszavétele.
- Megismételhető feldolgozási lépések, duplikált mellékhatások elleni védelem.
- PDF-, szkennelt PDF- és képfeltöltés; képek oldalsorrendje.
- OCR, strukturált kinyerés, forráshelyek és oldalképek megőrzése.
- Állapot és hibák láthatóvá tétele az adminnak.
- Újrafeldolgozás és az új változat elkülönítése az aktív változattól.

Eredmény: újraindítás után is folytatható dokumentumfeldolgozás.

Kész, ha: a worker megszakítása nem veszít el elfogadott feltöltést, a hibás dokumentum javítható vagy újrapróbálható, a közzétett anyag feldolgozás közben is elérhető.

## 7. Magyar fordítás és adminellenőrzés

Teendők:

- Nyelv megadása/felismerése, szabályegységenkénti magyar fordítás.
- Eredeti és fordított szöveg összerendelése stabil azonosítóval.
- Játékonkénti szójegyzék és következetes elnevezések.
- Egymás melletti eredeti/fordítás nézet, javítás és jóváhagyás.
- Javítás után az érintett keresési adatok frissítése, majd ellenőrzött közzététel.
- Számok, tagadások és kivételek célzott ellenőrzése a referenciaanyagokon.

Eredmény: magyarul kereshető és olvasható idegen nyelvű szabályanyag.

Kész, ha: a fordítás megőrzi a szabály jelentését, a javított változat kereshető, a válasz az eredeti forráshelyre hivatkozik.

## 8. Hibrid keresés és válaszminőség finomítása

Teendők:

- A kulcsszavas és vektoros találatok rangsorolásának összehangolása.
- Pontos nevek, magyar ragozás, szinonimák és a szójegyzék kezelése.
- Keresztutalások, kapcsolódó kivételek és szükséges szomszédos szöveg visszakeresése.
- Külön mérni a keresés és a magyarázat hibáit.
- Konfliktusok, kétértelmű kérdések és hiányzó kiegészítők kezelése.
- A saját anyagokon eldönteni, kell-e további találat-újrarangsorolás.
- Kezdetben játékonként szűrt pontos vektorkeresés; közelítő index csak indokolt mérés után.

Eredmény: mérhetően ellenőrzött keresési és válaszadási konfiguráció.

Kész, ha: a referencia-kérdések értékelése dokumentált, a fennmaradó hibák ismertek, a forrás- és játékhatárok ellenőrzése sikeres.

## 9. Eredeti ábrák, kártyák és tokenek

Teendők:

- Ábrák kinyerése vagy eredeti oldalképből kivágása; stabil képazonosítók.
- Képaláírás, környező szöveg és szükség szerinti gépi leírás tárolása.
- Ábrák összekapcsolása a szabályegységekkel és keresési darabokkal.
- Adminjavítás: kivágás és hozzárendelés módosítása.
- Válaszhoz képkiválasztás kizárólag ellenőrzött, tárolt azonosítókból.
- Mobilos nagyítás és az eredeti oldal megnyitása tartalék megoldásként.

Eredmény: a magyarázat mellett a megfelelő eredeti ábra jelenik meg.

Kész, ha: a referencia-kérdésekhez a helyes ábra társul, nem létező vagy más játékhoz tartozó képazonosító nem jeleníthető meg.

## 10. Mobilfelület, hangbevitel és PWA

Teendők:

- Játékválasztás, kérdezés, válasz, hivatkozások és képek mobilos elrendezése.
- Mikrofon gomb, rögzítési állapot, hang elküldése és beszédfelismerés.
- A felismert szöveg javítása a kérdés elküldése előtt.
- Mikrofonengedély elutasításának, megszakadt rögzítésnek és feltöltési hibának a kezelése.
- Kezdőképernyőre telepítés és alkalmazásikon; a támogatott eszközökön ellenőrizve.
- Helyi HTTPS korai kipróbálása valódi mobilon, legkésőbb a hangbevitel megkezdésekor.
- Offline/AI-elérhetetlenségi állapot: a helyi tartalom elérhetősége és az AI-funkciók korlátja látható legyen. Nem ígérünk teljes offline AI-működést.

Eredmény: telefonról kényelmesen használható írott és hangos kérdezés.

Kész, ha: valódi céltelefonon működik a rögzítés, szövegjavítás, kérdezés, képnagyítás és forrásmegnyitás.

## 11. Proxmox-telepítés és üzemeltetés

Teendők:

- Linux VM és éles Compose-konfiguráció létrehozása, erőforráskorlátokkal.
- Caddy, belső névfeloldás és az eszközök által megbízható HTTPS.
- Adatbázis, eredeti fájlok, feldolgozott állományok és szükséges konfiguráció tartós tárolása.
- Szerveroldali API-kulcs és admin-hozzáférés; adatbázis és worker belső hálózaton.
- AI-felhasználás mérése, alkalmazásszintű költési korlát és párhuzamossági korlátozás.
- Naplókban titkok és szükségtelen dokumentum-/hangtartalom kerülése.
- Verziózott frissítés, migráció, visszaállási eljárás.
- Mentés és tényleges visszaállítási próba; az adatbázis és fájlok közötti összhang ellenőrzésével.

Eredmény: helyi hálózaton működő és helyreállítható telepítés.

Kész, ha: VM-újraindítás után elindul, a célkészülékekről elérhető, az adatállományok egy mentésből visszaállíthatók.

## 12. Teljes MVP átvétele

Az MVP minden eredetileg kért bemenetet és fő funkciót tartalmaz: PDF, szöveg, képek, OCR, fordítás, írott és hangos kérdés, játék-/kiadásszűrés, forrásos magyarázat, eredeti ábrák, adminfelület és helyi telepítés.

Átvételi ellenőrzések:

- Referencia-kérdések: helyes szabályrész, magyarázat, hivatkozás és szükséges ábra.
- Ugyanaz a kérdés több játékban és kiadásban: megfelelő elkülönítés.
- Hiányzó, ellentmondó vagy hibás szabályanyag: látható korlát és javíthatóság.
- Worker-, API- és internetkimaradás: értelmezhető állapot és helyreállítás.
- Új feltöltés/javítás/újrafeldolgozás: a jóváhagyott változat váltása következetes.
- Valódi mobil, tablet és számítógép: fő folyamatok ellenőrzése.
- Adminjogosultság, szerveroldali kulcskezelés, költési korlát és mentés-visszaállítás.

Eredmény: otthoni használatra átadott első teljes verzió, ismert korlátokkal és használati/üzemeltetési leírással.

## Függőségek és munkasorrend

Elsődleges sorrend: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.

A HTTPS-es mobilpróba előrehozható a projektalap után. A telepítés előkészítése, a mobilos felület és a naplózás fokozatosan történjen; ezek nem kizárólag a késői szakaszokban készülnek.

A 2. szakasz dönti el, milyen eszközökkel és konfigurációval megyünk tovább. Az 5. szakasz az első használható részverzió, nem a teljes MVP. A teljes eredeti igény a 12. szakaszban teljesül.

## Későbbi, az MVP-n kívüli bővítések

- Folyamatos hangbeszélgetés és válaszfelolvasás.
- Teljesen helyi beszédfelismerés, embedding és válaszadó modell.
- Több háztartás/felhasználói csoport, távoli elérés.
- Külön objektumtároló vagy dedikált kereső, ha a mérések indokolják.
- Haladó vizuális keresés közvetlenül képi embeddingekkel.
