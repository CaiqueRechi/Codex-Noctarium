# CVC MVP architecture

This document records the implemented MVP architecture after the accepted vertical slice. Product requirements remain authoritative for behavior that is not implemented yet.

## Authorized explorer

`OpenVault` loads the fixed authorized vault and the user's current hierarchy slice after the Rechi OS middleware has authenticated and authorized the request. A slice contains either all root universes or one focused node with its immediate children, entities, and document summaries. It never recursively serializes the complete vault.

`GET /vault/contexts` returns root universes, and `GET /vault/contexts/{context}` returns an authorized focused slice plus breadcrumbs. `POST /vault/contexts` creates either a root universe or a child context. The hierarchy has no application-level depth limit; iterative breadcrumb resolution detects cycles, and the `(vault_id, parent_id, sort_order)` index supports sibling navigation. The active context is stored in `cvc_workspace_states.focus_context_id`, so reopening the vault restores the same location.

An entity keeps one stable UUID even when it participates in several contexts. Each context creates a distinct React Flow visual node ID from the context ID and entity ID. Opening or editing always uses the stable entity ID, so visual instances never duplicate Markdown or history.

Explorer selection enters another server-approved slice, updates semantic detail, focuses matching canvas instances, and persists the resulting viewport and hierarchy focus through the authorized workspace endpoint. Search results carry a context ID so a result outside the loaded slice can be opened without loading the entire hierarchy.

## Prepared database document revisions

Private immutable Markdown files remain canonical for current create, open, save, search, version, quota, and recovery behavior. The schema extension is deliberately additive: it prepares the next integration without changing a proven write path in the same release.

`cvc_document_revisions` stores an immutable UUID, entity ID, monotonic revision number, format, `LONGTEXT` content, extensible JSON metadata, SHA-256 hash, exact byte count, and timestamps. `(entity_id, revision)` is unique. `cvc_documents.current_revision_id` is a nullable restricted foreign key that can select the confirmed database revision while existing `storage_path`, `revision`, and `content_hash` fields continue to describe the canonical file.

The later cutover is a separate change: backfill in bounded chunks, verify byte counts and hashes, dual-write while files remain authoritative, compare both stores, switch reads behind a reversible configuration, and only then decide whether file-backed Markdown can be retired. Attachments stay in private filesystem storage because relational blobs would not improve their current validation or delivery boundary.

## Entity properties

Capture remains unstructured. A document may later receive an optional `entity_type` and up to 50 scalar properties without changing its UUID, Markdown, or revision. Properties are stored as JSON metadata in `cvc_entities`; Markdown remains the canonical document content in private revision files.

`PATCH /vault/entities/{entity}` requires the host's authenticated write permission, CSRF token, and entity-write throttle. The server scopes the entity to the configured vault, validates property names and values, and rejects nested data. Empty properties are serialized to clients as an object to keep the frontend contract stable.

The properties panel edits only the focused entity. A successful response replaces every summary with the same stable ID, keeping shared visual instances synchronized without duplicating database rows.

## Relations and context layouts

`cvc_relations` stores soft-deletable links between stable entity IDs. A relation may be free or typed, directed or undirected, and global or scoped to a context. Contextual relations require both entities to participate in that context. Undirected endpoints are normalized before duplicate detection, so reversing the submitted endpoints cannot create the same relation twice.

The context/entity pivot stores position and pin state for each visual instance. Dragging one instance writes only its context-specific pivot row; the same entity can therefore keep a different position in every context without duplicating content.

The inspector can reuse the focused entity in another context, create relations, and soft-delete existing relations. Relation edges are derived for the current canvas payload, while the relational models remain the source of truth.

## Independent perspectives

`cvc_perspectives` stores a named filter configuration for the fixed vault. Filters can limit visible contexts and entity types without deleting or changing the underlying entities and relations. `cvc_perspective_layouts` stores position and pin state by perspective, context, and entity; the base context layout remains the fallback when a perspective has no override.

