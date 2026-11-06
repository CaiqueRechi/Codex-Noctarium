# Crow Vault Canvas

<p align="center">
  <img src="resources/images/brand/cvc-logo-official.png" alt="Crow Vault Canvas cosmic crow logo" width="720">
</p>

Crow Vault Canvas (CVC) is a Laravel and React package that adds a private knowledge canvas to Rechi OS. The current vertical slice supports an authenticated path from universe to context to Markdown document, synchronous durable saving, and restoration of the user's canvas viewport.

## Current scope

- One fixed physical vault prepared for multiple vaults later.
- Arbitrarily deep universe/context hierarchies inside the vault, loaded one navigation slice at a time.
- Semantic zoom rendered with React Flow.
- Stable UUID document entities.
- Private immutable Markdown revision files with relational metadata.
- Additive database revision schema (`LONGTEXT` content plus JSON metadata) prepared for a later controlled content migration.
- Serialized vault storage quotas for bytes, filesystem entries, document size, and minimum free space.
- Explicit `pending`, `saving`, `saved`, and `failed` editor states.
- Persisted camera, focused hierarchy node, and focused document per authenticated user.
- Authorized vault explorer for locating universes, contexts, and documents.
- Shared entities displayed in multiple contexts without content duplication.
- Optional entity type and scalar properties managed after capture.
- Global or contextual, free or typed relations between entities.
- Independent persisted positions for each context-specific visual instance.
- Named perspectives with independent filters and layouts.
- Named, restorable vault versions with automatic recovery points.
- Authorized full-vault search across Markdown, tags, properties, contexts, and relations.
- Recoverable entity trash that preserves UUIDs, revisions, memberships, and valid relations.
- Private image and PDF attachments with strict validation, integrity checks, and authorized download.
- In-app save and queue status with visible pending, running, completed, failed, and stalled work.
- Versioned official cosmic-crow artwork, reduced UI mark, favicon, and monochrome presentation preset.
- Read/write authorization inherited from Rechi OS.
- Soft-deleted vault, context, entity, document, and relation records.

Vault import/export, remote hosting, and encryption at rest are not implemented yet.

## Host integration

CVC remains the source of truth for product code. Rechi OS installs it through a local Composer `path` repository and compiles its React source through host-owned Vite, TypeScript, ESLint, Vitest, and React Flow configuration.

The expected sibling layout is:

```text
work/
├── crow-vault-canvas/
└── rechi-os/
```

Rechi OS owns authentication, verified-user enforcement, screen permissions, database configuration, queue configuration, and the production build. CVC owns `/vault`, the knowledge domain, package migrations, private Markdown and attachment storage, and the canvas UI.

## Local setup

In Rechi OS, configure the package and private storage:

```dotenv
CVC_ENABLED=true
CVC_VAULT_NAME="Crow Vault Canvas"
# Optional; defaults to storage/app/private/cvc
CVC_STORAGE_ROOT=
# Optional fail-closed private-storage capacity controls
CVC_MAX_MARKDOWN_BYTES=2097152
CVC_MAX_VAULT_BYTES=1073741824
CVC_MAX_VAULT_ENTRIES=10000
CVC_MINIMUM_FREE_BYTES=104857600
# Optional operational-history controls
CVC_OPERATION_HISTORY_LIMIT=20
CVC_OPERATION_STALE_AFTER_SECONDS=300
```

Then run:

```bash
composer install
npm ci
php artisan migrate
php artisan cvc:initialize
php artisan cvc:reindex
```

Grant the intended Rechi OS user `write` access to the `vault` screen, then open `/vault` in Chrome. The initializer is explicit and idempotent; package installation does not create product data automatically.

Use the left explorer to enter any universe or context and create another level beneath it. The hierarchy has no application-level depth limit; the server returns only the active node and its immediate children, while breadcrumbs preserve the route back to the root. Authorized search can open the context that contains a result before focusing every visual instance that shares its stable identity. Search accepts optional context, entity-type, and tag filters. The properties panel on the right accepts tags, an optional type, and up to 50 named scalar properties. Metadata changes do not alter the document ID, Markdown content, or revision.

