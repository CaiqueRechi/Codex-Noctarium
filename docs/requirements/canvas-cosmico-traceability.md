# Cosmic canvas implementation traceability

Updated: 2026-11-08. Contract: `canvas-cosmico.md` and
`canvas-cosmico-formulas.md`. No production changes or push performed.

## Phase 1 — RF-06 autosave

Branch: `cm-canvas-cosmico-autosave`. Rechi approved D-08 and starting with RF-06,
then authorized automatic continuation into subsequent phases. No dependencies
were installed. Existing uncommitted database, capture, and navigation work was
preserved; only autosave-related changes were selected into these commits.

| Requirement | State | Implementation | Verification | Commits |
| --- | --- | --- | --- | --- |
| RF-06 (RN-10, RN-11; RNF-03, RNF-04) | implemented | `resources/js/documents/document-autosave.ts`, `save-request.ts`, `use-document-autosave.ts`, `document-editor.tsx`; `resources/js/pages/vault.tsx`; `resources/css/cvc.css` | `resources/js/tests/document-autosave.test.ts`, `document-save-request.test.ts`, `autosave-page.test.tsx`; existing `vault-page.test.tsx` adapted | `c41d7f6`, `2b75160`, `4c560c9` |
| Canonical source checks | implemented | `tooling/vitest.config.mjs`, `tooling/tsconfig.json`, `eslint.config.mjs` | Uses the existing sibling host toolchain against package sources; no package download | `b2f9cbf` |

Observed results:

- 74 React tests passed in 10 files against canonical package sources, including
  43 new autosave/request/integration cases. Fake timers verify exact deadlines
  and retry counts; integration tests use real page/editor components, mocked
  React Flow/Inertia boundaries, and mocked HTTP.
- TypeScript check passed for the package source and tests using the existing
  host types. Targeted ESLint check passed for the changed autosave code/tests.
- The isolated autosave page selected for the commit also passed 21 page tests
  and the TypeScript check independently of inherited uncommitted navigation work.
- Existing real-SQLite verification passed 9 checks for migrations, context moves,
  encrypted revisions, stale revision protection, quota rollback, identity binding,
  backfill idempotence, and migration rollback/reapply. This is baseline evidence,
  not browser, HTTP, MySQL, or complete encryption validation.
- The initial sandboxed PHPUnit invocation could not open its configured
  `vendor/autoload.php` bootstrap. A later approved execution outside that
  restriction passed all 63 package PHP tests (427 assertions) before the
  note/subspace migration phase. No PHP code was changed for RF-06.
- No live browser journey or production host refresh was performed. Canonical
  source checks do not update the installed package copy or running local app.

Security review for this phase:

- Mutations reuse the existing document endpoint, expected revision check,
  authorization, server validation, CSRF middleware, and configured write throttle.
  No public creation endpoint or new server write path was introduced.
- Tests verify a same-origin PATCH with the CSRF cookie header and no request
  when that cookie is missing. Conflicts and authorization failures stop retries.
- Draft HTML remains textarea text and never becomes executable markup.
- Error responses are mapped to safe messages; server details are not displayed.
- Drafts remain in memory. Integration tests observe no Web Storage writes or
  IndexedDB opens. Pending-close warnings clear only after confirmed saving.
- No newly exposed secrets or security issue found in this change's reviewed
  paths. This is a scoped check, not a repository-wide security audit.

## Phase 2 — RF-02 title presentation (RN-08)

Branch: `cm-canvas-cosmico-labels`, created from refreshed `origin/main` and
fast-forwarded through the validated autosave phase before continuing. Existing
uncommitted work remains preserved in the working tree.

| Requirement | State | Implementation | Tests | Commits |
| --- | --- | --- | --- | --- |
| RN-08 and title limit in RF-02/RNF-06 | implemented | `resources/js/canvas/truncate-canvas-title.ts`, `knowledge-node.tsx` | `resources/js/tests/canvas-title.test.tsx` (12 cases) | `17a5643`, `8b8184f` |
| Complete RF-02 cosmic editor | partial | Existing editor and full names retained; cosmic expansion and full property/type editing remain | No claim of complete RF-02 acceptance | Pending |

Labels show at most 20 grapheme clusters followed by an ellipsis only when
truncated. Segmentation preserves composed accents, flags, and family emoji.
The original string is unchanged and remains available in the title attribute
and existing document editor. A reusable segmenter holds no note content.

Observed phase results: 12 focused title tests passed; the full canonical
frontend suite passed 86 tests in 11 files. TypeScript and targeted lint checks
passed. No dependency, migration, endpoint, database mutation, or running-service
restart was introduced.

Security review: titles render as escaped React text and an escaped attribute;
the markup test confirms an HTML-looking title creates no image element. No
new record-writing surface or sensitive-data copy was introduced. No issue found
in the changed rendering path. No live browser journey was performed.

## Phase 3 — RF-03 mathematical foundation

Branch: `cm-canvas-cosmico-math`, created from refreshed `origin/main` and
fast-forwarded through the earlier validated phases. D-01 through D-06 and the
note/subspace model of D-14 are approved in specification section 15.2.