A manual perspective starts from the current base layout. A derived perspective copies its source filters and effective layouts inside one transaction. The source ID remains only provenance: later filter or layout changes write exclusively to the derived perspective, so the origin cannot drift.

The active perspective ID is part of the per-user workspace state. The React client applies filters and layout overrides only to the already authorized vault payload, while every mutation revalidates the perspective, context, and entity against the configured vault on the server. User-pinned items are never moved by an automatic layout flow; no automatic layout exists in this MVP stage.

## Named versions and recovery

`cvc_versions` stores immutable version records for one perspective. A schema-versioned JSON snapshot contains entity metadata, exact document revision pointers, context membership, the effective perspective layout, filters, and active relations. The snapshot stores no duplicate Markdown content: it references immutable private revision files and protects the canonicalized snapshot with SHA-256 so MySQL JSON key ordering cannot cause a false integrity failure.

Version creation and restoration require the authenticated write permission, CSRF protection, validation, and a dedicated throttle. Before restoration changes any database row, the server validates the snapshot scope and structure, confines every context and entity to the configured vault, reads every referenced Markdown file through the protected storage adapter, and verifies its content hash.

A successful restoration first captures the complete current state as an automatic recovery version in the same transaction. It then restores entity metadata and soft-delete state, document revision pointers, context membership, perspective filters and layouts, and active relations. Restoring that recovery version returns to the replaced state, so restoration never makes the current state unreachable.

## Authorized search index

`cvc_search_index` is a derived, vault-scoped projection of active Markdown content and searchable metadata: title, entity type, tags, scalar properties, context names, and relation text. `GET /vault/search` remains behind the host authentication and read-permission middleware, validates every filter against the fixed vault, applies a dedicated throttle, and returns at most 50 escaped result summaries. The index itself never leaves the server; the browser requests result summaries only from the authorized vault interface.

Document saves and metadata, membership, relation, and version-restoration mutations dispatch `IndexKnowledgeEntity` through the Laravel queue after their database transaction commits. `cvc:reindex` rebuilds existing data in bounded chunks without loading the complete vault into memory.

Every searchable mutation increments the entity's monotonic `search_version`. An indexing job captures that version and may publish only while holding the entity row lock and confirming both the current version and Markdown content hash. Older out-of-order jobs therefore cannot overwrite a newer projection. Search also joins the live entity and document rows, rejects soft-deleted records, and requires the indexed hash to match the current Markdown hash as defense in depth.

## Trash and relation recovery

Deleting an entity soft-deletes the entity, its Markdown document row, and every active relation that references it. Context membership, layout rows, immutable Markdown revisions, perspectives, and version snapshots remain intact. The mutation locks every affected entity in UUID order, increments each search version, and queues index refreshes only after the transaction commits; normal vault and search queries therefore stop exposing the entity immediately.

`cascade_deleted_by_entity_id` records that a relation became inactive because an entity entered the trash. Manual relation deletion clears this provenance first. Restoration considers only relations with cascade provenance, restores one only when both endpoints are active in the configured vault, and returns unresolved endpoint IDs as broken-relation warnings. This distinction prevents a trash restore from reviving a relation the user explicitly deleted.

The trash endpoints inherit the host's authenticated and verified-user middleware, require `vault:write`, use CSRF protection, and add a dedicated mutation throttle. All entity and relation lookups are scoped to the fixed configured vault. Version restoration clears obsolete cascade provenance before applying its authoritative relation snapshot.

## Secure private attachments

`cvc_attachments` stores attachment identity, the active parent entity, sanitized display name, detected MIME type, byte size, SHA-256, generated private path, and soft-delete state. The database prevents the same content hash from being attached to one entity more than once. Creation locks the active document entity before duplicate detection, so concurrent requests cannot bypass that invariant.

The upload endpoint requires authenticated write access, CSRF protection, and a dedicated throttle. It accepts PNG, JPEG, GIF, WebP, and PDF files up to 5 MB. `AttachmentInspector` requires agreement between the normalized extension, `finfo` MIME type, magic signature, and supported image structure or PDF envelope. SVG, unknown formats, mismatches, and oversized payloads are rejected before private storage is opened.

