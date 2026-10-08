# Fragmented rule retrieval and explanation timings

Date: 2026-10-08.

The question `hogy lehet harcolni falvak ellen?` exposed incomplete context selection in the published Hungarian Civilization book. The 864 original fragments and their embeddings were present. Village entry/setup/outcome rules were on PDF page 20; the shared combat procedure was on pages 23–25. Extraction was not repeated for this change.

The old search treated `ellen` as a prefix, promoting unrelated enemy-city rules. Its 16-fragment context and immediate-neighbor expansion included only part of the village procedure and omitted the referenced combat rules. An initial live reproduction retrieved in 1.12 seconds and generated a partial explanation in 7.71 seconds. The user's original unsuccessful response was not persisted, so its exact model output cannot be reconstructed.

## Changes

- Ignore generic `ellen`/`against` terms in lexical retrieval; semantic retrieval still receives the complete question.
- Take 12 semantic candidates and combine them with lexical results via rank fusion.
- Expand up to three leading contiguous heading groups, within a 24-fragment window on each side of the hit, plus adjacent exceptions.
- Follow up to two explicit HU/EN page hints from those groups, including up to two continuation pages, always in the same selected version.
- Keep the original source fragments and IDs; bound model context to 160 fragments and 32,000 content/heading characters. The small-book complete-context shortcut remains unchanged.
- Restrict response source/figure IDs to the supplied IDs using dynamic JSON-schema enums, retaining source membership and figure-page checks. Unknown and missing citations still fall back to original excerpts.
- Remove redundant internal `[S…]` labels after checking IDs; the UI presents source buttons.
- GPT-6 Luna/Sol explanations use low reasoning effort for up to 40 fragments and medium for larger contexts, with a bounded 2,400-token output. A lower-effort real-book probe blurred fixed non-player setup with general player setup, so extended contexts retain reasoning. Prompting favors concise target-specific setup and outcomes. Model identity remains `gpt-6-luna`.
- Return server search/explanation/total timings; the EN/HU reader displays search and explanation time without storing questions or answer history.

## Validation

- Targeted reader and selected-version semantic checks cover fragmented setup/outcome rules, referenced continuation pages, document isolation, context limits, allowed IDs, source buttons, fallback, conflicts and timings.
- 20 targeted checks passed; the project-configured Ruff check passed.
- Frontend production build passed.
- A live expanded-context probe supplied 113 original fragments / 17,667 content-and-heading characters, covering village setup, outcomes and combat pages. Retrieval took 0.32 seconds and generation 5.34 seconds in that run. These are individual observations, not a latency guarantee.
- Chromium submitted the actual village question through the deployed Hungarian reader. It returned an answer with page 20/23/24/25 citations; server timings were 440 ms search, 6,384 ms explanation and 6,824 ms total. Desktop/mobile layout and the timing label passed without page errors or horizontal overflow.
- The later medium-effort comparison clearly separated the fixed three first-level defenders from the attacking player's hand, and included combat bonuses and tie-breaking. It took 0.29 seconds for retrieval and 11.11 seconds for generation. The faster configuration is not used for this extended context; API generation remains the main latency cost.
- The final deployed reader used medium reasoning for this context and returned the target-specific setup, separate attacking hand, normal combat, bonuses, ties and village outcomes. Final browser timing: 433 ms search, 8,770 ms explanation, 9,204 ms total; HU desktop/mobile checks passed. The new large-context reasoning regression and four related SDK cases passed (21 distinct targeted checks across the runs).

Page hints refer to physical PDF page positions. Printed numbering offsets still require a separate mapping. Full source membership checks do not verify every generated claim; the original excerpts remain available for review.
