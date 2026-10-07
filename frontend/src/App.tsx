import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api, ApiError } from "./api";
import type { Document, Game, Preview } from "./api";

type IconName =
  | "books"
  | "plus"
  | "search"
  | "upload"
  | "file"
  | "arrow"
  | "check"
  | "close"
  | "logout"
  | "edit"
  | "image"
  | "refresh"
  | "lock";
const paths: Record<IconName, ReactNode> = {
  books: (
    <>
      <path d="M4 4h6v16H4zM14 4h6v16h-6z" />
      <path d="M7 8h1m9 0h1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8m-8 4h6" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  logout: (
    <>
      <path d="M10 4H4v16h6m-1-8h12m-4-4 4 4-4 4" />
    </>
  ),
  edit: (
    <>
      <path d="m15 4 5 5M4 20l1-6L16 3l5 5L10 19z" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1" />
      <path d="m3 17 5-5 4 4 4-6 5 7" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" />
    </>
  ),
};
function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
const labels: Record<string, string> = {
  uploaded: "Feltöltve",
  queued: "Sorban áll",
  processing: "Feldolgozás alatt",
  ready: "Ellenőrzésre kész",
  published: "Közzétéve",
  failed: "Sikertelen",
};
const languageName: Record<string, string> = {
  hu: "Magyar",
  en: "Angol",
  de: "Német",
  fr: "Francia",
  es: "Spanyol",
  it: "Olasz",
};
function LanguageOptions() {
  return (
    <>
      {Object.entries(languageName).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </>
  );
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Váratlan hiba történt.";
}
function fileSize(size: number) {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}
function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status}`}>
      <span className="status-dot" />
      {labels[status] ?? status}
    </span>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="modal-header">
        <div>
          <span className="eyebrow">SZABÁLYTÁR / ADMIN</span>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Bezárás">
          <Icon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

function GameForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Game | null;
  onClose: () => void;
  onSaved: (game: Game) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const game = await api<Game>(
        initial ? `/games/${initial.id}` : "/games",
        {
          method: initial ? "PATCH" : "POST",
          body: JSON.stringify(Object.fromEntries(data)),
        },
      );
      onSaved(game);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial ? "Játék szerkesztése" : "Új játék a polcon"}
      onClose={onClose}
    >
      <p className="modal-intro">
        Először add meg a játék adatait. A szabálykönyvet a következő lépésben
        töltheted fel.
      </p>
      <form onSubmit={save}>
        <label>
          A játék neve <span>*</span>
          <input
            name="title"
            defaultValue={initial?.title}
            placeholder="Például: Az ötödik évszak"
            required
            maxLength={150}
            autoFocus
          />
        </label>
        <div className="form-grid">
          <label>
            Kiadás
            <input
              name="edition"
              defaultValue={initial?.edition}
              placeholder="Például: 2024, magyar kiadás"
              maxLength={150}
            />
          </label>
          <label>
            Szabály nyelve
            <select name="language" defaultValue={initial?.language ?? "hu"}>
              <LanguageOptions />
            </select>
          </label>
        </div>
        <label>
          Rövid leírás
          <textarea
            name="description"
            defaultValue={initial?.description}
            placeholder="Opcionális megjegyzés a játékhoz vagy a kiadáshoz."
            rows={3}
            maxLength={3000}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Mégse
          </button>
          <button className="button primary" disabled={busy}>
            <Icon name={initial ? "check" : "plus"} />
            {busy
              ? "Mentés…"
              : initial
                ? "Változtatások mentése"
                : "Játék hozzáadása"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function UploadForm({
  game,
  onClose,
  onSaved,
}: {
  game: Game;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [autoProcess, setAutoProcess] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const language = String(form.get("language"));
    let completed = 0;
    try {
      if (mode === "file" && !files.length)
        throw new Error("Válassz legalább egy fájlt.");
      const work = mode === "file" ? files : [null];
      for (const file of work) {
        setMessage(file ? `Feltöltés: ${file.name}` : "Szöveg mentése…");
        let document: { id: string };
        if (file) {
          if (file.size > 50 * 1024 * 1024)
            throw new Error(`${file.name}: a fájl legfeljebb 50 MB lehet.`);
          const data = new FormData();
          data.set("file", file);
          data.set("language", language);
          document = await api(`/games/${game.id}/documents`, {
            method: "POST",
            body: data,
          });
        } else {
          document = await api(`/games/${game.id}/documents/text`, {
            method: "POST",
            body: JSON.stringify({
              title: form.get("title"),
              content: form.get("content"),
              language,
            }),
          });
        }
        completed++;
        if (autoProcess)
          await api(`/documents/${document.id}/process`, { method: "POST" });
      }
      onSaved();
    } catch (e) {
      setError(
        `${completed ? `${completed} dokumentum már mentve. ` : ""}${errorMessage(e)}`,
      );
      setMessage("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Szabályanyag feltöltése" onClose={onClose}>
      <p className="modal-intro">
        A kiválasztott játék: <strong>{game.title}</strong>
      </p>
      <div className="tabs">
        <button
          className={mode === "file" ? "active" : ""}
          disabled={busy}
          onClick={() => setMode("file")}
        >
          <Icon name="upload" />
          Fájlok
        </button>
        <button
          className={mode === "text" ? "active" : ""}
          disabled={busy}
          onClick={() => setMode("text")}
        >
          <Icon name="file" />
          Szöveg beillesztése
        </button>
      </div>
      <form onSubmit={submit}>
        {mode === "file" ? (
          <>
            <input
              ref={input}
              className="visually-hidden"
              type="file"
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
              multiple
              onChange={(event) =>
                setFiles(Array.from(event.target.files ?? []))
              }
            />
            <button
              type="button"
              className={`dropzone ${drag ? "dragging" : ""}`}
              disabled={busy}
              onClick={() => input.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDrag(false);
                if (!busy) setFiles(Array.from(event.dataTransfer.files));
              }}
            >
              <span className="upload-icon">
                <Icon name="upload" />
              </span>
              <strong>Húzd ide a szabálykönyvet</strong>
              <span>vagy kattints a fájlok kiválasztásához</span>
              <small>
                PDF, TXT, Markdown, PNG, JPG, WebP · legfeljebb 50 MB/fájl
              </small>
            </button>
            {files.length > 0 && (
              <ul className="selected-files">
                {files.map((file, i) => (
                  <li key={`${file.name}-${i}`}>
                    <Icon name="file" />
                    <span>{file.name}</span>
                    <small>{fileSize(file.size)}</small>
                  </li>
                ))}
              </ul>
            )}
            <p className="field-note">
              Több kép esetén minden kép külön dokumentumként kerül be. A
              feldolgozó a PDF-ek és képek szövegét is kinyeri.
            </p>
          </>
        ) : (
          <>
            <label>
              Dokumentum neve
              <input
                name="title"
                placeholder="Alapszabály"
                defaultValue="Alapszabály"
                required
                maxLength={200}
              />
            </label>
            <label>
              Szabályszöveg
              <textarea
                name="content"
                placeholder={
                  "# Előkészületek\n\nIlleszd be a játék szabályait…"
                }
                rows={9}
                required
                maxLength={2_000_000}
              />
            </label>
            <p className="field-note">
              A Markdown-címek (#, ##) segítenek a szabályrészek tagolásában.
            </p>
          </>
        )}
        <label>
          A dokumentum nyelve
          <select name="language" defaultValue={game.language}>
            <LanguageOptions />
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={autoProcess}
            onChange={(event) => setAutoProcess(event.target.checked)}
            disabled={busy}
          />
          <span>Feldolgozás indítása a feltöltés után</span>
        </label>
        {message && (
          <p className="field-note" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Mégse
          </button>
          <button className="button primary" disabled={busy}>
            <Icon name="upload" />
            {busy
              ? "Feltöltés…"
              : autoProcess
                ? "Feltöltés és feldolgozás"
                : "Feltöltés"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function PreviewModal({
  document,
  onClose,
  onPublished,
}: {
  document: Document;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [data, setData] = useState<Preview | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<Preview>(
      `/versions/${document.version_id}/preview?q=${encodeURIComponent(search)}&offset=${offset}`,
      { signal: controller.signal },
    )
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [document.version_id, search, offset]);
  async function publish() {
    setBusy(true);
    setError("");
    try {
      await api(`/versions/${document.version_id}/publish`, { method: "POST" });
      onPublished();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Feldolgozott szabályanyag" onClose={onClose} wide>
      <div className="preview-title">
        <Icon name="file" />
        <span>{document.filename}</span>
        <Badge status={document.status} />
      </div>
      <form
        className="preview-search"
        onSubmit={(e) => {
          e.preventDefault();
          setOffset(0);
          setSearch(query);
        }}
      >
        <Icon name="search" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Keresés a kinyert szövegben…"
          aria-label="Keresés a feldolgozott dokumentumban"
        />
        <button className="button secondary">Keresés</button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="preview-body" aria-busy={loading}>
        {loading ? (
          <p className="loading">Szabályrészek betöltése…</p>
        ) : (
          <>
            <div className="preview-summary">
              <span>{data?.total_chunks ?? 0} szabályrész</span>
              <span>{data?.assets.length ?? 0} eredeti ábra</span>
              <span>
                {search ? "Kulcsszavas találatok" : "Eredeti sorrend"}
              </span>
            </div>
            {data?.chunks.length === 0 && (
              <p className="empty-text">
                Nincs találat. Próbálj másik kifejezést.
              </p>
            )}
            {data?.chunks.map((chunk) => (
              <article className="chunk" key={chunk.id}>
                <div className="chunk-meta">
                  <strong>{chunk.heading}</strong>
                  <span>
                    {chunk.page
                      ? `${chunk.page}. PDF-oldal`
                      : `${chunk.ordinal + 1}. szabályrész`}
                  </span>
                </div>
                <p>{chunk.content}</p>
              </article>
            ))}
            <div className="pagination">
              <button
                className="button secondary"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                Előző
              </button>
              <span>
                {offset + 1}–{offset + (data?.chunks.length ?? 0)}
              </span>
              <button
                className="button secondary"
                disabled={(data?.chunks.length ?? 0) < 50}
                onClick={() => setOffset(offset + 50)}
              >
                Következő
              </button>
            </div>
            {!!data?.assets.length && (
              <section className="asset-grid">
                {data.assets.map((asset) => (
                  <a
                    key={asset.id}
                    className="asset-card"
                    href={`/api/assets/${asset.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={`/api/assets/${asset.id}`}
                      alt={asset.caption || "Eredeti ábra a szabálykönyvből"}
                      loading="lazy"
                    />
                    <span>
                      {asset.caption || "Eredeti ábra"}
                      {asset.page ? ` · ${asset.page}. oldal` : ""}
                    </span>
                  </a>
                ))}
              </section>
            )}
          </>
        )}
      </div>
      <footer className="modal-footer">
        <a
          className="button secondary"
          href={`/api/documents/${document.id}/source`}
        >
          <Icon name="file" />
          Eredeti letöltése
        </a>
        {document.status === "ready" && (
          <button
            className="button primary"
            onClick={publish}
            disabled={busy || loading}
          >
            <Icon name="check" />
            {busy ? "Közzététel…" : "Ellenőriztem, közzéteszem"}
          </button>
        )}
      </footer>
    </Modal>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      onLogin();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-art">
        <div className="brand">
          <Icon name="books" />
          <span>
            Szabálytár<span className="brand-dot">.</span>
          </span>
        </div>
        <span className="eyebrow">MINDEN JÓ JÁTÉK ITT KEZDŐDIK</span>
        <h1>
          A szabályoknak
          <br />
          is jár egy
          <br />
          <em>saját polc.</em>
        </h1>
        <p>
          Rendezd egy helyre a társasjátékaid szabálykönyveit, hogy játék közben
          minden válasz kéznél legyen.
        </p>
        <div className="book-art" aria-hidden="true">
          <span>SZABÁLYOK</span>
          <span>EGY JÓ KÖR</span>
          <span>JÁTÉKTÁR</span>
          <span>KEZDŐDHET!</span>
        </div>
      </div>
      <div className="login-panel">
        <div className="login-form">
          <span className="login-lock">
            <Icon name="lock" />
          </span>
          <span className="eyebrow">ADMINFELÜLET</span>
          <h2>Üdv a Szabálytárban</h2>
          <p>Jelentkezz be a gyűjteményed kezeléséhez.</p>
          <form onSubmit={submit}>
            <label>
              Felhasználónév
              <input
                name="username"
                autoComplete="username"
                defaultValue="admin"
                required
              />
            </label>
            <label>
              Jelszó
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "Belépés…" : "Belépés"}
              <Icon name="arrow" />
            </button>
          </form>
          <small>
            A belépési adatokat a telepítéskor létrehozott
            <br />
            <code>infra/.env</code> fájlban találod.
          </small>
        </div>
        <span className="login-footnote">Saját gyűjtemény. Saját otthon.</span>
      </div>
    </main>
  );
}

