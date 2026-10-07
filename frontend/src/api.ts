export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      typeof data.detail === "string"
        ? data.detail
        : response.status === 413
          ? "A feltöltött fájl túl nagy."
          : "A kérés nem sikerült. Ellenőrizd a megadott adatokat.";
    throw new ApiError(response.status, message);
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
  progress: number | null;
  error: string | null;
  page_count: number;
  character_count: number;
  chunk_count: number;
  asset_count: number;
  has_published: boolean;
  published_version_id: string | null;
};
export type Preview = {
  version: { id: string; status: string; stage: string };
  chunks: {
    id: string;
    ordinal: number;
    heading: string;
    content: string;
    page: number | null;
    source_ref: string;
  }[];
  assets: { id: string; caption: string; page: number | null }[];
  total_chunks: number;
};
