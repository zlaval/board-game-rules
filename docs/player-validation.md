# Player interface and voice input

The player opens at `/`. Choose a game and one or more published rulebooks, then ask a question. Local keyword search works without an API key. OpenAI configuration adds source-cited explanations, semantic retrieval and editable speech transcription.

## Sources and answers

The reader API searches only selected published versions. Answers expose original excerpts, source documents and related figures. PDF originals open with actual page references; text sources use stable section references. Figure association is page-based rather than verified recognition of individual cards or tokens.

Unknown or missing source identifiers, invalid figure references or provider failures fall back to original search results. Insufficient evidence and conflicting rules are visible states. Source membership checks cannot prove every generated claim is correct; inspect the original rules when necessary.

The interface defaults to English and remembers the selected language. New explanations use that language; original rules and existing answers retain theirs. Changing games or rulebook selection clears history. The latest six independent questions remain in browser memory until refresh; earlier questions are not supplied as conversational context.

## Microphone

Recording uses the browser's MediaRecorder API, lasts at most 60 seconds and is limited to 10 MB. The recognized text is editable and is not submitted automatically. Cancelling discards the recording. No audio-file upload fallback is provided.

Transcription needs a configured server-side OpenAI key, browser microphone support and permission. The application reports unavailable devices and permission errors. Browsers normally restrict capture to localhost or trusted HTTPS; enabling the microphone button on HTTP does not bypass browser restrictions. For phones accessing a server's LAN address, configure HTTPS with a certificate trusted by the device.

Question and transcription requests share a per-client rate limit and bounded provider concurrency. The server does not store recordings or question history. See [AI behavior](ai-validation.md) for provider data handling.

## Validation checklist

Use the [isolated browser tests](development.md). Check game and rulebook selection, search/no-match behavior, source/original access, language changes, URL reload, cited answers, figure enlargement, responsive layout and navigation. Provider output is mocked; microphone capture uses Chromium's synthetic microphone. The standalone upload/voice check also tests a genuine insecure HTTP origin and readable browser errors.

Before relying on phone input, manually check permission, recording, cancellation, transcription and source viewing on the intended Android/iOS browsers with trusted HTTPS. PWA installation and conversational follow-ups remain planned.
