export type PlayerGame = {
  id: string;
  title: string;
  edition: string;
  description: string;
  language: string;
  document_count: number;
};
export type RuleDocument = {
  id: string;
  filename: string;
  language: string;
  version_id: string;
  page_count: number;
};
export type RuleSource = {
  id: string;
  document_id: string;
  version_id?: string;
  filename: string;
  heading: string;
  content: string;
  page: number | null;
  ordinal: number;
  source_ref: string;
  language: string;
};
export type RuleAsset = {
  id: string;
  caption: string;
  page: number;
  version_id: string;
};
export type RuleAnswer = {
  language: "en" | "hu";
  status:
    | "answered"
    | "conflicting"
    | "insufficient"
    | "search_results"
    | "no_matches";
  paragraphs: { text: string; source_ids: string[] }[];
  sources: RuleSource[];
  assets: RuleAsset[];
  fallback_code: string | null;
  timings?: { search_ms: number; explanation_ms: number; total_ms: number };
};
export type Capabilities = {
  explanations: boolean;
  transcription: boolean;
  max_audio_bytes: number;
};