export default function App() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [games, setGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [docLoading, setDocLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [upload, setUpload] = useState(false);
  const [preview, setPreview] = useState<Document | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const game = games.find((g) => g.id === selected);
  const refresh = () => setRevision((v) => v + 1);
  function handleError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) setAuth("out");
    else setError(errorMessage(e));
  }
  useEffect(() => {
    api("/auth/me")
      .then(() => setAuth("in"))
      .catch(() => setAuth("out"));
  }, []);
  useEffect(() => {
    if (auth !== "in") return;
    const controller = new AbortController();
    setLoading(true);
    api<Game[]>("/games", { signal: controller.signal })
      .then(setGames)
      .catch((e) => {
        if (!controller.signal.aborted) handleError(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth, revision]);
  useEffect(() => {
    if (!selected || auth !== "in") {
      setDocuments([]);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setDocuments([]);
    setDocLoading(true);
    async function fetchDocuments() {
      try {
        const docs = await api<Document[]>(`/games/${selected}/documents`, {
          signal: controller.signal,
        });
        if (active) setDocuments(docs);
      } catch (e) {
        if (active && !controller.signal.aborted) handleError(e);
      } finally {
        if (active) setDocLoading(false);
      }
    }
    void fetchDocuments();
    const timer = window.setInterval(() => void fetchDocuments(), 2500);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [selected, auth, revision]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  async function processDocument(doc: Document) {
    setPending(doc.id);
    setError("");
    try {
      await api(`/documents/${doc.id}/process`, { method: "POST" });
      refresh();
      setNotice("A feldolgozás sorba állítva.");
    } catch (e) {
      handleError(e);
    } finally {
      setPending(null);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setAuth("out");
      setGames([]);
      setSelected(null);
    } catch (e) {
      handleError(e);
    }
  }
  if (auth === "loading")
    return (
      <div className="startup">
        <Icon name="books" />
        <p>Szabálytár betöltése…</p>
      </div>
    );
  if (auth === "out") return <Login onLogin={() => setAuth("in")} />;
  const filtered = games.filter((g) =>
    `${g.title} ${g.edition}`
      .toLocaleLowerCase("hu")
      .includes(filter.toLocaleLowerCase("hu")),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Icon name="books" />
          <span>
            Szabálytár<span className="brand-dot">.</span>
          </span>
        </div>
        <span className="sidebar-caption">A TE JÁTÉKPOLCOD</span>
        <button className="nav-item active" onClick={() => setSelected(null)}>
          <Icon name="books" />
          Játékgyűjtemény<span>{games.length}</span>
        </button>
        <div className="sidebar-note">
          <span className="note-star">✳</span>
          <p>
            Kevesebb lapozás.
            <br />
            <strong>Több játék.</strong>
          </p>
          <small>A jó válasz a jó szabálykönyvvel kezdődik.</small>
        </div>
        <div className="sidebar-bottom">
          <div className="admin-profile">
            <span>A</span>
            <div>
              <strong>Adminisztrátor</strong>
              <small>Gyűjtemény kezelése</small>
            </div>
          </div>
          <button onClick={logout} className="logout">
            <Icon name="logout" />
            Kijelentkezés
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <span>GYŰJTEMÉNY / {game ? "JÁTÉK ADATLAPJA" : "ÁTTEKINTÉS"}</span>
          <span className="local-indicator">
            <i />
            Saját szabálytár
          </span>
        </header>
        <div className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">MINDEN SZABÁLYNAK MEGVAN A HELYE</span>
              <h1>{game ? game.title : "A játékpolcod"}</h1>
              <p>
                {game
                  ? game.edition || "Szabályanyagok és feldolgozás"
                  : "Töltsd fel a szabálykönyveket. Mi segítünk rendszerezni őket."}
              </p>
            </div>
            <button className="button primary" onClick={() => setForm("new")}>
              <Icon name="plus" />
              Új játék
            </button>
          </div>
          {error && (
            <div className="error global-error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Hibaüzenet bezárása"
                onClick={() => setError("")}
              >
                <Icon name="close" />
              </button>
            </div>
          )}
          {!game ? (
            <>
              <div className="stats">
                <div>
                  <span>JÁTÉK A POLCON</span>
                  <strong>{games.length.toString().padStart(2, "0")}</strong>
                  <Icon name="books" />
                </div>
                <div>
                  <span>SZABÁLYDOKUMENTUM</span>
                  <strong>
                    {games
                      .reduce((n, g) => n + g.document_count, 0)
                      .toString()
                      .padStart(2, "0")}
                  </strong>
                  <Icon name="file" />
                </div>
                <div>
                  <span>KÖZZÉTETT SZABÁLYANYAG</span>
                  <strong>
                    {games
                      .reduce((n, g) => n + g.published_count, 0)
                      .toString()
                      .padStart(2, "0")}
                  </strong>
                  <Icon name="check" />
                </div>
              </div>
              <div className="collection-toolbar">
                <h2>
                  Játékgyűjtemény <span>{games.length}</span>
                </h2>
                <div className="search-field">
                  <Icon name="search" />
                  <input
                    placeholder="Játék keresése…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Játék keresése"
                  />
                </div>
              </div>
              {loading && !games.length ? (
                <p className="loading">Gyűjtemény betöltése…</p>
              ) : games.length === 0 ? (
                <section className="empty-state">
                  <div className="empty-books" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="eyebrow">ITT KEZDŐDIK A GYŰJTEMÉNYED</span>
                  <h2>Az első játéknak már van helye.</h2>
                  <p>
                    Adj hozzá egy társasjátékot, majd töltsd fel a
                    szabálykönyvét.
                    <br />
                    PDF-ből, képből vagy egyszerű szövegből is dolgozhatunk.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setForm("new")}
                  >
                    <Icon name="plus" />
                    Az első játék hozzáadása
                  </button>
                </section>
              ) : (
                <div className="game-grid">
                  {filtered.map((g, index) => (
                    <button
                      className="game-card"
                      key={g.id}
                      onClick={() => {
                        setSelected(g.id);
                        setError("");
                      }}
                    >
                      <div className={`game-cover cover-${index % 4}`}>
                        <span className="cover-edition">
                          {languageName[g.language] ?? g.language} szabály
                        </span>
                        <span className="cover-mark" aria-hidden="true">
                          {["✳", "◈", "✺", "⬡"][index % 4]}
                        </span>
                        <strong>{g.title}</strong>
                        <span className="cover-bottom">
                          {g.edition || "Társasjáték"}
                          <Icon name="books" />
                        </span>
                      </div>
                      <div className="game-card-info">
                        <div>
                          <strong>{g.title}</strong>
                          <small>
                            {g.document_count} dokumentum
                            {g.published_count
                              ? ` · ${g.published_count} közzétéve`
                              : ""}
                          </small>
                        </div>
                        <Icon name="arrow" />
                      </div>
                    </button>
                  ))}
                  <button className="add-card" onClick={() => setForm("new")}>
                    <span>
                      <Icon name="plus" />
                    </span>
                    <strong>Jöhet a következő játék</strong>
                    <small>Bővítsd a gyűjteményed</small>
                  </button>
                  {filtered.length === 0 && (
                    <p className="empty-text">
                      Nincs ilyen játék a gyűjteményben.
                    </p>
                  )}
                </div>
              )}
              <div className="how-it-works">
                <span className="eyebrow">
                  HOGYAN KERÜL A SZABÁLY A POLCRA?
                </span>
                <div>
                  <span>
                    <b>01</b>Játék hozzáadása
                  </span>
                  <Icon name="arrow" />
                  <span>
                    <b>02</b>Szabályanyag feltöltése
                  </span>
                  <Icon name="arrow" />
                  <span>
                    <b>03</b>Ellenőrzés és közzététel
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="detail-toolbar">
                <button
                  className="text-button"
                  onClick={() => setSelected(null)}
                >
                  ← Vissza a gyűjteményhez
                </button>
                <button
                  className="button secondary"
                  onClick={() => setForm("edit")}
                >
                  <Icon name="edit" />
                  Adatok szerkesztése
                </button>
              </div>
              <section className="game-info">
                <div className="game-emblem">✳</div>
                <div>
                  <span className="eyebrow">JÁTÉK ADATAI</span>
                  <p>
                    {game.description ||
                      "Ehhez a játékhoz még nem adtál meg leírást."}
                  </p>
                  <span className="metadata">
                    {languageName[game.language] ?? game.language} ·{" "}
                    {game.edition || "Kiadás nincs megadva"}
                  </span>
                </div>
              </section>
              <div className="collection-toolbar">
                <h2>
                  Szabályanyagok <span>{documents.length}</span>
                </h2>
                <button
                  className="button primary"
                  onClick={() => setUpload(true)}
                >
                  <Icon name="upload" />
                  Szabályanyag feltöltése
                </button>
              </div>
              {docLoading ? (
                <p className="loading">Dokumentumok betöltése…</p>
              ) : documents.length === 0 ? (
                <section className="document-empty">
                  <span className="upload-icon">
                    <Icon name="file" />
                  </span>
                  <h3>Még nincs szabályanyag</h3>
                  <p>
                    Tölts fel egy szabálykönyvet, vagy illeszd be a szabály
                    szövegét.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => setUpload(true)}
                  >
                    <Icon name="upload" />
                    Feltöltés
                  </button>
                </section>
              ) : (
                <div className="documents">
                  {documents.map((doc) => (
                    <article className="document-card" key={doc.id}>
                      <div className="document-icon">
                        <Icon
                          name={
                            ["png", "jpg", "jpeg", "webp"].includes(doc.format)
                              ? "image"
                              : "file"
                          }
                        />
                        <small>{doc.format.toUpperCase()}</small>
                      </div>
                      <div className="document-main">
                        <div className="document-title">
                          <h3>{doc.filename}</h3>
                          <Badge status={doc.status} />
                        </div>
                        <p className="document-meta">
                          {languageName[doc.language] ?? doc.language} ·{" "}
                          {fileSize(doc.size_bytes)}
                          {doc.chunk_count
                            ? ` · ${doc.chunk_count} szabályrész`
                            : ""}
                          {doc.page_count ? ` · ${doc.page_count} oldal` : ""}
                          {doc.asset_count ? ` · ${doc.asset_count} ábra` : ""}
                        </p>
                        {["processing", "queued"].includes(doc.status) && (
                          <div className="processing">
                            <div className="progress-track">
                              <div
                                className={`progress-fill ${doc.status === "queued" ? "queued" : ""}`}
                                style={{ width: `${doc.progress ?? 0}%` }}
                              />
                            </div>
                            <span>
                              {doc.stage} · {doc.progress ?? 0}%
                            </span>
                          </div>
                        )}
                        {doc.error && (
                          <p className="document-error">{doc.error}</p>
                        )}
                        {doc.has_published && doc.status !== "published" && (
                          <p className="field-note">
                            A korábban közzétett változat továbbra is megmarad.
                          </p>
                        )}
                      </div>
                      <div className="document-actions">
                        {doc.published_version_id &&
                          doc.status !== "published" && (
                            <button
                              className="button secondary"
                              onClick={() =>
                                setPreview({
                                  ...doc,
                                  version_id: doc.published_version_id,
                                  status: "published",
                                })
                              }
                            >
                              Közzétett változat
                            </button>
                          )}
                        {["ready", "published"].includes(doc.status) && (
                          <button
                            className="button secondary"
                            onClick={() => setPreview(doc)}
                          >
                            Ellenőrzés
                            <Icon name="arrow" />
                          </button>
                        )}
                        {!["queued", "processing"].includes(doc.status) && (
                          <button
                            className={`button ${doc.status === "uploaded" || doc.status === "failed" ? "primary" : "ghost"}`}
                            disabled={pending === doc.id}
                            onClick={() => void processDocument(doc)}
                          >
                            <Icon
                              name={
                                doc.status === "uploaded" ? "arrow" : "refresh"
                              }
                            />
                            {pending === doc.id
                              ? "Indítás…"
                              : doc.status === "uploaded"
                                ? "Feldolgozás"
                                : "Újrafeldolgozás"}
                          </button>
                        )}
                        <a
                          className="text-button"
                          href={`/api/documents/${doc.id}/source`}
                        >
                          Eredeti letöltése
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="info-note">
                <Icon name="check" />
                <p>
                  A feldolgozott anyag először ellenőrzésre kerül. Nézd át a
                  kinyert szöveget és ábrákat, majd tedd közzé a jóváhagyott
                  változatot.
                </p>
              </div>
            </>
          )}
          <footer className="workspace-footer">
            <span>
              Szabálytár <b>·</b> Admin
            </span>
            <span>A következő jó játékhoz.</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" />
          {notice}
        </div>
      )}
      {form && (
        <GameForm
          initial={form === "edit" ? (game ?? null) : null}
          onClose={() => setForm(null)}
          onSaved={(saved) => {
            setForm(null);
            refresh();
            setSelected(saved.id);
            setNotice("A játék adatait elmentettük.");
          }}
        />
      )}
      {upload && game && (
        <UploadForm
          game={game}
          onClose={() => {
            setUpload(false);
            refresh();
          }}
          onSaved={() => {
            setUpload(false);
            refresh();
            setNotice("A szabályanyagot elmentettük.");
          }}
        />
      )}
      {preview && (
        <PreviewModal
          document={preview}
          onClose={() => setPreview(null)}
          onPublished={() => {
            setPreview(null);
            refresh();
            setNotice("A szabályanyag közzétéve.");
          }}
        />
      )}
    </div>
  );
}
