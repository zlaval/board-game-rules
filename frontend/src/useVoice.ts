import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { MessageError } from "./i18n";
import type { Language } from "./i18n";

export function useVoice(
  onText: (text: string) => void,
  language: Language,
  maxBytes: number,
) {
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const pending = useRef(false);
  const supported =
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  function cleanup() {
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }
  function cancel() {
    generation.current += 1;
    pending.current = false;
    controller.current?.abort();
    if (recorder.current) {
      recorder.current.onstop = null;
      if (recorder.current.state !== "inactive") recorder.current.stop();
    }
    recorder.current = null;
    cleanup();
    setRecording(false);
    setRequesting(false);
    setTranscribing(false);
    setError(null);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      controller.current?.abort();
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state !== "inactive") recorder.current.stop();
      }
      cleanup();
    };
  }, []);

  async function start() {
    if (pending.current || recorder.current) return;
    setError(null);
    if (!supported) {
      setError(new MessageError("errors.microphone_unavailable"));
      return;
    }
    const token = ++generation.current;
    pending.current = true;
    setRequesting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || token !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((mime) => MediaRecorder.isTypeSupported(mime));
      const instance = new MediaRecorder(
        media,
        mimeType ? { mimeType } : undefined,
      );
      recorder.current = instance;
      const parts: Blob[] = [];
      let size = 0;
      instance.ondataavailable = (event) => {
        if (!event.data.size) return;
        size += event.data.size;
        if (size > maxBytes) {
          cancel();
          setError(new MessageError("errors.audio_too_large"));
        } else parts.push(event.data);
      };
      instance.onerror = () => {
        cancel();
        setError(new MessageError("errors.recording_failed"));
      };
      instance.onstop = async () => {
        cleanup();
        setRecording(false);
        recorder.current = null;
        const audio = new Blob(parts, { type: instance.mimeType });
        if (!audio.size) {
          setError(new MessageError("errors.empty_audio"));
          return;
        }
        setTranscribing(true);
        const abort = new AbortController();
        controller.current = abort;
        const form = new FormData();
        const extension = instance.mimeType.includes("mp4")
          ? "mp4"
          : instance.mimeType.includes("ogg")
            ? "ogg"
            : "webm";
        form.append("file", audio, `question.${extension}`);
        form.append("language", language);
        try {
          const result = await api<{ text: string }>("/play/transcriptions", {
            method: "POST",
            body: form,
            signal: abort.signal,
          });
          if (mounted.current && !abort.signal.aborted) onText(result.text);
        } catch (error) {
          if (mounted.current && !abort.signal.aborted) setError(error);
        } finally {
          if (mounted.current && !abort.signal.aborted) setTranscribing(false);
        }
      };
      instance.start(1000);
      setRecording(true);
      timer.current = setTimeout(
        () => instance.state === "recording" && instance.stop(),
        60_000,
      );
    } catch (error) {
      if (!mounted.current || token !== generation.current) return;
      cleanup();
      setError(
        new MessageError(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "errors.microphone_denied"
            : "errors.recording_failed",
        ),
      );
    } finally {
      if (mounted.current && token === generation.current) {
        pending.current = false;
        setRequesting(false);
      }
    }
  }
  return {
    recording,
    requesting,
    transcribing,
    error,
    supported,
    start,
    stop: () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
    },
    cancel,
  };
}
