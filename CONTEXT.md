# Working context

Where the work stands and how to pick it up. Updated on 2026-11-25 on
`cm-fluidez-e-editor` (drag, camera timings, editor expansion, seeder run),
after the 2026-11-13 integration of the cosmic-canvas stack. The product
contract is `docs/requirements/canvas-cosmico.md` (with its formulas); the
detail of every change, with what was and was not verified, is in
`docs/requirements/canvas-cosmico-traceability.md`, phases 9 to 20. This file
is the map; those are the territory.

## Product name

The product was renamed **Codex Noctarium** on 2026-11-12, with a new logo.
The name, artwork and cosmic-canvas implementation are now part of the same
integrated history.

Technical identifiers keep the old name on purpose (package, namespace,
`crow-vault-canvas` config key, `cvc_*` tables, `CVC_*` variables, `cvc:*`
commands, `cvc.*` routes, `cvc-*` classes); renaming them is a separate
decision for Caique. An existing vault keeps "Crow Vault Canvas" stored in its
row until renamed there.

## Integrated delivery

The former stacked branches were consolidated from `main` through
`cm-fluxograma`, with the later Noctarium identity changes preserved. The
table remains as traceability for the delivered slices; it is no longer a
branching or deployment instruction.

| Branch | Item | Traceability |
| --- | --- | --- |
| `cm-canvas-cosmico-cena-visivel` | open space drawn by the physics; only the canvas on screen | phases 9, 10 |
| `cm-navegacao-zoom-canvas` | zoom navigation of D-12 into contexts and notes, subnotes, no header, zoom bounds of the workspace | browser check, phase 11 |
| `cm-ligacoes-entre-notas` | dot on a note's edge (link by drag, linked sibling by click); `/link` and `/l` | phase 12 |
| `cm-renomear-nota` | rename a note from its editor | phase 13 |
| `cm-paleta-rapinante-cosmico` | palette F and its fonts | phase 14, spec 15.5 |
| `cm-editor-e-gestos` | click opens a note, long press on a phone, connection list, note color | phase 15 |
| `cm-rosa-dos-ventos` | compass search (RF-07) | phase 16 |
| `cm-contadores-link` | access and search counters in the link score (D-09) | phase 17 |
| `cm-conexoes-externas` | links leaving the space, travel through the common ancestor (RF-09) | phase 18 |
| `cm-mover-e-lixeira` | move, "só daqui", delete with subnotes, seven-day purge (RF-08, D-13) | phase 19 |
| `cm-fluxograma` | flowchart notes and their mermaid conversion (RF-04, RF-05) | phase 20 |

## Verification on 2026-11-13

- PHP: 188 tests and 932 assertions passed on SQLite.
- Frontend: 315 tests in 28 files passed with the sibling Rechi OS toolchain.
- TypeScript: `tooling/tsconfig.json` passed with no errors.
- ESLint: the documented `resources/js/documents` and `vault.tsx` scope passed.
- Dependency checks: Composer and npm reported no known vulnerabilities.
- Codex Security reviewed the 92-file cosmic-canvas diff and found no
  reportable issue across authorization, vault isolation, private storage,
  purge, flowchart validation and browser rendering.

The two additive migrations have automated rollback/reapply coverage on
SQLite. A real MySQL migration run and an end-to-end browser session remain
deployment checks, not claims made by this source verification.

## Verification on 2026-11-25

See "Fluidity, editor expansion and seeder check" at the end of the
traceability. In short: the drag jump (the old "64 %") was the note's radius,
fixed; Ctrl drags and pins with real Ctrl events, and the old report of Ctrl
panning came from the testing tool; the canvas runs at 60 frames per second
in a drag, the settling and a zoom across levels; every camera transition
takes 250 ms (D-12); the editor grows out of the clicked note; buttons and the
editor header were redesigned; migrations 000017–000019 and
`cvc:seed-projects` ran on the local MySQL. Loading was slow because Laravel
booted without caches: `php artisan optimize` in the container took entering a
space from 876 ms to 324 ms. PHP: 189 tests / 943 assertions passed. Frontend:
320 tests in 29 files passed; TypeScript and ESLint passed.

## Known problems

- A drag with a physical Ctrl key has not been tried by a person; the check
  used scripted events.
- The editor expansion was checked in a background tab: the origin and the
  animation are set, but nobody has watched it run.
- The (−0.135, −0.135) px shift of every body seen on 2026-11-12 did not
  reappear and was not investigated.
- A space near 5,000 notes (D-15) has not been measured for fluidity.
- The Rechi OS middleware reads `screen_access_permissions` four times per
  request; it is most of the ~110 ms left per request after the caches.
- "Excluir" on a note without subnotes sends it to the trash with no
  question (D-13), right next to "Mover para…".
- A note's search index holds its stored content, so a flowchart's JSON keys
  can match a search.

## Consequences to keep in mind

- The trash deletes for good after seven days (`cvc:purge-trash`, scheduled
  daily by the package), files included. It runs only while the host's
  scheduler runs. A named version that held a purged note can no longer be
  restored; restoration refuses as a whole and changes nothing.
- A note's type lives in its content (`"format": "cvc-flowchart"`), not in a
  column, so restored versions bring back the right type.

## What is left

1. **Encryption (D-14)** — the key comes from a vault-only passphrase
   derived in the browser (PBKDF2 or Argon2), independent of the Rechi OS
   password (specification 15.6). Still to fix before building: algorithm
   and parameters, and how the administrator's copy is kept. When built, the
   content measure moves to the browser and parts of phases 6 to 8 change.
2. Open decisions: cancellation during a camera move (D-12), environments and
   operation (D-15).
3. Decide separately whether technical identifiers follow the product name;
   the current identifiers intentionally remain compatible.

## Local environment

Keep this package and `rechi-os` as sibling directories. The package checks
below use the host's pinned frontend dependencies without copying sources into
the host's `vendor` directory.

For a host-level release check, configure the Rechi OS `.env`, run its MySQL
migrations, compile with `WAYFINDER_GENERATE=false npm run build`, and exercise
the authenticated `/vault` screen with read and write permissions. Those steps
are intentionally separate from the package's source-level checks.

In the local Docker environment, run `php artisan optimize` inside the Rechi
OS container: without the config, route and event caches every request
boots Laravel through the Windows share, about 480 ms before any work. Run it
again after changing routes or config, or clear it with
`php artisan optimize:clear`.

## Checks

From this repository, with the sibling `../rechi-os` toolchain:

```bash
composer test
node ../rechi-os/node_modules/vitest/vitest.mjs run --config tooling/vitest.config.mjs --configLoader native --pool=threads
node ../rechi-os/node_modules/typescript/bin/tsc --noEmit --project tooling/tsconfig.json
node ../rechi-os/node_modules/eslint/bin/eslint.js resources/js/documents resources/js/pages/vault.tsx
```

Inside the container, `npx tsc --noEmit` in `rechi-os` checks the package
sources through `vendor/caiquerechi/crow-vault-canvas`.

## How work is done here

Caique's standing conventions apply: one
branch `cm-…` per task, one commit per change in English with no
co-authorship, tests with new development and apart from non-trivial
alterations, documentation in its own last commit, mistakes corrected by
new commits instead of rewrites, and a security check on every change.