| Requirement | State | Implementation | Tests | Commits |
| --- | --- | --- | --- | --- |
| Own content, unique descendants, fixed area budget (D-01/D-02) | implemented as domain arithmetic | `resources/js/canvas/math/content-weight.ts`, `hierarchy-weight.ts`, `space-budget.ts`, `validate-measure.ts` | `cosmic-content.test.ts` (32 cases) | `f87af10` |
| Scalar force laws, circular area, coordinate and camera arithmetic (D-03/D-06) | implemented as domain arithmetic | `resources/js/canvas/math/forces.ts`, `geometry.ts` | `cosmic-forces.test.ts` (13 cases) | `473176f` |
| Complete RF-03 simulation and persistence | partial | Headless simulator, metric collection, renderer, hit testing, viewport observation, position/fixation persistence, and browser verification remain | Not claimed complete | Pending |

Observed results: all 131 canonical frontend tests passed in 13 files. TypeScript
and targeted lint passed for the package source and mathematical modules/tests.
The numerical budget test conserves X within absolute tolerance 1e-12 for 1000
allocations; an iterative hierarchy test handles 10000 levels without recursive
stack overflow. These are test scenarios, not approved production volume targets.

`measureOwnContent` takes source text and already-counted structural metrics.
It does not parse Markdown into top-level blocks or fetch note bodies. The
normal-note caller must supply raw Markdown and top-level block counts; the
flowchart caller must supply editable node/edge text and structural counts,
excluding serialization and external links. Metric collection is separate work.
Unique descendants are memoized only within each traversal. No cross-space or
persistent cache retains content; a new input snapshot produces fresh results.

Security review: no endpoint, write path, browser storage, or rendered HTML was
introduced. Numeric inputs reject invalid values/overflow, graphs reject cycles
and missing references, and duplicate allocations are rejected. Input maps and
source strings are not modified. No issue found in these changed paths.

An isolated two-body numerical probe found that contact coefficient 20 could
leave two area-0.4 bodies nearly coincident. Rechi explicitly approved correcting
that coefficient to 32 before simulator implementation. This probe does not
constitute validation of a production simulator or visual interaction.

## Phase 4 — RF-03 headless physical simulation

Branch: `cm-canvas-cosmico-simulation`, based on refreshed main with prior phases
integrated by fast-forward. Code and new capability tests: `f82bd41`.

Implementation: `resources/js/canvas/physics/cosmic-simulation.ts`,
`simulation-body.ts`, `simulation-parameters.ts`, and `spring-connections.ts`.
The engine copies scene input, caches same-space connection counts for that
immutable scene, accumulates fractional frame time, applies simultaneous pair
forces, and integrates in fixed steps. Scene replacement must build a new engine
so connection data cannot remain stale. No note content is stored by the engine.

`cosmic-simulation.test.ts` passed 15 cases for unconnected gravity, fixed-body
influence, link reinforcement, recovery from coincident large notes with contact
32, deterministic ordering, damping/rest, wake after move/release, equal results
at 30/60/120 Hz, bounded catch-up after suspended tabs, immutable inputs, and
invalid scenes. Full frontend suite: 146 passing tests in 14 files; TypeScript
passed. Scoped lint checks passed for the new engine and tests.

The engine has no hard enclosing boundary under D-05. It does not animate
flowchart content. Input links must refer to bodies inside its scene; exterior
connection indicators are a separate UI concern. Configurations that would
request more than 1024 substeps in one advance are rejected as unsafe; approved
defaults use at most eight. Numeric errors fail closed instead of committing
invalid body positions. Pinned positions are preserved exactly.

Security review: no endpoint, record write, rendered user text, persistent cache,
or secret was introduced. IDs only determine reproducible directions. Inputs and
parameter values are checked, duplicate identities and foreign endpoints fail,
and elapsed time cannot trigger unbounded catch-up under accepted settings.
No issue found in these changed paths.

The scene renderer, metric collection, note/subspace schema, touch hit targets,
viewport observation, and position/fixation integration remain to be implemented.
This engine is tested domain code, not a claim that the visible Vault already
runs the new simulation.

Backend baseline before schema work: 63 package PHP tests passed, with 427
assertions, using the existing environment and an approved execution outside the
Windows sandbox file-access restriction. No dependency download was needed.

## Remaining requirements

| Requirement | State | Next work / blocker |
| --- | --- | --- |
| RF-01 | blocked | Cosmic creation/zoom and touch rules require D-05, D-06, D-12; existing contextual capture draft is preserved |
| RF-02 | partial | RN-08 title display implemented; cosmic expansion, complete note properties/type UI, and camera integration remain |
| RF-03 | partial | Arithmetic and headless simulator tested; metric collection and UI/persistence integration remain |
| RF-04 | blocked | Flowchart domain/UI and persistence contract require clarification before adding schema |
| RF-05 | blocked | D-07 textual format and multiple-block behavior remain open |
| RF-07 | blocked | D-11 proximity/fade and root search behavior remain open |
| RF-08 | blocked | Shared subspace model approved under D-01/D-14; movement of a particular participation and D-13 policies remain |
| RF-09 | blocked | D-10 directions/overlap/physics and transition parameters remain open |
| RF-10 | blocked | D-09 counter events and prefix normalization remain open |
| RF-11 | blocked | Fixture identity/tombstone handling, final persistence, and flowchart format must support examples without replacing edits |

Follow-up questions are asked only when their decisions block the next phase.
No open physical constant, formula, migration policy, or content format has been
silently chosen. The user authorized continuation across phases; unresolved
product decisions still require an answer.

Next implementation: additive note/subspace integration under D-14, followed
by renderer/interaction wiring. D-05/D-06 UI rules are approved
but not implemented by their arithmetic helpers alone. Product questions for
later requirements remain separate and must not be silently resolved.
