import {
  useI18n,
  LanguageSwitcher,
  MessageError,
  errorMessage,
  validateForm,
} from "./i18n";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api } from "./api";
import type { Document, Game, Preview } from "./api";
import ProcessingLog from "./ProcessingLog";

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
  | "eye"
  | "sparkles"
  | "download"
  | "play"
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
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4" />
    </>
  ),
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
  play: <path d="m8 4 12 8-12 8V4Z" />,
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
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
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
    <Modal title={initial ? t("Edit game") : t("New game")} onClose={onClose}>
      <p className="modal-intro">
        {t(
          "Enter the game details first. You can upload the rulebook in the next step.",
        )}
      </p>
      <form onSubmit={save} noValidate>
        <label>
          <span className="field-label">
            {t("Game name")} <span aria-hidden="true">*</span>
          </span>
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
  const { t, language: interfaceLanguage } = useI18n();
  const [sourceLanguage, setSourceLanguage] = useState(game.language);
  const [usageLanguage, setUsageLanguage] = useState<string>(interfaceLanguage);
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
    const usage_language = String(form.get("usage_language"));
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
          data.set("usage_language", usage_language);
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
              usage_language,
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
        {t("Selected game:")} <strong>{game.title}</strong>
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
                {files.map((file, index) => (
                  <li key={file.name + index}>
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
                maxLength={2000000}
              />
            </label>
            <p className="field-note">
              {t("Markdown headings (#, ##) help organize rule sections.")}
            </p>
          </>
        )}
        <div className="form-grid">
          <label>
            {t("Rulebook language")}
            <select
              name="language"
              aria-label={t("Rulebook language")}
              value={sourceLanguage}
              onChange={(event) => setSourceLanguage(event.target.value)}
              disabled={busy}
            >
              <LanguageOptions />
            </select>
          </label>
          <label>
            {t("Use language")}
            <select
              name="usage_language"
              aria-label={t("Use language")}
              value={usageLanguage}
              onChange={(event) => setUsageLanguage(event.target.value)}
              disabled={busy}
            >
              <option value="en">{t("English")}</option>
              <option value="hu">{t("Hungarian")}</option>
              <option value="both">{t("English and Hungarian")}</option>
            </select>
          </label>
        </div>
        <p className="field-note">
          {t(
            sourceLanguage.toLowerCase().split("-")[0] === usageLanguage
              ? "No translation needed. The original rules will be processed and indexed."
              : "Only selected languages that differ from the rulebook language will be translated.",
          )}
        </p>
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
}: {
  document: Document;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const [data, setData] = useState<Preview | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<unknown>(null);
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
  return (
    <Modal title={t("Processed rule material")} onClose={onClose} wide>
      <div className="preview-title">
        <Icon name="file" />
        <span>{document.filename}</span>
        <Badge status={document.status} />
        <span className="badge">
          {t(`ai.${data?.version.ai_status ?? document.ai_status}`)}
        </span>
      </div>
      <form
        className="preview-search"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setSearch(query);
        }}
      >
        <Icon name="search" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
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
      {data?.version.ai_error_code && (
        <p className="ai-warning" role="status">
          {t(`errors.${data.version.ai_error_code}`)}
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
              <span>{t(search ? "Keyword matches" : "Original order")}</span>
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
                {(language === "hu"
                  ? chunk.translation_hu
                  : chunk.translation_en) && (
                  <details className="ai-translation">
                    <summary>{t("AI translation")}</summary>
                    <p lang={language}>
                      {language === "hu"
                        ? chunk.translation_hu
                        : chunk.translation_en}
                    </p>
                  </details>
                )}
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
      </footer>
    </Modal>
  );
}

