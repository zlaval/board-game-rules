# A Szabálytár telepítése

[English](README.md) · [Magyar](README.hu.md)

## Gyorsindítás

Ezzel a csomaggal az előre elkészített Docker-képfájlokból indíthatod el a Szabálytárat. Egy **x86-64 (AMD64) architektúrájú számítógépre**, Linux-konténereket futtató Dockerre és a Compose v2-re van szükséged. Windows alatt a Docker Desktop WSL2-alapú működését használhatod. Az alapértelmezett feldolgozó a gép processzorán fut, ezért videokártya nem szükséges. A forráskódot sem kell lefordítanod, és Node.js-t vagy Pythont sem kell telepítened.

1. Csomagold ki a `ruleshelf-0.1.0.zip` fájlt egy külön mappába. Ebben megtalálod a kitöltendő `.env` fájlt is. Ha a projekt Git-tárolójából másoltad a `release` mappát, előbb készíts másolatot a `.env.example` fájlról `.env` néven. Linuxon és macOS-en erre a `cp .env.example .env`, PowerShellben a `Copy-Item .env.example .env` parancs használható.
2. Nyisd meg a `.env` fájlt. A `POSTGRES_PASSWORD` mezőbe írj egy saját, véletlenszerű jelszót, amely legalább 32 karakterből áll. Csak az angol ábécé betűit, számokat, aláhúzást (`_`) és kötőjelet (`-`) használj. Az `OPENAI_API_KEY` mezőbe a saját OpenAI-kulcsodat írhatod. Ha ezt üresen hagyod, a dokumentumok feldolgozása és a helyi kulcsszavas keresés akkor is működik.
3. Nyiss egy terminált a kicsomagolt mappában, majd futtasd az alábbi parancsot:

```sh
docker compose up -d
```

