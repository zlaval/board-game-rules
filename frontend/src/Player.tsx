import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Icon, Modal } from "./App";
import { api } from "./api";
import { errorMessage, useI18n } from "./i18n";
import type {
  Capabilities,
  PlayerGame,
  RuleAnswer,
  RuleAsset,
  RuleDocument,
  RuleSource,
} from "./player-api";
import { useVoice } from "./useVoice";
import "./player.css";

type Turn = { id: number; question: string; answer: RuleAnswer };
function selectedFromURL() {
  return new URLSearchParams(window.location.search).get("game") ?? "";
}

export default function Player() {
  const { t, language } = useI18n();
  const [games, setGames] = useState<PlayerGame[]>([]);
  const [visible, setVisible] = useState<PlayerGame[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [selected, setSelected] = useState(selectedFromURL);
  const [documents, setDocuments] = useState<RuleDocument[]>([]);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [libraryError, setLibraryError] = useState<unknown>(null);
  const [reload, setReload] = useState(0);
  const [source, setSource] = useState<RuleSource | null>(null);
  const [sourceBusy, setSourceBusy] = useState(false);
  const [sourceError, setSourceError] = useState<unknown>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [figure, setFigure] = useState<RuleAsset | null>(null);
  const [transcribed, setTranscribed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const sourceRequest = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const results = useRef<HTMLElement>(null);
  const voice = useVoice(
    (text) => {
      setQuestion(text);
      setTranscribed(true);
      input.current?.focus();
    },
    language,
    capabilities?.max_audio_bytes ?? 10 * 1024 * 1024,
  );
  const game = games.find((item) => item.id === selected);
  useEffect(() => {
    const controller = new AbortController();
    api<Capabilities>("/play/capabilities", { signal: controller.signal })
      .then((features) => {
        if (!controller.signal.aborted) setCapabilities(features);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error);
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    const query = filter.trim();
    setLoading(true);
    setLibraryError(null);
    const timer = window.setTimeout(
      () => {
        api<PlayerGame[]>(
          `/play/games${query ? `?q=${encodeURIComponent(query)}` : ""}`,
          {
            signal: controller.signal,
          },
        )
          .then((items) => {
            if (controller.signal.aborted) return;
            setVisible(items);
            // Keep the selected game's question available while searching for another.
            setGames((known) =>
              query
                ? [
                    ...known.filter(
                      (item) => !items.some((match) => match.id === item.id),
                    ),
                    ...items,
                  ]
                : items,
            );
            if (!query)
              setSelected((value) =>
                items.some((item) => item.id === value) ? value : "",
              );
          })
          .catch((error) => {
            if (!controller.signal.aborted) setLibraryError(error);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      query ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filter, reload]);

  useEffect(() => {
    const pop = () => setSelected(selectedFromURL());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  useEffect(() => {
    request.current?.abort();
    sourceRequest.current?.abort();
    voice.cancel();
    setBusy(false);
    setTurns([]);
    setQuestion("");
    setTranscribed(false);
    setError(null);
    setSourceOpen(false);
    setFigure(null);
    setDocuments([]);
    setDocumentIds([]);
    if (!selected) {
      setLoadingDocs(false);
      return;
    }
    const controller = new AbortController();
    setLoadingDocs(true);
    api<RuleDocument[]>(`/play/games/${selected}/documents`, {
      signal: controller.signal,
    })
      .then((docs) => {
        if (controller.signal.aborted) return;
        setDocuments(docs);
        setDocumentIds(docs.map((doc) => doc.id));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDocs(false);
      });
    return () => controller.abort();
  }, [selected, reload]);

  useEffect(
    () => () => {
      request.current?.abort();
      sourceRequest.current?.abort();
    },
    [],
  );

  function choose(id: string) {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("game", id);
    else url.searchParams.delete("game");
    window.history.pushState({}, "", url);
  }
  function selectDocument(id: string, checked: boolean) {
    request.current?.abort();
    voice.cancel();
    setBusy(false);
    setError(null);
    setTurns([]);
    setDocumentIds((ids) =>
      checked ? [...ids, id] : ids.filter((item) => item !== id),
    );
  }
  async function ask(event: FormEvent) {
    event.preventDefault();
    if (
      !question.trim() ||
      !game ||
      !documentIds.length ||
      busy ||
      voice.recording ||
      voice.requesting ||
      voice.transcribing
    )
      return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const text = question.trim();
    setBusy(true);
    setError(null);
    try {
      const answer = await api<RuleAnswer>(
        `/play/games/${selected}/questions`,
        {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({ question: text, document_ids: documentIds }),
        },
      );
      if (controller.signal.aborted) return;
      setTurns((items) =>
        [{ id: Date.now(), question: text, answer }, ...items].slice(0, 6),
      );
      setQuestion("");
      setTranscribed(false);
      requestAnimationFrame(() => results.current?.focus());
    } catch (error) {
      if (!controller.signal.aborted) setError(error);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function openSource(id: string) {
    sourceRequest.current?.abort();
    const controller = new AbortController();
    sourceRequest.current = controller;
    setSourceOpen(true);
    setSource(null);
    setSourceBusy(true);
    setSourceError(null);
    try {
      const row = await api<RuleSource>(
        `/play/games/${selected}/sources/${id}`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setSource(row);
    } catch (error) {
      if (!controller.signal.aborted) setSourceError(error);
    } finally {
      if (!controller.signal.aborted) setSourceBusy(false);
    }
  }
  function location(row: RuleSource) {
    const section = /^section-(\d+)$/.exec(row.source_ref);
    return row.page !== null
      ? t("Page {page}", { page: row.page })
      : t("Section {number}", {
          number: section ? Number(section[1]) : row.ordinal + 1,
        });
  }
  const locked =
    busy || voice.recording || voice.transcribing || voice.requesting;
  return (
    <div className="player-app">
      <main className="player-main">
        <div className="player-layout">
          <aside className="player-library" aria-label={t("Choose a game")}>
            <label className="player-search">
              <span className="sr-only">{t("Search games")}</span>
              <Icon name="search" />
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={t("Search games…")}
              />
            </label>
            <div className="player-mobile-picker">
              <label className="player-mobile-select">
                <span className="sr-only">{t("Choose a game")}</span>
                <select
                  value={selected}
                  onChange={(event) => choose(event.target.value)}
                >
                  <option value="">{t("Select a game…")}</option>
                  {games.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="player-refresh"
                aria-label={t("Refresh library")}
                title={t("Refresh library")}
                onClick={() => {
                  setFilter("");
                  setReload((value) => value + 1);
                }}
                disabled={loading || locked}
              >
                <Icon name="refresh" />
              </button>
            </div>
            {loading ? (
              <p className="loading">{t("Loading collection…")}</p>
            ) : !libraryError && games.length === 0 && !filter.trim() ? (
              <div className="player-empty-library">
                <Icon name="books" />
                <strong>{t("No published games yet")}</strong>
                <p>
                  {t(
                    "Add a game and publish its rulebook in the admin interface to start asking questions.",
                  )}
                </p>
                <a href="/admin" className="button secondary">
                  {t("Manage library")}
                </a>
              </div>
            ) : (
              <>
                <div className="player-game-list">
                  {visible.map((item) => (
                    <button
                      className={`player-game ${selected === item.id ? "selected" : ""}`}
                      key={item.id}
                      onClick={() => choose(item.id)}
                      aria-pressed={selected === item.id}
                    >
                      <span className="player-game-icon">
                        <Icon name="books" />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                      </span>
                      <Icon name="arrow" />
                    </button>
                  ))}
                  {!libraryError && visible.length === 0 && (
                    <p>{t("No games match your search.")}</p>
                  )}
                </div>
              </>
            )}
            {!!libraryError && (
              <p className="error" role="alert">
                {errorMessage(libraryError, t)}
              </p>
            )}
          </aside>
          <section
            className="player-question-area"
            aria-label={t("Rule questions")}
          >
            {!game ? (
              <div className="player-welcome">
                <Icon name="search" />
                <h2>{t("Choose a game")}</h2>
              </div>
            ) : (
              <>
                <div className="player-selected">
                  <div>
                    <h2>{game.title}</h2>
                  </div>
                </div>
                {!capabilities?.explanations && capabilities && (
                  <div className="player-mode-note">
                    <Icon name="search" />
                    <p>{t("Rule search · AI explanations are unavailable.")}</p>
                  </div>
                )}
                <form className="player-composer" onSubmit={ask}>
                  <label htmlFor="player-question">{t("Your question")}</label>
                  <textarea
                    id="player-question"
                    ref={input}
                    value={question}
                    onChange={(event) => {
                      setQuestion(event.target.value);
                      setTranscribed(false);
                    }}
                    maxLength={1000}
                    rows={3}
                    placeholder={t(
                      "What would you like to know about the rules?",
                    )}
                    disabled={locked || loadingDocs}
                  />
                  {transcribed && (
                    <p className="player-transcribed" role="status">
                      {t(
                        "Check the recognized text and edit it before sending your question.",
                      )}
                    </p>
                  )}
                  <div className="player-composer-actions">
                    <button
                      type="button"
                      className={`button secondary player-microphone ${voice.recording ? "recording" : ""}`}
                      disabled={
                        !capabilities?.transcription ||
                        !voice.supported ||
                        busy ||
                        voice.requesting ||
                        voice.transcribing ||
                        loadingDocs
                      }
                      onClick={voice.recording ? voice.stop : voice.start}
                      aria-label={
                        voice.recording
                          ? t("Stop recording")
                          : voice.transcribing
                            ? t("Transcribing…")
                            : t("Use microphone")
                      }
                      title={
                        voice.recording
                          ? t("Stop recording")
                          : voice.transcribing
                            ? t("Transcribing…")
                            : t("Use microphone")
                      }
                      aria-pressed={voice.recording}
                    >
                      <svg
                        className="icon"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        aria-hidden="true"
                      >
                        <rect x="9" y="3" width="6" height="12" rx="3" />
                        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
                      </svg>
                    </button>
                    {locked && (
                      <button
                        type="button"
                        className="player-cancel"
                        onClick={() => {
                          request.current?.abort();
                          setBusy(false);
                          voice.cancel();
                        }}
                      >
                        {t("Cancel")}
                      </button>
                    )}
                    <span className="player-character-count">
                      {question.length}/1000
                    </span>
                    <button
                      className="button primary"
                      disabled={
                        locked ||
                        loadingDocs ||
                        !question.trim() ||
                        !documentIds.length
                      }
                    >
                      {busy ? t("Finding the rule…") : t("Ask question")}
                      <Icon name="arrow" />
                    </button>
                  </div>
                  {voice.recording && (
                    <p className="player-input-help" role="status">
                      {t("Recording… Stop when finished. Maximum 60 seconds.")}
                    </p>
                  )}
                  {!loadingDocs && !documentIds.length && (
                    <p className="player-input-help">
                      {t(
                        "Select at least one published rulebook to ask a question.",
                      )}
                    </p>
                  )}
                  {!!voice.error && (
                    <p className="error" role="alert">
                      {errorMessage(voice.error, t)}
                    </p>
                  )}
                </form>
                <details className="player-rule-selection">
                  <summary>
                    {t("Rulebooks in use")}{" "}
                    <span>
                      {documentIds.length}/{documents.length}
                    </span>
                  </summary>
                  {loadingDocs ? (
                    <p>{t("Loading rulebooks…")}</p>
                  ) : (
                    documents.map((doc) => (
                      <label className="checkbox" key={doc.id}>
                        <input
                          type="checkbox"
                          checked={documentIds.includes(doc.id)}
                          onChange={(event) =>
                            selectDocument(doc.id, event.target.checked)
                          }
                          disabled={locked}
                        />
                        <span>{doc.filename}</span>
                      </label>
                    ))
                  )}
                </details>
                {busy && (
                  <p className="player-working" role="status">
                    {t("Checking the selected rulebooks…")}
                  </p>
                )}
                <section
                  className="player-results"
                  ref={results}
                  tabIndex={-1}
                  aria-label={t("Questions and answers")}
                  aria-busy={busy}
                >
                  {turns.length > 0 && (
                    <div className="player-history-title">
                      <h3>{t("Questions and answers")}</h3>
                      <button onClick={() => setTurns([])} disabled={busy}>
                        {t("Clear questions")}
                      </button>
                    </div>
                  )}
                  {turns.map(({ id, question: text, answer }) => (
                    <article className="player-turn" key={id}>
                      <div className="player-user-question">
                        <Icon name="search" />
                        <h3>{text}</h3>
                      </div>
                      <div className="player-answer" lang={answer.language}>
                        <span
                          className={`player-answer-status ${answer.status}`}
                        >
                          <Icon
                            name={
                              answer.status === "answered" ? "check" : "file"
                            }
                          />
                          {t(`answer.${answer.status}`)}
                        </span>
                        {answer.fallback_code && (
                          <p className="player-fallback">
                            {t(`player.${answer.fallback_code}`)}
                          </p>
                        )}
                        {answer.status === "conflicting" && (
                          <p className="player-fallback">
                            {t(
                              "The selected rulebooks disagree. Check the cited sources before deciding.",
                            )}
                          </p>
                        )}
                        {answer.paragraphs.map((paragraph, index) => (
                          <div className="player-paragraph" key={index}>
                            <p>{paragraph.text}</p>
                            <div className="player-citations">
                              {paragraph.source_ids.map((sourceId) => {
                                const row = answer.sources.find(
                                  (source) => source.id === sourceId,
                                );
                                return (
                                  row && (
                                    <button
                                      key={sourceId}
                                      onClick={() => openSource(sourceId)}
                                    >
                                      {t("Source {number}", {
                                        number: answer.sources.indexOf(row) + 1,
                                      })}{" "}
                                      · {location(row)}
                                    </button>
                                  )
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {answer.language !== language &&
                          answer.paragraphs.length > 0 && (
                            <p className="player-input-help">
                              {t(
                                "This answer keeps its original language. Ask again to receive an answer in the current interface language.",
                              )}
                            </p>
                          )}
                        {answer.status === "no_matches" && (
                          <p>
                            {t(
                              "No matching rule section was found. Try the exact name of a card or action, or check the selected rulebooks.",
                            )}
                          </p>
                        )}
                        {answer.status === "insufficient" && (
                          <p>
                            {t(
                              "The available excerpts do not support a reliable answer. Add details or check whether the relevant rulebook is published.",
                            )}
                          </p>
                        )}
                        {answer.timings && (
                          <p className="player-input-help">
                            {t(
                              "Search: {search}s · Explanation: {explanation}s",
                              {
                                search: (
                                  answer.timings.search_ms / 1000
                                ).toFixed(1),
                                explanation: (
                                  answer.timings.explanation_ms / 1000
                                ).toFixed(1),
                              },
                            )}
                          </p>
                        )}
                        {answer.sources.length > 0 && (
                          <div className="player-sources">
                            <h4>{t("Original rule sections")}</h4>
                            {answer.sources.map((row, index) => (
                              <details
                                key={row.id}
                                open={answer.status === "search_results"}
                              >
                                <summary>
                                  <span className="player-source-number">
                                    {index + 1}
                                  </span>
                                  <span>
                                    <strong>{row.heading || t("Rules")}</strong>
                                    <small>
                                      {row.filename} · {location(row)}
                                    </small>
                                  </span>
                                </summary>
                                <p
                                  className="player-source-content"
                                  lang={row.language}
                                >
                                  {row.content}
                                </p>
                                <button onClick={() => openSource(row.id)}>
                                  <Icon name="file" />
                                  {t("Open source")}
                                </button>
                              </details>
                            ))}
                          </div>
                        )}
                        {answer.assets.length > 0 && (
                          <div className="player-figures">
                            <h4>{t("Original figures from source pages")}</h4>
                            <div>
                              {answer.assets.map((asset) => (
                                <button
                                  key={asset.id}
                                  className="player-figure"
                                  onClick={() => setFigure(asset)}
                                  aria-label={t("Enlarge figure: {caption}", {
                                    caption:
                                      asset.caption ||
                                      t("Page {page}", { page: asset.page }),
                                  })}
                                >
                                  <img
                                    src={`/api/play/games/${selected}/assets/${asset.id}`}
                                    alt={
                                      asset.caption ||
                                      t("Original figure from the rulebook")
                                    }
                                    loading="lazy"
                                  />
                                  <span>
                                    {asset.caption || t("Original figure")} ·{" "}
                                    {t("Page {page}", { page: asset.page })}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </section>
              </>
            )}
            {!!error && (
              <div className="player-error error" role="alert">
                <p>{errorMessage(error, t)}</p>
                <button
                  className="button secondary"
                  onClick={() => setReload((value) => value + 1)}
                  disabled={busy}
                >
                  {t("Refresh library")}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
      {sourceOpen && (
        <Modal
          title={t("Original rule section")}
          onClose={() => {
            sourceRequest.current?.abort();
            setSourceOpen(false);
          }}
          wide
        >
          <div className="player-source-modal">
            {sourceBusy && <p role="status">{t("Loading source…")}</p>}
            {!!sourceError && (
              <p className="error" role="alert">
                {errorMessage(sourceError, t)}
              </p>
            )}
            {source && (
              <>
                <h3>{source.heading || t("Rules")}</h3>
                <p className="player-input-help">
                  {source.filename} · {location(source)}
                </p>
                <p className="player-source-content" lang={source.language}>
                  {source.content}
                </p>
                <a
                  className="button secondary"
                  href={`/api/play/games/${selected}/documents/${source.document_id}/original${source.page ? `#page=${source.page}` : ""}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="file" />
                  {t("Open original document")}
                </a>
              </>
            )}
          </div>
        </Modal>
      )}
      {figure && (
        <Modal
          title={figure.caption || t("Original figure")}
          onClose={() => setFigure(null)}
          wide
        >
          <div className="player-image-modal">
            <img
              src={`/api/play/games/${selected}/assets/${figure.id}`}
              alt={figure.caption || t("Original figure from the rulebook")}
            />
            <p>{t("Page {page}", { page: figure.page })}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
