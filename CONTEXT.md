# Working context

Where the work stands and how to pick it up. Updated on 2026-11-12, at the
end of a session that built most of the cosmic canvas redesign. The product
contract is `docs/requirements/canvas-cosmico.md` (with its formulas); the
detail of every change, with what was and was not verified, is in
`docs/requirements/canvas-cosmico-traceability.md`, phases 9 to 20. This file
is the map; those are the territory.

## Product name

The product was renamed **Codex Noctarium** on 2026-11-12, with a new logo.
The rename lives on its own branches, not in the stack below:

| Repository | Branch | Based on |
| --- | --- | --- |
| crow-vault-canvas | `cm-renomear-codex-noctarium` | `main` |
| rechi-os | `cm-renomear-codex-noctarium` | `cm-crow-vault-canvas-mvp` |

Technical identifiers keep the old name on purpose (package, namespace,
`crow-vault-canvas` config key, `cvc_*` tables, `CVC_*` variables, `cvc:*`
commands, `cvc.*` routes, `cvc-*` classes); renaming them is a separate
decision for Caique. An existing vault keeps "Crow Vault Canvas" stored in its
row until renamed there.

## Branches

Every branch starts from the one above it; together they make one pull
request into `main`, from `cm-fluxograma`. Each item ends with its own
`docs:` commit.

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

The Rechi OS side of the integration is still on `cm-crow-vault-canvas-mvp`
in `rechi-os`, which `main` there does not have.

## Not verified yet

Read this before trusting any of the above.

- **No suite was run** for anything since phase 11. Tests were written with
  each item, at Caique's request, to be run once everything is built. Run the
  package PHP suite and the frontend suite first and fix what fails.
- The **flowchart item was not even type checked**; the run was interrupted.
- The **page tests still expect the header** that phase 11 removed, so
  `vault-page.test.tsx` and parts of `vault-cosmic-space.test.tsx` will fail
  until updated.
- **Nothing after the palette was seen in a browser**: the editor, the
  gestures, the compass, the external connections, moving and deleting,
  the flowchart editor.
- Migrations `2026_11_12_000017` (note color) and `2026_11_12_000018` (use
  counters) never ran on MySQL; their rollback is covered only by tests that
  have not run.

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
5. Merge the rename branches, and decide whether technical identifiers
   follow the new name.

## Local environment

The checkouts live side by side in `Documents\CrowVaultCanvas` (this
package and `rechi-os` on `cm-crow-vault-canvas-mvp`); the Docker project
`rechi-os-cvc-local` is served from that `rechi-os`, at
`http://localhost:8081`.

- The `.env` there was copied from the earlier checkout so the existing
  MySQL volume and `APP_KEY` keep working. It adds
  `PHP_CLI_SERVER_WORKERS=4` and a local test user
  (`CVC_LOCAL_TEST_EMAIL`, `CVC_LOCAL_TEST_PASSWORD`) with write access to
  the `vault` screen.
- OPcache was turned on inside the container
  (`/etc/php/8.5/cli/conf.d/99-local-opcache.ini`, `opcache.enable_cli=1`,
  `validate_timestamps=0`). It brought `/up` from 4–10 s to 0.6 s. A PHP
  change needs `docker compose restart laravel.test`; recreating the
  container loses the file.
- The frontend is served from `npm run build` inside the container, not the
  Vite dev server: the Rechi OS content security policy allows only
  `127.0.0.1:5173` while Vite announces `localhost:5173`. Rebuild with
  `WAYFINDER_GENERATE=false npm run build` after changing package sources.
- Run `php artisan migrate` there before trying the branches above.

## Checks

From this repository, with the sibling `../rechi-os` toolchain:

```bash
composer test
node ../rechi-os/node_modules/vitest/vitest.mjs run --config tooling/vitest.config.mjs --configLoader native --pool=threads
node ../rechi-os/node_modules/typescript/bin/tsc --noEmit --project tooling/tsconfig.json
```

Inside the container, `npx tsc --noEmit` in `rechi-os` checks the package
sources through `vendor/caiquerechi/crow-vault-canvas`.

## How work is done here

Caique's standing conventions (the `crow:conventions` skill) apply: one
branch `cm-…` per task, one commit per change in English with no
co-authorship, tests with new development and apart from non-trivial
alterations, documentation in its own last commit, mistakes corrected by
new commits instead of rewrites, and a security check on every change. For
this canvas he asked to try changes by hand first and to run the suites only
when he says so.
