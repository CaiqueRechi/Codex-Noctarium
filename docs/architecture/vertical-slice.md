# Vertical-slice architecture

This document preserves the original file-backed vertical-slice design. The current arbitrary-depth navigation and the prepared database revision schema are documented in [Unbounded hierarchy and database revision transition](unbounded-hierarchy-and-database-revisions.md); private Markdown files remain canonical until that separate cutover is implemented.

## Boundary

Crow Vault Canvas is a package, not a second Laravel application. Rechi OS is the runtime host and owns infrastructure concerns. The package exposes product behavior through service-provider registration, reversible migrations, routes, application services, domain models, private storage, and React source.

```text
Authenticated browser
        |
        v
Rechi OS middleware and permissions
        |
        v
CVC routes and application services
       / \
      v   v
 MySQL   private Markdown root
```

React Flow is a visual adapter. Its nodes, edges, viewport, and selection are not the canonical knowledge model.

## Runtime flow

1. Rechi OS authenticates and verifies the user and checks `vault:read`.
2. `OpenVault` loads the fixed vault, its universes, contexts, and document summaries.
3. `OpenWorkspaceState` restores the user's camera and focused document.
4. Semantic zoom reveals universe, context, and document detail without entering edit mode.
5. Creating a note generates a stable entity UUID, writes an empty private Markdown revision, and attaches the entity to the selected context.
6. Opening a document verifies its storage boundary and SHA-256 hash before returning content.
7. Saving locks the document metadata, checks the expected revision, writes a new immutable file, flushes it, and only then advances the database pointer.
8. Returning to the canvas restores the captured viewport; it does not perform document undo.

## Persistence model

| Table | Purpose |
| --- | --- |
| `cvc_vaults` | Physical vault identity and name |
| `cvc_contexts` | Universe/context hierarchy |
| `cvc_entities` | Stable knowledge identity independent of representation |
| `cvc_context_entity` | Many-to-many context participation |
| `cvc_documents` | Current Markdown revision pointer and integrity hash |
| `cvc_attachments` | Private image/PDF metadata, generated path, and integrity hash |
| `cvc_operations` | Authorized background-task state and safe failure messages |
| `cvc_workspace_states` | Camera and focused entity per host user |

Markdown files use generated paths beneath the configured private root:

```text
vaults/{vaultUuid}/entities/{entityUuid}/revisions/{revision}-{writeUuid}.md
```

The files are immutable. The database selects the confirmed current revision. A database failure after a completed filesystem write can leave an inaccessible orphan file, but it cannot replace or lose the previously confirmed revision. Orphan reconciliation belongs to a later maintenance phase.

## Concurrency and failure behavior

- Document updates carry an expected revision.
- A stale revision returns HTTP `409` and does not overwrite current content.
- Storage exceptions roll back relational changes.
- The browser retains the draft and displays `failed`; leaving the editor remains disabled while the draft differs from the confirmed content.
- Camera persistence is independent of document revisions.
- Derived indexing runs through tracked Laravel queue jobs and never gates canonical Markdown saving; future preview or compaction jobs must preserve the same rule.

## Security controls

- Rechi OS authentication, verified-user, and screen-permission middleware.
- Separate read and write access levels.
- Laravel CSRF protection on mutations. The browser reads the host's `XSRF-TOKEN` cookie and sends it as `X-XSRF-TOKEN`; the package does not depend on a `csrf-token` meta tag in the host layout. The host must keep issuing that cookie and must not exclude it from cookie encryption.
- Document and workspace throttling.
- Server-side UUID and numeric-range validation.
- Fixed-vault scoping on every entity and context lookup.
- Generated paths only; no client-supplied file path.
- Root confinement after resolving filesystem paths and directories.
- Exclusive file creation, explicit flush, filesystem sync, and SHA-256 verification.
- React text rendering and textarea editing only; no raw Markdown HTML rendering in this phase.
- Soft delete on vault, context, entity, and document records.
- Composer and NPM audits with zero known findings at phase close.

## Provisional decisions

- Semantic zoom thresholds and hysteresis are implementation defaults subject to usability tests.
- Docker volume mapping for the private Markdown root will be finalized with the host Docker setup.
- Soft-delete retention and physical purge policy must be decided before MVP acceptance.
- The official logo variants and encryption at rest remain later work.
