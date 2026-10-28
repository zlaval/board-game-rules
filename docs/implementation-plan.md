# Architektúra és további tervek

A Szabálytár saját szerveren futó társasjáték-szabálykönyvtár. A jelenlegi működést a [fő README](../README.hu.md), a telepítést a [kiadási útmutató](../release/README.hu.md), a hozzájárulást a [fejlesztési leírás](development.md) mutatja be.

## Összetevők

| Összetevő | Feladat |
| --- | --- |
| React, TypeScript, Vite | Angol/magyar kereső és gyűjteménykezelő |
| Caddy | Statikus felület és azonos eredetű API-közvetítés |
| FastAPI | Könyvtárkezelés, feltöltés, keresés és opcionális AI-funkciók |
| PostgreSQL és pgvector | Metaadatok, verziók, feldolgozási feladatok és keresési index |
| Python worker, Docling, OCR | Háttérfeldolgozás CPU-n vagy támogatott NVIDIA GPU-n |
| Docker-kötetek | Adatbázis, eredeti/feldolgozott dokumentumok és modellcache |
| OpenAI, opcionálisan | Fordítás, embedding, forrásos magyarázat és hangátirat |

Az API és az adatbázis csak a belső konténerhálózaton érhető el; a felhasználók a webes közvetítőhöz csatlakoznak. A kiadási Compose kész képfájlokat használ, a forrás-Compose helyben épít. A tesztfuttatók külön Compose-fájlban vannak.

## Működési szabályok

1. A kereső csak a kiválasztott játék és közzétett szabályverziók adatait adja vissza.
2. Az eredeti dokumentum, a forrásszöveg, az oldalak és az ábrák visszakereshetők maradnak.
3. Az AI csak átadott forrásazonosítókra hivatkozhat; a backend a tagságukat és az ábrák oldalkapcsolatát ellenőrzi.
4. Újrafeldolgozás közben a korábbi közzétett verzió használható. A sikeresen elkészült új verzió automatikusan megjelenik.
5. A worker megújítható foglalással és egyedi tokennel dolgozik; lejárt feldolgozó nem írhatja felül az új eredményt.
6. Az API-kulcs a szerveren marad. API-kulcs nélkül a feldolgozás és a helyi kulcsszavas keresés működik.
7. Nincs bejelentkezés; az alkalmazás megbízható hálózaton használható. Telefonos mikrofonhoz általában külön megbízható HTTPS kell.

## További fejlesztési lehetőségek

- PWA-telepítés és telefonos elfogadási ellenőrzések.
- Beszélgetési kontextus a visszakérdezések értelmezéséhez.
- Kinyert szöveg, fordítás és ábrakivágás kézi javítása.
- Nyomtatott és tényleges PDF-oldalszámok összerendelése.
- Pontosabb kártya-, jelölő- és ábraazonosítás.
- Megszakadt AI-feldolgozás folytatása a befejezett részfeladatoktól.
- Automatizált mentési/visszaállítási eljárás és ellenőrzött ARM64-képfájlok.

Ezek tervezett lehetőségek, nem jelenlegi szolgáltatások vagy vállalt határidők. A keresés és a magyarázat minőségét jogszerűen használható, ismert válaszú referenciaanyagokon kell ellenőrizni.
