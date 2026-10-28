# Rule retrieval and explanation context

Reader queries are limited to the selected game and published rulebook versions. Original extracted fragments and their identifiers are preserved throughout retrieval and explanation generation.

## Selection

- Combine multilingual keyword matching with pgvector cosine similarity when embeddings are available. Generic words such as `against`/`ellen` do not dominate lexical retrieval.
- Fuse semantic candidates and lexical matches, expand leading contiguous heading groups and include neighboring exceptions.
- Follow up to two explicit English/Hungarian page references, including continuation pages within the same selected version.
- Bound the context to 160 original fragments and 32,000 content/heading characters. Small selected rulebooks of at most 40 chunks within the character limit can be included in full.

The answer schema restricts source and figure identifiers to those supplied. The server also validates membership and figure-page associations. Invalid citations fall back to original excerpts. Derived translations and keywords assist retrieval; original rules provide factual evidence.

## Timings and limitations

Responses expose search, explanation and total timings. The interface displays search and explanation durations without persisting question history. Provider latency, document structure and context size affect total time; no response-time guarantee is implied.

Page hints use actual PDF positions. Printed-page offsets can miss the intended section, and bounded expansion can omit distant exceptions. Source validation does not establish semantic correctness of every explanation. Original sources remain available for review.

## Validation checklist

The [isolated backend tests](development.md) cover fragmented setup/outcome rules, referenced continuation pages, selected-document isolation, context bounds, permitted source IDs, conflicts, fallbacks and timing fields. Browser checks cover source buttons, figures and responsive timing labels.

For quality acceptance, prepare questions with known source references, including exceptions, negative rules, page cross-references, missing evidence and conflicting editions. Compare answers with the original rules. Use representative documents you have permission to process; synthetic checks alone do not establish retrieval quality across arbitrary books.
