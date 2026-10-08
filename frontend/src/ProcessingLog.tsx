import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useI18n, errorMessage } from "./i18n";
import type { Params } from "./i18n";

type Entry = { time: string; code: string; params: Params };
type Job = {
  id: string;
  filename: string;
  state: string;
  attempts: number;
  stage: string;
  stage_code: string;
  stage_params: Params;
  progress: number;
  elapsed_seconds: number;
  step_elapsed_seconds: number;
  details: Record<string, number>;
  events: Entry[];
};
const statuses: Record<string, string> = {
  queued: "queued",
  running: "processing",
  done: "ready",
  failed: "failed",
};
const languages: Record<string, string> = {
  en: "English",
  hu: "Hungarian",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  both: "English and Hungarian",
};

export default function ProcessingLog({ gameId }: { gameId: string }) {
  const { t, language } = useI18n();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  const [follow, setFollow] = useState(true);
  const view = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    setJobs([]);
    setSelected("");
    setError(null);
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const result = await api<{ jobs: Job[] }>(
          `/games/${gameId}/processing`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setJobs(result.jobs);
          setError(null);
          setTick(0);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e);
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [gameId, language]);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const job = jobs.find((item) => item.id === selected) ?? jobs[0];
  const last = job?.events.at(-1)?.time;
  useEffect(() => {
    if (follow && view.current)
      view.current.scrollTop = view.current.scrollHeight;
  }, [last, job?.id, follow]);
  function eventText(entry: Entry) {
    const params = { ...entry.params };
    for (const key of ["language", "source_language", "usage_language"])
      if (typeof params[key] === "string")
        params[key] = t(
          languages[params[key] as string] ?? (params[key] as string),
        );
    if (typeof params.stage === "string") {
      const [code, device] = params.stage.split(" (");
      params.stage = t(`stages.${code}`) + (device ? " (" + device : "");
    }
    if (typeof params.status === "string")
      params.status = t(`ai.${params.status}`);
    return t(`events.${entry.code}`, params);
  }
  return (
    <section className="processing-terminal" aria-label={t("Processing log")}>
      <header>
        <h3>{t("Processing log")}</h3>
        <label className="terminal-follow">
          <input
            type="checkbox"
            checked={follow}
            onChange={(event) => setFollow(event.target.checked)}
          />
          {t("Follow log")}
        </label>
      </header>
      {job && (
        <>
          <label className="sr-only" htmlFor="processing-job">
            {t("Processing task")}
          </label>
          <select
            id="processing-job"
            value={job.id}
            onChange={(event) => setSelected(event.target.value)}
          >
            {jobs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.filename} · {t(`statuses.${statuses[item.state]}`)}
              </option>
            ))}
          </select>
          <div className="terminal-status">
            <span>
              {job.stage} · {job.progress}%
            </span>
            <span>
              {t("Elapsed: {seconds}s", {
                seconds:
                  job.elapsed_seconds + (job.state === "running" ? tick : 0),
              })}
            </span>
            {job.state === "running" && (
              <span>
                {t("Current step: {seconds}s", {
                  seconds: job.step_elapsed_seconds + tick,
                })}
              </span>
            )}
            {job.details.batches && (
              <span>{t("Batch {batch}/{batches}", job.details)}</span>
            )}
            {job.details.total_chunks && (
              <span>
                {t(
                  "Indexed sections: {completed_chunks}/{total_chunks}",
                  job.details,
                )}
              </span>
            )}
            <span>{t("Attempt {count}", { count: job.attempts })}</span>
          </div>
        </>
      )}
      {!!error && (
        <p className="error" role="alert">
          {errorMessage(error, t)}
        </p>
      )}
      <div
        ref={view}
        className="terminal-lines"
        role="log"
        aria-live="off"
        tabIndex={0}
        aria-label={t("Processing events")}
      >
        {!job && <p>{t("No processing tasks yet.")}</p>}
        {job && !job.events.length && (
          <p>{t("Waiting for processing events…")}</p>
        )}
        {job?.events.map((entry, index) => (
          <div
            className={`terminal-line ${entry.code.includes("failed") ? "terminal-error" : ""}`}
            key={entry.time + index}
          >
            <time dateTime={entry.time}>
              {new Date(entry.time).toLocaleTimeString(
                language === "hu" ? "hu-HU" : "en-GB",
              )}
            </time>
            <span>{eventText(entry)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
