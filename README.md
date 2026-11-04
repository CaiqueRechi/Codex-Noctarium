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
- Read/write authorization inherited from Rechi OS.
- Soft-delete-ready vault, context, entity, and document records.

Search, attachments, named versions, perspectives, vault import/export, remote hosting, and encryption at rest are not implemented yet.

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
```

Grant the intended Rechi OS user `write` access to the `vault` screen, then open `/vault` in Chrome. The initializer is explicit and idempotent; package installation does not create product data automatically.

Use the left explorer to locate a universe, context, or document. Selecting a document focuses every visual instance that shares its stable identity. The properties panel on the right accepts an optional type and up to 50 named scalar properties. Property changes do not alter the document ID, Markdown content, or revision.

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