`LocalAttachmentStorage` ignores the client filename when choosing a path. It writes to a UUID-derived path below the configured CVC private root with exclusive creation, verifies the exact copied byte count, flushes the file, and applies restrictive permissions. Reads revalidate path ownership and root confinement and verify the stored SHA-256 before returning a stream.

Download resolution scopes both the attachment and its active parent entity to the configured vault. A trashed parent therefore makes its attachment unreachable without destroying the attachment record or bytes. The response uses `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, a sandboxed content security policy, and private no-store caching; CVC never embeds or executes uploaded files.

## Operational state and queue failures

`cvc_operations` records server-created task identity, fixed-vault scope, optional subject entity, operation type, progress, safe status message, error code, and timestamps. Search-index jobs are created as `pending`, become `running` when the worker starts, and become `succeeded` only after indexing returns without an exception. Laravel's terminal failure hook records `failed`; raw exception text remains in server logs and is never persisted for the browser.

Task creation, dispatch, and status updates are best-effort observability. A tracking-table or queue-dispatch failure is logged and, when possible, represented by the safe `search_index_dispatch_failed` state, but it cannot convert an already durable canonical mutation into a failed response. Likewise, an unavailable tracking row cannot prevent the derived indexing job from running.

The authorized `GET /vault/operations` endpoint inherits the host read middleware, scopes its bounded history to the configured vault, and uses a dedicated throttle. The React panel refreshes after a successful document save and then polls every ten seconds only while a task remains pending or running. An in-flight refresh blocks overlapping timer requests. Manual refresh remains available, a failed refresh preserves the previous state, and messages render as escaped text. Pending or running work with no update beyond the configured threshold is presented as `attention`, never as completed. The MVP sends no e-mail, push, or external operational notification.

## Brand identity

The repository preserves the user-supplied definitive artwork at `resources/images/brand/cvc-logo-official.png`. The header and PNG favicon consume a transparent reduced mark at `resources/images/brand/cvc-mark-reduced.png`; it adapts the composition for a square small-size surface without replacing the original source. A CSS monochrome preset transforms that same mark at render time, avoiding a second independently redrawn identity asset.

Vite imports the reduced mark through the package source and emits a hashed production asset in the Rechi OS build. The decorative header image has empty alternative text and `aria-hidden`; the visible CVC name remains the accessible identity.

## Private-storage capacity guard

Every Markdown revision and attachment write is serialized by a per-vault lock before opening its destination. While the lock is held, `StorageQuota` measures the current private tree and reserves the exact missing directory and file entries for the generated destination. It rejects the write when it would exceed cumulative bytes, filesystem entries, or the configured minimum free-space reserve. This closes the race in which two workers could independently pass a capacity check and overcommit the same vault.

Markdown also has an independent per-revision byte ceiling. The defaults are 2 MiB per Markdown revision, 1 GiB cumulative vault bytes, 10,000 vault filesystem entries, and 100 MiB of host free space. They are replaceable through `CVC_MAX_MARKDOWN_BYTES`, `CVC_MAX_VAULT_BYTES`, `CVC_MAX_VAULT_ENTRIES`, and `CVC_MINIMUM_FREE_BYTES`. Missing, non-positive, or otherwise unsafe effective limits fail closed instead of disabling protection silently.

The quota bounds host impact but does not decide product lifecycle. Immutable historical revisions, soft-deleted content, and orphan cleanup remain subject to the retention and physical-purge policy that must be approved before final MVP acceptance.

## Security and caching

React renders explorer labels, types, keys, and values as escaped text. No raw HTML or executable URL is accepted by these flows. Mutations are authorized, throttled, and validated on the server.

Explorer, property, relation, perspective, layout, and operational data are not cached because they are permission-bound and mutable. A future cache must include vault and authorization identity in its key and be invalidated by every related write.
