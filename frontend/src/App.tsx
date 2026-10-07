import {
  useI18n,
  LanguageSwitcher,
  MessageError,
  errorMessage,
  validateForm,
} from "./i18n";
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
export function Icon({
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
  uploaded: "statuses.uploaded",
  queued: "statuses.queued",
  processing: "statuses.processing",
  ready: "statuses.ready",
  published: "statuses.published",
  failed: "statuses.failed",
};
const languageName: Record<string, string> = {
  hu: "Hungarian",
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
};
function LanguageOptions() {
  const { t } = useI18n();
  return (
    <>
      {Object.entries(languageName).map(([code, name]) => (
        <option key={code} value={code}>
          {t(name)}
        </option>
      ))}
    </>
  );
}

function fileSize(size: number) {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}
function Badge({ status }: { status: string }) {
  const { t } = useI18n();
  return (
    <span className={`badge ${status}`}>
      <span className="status-dot" />
      {t(labels[status] ?? status)}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
  eyebrow = "RULESHELF / ADMIN",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  eyebrow?: string;
}) {
  const { t } = useI18n();
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
          <span className="eyebrow">{t(eyebrow)}</span>
          <h2>{title}</h2>
        </div>
        <div className="modal-header-actions">
          <LanguageSwitcher />
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t("Close")}
          >
            <Icon name="close" />
          </button>
        </div>
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
  const { t, language } = useI18n();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      validateForm(event.currentTarget);
      const game = await api<Game>(
        initial ? `/games/${initial.id}` : "/games",
        {
          method: initial ? "PATCH" : "POST",
          body: JSON.stringify(Object.fromEntries(data)),
        },
      );
      onSaved(game);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial ? t("Edit game") : t("A new game on your shelf")}
      onClose={onClose}
    >
      <p className="modal-intro">
        {t(
          "Enter the game details first. You can upload the rulebook in the next step.",
        )}
      </p>
      <form onSubmit={save} noValidate>
        <label>
          {t("Game name")}
          <span>*</span>
          <input
            name="title"
            defaultValue={initial?.title}
            placeholder={t("For example: Everdell")}
            required
            maxLength={150}
            autoFocus
          />
        </label>
        <div className="form-grid">
          <label>
            {t("Edition")}
            <input
              name="edition"
              defaultValue={initial?.edition}
              placeholder={t("For example: 2024, English edition")}
              maxLength={150}
            />
          </label>
          <label>
            {t("Rulebook language")}
            <select
              name="language"
              aria-label={t("Rulebook language")}
              defaultValue={initial?.language ?? language}
            >
              <LanguageOptions />
            </select>
          </label>
        </div>
        <label>
          {t("Short description")}
          <textarea
            name="description"
            defaultValue={initial?.description}
            placeholder={t("Optional notes about the game or edition.")}
            rows={3}
            maxLength={3000}
          />
        </label>
        {!!error && (
          <p className="error" role="alert">
            {errorMessage(error, t)}
          </p>
        )}
        <footer className="modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            {t("Cancel")}
          </button>
          <button className="button primary" disabled={busy}>
            <Icon name={initial ? "check" : "plus"} />
            {busy ? t("Saving…") : initial ? t("Save changes") : t("Add game")}
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
  const { t } = useI18n();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
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
      validateForm(event.currentTarget);
      if (mode === "file" && !files.length)
        throw new MessageError("Choose at least one file.");
      const work = mode === "file" ? files : [null];
      for (const file of work) {
        setMessage(file ? file.name : "__text__");
        let document: { id: string };
        if (file) {
          if (file.size > 50 * 1024 * 1024)
            throw new MessageError(
              "{name}: the file must be no larger than 50 MB.",
              { name: file.name },
            );
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
        completed
          ? new MessageError(
              "{count} document(s) already saved.",
              { count: completed },
              e,
            )
          : e,
      );
      setMessage("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={t("Upload rule material")} onClose={onClose}>
      <p className="modal-intro">
        {t("Selected game:")}
        <strong>{game.title}</strong>
      </p>
      <div className="tabs">
        <button
          className={mode === "file" ? "active" : ""}
          disabled={busy}
          onClick={() => setMode("file")}
        >
          <Icon name="upload" />
          {t("Files")}
        </button>
        <button
          className={mode === "text" ? "active" : ""}
          disabled={busy}
          onClick={() => setMode("text")}
        >
          <Icon name="file" />
          {t("Paste text")}
        </button>
      </div>
      <form onSubmit={submit} noValidate>
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
              <strong>{t("Drop your rulebook here")}</strong>
              <span>{t("or click to choose files")}</span>
              <small>
                {t("PDF, TXT, Markdown, PNG, JPG, WebP · up to 50 MB per file")}
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
              {t(
                "Each uploaded image becomes a separate document. Text is extracted from both PDFs and images.",
              )}
            </p>
          </>
        ) : (
          <>
            <label>
              {t("Document name")}
              <input
                name="title"
                placeholder={t("Base rules")}
                defaultValue={t("Base rules")}
                required
                maxLength={200}
              />
            </label>
            <label>
              {t("Rule text")}
              <textarea
                name="content"
                placeholder={t("# Setup\n\nPaste the game rules here…")}
                rows={9}
                required
                maxLength={2_000_000}
              />
            </label>
            <p className="field-note">
              {t("Markdown headings (#, ##) help organize rule sections.")}
            </p>
          </>
        )}
        <label>
          {t("Document language")}
          <select
            name="language"
            aria-label={t("Document language")}
            defaultValue={game.language}
          >
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
          <span>{t("Start processing after upload")}</span>
        </label>
        {message && (
          <p className="field-note" role="status">
            {message === "__text__"
              ? t("Saving text…")
              : t("Uploading: {name}", { name: message })}
          </p>
        )}
        {!!error && (
          <p className="error" role="alert">
            {errorMessage(error, t)}
          </p>
        )}
        <footer className="modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            {t("Cancel")}
          </button>
          <button className="button primary" disabled={busy}>
            <Icon name="upload" />
            {busy
              ? t("Uploading…")
              : autoProcess
                ? t("Upload and process")
                : t("Upload")}
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
  const { t } = useI18n();
  const [data, setData] = useState<Preview | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<unknown>(null);
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
        if (!controller.signal.aborted) setError(e);
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
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={t("Processed rule material")} onClose={onClose} wide>
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
          placeholder={t("Search extracted text…")}
          aria-label={t("Search the processed document")}
        />
        <button className="button secondary">{t("Search")}</button>
      </form>
      {!!error && (
        <p className="error" role="alert">
          {errorMessage(error, t)}
        </p>
      )}
      <div className="preview-body" aria-busy={loading}>
        {loading ? (
          <p className="loading">{t("Loading rule sections…")}</p>
        ) : (
          <>
            <div className="preview-summary">
              <span>
                {t("{count} rule section(s)", {
                  count: data?.total_chunks ?? 0,
                })}
              </span>
              <span>
                {t("{count} original figure(s)", {
                  count: data?.assets.length ?? 0,
                })}
              </span>
              <span>{search ? t("Keyword matches") : t("Original order")}</span>
            </div>
            {data?.chunks.length === 0 && (
              <p className="empty-text">
                {t("No results. Try another search term.")}
              </p>
            )}
            {data?.chunks.map((chunk) => (
              <article className="chunk" key={chunk.id}>
                <div className="chunk-meta">
                  <strong>{chunk.heading || t("Rules")}</strong>
                  <span>
                    {chunk.page
                      ? t("PDF page {page}", { page: chunk.page })
                      : t("Rule section {number}", {
                          number: chunk.ordinal + 1,
                        })}
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
                {t("Previous")}
              </button>
              <span>
                {offset + 1}–{offset + (data?.chunks.length ?? 0)}
              </span>
              <button
                className="button secondary"
                disabled={(data?.chunks.length ?? 0) < 50}
                onClick={() => setOffset(offset + 50)}
              >
                {t("Next")}
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
                      alt={
                        asset.caption || t("Original figure from the rulebook")
                      }
                      loading="lazy"
                    />
                    <span>
                      {asset.caption || t("Original figure")}
                      {asset.page
                        ? ` · ${t("Page {page}", { page: asset.page })}`
                        : ""}
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
          {t("Download original")}
        </a>
        {document.status === "ready" && (
          <button
            className="button primary"
            onClick={publish}
            disabled={busy || loading}
          >
            <Icon name="check" />
            {busy ? t("Publishing…") : t("Reviewed — publish")}
          </button>
        )}
      </footer>
    </Modal>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const { t } = useI18n();
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      validateForm(event.currentTarget);
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      onLogin();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-language">
        <LanguageSwitcher />
      </div>
      <div className="login-art">
        <div className="brand">
          <Icon name="books" />
          <span>
            {t("RuleShelf")}
            <span className="brand-dot">.</span>
          </span>
        </div>
        <span className="eyebrow">{t("EVERY GREAT GAME STARTS HERE")}</span>
        <h1>
          {t("Rules deserve")}
          <br />
          {t("their own")}
          <br />
          <em>{t("shelf.")}</em>
        </h1>
        <p>
          {t(
            "Keep your board game rulebooks together so the rules are always within reach during play.",
          )}
        </p>
        <div className="book-art" aria-hidden="true">
          <span>{t("RULES")}</span>
          <span>{t("A GOOD TURN")}</span>
          <span>{t("GAME LIBRARY")}</span>
          <span>{t("LET’S PLAY!")}</span>
        </div>
      </div>
      <div className="login-panel">
        <div className="login-form">
          <span className="login-lock">
            <Icon name="lock" />
          </span>
          <span className="eyebrow">{t("ADMIN INTERFACE")}</span>
          <h2>{t("Welcome to RuleShelf")}</h2>
          <p>{t("Sign in to manage your collection.")}</p>
          <form onSubmit={submit} noValidate>
            <label>
              {t("Username")}
              <input
                name="username"
                autoComplete="username"
                defaultValue="admin"
                required
              />
            </label>
            <label>
              {t("Password")}
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
              />
            </label>
            {!!error && (
              <p className="error" role="alert">
                {errorMessage(error, t)}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? t("Signing in…") : t("Sign in")}
              <Icon name="arrow" />
            </button>
          </form>
          <small>
            {t("Find your sign-in details in the")}
            <br />
            <code>infra/.env</code> {t("file created during setup.")}
          </small>
        </div>
        <span className="login-footnote">
          {t("Your collection. Your home.")}
        </span>
      </div>
    </main>
  );
}

export default function App() {
  const { t, language } = useI18n();
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
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const game = games.find((g) => g.id === selected);
  const refresh = () => setRevision((v) => v + 1);
  function handleError(e: unknown) {
    if (e instanceof ApiError && e.status === 401) setAuth("out");
    else setError(e);
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
      setNotice("Processing has been queued.");
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
        <p>{t("Loading RuleShelf…")}</p>
      </div>
    );
  if (auth === "out") return <Login onLogin={() => setAuth("in")} />;
  const filtered = games.filter((g) =>
    `${g.title} ${g.edition}`
      .toLocaleLowerCase(language)
      .includes(filter.toLocaleLowerCase(language)),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Icon name="books" />
          <span>
            {t("RuleShelf")}
            <span className="brand-dot">.</span>
          </span>
        </div>
        <span className="sidebar-caption">{t("YOUR GAME SHELF")}</span>
        <button className="nav-item active" onClick={() => setSelected(null)}>
          <Icon name="books" />
          {t("Game collection")}
          <span>{games.length}</span>
        </button>
        <div className="sidebar-note">
          <span className="note-star">✳</span>
          <p>
            {t("Less page turning.")}
            <br />
            <strong>{t("More playing.")}</strong>
          </p>
          <small>{t("A good answer starts with the right rulebook.")}</small>
        </div>
        <div className="sidebar-bottom">
          <a href="/" className="player-link">
            <Icon name="search" />
            {t("Ask the rules")}
          </a>
          <div className="admin-profile">
            <span>A</span>
            <div>
              <strong>{t("Administrator")}</strong>
              <small>{t("Manage collection")}</small>
            </div>
          </div>
          <button onClick={logout} className="logout">
            <Icon name="logout" />
            {t("Sign out")}
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <span>
            {t("COLLECTION")} / {game ? t("GAME DETAILS") : t("OVERVIEW")}
          </span>
          <LanguageSwitcher />
          <span className="local-indicator">
            <i />
            {t("Your rule library")}
          </span>
        </header>
        <div className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">{t("A PLACE FOR EVERY RULE")}</span>
              <h1>{game ? game.title : t("Your game shelf")}</h1>
              <p>
                {game
                  ? game.edition || t("Rule material and processing")
                  : t("Upload your rulebooks. We’ll help you organize them.")}
              </p>
            </div>
            <button className="button primary" onClick={() => setForm("new")}>
              <Icon name="plus" />
              {t("New game")}
            </button>
          </div>
          {!!error && (
            <div className="error global-error" role="alert">
              {errorMessage(error, t)}
              <button
                className="icon-button"
                aria-label={t("Dismiss error")}
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
                  <span>{t("GAMES ON THE SHELF")}</span>
                  <strong>{games.length.toString().padStart(2, "0")}</strong>
                  <Icon name="books" />
                </div>
                <div>
                  <span>{t("RULE DOCUMENTS")}</span>
                  <strong>
                    {games
                      .reduce((n, g) => n + g.document_count, 0)
                      .toString()
                      .padStart(2, "0")}
                  </strong>
                  <Icon name="file" />
                </div>
                <div>
                  <span>{t("PUBLISHED RULEBOOKS")}</span>
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
                  {t("Game collection")}
                  <span>{games.length}</span>
                </h2>
                <div className="search-field">
                  <Icon name="search" />
                  <input
                    placeholder={t("Search games…")}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label={t("Search games")}
                  />
                </div>
              </div>
              {loading && !games.length ? (
                <p className="loading">{t("Loading collection…")}</p>
              ) : games.length === 0 ? (
                <section className="empty-state">
                  <div className="empty-books" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="eyebrow">
                    {t("YOUR COLLECTION STARTS HERE")}
                  </span>
                  <h2>{t("There’s room for your first game.")}</h2>
                  <p>
                    {t("Add a board game, then upload its rulebook.")}
                    <br />
                    {t("Start with a PDF, an image or plain text.")}
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setForm("new")}
                  >
                    <Icon name="plus" />
                    {t("Add your first game")}
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
                          {t("{language} rules", {
                            language: t(languageName[g.language] ?? g.language),
                          })}
                        </span>
                        <span className="cover-mark" aria-hidden="true">
                          {["✳", "◈", "✺", "⬡"][index % 4]}
                        </span>
                        <strong>{g.title}</strong>
                        <span className="cover-bottom">
                          {g.edition || t("Board game")}
                          <Icon name="books" />
                        </span>
                      </div>
                      <div className="game-card-info">
                        <div>
                          <strong>{g.title}</strong>
                          <small>
                            {t("{count} document(s)", {
                              count: g.document_count,
                            })}
                            {g.published_count
                              ? ` · ${t("{count} published", { count: g.published_count })}`
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
                    <strong>{t("Add another game")}</strong>
                    <small>{t("Grow your collection")}</small>
                  </button>
                  {filtered.length === 0 && (
                    <p className="empty-text">
                      {t("No matching game in your collection.")}
                    </p>
                  )}
                </div>
              )}
              <div className="how-it-works">
                <span className="eyebrow">
                  {t("HOW DOES A RULEBOOK REACH YOUR SHELF?")}
                </span>
                <div>
                  <span>
                    <b>01</b>
                    {t("Add game")}
                  </span>
                  <Icon name="arrow" />
                  <span>
                    <b>02</b>
                    {t("Upload rule material")}
                  </span>
                  <Icon name="arrow" />
                  <span>
                    <b>03</b>
                    {t("Review and publish")}
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
                  {t("← Back to collection")}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setForm("edit")}
                >
                  <Icon name="edit" />
                  {t("Edit details")}
                </button>
              </div>
              <section className="game-info">
                <div className="game-emblem">✳</div>
                <div>
                  <span className="eyebrow">{t("GAME DETAILS")}</span>
                  <p>
                    {game.description ||
                      t("No description has been added for this game.")}
                  </p>
                  <span className="metadata">
                    {t(languageName[game.language] ?? game.language)} ·{" "}
                    {game.edition || t("Edition not specified")}
                  </span>
                </div>
              </section>
              <div className="collection-toolbar">
                <h2>
                  {t("Rule material")}
                  <span>{documents.length}</span>
                </h2>
                <button
                  className="button primary"
                  onClick={() => setUpload(true)}
                >
                  <Icon name="upload" />
                  {t("Upload rule material")}
                </button>
              </div>
              {docLoading ? (
                <p className="loading">{t("Loading documents…")}</p>
              ) : documents.length === 0 ? (
                <section className="document-empty">
                  <span className="upload-icon">
                    <Icon name="file" />
                  </span>
                  <h3>{t("No rule material yet")}</h3>
                  <p>{t("Upload a rulebook or paste the rule text.")}</p>
                  <button
                    className="button secondary"
                    onClick={() => setUpload(true)}
                  >
                    <Icon name="upload" />
                    {t("Upload")}
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
                          {t(languageName[doc.language] ?? doc.language)} ·{" "}
                          {fileSize(doc.size_bytes)}
                          {doc.chunk_count
                            ? ` · ${t("{count} rule section(s)", { count: doc.chunk_count })}`
                            : ""}
                          {doc.page_count
                            ? ` · ${t("{count} page(s)", { count: doc.page_count })}`
                            : ""}
                          {doc.asset_count
                            ? ` · ${t("{count} figure(s)", { count: doc.asset_count })}`
                            : ""}
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
                              {doc.stage_code
                                ? t(`stages.${doc.stage_code}`)
                                : t("stages.processing")}
                              {doc.stage_params?.device
                                ? ` (${doc.stage_params.device})`
                                : ""}{" "}
                              · {doc.progress ?? 0}%
                            </span>
                          </div>
                        )}
                        {doc.error && (
                          <p className="document-error">
                            {t(
                              `errors.${doc.error_code ?? "processing_failed"}`,
                            )}
                          </p>
                        )}
                        {doc.has_published && doc.status !== "published" && (
                          <p className="field-note">
                            {t(
                              "The previously published version remains available.",
                            )}
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
                              {t("Published version")}
                            </button>
                          )}
                        {["ready", "published"].includes(doc.status) && (
                          <button
                            className="button secondary"
                            onClick={() => setPreview(doc)}
                          >
                            {t("Review")}
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
                              ? t("Starting…")
                              : doc.status === "uploaded"
                                ? t("Process")
                                : t("Reprocess")}
                          </button>
                        )}
                        <a
                          className="text-button"
                          href={`/api/documents/${doc.id}/source`}
                        >
                          {t("Download original")}
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="info-note">
                <Icon name="check" />
                <p>
                  {t(
                    "Review the extracted text and figures first, then publish the approved version.",
                  )}
                </p>
              </div>
            </>
          )}
          <footer className="workspace-footer">
            <span>
              {t("RuleShelf")}
              <b>·</b> Admin
            </span>
            <span>{t("For your next great game.")}</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" />
          {t(notice)}
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
            setNotice("Game details saved.");
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
            setNotice("Rule material saved.");
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
            setNotice("Rule material published.");
          }}
        />
      )}
    </div>
  );
}
