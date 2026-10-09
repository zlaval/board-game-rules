# Szabálytár kiadás

[English](README.md) · [Magyar](README.hu.md)

## Gyorsindítás

Docker és Compose v2 szükséges, Linux-konténerekkel, **x86-64 / AMD64** gépen. Windowson Docker Desktop és WSL2 használható. Az alapfeldolgozó CPU-val működik; nem szükséges GPU, forráskód, Node.js vagy telepített Python.

1. Csomagold ki a `ruleshelf-0.1.0.zip` fájlt egy saját mappába. A ZIP tartalmazza a kitöltendő `.env` sablont. Ha Gitből használod ezt a mappát, előbb másold a `.env.example` fájlt `.env` néven (`cp .env.example .env` Linux/macOS alatt, `Copy-Item .env.example .env` PowerShellben).
2. A `.env` fájlban töltsd ki a `POSTGRES_PASSWORD` értékét saját, legalább 32 karakteres véletlen jelszóval; csak `A-Z`, `a-z`, `0-9`, `_` és `-` karaktereket használj. Opcionálisan add meg **a saját** `OPENAI_API_KEY` kulcsodat. Üres kulccsal is működik a helyi kulcsszavas keresés és a dokumentumok kinyerése.
3. Nyiss terminált a kicsomagolt mappában, és indítsd el:

```sh
docker compose up -d
```

Nyisd meg a [Szabály keresése](http://localhost:8080) vagy a [Szabálykönyv feldolgozása](http://localhost:8080/admin) felületet. A Docker letölti a verziózott, nyilvános image-eket a Docker Hubról. Az első PDF-/képfeldolgozás további modelleket tölthet le. A sikeresen feldolgozott szabályok automatikusan közzétételre kerülnek.

A csomag `.env` fájlja nem tartalmaz API-kulcsot vagy használható adatbázisjelszót. A kitöltött fájlt kezeld titokként. Az alkalmazás nem kér belépést: aki eléri, kezelheti a gyűjteményt. Alapból csak a Docker gépén érhető el. Megbízható otthoni hálózathoz állítsd be az `APP_BIND_ADDRESS=0.0.0.0` értéket, futtasd újra a `docker compose up -d` parancsot, majd használd a `http://<gép-ip>:8080` címet. A mikrofonhoz localhost vagy megbízható HTTPS kell.

## Beállítások és adatok

A `.env` automatikusan beolvasásra kerül. Ha a 8080-as port foglalt, módosítsd az `APP_PORT` értékét. Az OpenAI-magyarázatokhoz, fordításhoz, szemantikus kereséshez és beszédfelismeréshez saját, érvényes API-kulcs kell; ezek szolgáltatói költséggel járhatnak. Kulcs nélkül a helyi szabálykeresés és kinyerés használható.

A névvel rendelkező volume-ok tárolják az adatbázist (`database`), a feltöltött és feldolgozott fájlokat (`documents`), valamint a modelleket (`models`). Normál leállítás után megmaradnak. Őrizd meg a `.env` fájlt az adatokkal együtt, és a meglévő adatbázis jelszavát ne változtasd meg. Frissítés előtt mentsd az adatbázist `pg_dump` segítségével, a documents volume-ot és a `.env` fájlt; a modellek újra letölthetők. Frissítéskor tartsd meg a mappát és a Compose-projekt nevét, hogy ugyanazokat a volume-okat használd.

```sh
# Állapot és feldolgozási naplók
docker compose ps
docker compose logs -f api worker

# Leállítás a gyűjtemény megőrzésével
docker compose down

# Újraindítás
docker compose up -d
```

A `docker compose down -v` törli a gyűjteményt és a modelleket tároló volume-okat.

## Frissítés

Mentés után cseréld a kiadási fájlokat az új ZIP tartalmára, **a saját `.env` fájlodat megőrizve**. A `.env` `RULESHELF_VERSION` értékét állítsd az új verzióra, majd:

```sh
docker compose pull
docker compose up -d
```

Az adatbázis-migrációk automatikusan lefutnak. A verziótagek egy konkrét kiadást választanak; a Compose egyszerre frissíti a három alkalmazásszolgáltatást. Frissítés előtt olvasd el az új kiadás megjegyzéseit.

## Opcionális NVIDIA GPU

Támogatott NVIDIA-driverrel és Docker GPU-hozzáféréssel (Linuxon NVIDIA Container Toolkit is kell):

```sh
docker compose -f compose.yaml -f compose.gpu.yaml up -d
```

Ez a nagyobb CUDA-feldolgozó image-et tölti le. A későbbi Compose-parancsoknál is add meg mindkét fájlt a GPU-hozzáférés megtartásához. AMD/Intel GPU-gyorsítás nincs a csomagban.

## Nyilvános image-ek

| Összetevő | 0.1.0 verzió |
| --- | --- |
| API | `zalerix/ruleshelf-api:0.1.0` |
| Webes felület | `zalerix/ruleshelf-frontend:0.1.0` |
| CPU-feldolgozó (alap) | `zalerix/ruleshelf-worker:0.1.0-cpu` |
| NVIDIA-feldolgozó | `zalerix/ruleshelf-worker:0.1.0-cuda` |

A jelenlegi image-ek `linux/amd64` platformra készülnek; natív ARM64-támogatás ebben a kiadásban nincs. Az adatbázis image-e `pgvector/pgvector:pg17`, a Compose-ban digesttel rögzítve.