export default function App() {
  const { t, language } = useI18n();
  const [ai, setAi] = useState<{
    processing: boolean;
    explanations: boolean;
  } | null>(null);
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
  useEffect(() => {
    const controller = new AbortController();
    api<{ processing: boolean; explanations: boolean }>("/ai/status", {
      signal: controller.signal,
    })
      .then(setAi)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api<Game[]>("/games", { signal: controller.signal })
      .then(setGames)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (!selected) {
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
        if (active && !controller.signal.aborted) setError(e);
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
  }, [selected, revision]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  async function processDocument(doc: Document, aiOnly = false) {
    setPending(doc.id);
    setError("");
    try {
      await api(`/documents/${doc.id}/${aiOnly ? "ai-process" : "process"}`, {
        method: "POST",
      });
      refresh();
      setNotice("Processing has been queued.");
    } catch (e) {
      setError(e);
    } finally {
      setPending(null);
    }
  }
  const filtered = games.filter((g) =>
    `${g.title} ${g.edition}`
      .toLocaleLowerCase(language)
      .includes(filter.toLocaleLowerCase(language)),
  );
  return (
    <div className="admin-app">
      <main className="admin-main">
        <div className="main-content">
          <div className={`page-heading ${game ? "game-heading" : ""}`}>
            <div>
              <h1>{game ? game.title : t("Game collection")}</h1>
              {game?.edition && <p>{game.edition}</p>}
            </div>
            <div className="page-heading-actions">
              {game ? (
                <button
                  className="button secondary"
                  onClick={() => setSelected(null)}
                >
                  {t("← Back to collection")}
                </button>
              ) : (
                <>
                  <div className="search-field">
                    <Icon name="search" />
                    <input
                      placeholder={t("Search games…")}
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      aria-label={t("Search games")}
                    />
                  </div>
                  <button
                    className="button primary"
                    onClick={() => setForm("new")}
                  >
                    <Icon name="plus" />
                    {t("New game")}
                  </button>
                </>
              )}
            </div>
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
              <div className="collection-toolbar">
                <span className="collection-count">
                  {t("{count} game(s)", { count: games.length })}
                </span>
              </div>
              {loading && !games.length ? (
                <p className="loading">{t("Loading collection…")}</p>
              ) : games.length === 0 ? (
                <section className="empty-state">
                  <h2>{t("No games yet")}</h2>
                  <p>{t("Add a board game, then upload its rulebook.")}</p>
                  <button
                    className="button primary"
                    onClick={() => setForm("new")}
                  >
                    <Icon name="plus" />
                    {t("New game")}
                  </button>
                </section>
              ) : (
                <div className="game-grid">
                  {filtered.map((g) => (
                    <button
                      className="game-card"
                      key={g.id}
                      onClick={() => {
                        setSelected(g.id);
                        setError("");
                      }}
                    >
                      <span className="game-card-icon">
                        <Icon name="books" />
                      </span>
                      <div className="game-card-info">
                        <div>
                          <strong>{g.title}</strong>
                          {g.edition && (
                            <span className="game-card-edition">
                              {g.edition}
                            </span>
                          )}
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
                  {filtered.length === 0 && (
                    <p className="empty-text">
                      {t("No matching game in your collection.")}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="collection-toolbar rule-toolbar">
                <h2>
                  {t("Rule material")}
                  <span>{documents.length}</span>
                </h2>
                <div className="rule-toolbar-actions">
                  <button
                    className="button secondary"
                    onClick={() => setForm("edit")}
                  >
                    <Icon name="edit" />
                    {t("Edit details")}
                  </button>
                  {documents.length > 0 && (
                    <button
                      className="button primary"
                      onClick={() => setUpload(true)}
                    >
                      <Icon name="upload" />
                      {t("Upload rule material")}
                    </button>
                  )}
                </div>
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
                    {t("Upload rule material")}
                  </button>
                </section>
              ) : (
                <div className="documents">
                  {documents.map((doc) => {
                    const processing = ["queued", "processing"].includes(
                      doc.status,
                    );
                    const availableVersion = ["ready", "published"].includes(
                      doc.status,
                    )
                      ? doc.version_id
                      : doc.published_version_id;
                    const canProcess = !processing && pending === null;
                    const canEnrich =
                      canProcess &&
                      !!ai?.processing &&
                      !!availableVersion &&
                      (doc.chunk_count > 0 || !!doc.published_version_id);
                    return (
                      <article className="document-card" key={doc.id}>
                        <div className="document-icon">
                          <Icon
                            name={
                              ["png", "jpg", "jpeg", "webp"].includes(
                                doc.format,
                              )
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
                            {doc.chunk_count > 0 && (
                              <span className="badge">
                                {t(`ai.${doc.ai_status}`)}
                              </span>
                            )}
                          </div>
                          <p className="document-meta">
                            {t(languageName[doc.language] ?? doc.language)} ·{" "}
                            {t("Use: {language}", {
                              language:
                                doc.usage_language === "both"
                                  ? t("English and Hungarian")
                                  : t(
                                      languageName[doc.usage_language] ??
                                        doc.usage_language,
                                    ),
                            })}{" "}
                            · {fileSize(doc.size_bytes)}
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
                          {doc.ai_error_code && (
                            <p className="ai-warning">
                              {t(`errors.${doc.ai_error_code}`)}
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
                          <button
                            className="button secondary"
                            disabled={!availableVersion}
                            title={t(
                              availableVersion
                                ? "View extracted text and figures"
                                : "Available after successful processing",
                            )}
                            onClick={() =>
                              setPreview({
                                ...doc,
                                version_id: availableVersion,
                                status:
                                  availableVersion === doc.published_version_id
                                    ? "published"
                                    : doc.status,
                              })
                            }
                          >
                            <Icon name="eye" />
                            {t("View rules")}
                          </button>
                          <button
                            className="button secondary"
                            disabled={!canProcess}
                            title={t(
                              processing
                                ? "Processing is already running"
                                : "Extract text and figures, then make the rules available automatically",
                            )}
                            onClick={() => void processDocument(doc)}
                          >
                            <Icon
                              name={
                                doc.status === "uploaded" ? "play" : "refresh"
                              }
                            />
                            {pending === doc.id
                              ? t("Starting…")
                              : t(
                                  doc.status === "uploaded"
                                    ? "Process"
                                    : doc.status === "failed"
                                      ? "Retry processing"
                                      : "Reprocess",
                                )}
                          </button>
                          <button
                            className="button secondary"
                            disabled={!canEnrich}
                            title={t(
                              processing
                                ? "Processing is already running"
                                : !ai?.processing
                                  ? "Translation and enhanced search are unavailable"
                                  : !availableVersion
                                    ? "Available after successful processing"
                                    : "Update translations and enhanced search without extracting the file again",
                            )}
                            onClick={() => void processDocument(doc, true)}
                          >
                            <Icon name="sparkles" />
                            {t("Update translation and search")}
                          </button>
                          <a
                            className="button secondary"
                            href={`/api/documents/${doc.id}/source`}
                          >
                            <Icon name="download" />
                            {t("Download original")}
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <ProcessingLog gameId={game.id} />
            </>
          )}
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
        <PreviewModal document={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
