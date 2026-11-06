# MVP technical readiness

Status recorded on 2026-11-05 for the local Docker MVP integrated into Rechi OS.

## Implemented scope

| Requirement | Implemented evidence |
| --- | --- |
| RF-01 to RF-04 | Authorized vault opening, semantic navigation, durable document editing, conflict handling, and workspace restoration |
| RF-05 | Authorized vault explorer with stable shared entity identity |
| RF-06 | Vault-scoped queued search across Markdown and approved metadata |
| RF-07 | Optional entity type, tags, and bounded scalar properties |
| RF-08 | Global/contextual relations and independent context layouts |
| RF-09 | Manual and derived independent perspectives |
| RF-10 | Named versions, validated restoration, and automatic recovery points |
| RF-11 | Entity trash, provenance-aware relation recovery, and broken-link warnings |
| RF-12 | Private validated image/PDF attachments up to 5 MB |
| RF-13 | Honest save and queue status without raw exception disclosure |
| RF-14 | Feature-flagged `/vault` package mounted behind Rechi OS authentication and permissions |

The official brand source, reduced mark, favicon use, monochrome preset, and replaceable theme tokens are versioned with the package.

## Security close

The repository-wide Standard scan of revision `6f88b80` reviewed 175 tracked files and reported one medium availability finding: persistent Markdown revisions and attachments had no cumulative capacity boundary. No critical or high vulnerability survived validation.

The subsequent fix adds:

- a 2 MiB default ceiling for each Markdown revision;
- a 1 GiB default cumulative vault byte quota;
- a 10,000-entry default filesystem quota, including zero-byte revisions;
- a 100 MiB default host free-space reserve;
- exact missing-path entry reservation under a per-vault cross-process lock;
- fail-closed handling for invalid limits or unverifiable free space.

The capacity guard bounds host impact. Retention, compaction, and physical purge remain a separate lifecycle decision rather than being silently invented by the implementation.

Online `composer audit --locked` and `npm audit` both returned zero advisories after the dependency lock updates.

## Current automated verification

- CVC package PHP: 48 tests, 361 assertions.
- Rechi OS PHP gate: Pint passed, PHPStan passed with zero errors, PHPUnit passed 78 of 80 tests with 509 assertions and 2 existing skips.
- React/Vitest: 14 files, 44 tests.
- Configured frontend coverage: 78.04% statements and 77.95% lines.
- TypeScript, ESLint, Prettier, Composer strict validation, and production Vite build: passed.
- Dependency audits: zero Composer advisories and zero NPM vulnerabilities.

## Remaining before product acceptance

These items do not require more undiscovered MVP functionality; they require product calibration or real-use evidence:

1. define the benchmark volume for notes, relations, and rendered elements, then validate the 3-second open and 60 FPS targets;
2. calibrate semantic-zoom thresholds and hysteresis in Chrome with that volume;
3. approve retention, compaction, and physical-purge rules for soft-deleted data and immutable revisions;
4. measure the 300 ms normal-save target on the selected local Docker environment;
5. complete the intended 30-day primary-vault usage period without returning to Obsidian for covered workflows.

Encryption, remote hosting, import/export, multiple physical vaults, free-form drawing, and repository CI remain explicitly outside this MVP.

## Release boundary

The technical implementation is suitable for local acceptance testing after the storage-capacity fix is committed and the Rechi OS integration gate remains green. Remote deployment stays prohibited until the separate encryption, persistence, and remote-hosting review is complete.
