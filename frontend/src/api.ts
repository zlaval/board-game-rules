import { getLanguage, MessageError } from "./i18n";
import type { Params } from "./i18n";

export class ApiError extends MessageError {
  constructor(
    public status: number,
    key: string,
    params: Params = {},
  ) {
    super(key, params);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept-Language", getLanguage());
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const key =
      typeof data.code === "string"
        ? `errors.${data.code}`
        : response.status === 413
          ? "errors.upload_too_large"
          : "errors.request_failed";
    throw new ApiError(response.status, key, data.params ?? {});
  }
  return response.json() as Promise<T>;
}

export type Game = {
  id: string;
  title: string;
  edition: string;
  language: string;
  description: string;
  document_count: number;
  processing_count: number;
  published_count: number;
  created_at: string;
};
export type Document = {
  id: string;
  filename: string;
  format: string;
  language: string;
  size_bytes: number;
  status: string;
  version_id: string | null;
  stage: string | null;
  stage_code: string | null;
  stage_params: Params;
  progress: number | null;
  error: string | null;
  error_code: string | null;
  page_count: number;
  character_count: number;
  chunk_count: number;
  asset_count: number;
  has_published: boolean;
  published_version_id: string | null;
  ai_status: "none" | "complete" | "partial" | "failed" | "limited";
  ai_error_code: string | null;
};
export type Preview = {
  version: {
    id: string;
    status: string;
    stage: string;
    ai_status: Document["ai_status"];
    ai_error_code: string | null;
  };
  chunks: {
    id: string;
    ordinal: number;
    heading: string;
    content: string;
    page: number | null;
    source_ref: string;
    translation_en: string;
    translation_hu: string;
  }[];
  assets: { id: string; caption: string; page: number | null }[];
  total_chunks: number;
};
