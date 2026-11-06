# Unbounded hierarchy and database revision transition

## Decision status

Accepted and implemented on 2026-11-06. This decision extends the MVP without changing the current canonical Markdown write path.

## Arbitrary-depth knowledge hierarchy

One physical vault can contain any number of root universes. Every universe or context can contain another context, so the application does not impose a maximum nesting depth. Root rows have `parent_id = null`; all other rows reference their immediate parent in `cvc_contexts`.

The browser never receives the complete recursive tree. `GET /vault/contexts` returns roots and their immediate children. `GET /vault/contexts/{context}` returns the focused node, its immediate children, entities in that slice, and iterative breadcrumbs to the root. `children_count` tells the interface whether another level exists without loading it. This keeps payload and React Flow work proportional to the visible slice rather than total vault size.

`POST /vault/contexts` creates a root universe when `parent_id` is null and a child context otherwise. The server trims and validates the name, scopes the parent to the configured vault, locks the parent or vault while calculating sibling order, and retries transactional deadlocks. Creation is protected by Rechi OS authentication, verified-user and `vault:write` authorization, CSRF, and a 30-per-minute throttle.

The current node is stored in `cvc_workspace_states.focus_context_id`. Reopening `/vault` restores that slice. Search results include one containing context ID, allowing the client to open a result outside the current slice before focusing the entity. Breadcrumb construction is iterative and rejects a detected cycle; a later move/reparent feature must prevent cycles before writing.

The composite `(vault_id, parent_id, sort_order)` index supports scoped sibling reads. Its migration restores the MySQL foreign-key support index before dropping the composite index, because MySQL may replace the implicit `vault_id` index during migration. The migration has been exercised as `migrate → rollback → migrate` against MySQL.

## Prepared database revision model

The accepted target is a hybrid relational model:

- relational columns hold identity, ordering, foreign keys, format, hash, size, and timestamps;
- `LONGTEXT` holds document content without JSON escaping or document-size coupling;
- nullable JSON metadata carries schema-versioned, format-specific extension data;
- attachments remain in private filesystem storage with their existing validation and authorized streaming boundary.

`cvc_document_revisions` is append-only by design. Each row has a UUID, `entity_id`, monotonic `revision`, `format`, `content`, `metadata`, `content_hash`, `content_bytes`, and timestamps. `(entity_id, revision)` is unique. `cvc_documents.current_revision_id` is nullable and uses restricted deletion so a selected revision cannot disappear accidentally.

The table is prepared but not yet used by production document reads or writes. Private immutable Markdown files remain authoritative, and the existing `storage_path`, `revision`, and `content_hash` contract remains unchanged. This avoids introducing two competing sources of truth before migration and recovery behavior has dedicated tests.

## Required cutover sequence

Changing the canonical store is a separate implementation and must keep every step reversible:

1. backfill existing immutable file revisions in bounded Laravel queue chunks;
2. verify UUID scope, exact bytes, SHA-256, and revision ordering before accepting each row;
3. dual-write new revisions while files remain authoritative;
4. compare both stores and expose mismatch progress through safe operational states;
5. enable database reads behind an explicit reversible configuration;
6. keep file fallback until a defined observation period and backup restore test pass;
7. decide retention and removal of historical files only after the soft-delete and purge policy is approved.

No automatic file deletion, import/export, encryption design, or attachment migration is part of this decision.

## Security and performance consequences

All hierarchy and revision access remains behind the Rechi OS route middleware. Context lookups and creation are vault-scoped; user text is returned as JSON and rendered by React as escaped text. No raw Markdown HTML is introduced. The context mutation is throttled, and no credentials or content are placed in URLs, logs, or frontend caches.

Hierarchy data is intentionally not cached because the active slice is mutable, permission-bound, and small. Lazy loading is the primary performance control. Revision content is not cached client-side and is not exposed by a new endpoint in this preparatory stage.
