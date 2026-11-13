# Working context

Where the work stands and how to pick it up. Updated on 2026-11-13 after the
complete cosmic-canvas branch stack was integrated and verified. The product
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

## Known problems

- Holding Ctrl for a whole drag pans the camera instead of moving the note,
  so the Ctrl drop never pinned in the browser check; pressing Ctrl only at
  the drop was not tried. The phone menu "Fixar / Liberar" pins without Ctrl.
- In the browser check a free drag moved the note about 64 % of the pointer's
  path, and twice every body shifted by exactly (−0.135, −0.135) px. Neither
  was investigated.
- Caique found the navigation "on the right path" but not fluid.
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

1. **RF-11, the "Meus Projetos" seeder** — last in the delivery order, not
   started. Section 5.1 of the specification lists its rules.
2. **Encryption (D-14)** — blocked: key derivation, password change and the
   administrator's copy are still open. When built, the content measure
   moves to the browser and parts of phases 6 to 8 change.
3. Open decisions: zoom animation timings (D-12), migration of existing
   layout and data (D-13), environments and operation (D-15).
4. The editor still opens over the whole screen instead of expanding on the
   canvas (RF-02).
5. Decide separately whether technical identifiers follow the product name;
   the current identifiers intentionally remain compatible.

## Local environment

Keep this package and `rechi-os` as sibling directories. The package checks
below use the host's pinned frontend dependencies without copying sources into
the host's `vendor` directory.

For a host-level release check, configure the Rechi OS `.env`, run its MySQL
migrations, compile with `WAYFINDER_GENERATE=false npm run build`, and exercise
the authenticated `/vault` screen with read and write permissions. Those steps
are intentionally separate from the package's source-level checks.

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
