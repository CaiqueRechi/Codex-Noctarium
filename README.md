# Crow Vault Canvas

Crow Vault Canvas (CVC) is a Laravel and React package that adds a private knowledge canvas to Rechi OS. The current vertical slice supports an authenticated path from universe to context to Markdown document, synchronous durable saving, and restoration of the user's canvas viewport.

## Current scope

- One fixed physical vault prepared for multiple vaults later.
- Multiple universes and contexts inside the vault.
- Semantic zoom rendered with React Flow.
- Stable UUID document entities.
- Private immutable Markdown revision files with relational metadata.
- Explicit `pending`, `saving`, `saved`, and `failed` editor states.
- Persisted camera and focused document per authenticated user.
- Authorized vault explorer for locating universes, contexts, and documents.
- Shared entities displayed in multiple contexts without content duplication.
- Optional entity type and scalar properties managed after capture.
- Global or contextual, free or typed relations between entities.
- Independent persisted positions for each context-specific visual instance.
- Named perspectives with independent filters and layouts.
- Named, restorable vault versions with automatic recovery points.
- Authorized full-vault search across Markdown, tags, properties, contexts, and relations.
- Recoverable entity trash that preserves UUIDs, revisions, memberships, and valid relations.
- Read/write authorization inherited from Rechi OS.
- Soft-deleted vault, context, entity, document, and relation records.

Attachments, vault import/export, remote hosting, and encryption at rest are not implemented yet.

## Host integration

CVC remains the source of truth for product code. Rechi OS installs it through a local Composer `path` repository and compiles its React source through host-owned Vite, TypeScript, ESLint, Vitest, and React Flow configuration.

The expected sibling layout is:

```text
work/
├── crow-vault-canvas/
└── rechi-os/
```

Rechi OS owns authentication, verified-user enforcement, screen permissions, database configuration, queue configuration, and the production build. CVC owns `/vault`, the knowledge domain, package migrations, private Markdown storage, and the canvas UI.

## Local setup

In Rechi OS, configure the package and private storage:

```dotenv
CVC_ENABLED=true
CVC_VAULT_NAME="Crow Vault Canvas"
# Optional; defaults to storage/app/private/cvc
CVC_STORAGE_ROOT=
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

Use the left explorer or authorized search to locate a universe, context, or document. Selecting a search result focuses every visual instance that shares its stable identity. Search accepts optional context, entity-type, and tag filters. The properties panel on the right accepts tags, an optional type, and up to 50 named scalar properties. Metadata changes do not alter the document ID, Markdown content, or revision.

`cvc:reindex` queues existing entities in configurable chunks. New writes update the derived index through the Laravel queue configured by Rechi OS.

The trash panel moves the focused entity, its document, and active relations out of the normal canvas without erasing their records. Restoration returns the entity to every previous context with the same UUID, revision, and layout. Relations removed with the entity are restored only when both endpoints still exist; manually deleted relations never return automatically, and unresolved endpoints are reported in the panel.

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
- [Vertical-slice traceability](docs/traceability/vertical-slice.md)

## Security boundary

All vault routes require the Rechi OS web, authentication, verified-user, and screen-access middleware outside testing. Mutations require `vault:write`, CSRF protection, validation, and throttling. The canvas sends Laravel's `XSRF-TOKEN` cookie as the `X-XSRF-TOKEN` header, so the host only has to keep that cookie enabled; if it is missing, the page asks for a reload instead of sending the request. Markdown is edited as plain text and is not rendered as raw HTML in this slice.

Storage paths are generated from validated UUIDs, confined to the configured private root, created as immutable revision files, and checked with SHA-256 when reopened. A failed write never advances the database revision or reports a successful save.
