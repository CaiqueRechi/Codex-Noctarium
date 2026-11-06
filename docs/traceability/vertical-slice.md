# Vertical-slice traceability

This is the historical vertical-slice checkpoint. Current arbitrary-depth hierarchy and database revision preparation are tracked in [MVP technical readiness](mvp-readiness.md) and the [transition architecture](../architecture/unbounded-hierarchy-and-database-revisions.md).

## Acceptance coverage

| Requirement | Implemented behavior | Primary automated evidence |
| --- | --- | --- |
| RF-14 | Feature flag, `/vault` host mount, authenticated and verified access, read/write screen permission, local package boundary | `PackageRoutingTest`, `PackageDisabledTest`, `CrowVaultCanvasIntegrationTest` |
| RF-01 | Fixed vault opens with its initial universe | `VaultInitializationTest::test_rf_01_opening_the_vault_returns_its_initial_universe` |
| RF-02 | Idempotent initialization, initial context, semantic zoom without entering edit mode | `VaultInitializationTest::test_rf_02_initialization_creates_a_navigable_context_idempotently`, `vault-page.test.tsx`, `semantic-zoom.test.ts` |
| RF-03 | Note creation without mandatory metadata, exact Markdown reopen, synchronous confirmed save, retained draft on failure | `DocumentEditingTest`, `LocalMarkdownStorageTest`, `vault-page.test.tsx`, host RF-03 integration test |
| RF-04 | Persisted viewport and focus, return without content undo | `WorkspaceStateTest`, `vault-page.test.tsx`, host RF-04 integration test |

## Security assertions

| Property | Evidence |
| --- | --- |
| Guest cannot open the vault | Host integration test redirects guests |
| Authenticated user without permission is forbidden | Host integration test returns `403` |
| Read-only user cannot write | Host integration test returns `403` on document creation |
| Document lookup cannot cross the fixed vault | Application queries scope entity and context by configured vault ID |
| Path traversal is rejected | `LocalMarkdownStorageTest` rejects untrusted IDs and external paths |
| Failed storage does not produce false success | `DocumentEditingTest` keeps revision/hash unchanged; React test keeps the draft visible |
| Stale writes do not overwrite | `DocumentEditingTest` expects `409` and reopens confirmed content |
| Migration is reversible | `VaultInitializationTest::test_vault_migration_can_be_rolled_back_and_reapplied` |
| Known dependency vulnerabilities | `composer audit --locked` and `npm audit` both returned zero findings at phase close |

## Historical vertical-slice verification

The following numbers are the original vertical-slice checkpoint executed on 2026-10-30, not the current MVP totals:

- CVC PHP: 14 tests, 83 assertions.
- Rechi OS PHP: 70 tests, 347 assertions; 2 tests skipped by the existing suite.
- React/Vitest: 12 files, 33 tests.
- Frontend coverage: 86.04% statements, 85.82% lines for the configured scope.
- TypeScript: passed with no emitted output.
- ESLint: passed.
- Production Vite build: passed with CVC bundled as a host page.
- Composer audit: zero advisories.
- NPM audit: zero vulnerabilities.

The optional Fontaine optimization notice and the pre-existing large game chunk warning do not block the CVC vertical slice.

## Delivered commits

The CVC branch `cm-crow-vault-canvas-vertical-slice` contains separate commits for package isolation, feature-flag normalization, flag coverage, vault initialization, semantic navigation, durable document editing, and workspace restoration.

The matching Rechi OS branch contains separate commits for package mounting, initialized-vault exposure, frontend compilation, secure document integration, workspace integration, and dependency security patches.

No push or deployment is part of this phase close.

Current technical-close evidence and remaining acceptance work are maintained in [MVP technical readiness](mvp-readiness.md).