Private Markdown files remain the canonical content store in this release. `cvc_document_revisions` can already receive immutable revision content in `LONGTEXT`, extensible JSON metadata, the SHA-256 hash, and the exact byte count; `cvc_documents.current_revision_id` can select the confirmed row. Production read/write paths do not use this table yet. The later cutover must backfill and verify every revision before changing reads, then dual-write and compare hashes before retiring file-backed content. Attachments remain in private file storage.

`cvc:reindex` queues existing entities in configurable chunks. New writes update the derived index through the Laravel queue configured by Rechi OS.

The trash panel moves the focused entity, its document, and active relations out of the normal canvas without erasing their records. Restoration returns the entity to every previous context with the same UUID, revision, and layout. Relations removed with the entity are restored only when both endpoints still exist; manually deleted relations never return automatically, and unresolved endpoints are reported in the panel.

The attachment panel accepts PNG, JPEG, GIF, WebP, and PDF files up to 5 MB. CVC verifies the extension, detected MIME type, file signature, supported image structure or PDF envelope, and SHA-256 before storing the file outside the public web root. Downloads remain behind the vault read permission and are forced as non-cacheable attachments; duplicate bytes for the same entity are rejected.

The operational panel keeps save state and recent queue work inside the vault interface. It refreshes once after a successful document save and polls only while at least one task is pending or running; a slow request is never overlapped by another poll. Search-index tasks move from waiting to running and only report completion after the worker returns successfully. Terminal or dispatch failures use safe messages without exception details. Pending or running work without a recent confirmation is marked as requiring attention; no e-mail, push, or external notification is sent.

## Verification

Package PHP tests:

```bash
composer test
```

Host verification from Rechi OS:

```bash
php artisan test
npm run test:react
npm run types:check
npm run lint:check
WAYFINDER_GENERATE=false npm run build
composer audit --locked
npm audit
```

On Windows PowerShell, set `$env:WAYFINDER_GENERATE='false'` before the build command when Wayfinder generation is not required.

## Documentation

- [Product requirements](docs/requirements/crow-vault-canvas.md)
- [Vertical-slice architecture](docs/architecture/vertical-slice.md)
- [MVP architecture](docs/architecture/mvp.md)
- [Unbounded hierarchy and database revision transition](docs/architecture/unbounded-hierarchy-and-database-revisions.md)
- [Vertical-slice traceability](docs/traceability/vertical-slice.md)
- [MVP technical readiness](docs/traceability/mvp-readiness.md)

## Brand assets

- `resources/images/brand/cvc-logo-official.png` preserves the definitive artwork supplied by Caique without modification.
- `resources/images/brand/cvc-mark-reduced.png` is the transparent square derivative used in the vault header and favicon.
- `.cvc-brand-mark--monochrome` applies a one-color presentation to the same reduced mark without maintaining a divergent redraw.

## Security boundary

All vault routes require the Rechi OS web, authentication, verified-user, and screen-access middleware outside testing. Mutations require `vault:write`, CSRF protection, validation, and throttling. Context creation is scoped to the configured vault, trims and validates names on the server, and serializes sibling ordering under a database lock. The canvas sends Laravel's `XSRF-TOKEN` cookie as the `X-XSRF-TOKEN` header, so the host only has to keep that cookie enabled; if it is missing, the page asks for a reload instead of sending the request. Markdown is edited as plain text and is not rendered as raw HTML in this slice.

Storage paths are generated from validated UUIDs, confined to the configured private root, and checked with SHA-256 when reopened. Markdown revisions are immutable, and a failed write never advances the database revision or reports a successful save. Attachment filenames never determine storage paths; files are created exclusively with restrictive permissions and are not served by the public filesystem.

All private writes pass through one per-vault filesystem lock. Before opening the destination, CVC reserves the exact missing path entries and checks the configured document ceiling, cumulative vault bytes, cumulative entry count, and minimum host free-space reserve. Invalid or unsafe capacity configuration fails closed. Retention and physical purge remain a separate product decision required before final MVP acceptance.