A Docker letölti a kiválasztott kiadáshoz tartozó nyilvános képfájlokat a Docker Hubról, és elindítja az alkalmazást. Ezután megnyithatod a [Szabály keresése](http://localhost:8080) vagy a [Szabálykönyv feldolgozása](http://localhost:8080/admin) felületet.

Az első PDF vagy kép feldolgozásakor további modellek töltődhetnek le. Ezeket az alkalmazás megőrzi a későbbi használathoz. A sikeresen feldolgozott szabályok automatikusan megjelennek a keresőben, külön jóváhagyásra nincs szükség.

## Saját beállítások

A kiadási csomag `.env` fájljában nincs API-kulcs vagy előre beállított adatbázisjelszó. Az adatbázisjelszót neked kell megadnod, az API-kulcs csak az OpenAI-funkciókhoz szükséges. A kitöltött fájlt őrizd meg, és ne oszd meg másokkal.

Az alkalmazás automatikusan beolvassa a `.env` beállításait. Ha a gépeden a 8080-as portot már más szolgáltatás használja, az `APP_PORT` mezőben adj meg egy másik portot. A beállítások módosítása után futtasd újra a `docker compose up -d` parancsot.

Az OpenAI-magyarázatokhoz, a fordításhoz, a jelentésalapú kereséshez és a beszédfelismeréshez saját, érvényes API-kulcs szükséges. Ezek a szolgáltatások költséggel járhatnak. API-kulcs nélkül az eredeti szabályok feldolgozása és helyi keresése használható.

### Elérés az otthoni hálózatról

Alapértelmezetten csak azon a gépen nyithatod meg az alkalmazást, amelyen fut. Ha az otthoni hálózat más eszközeiről is szeretnéd használni, állítsd a `.env` fájl `APP_BIND_ADDRESS` értékét `0.0.0.0`-ra. Futtasd újra a `docker compose up -d` parancsot, majd a többi eszközön nyisd meg a `http://<gép-ip>:8080` címet. Ha megváltoztattad a portot, a címben is azt használd.

A Szabálytár nem kér bejelentkezést. A gyűjteményt mindenki kezelheti, aki eléri az alkalmazást, ezért ezt a beállítást megbízható otthoni hálózaton használd. A mikrofon használatához `localhost` cím vagy megbízható HTTPS-kapcsolat kell.

## Az adatok megőrzése

Az alkalmazás az adatokat három külön Docker-kötetben tárolja:

| Kötet | Mit tárol? |
| --- | --- |
| `database` | A PostgreSQL adatbázisát. |
| `documents` | A feltöltött dokumentumokat és a feldolgozás eredményét. |
| `models` | A letöltött feldolgozómodelleket. |

Ezek a kötetek normál leállítás után is megmaradnak. A meglévő adatbázis jelszavát ne változtasd meg, és a `.env` fájlt őrizd meg az adatokkal együtt.

Frissítés előtt készíts mentést az adatbázisról a `pg_dump` segítségével, valamint a `documents` kötetről és a `.env` fájlról. A modellfájlokat nem feltétlenül kell mentened, mert újra letölthetők. Frissítéskor tartsd meg a telepítés mappáját és a Compose-projekt nevét, hogy az alkalmazás továbbra is ugyanazokat a köteteket használja.

Az állapot és a naplók megtekintéséhez, illetve a leállításhoz az alábbi parancsokat használhatod:

```sh
# A szolgáltatások állapota és a feldolgozás naplói
docker compose ps
docker compose logs -f api worker

# Leállítás a gyűjtemény megőrzésével
docker compose down

# Újraindítás
docker compose up -d
```

A `docker compose down -v` parancs a köteteket is törli, így a gyűjtemény és a letöltött modellek elvesznek.

## Frissítés új verzióra

Frissítés előtt olvasd el az új kiadáshoz tartozó megjegyzéseket, és készíts biztonsági mentést. Ezután másold az új ZIP-fájl tartalmát a meglévő telepítés mappájába. **A saját, kitöltött `.env` fájlodat tartsd meg, ne írd felül a csomag üres sablonjával.**

A `.env` fájlban állítsd a `RULESHELF_VERSION` értékét az új verziószámra, majd futtasd az alábbi parancsokat:

```sh
docker compose pull
docker compose up -d
```

A Compose letölti és elindítja az API, a webes felület és a feldolgozó új változatát. A szükséges adatbázis-módosítások automatikusan lefutnak. Mindhárom szolgáltatásnál ugyanahhoz a kiadáshoz tartozó verziót kell használni. A csomag beállításai erről gondoskodnak.

## Feldolgozás NVIDIA-videokártyával

Ha támogatott NVIDIA-videokártyád van, és a Docker hozzáfér, a feldolgozáshoz azt is használhatod. Ehhez megfelelő illesztőprogram szükséges, Linuxon pedig az NVIDIA Container Toolkit is. Az indításhoz add meg a GPU-hoz tartozó kiegészítő beállításokat:

```sh
docker compose -f compose.yaml -f compose.gpu.yaml up -d
```

Ez a parancs a CUDA-t támogató, nagyobb méretű feldolgozó képfájlját tölti le. Ha ezt a változatot használod, a későbbi Compose-parancsoknál is add meg mindkét fájlt, hogy a videokártya elérhető maradjon. A csomag AMD- és Intel-videokártyákhoz nem tartalmaz gyorsítást.

## A kiadáshoz tartozó Docker-képfájlok

| Összetevő | A 0.1.0-s kiadás képfájlja |
| --- | --- |
| API | `zalerix/ruleshelf-api:0.1.0` |
| Webes felület | `zalerix/ruleshelf-frontend:0.1.0` |
| Feldolgozó videokártya nélkül | `zalerix/ruleshelf-worker:0.1.0-cpu` |
| Feldolgozó NVIDIA-videokártyához | `zalerix/ruleshelf-worker:0.1.0-cuda` |

Ez a kiadás `linux/amd64` platformra készült. Natív ARM64-támogatást nem tartalmaz. Az adatbázishoz a `pgvector/pgvector:pg17` képfájlt használja, amelynek pontos változatát a Compose-fájl egyedi tartalomazonosítóval rögzíti.
