# Cosmic canvas implementation traceability

Updated: 2026-11-10. Contract: `canvas-cosmico.md` and
`canvas-cosmico-formulas.md`. No production changes. Phases 1 to 5 are on
`main`; the work of 2026-11-10 was pushed on `cm-implementação-canva` for a pull
request into `main`. The latest state and how to resume are in the checkpoint at
the end of this page.

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
excluding serialization and external links. Metric collection for normal notes
arrived later, in phase 6.
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

## Phase 5 — note/subspace backend checkpoint (in progress)

Checkpoint requested by Rechi on 2026-11-08: stop development, save context, and
push the current branch `cm-canvas-cosmico-note-spaces`. This is a review branch,
not a completed release or acceptance of the whole redesign.

| Change | Implementation / evidence | Commit |
| --- | --- | --- |
| Reconcile existing context movement | Existing rename/move endpoint and three tests retained as a prerequisite | `a574881` |
| Keep new PHP test names in camelCase | Pint configuration follows standing conventions | `e6a3553` |
| Stable shared note spaces | Additive `cvc_note_spaces` association, idempotent creation, cycle guards, independent layouts, deleted-owner checks, user/IP throttles, `spaceId` and `ownerEntityId` response fields | `5c020b5` |
| Content for legacy contexts | Reusable private Markdown writer, one document per existing context, preserved children/identity, title synchronization, searchable context content | `7b805a4` |

Observed validation:

- Initial association tests: 11 passing tests / 69 assertions, including rollback
  and reapplication of the new migration while preserving existing documents.
- After rate-limit coverage, the exact staged package passed all 69 tracked PHP
  tests / 519 assertions independently of the uncommitted storage prototype.
- After adding legacy context content, the affected PHP selection passed 31
  tests / 273 assertions (context documents, note spaces, editing, search, versions).
- The last complete frontend run remains 146 passing tests in 14 files; no visual
  integration was made in this backend phase.
- A subsequent version-specific regression reproduction ran 2 tests / 6 assertions
  with **1 failure**. That local test file was never committed; it was rewritten
  from the reproduction below on 2026-11-10, when the issue was fixed.

### Restoration cycle integrity issue (fixed 2026-11-10)

Restoring a membership snapshot could reintroduce a cycle after contexts had
moved. Reproduction: capture V0 with note B outside context A; attach B to A and
capture V1; restore V0; move A inside B's owned space; restore V1. The last step
accepted A → B → A instead of rejecting it. The reproduction is
`tests/Feature/NoteSpaceVersionTest.php`, method
`testRf03RejectsAnOlderMembershipSnapshotThatWouldCreateACycleWithCurrentContextPositions`.

Fix, on branch `cm-implementação-canva`: after the memberships are restored,
`RestoreVaultVersion` asks `NoteSpaceHierarchy::containsCycle()` about the whole
active context/note-space graph and rejects the restoration with a 422 `version`
validation error, inside the transaction, so memberships and the recovery
version are rolled back. `CreateVaultVersion` and `RestoreVaultVersion` now take
the vault row lock first, the order used by graph writes. Behaviour and the way
out for the user are described in `docs/architecture/mvp.md`.

Observed on 2026-11-10: the regression failed before the fix (422 expected, 200
received) and passes after it; the file's 2 tests pass with 12 assertions,
including valid restoration of legacy context content without changing the
owned-space identity. The complete package suite passed 77 PHP tests / 576
assertions on SQLite, from 75 / 564 before the change. Not verified: the lock
order under real concurrency or on MySQL, which a single-connection SQLite run
cannot exercise; the frontend suite, untouched by this change, was not rerun;
Pint is not installed in the package, so the formatter was not run.

Security review: the rejection message is fixed text with no identifiers or
server detail. The endpoint keeps its session, authorization, CSRF and version
throttle. No new write path, cache or stored data; the graph is read live inside
the transaction on purpose. No issue found in the changed paths.

### Integration and rollback limits

The new migration's down removes the association table. It preserves existing
documents and content, but does not preserve newly populated ownership links.
Do not treat rollback after adoption as lossless; plan preservation of those
associations before using it on user data. Only local fixture rollback was run.

New creation endpoints inherit session, authorization, CSRF, and existing write
middleware, plus 30 requests/minute per identity and 60/minute per IP for the new
space/context-content writes. IP keys are hashed. Foreign vaults and deleted
owners are rejected; shared descendants are allowed, while direct/descendant
attachment cycles are rejected. The restoration gap above is closed.

No production migration, service restart, dependency installation, merge, or
deployment was performed. The running host copy was not refreshed. Earlier
uncommitted storage/navigation work remains local; it was not folded wholesale
into these commits. Local context memory is excluded from Git separately.

## Phase 6 — RF-03 normal-note metric collection

Branch: `cm-implementação-canva`, 2026-11-10. This closes the gap left by phase
3 for normal notes: the caller no longer has to count blocks itself.

| Requirement | State | Implementation | Tests |
| --- | --- | --- | --- |
| `B_i`, top-level Markdown blocks of a normal note | implemented as domain arithmetic | `resources/js/canvas/math/markdown-blocks.ts` (`countTopLevelMarkdownBlocks`) | `cosmic-markdown-blocks.test.ts` (16 cases) |
| `C_i` of a normal note from its raw Markdown | implemented as domain arithmetic | `measureNormalNoteContent` in `content-weight.ts` | same file (3 cases) |
| Metrics of a flowchart note (`V_i`, `E_i`, editable text) | blocked | Needs the flowchart format of RF-04 | — |
| Delivering each note's measure to the canvas | implemented in phase 7 | Server-side measure sent with the context slice | see phase 7 |

How to use it: pass the note's raw Markdown source to
`measureNormalNoteContent`; the result is `C_i`, ready to be an `ownContent` in
`calculateHierarchicalContentWeight`. Use it only for normal notes. A flowchart
note measured this way would count its serialization as text, which the
formulas forbid.

The counter is a single line-by-line pass with no dependency, because adding a
Markdown parser needs explicit consent. It applies the rule of section 1 of
`canvas-cosmico-formulas.md` (a paragraph, heading, list, quote, table or code
block counts once; descendants are not counted again; blank lines create
nothing) and takes these details from CommonMark. They are implementation
readings of that rule, not new product decisions, and are easy to change:

- a list is one block across blank lines and nested content; changing the
  bullet character, or `.` to `)`, starts another list;
- a paragraph is interrupted by a bullet item or by an ordered item numbered 1,
  never by an empty item or another number;
- fenced code runs to a closing fence of the same character and at least the
  same length, or to the end of the note;
- a quote ends at a blank line; unindented text right after a quote, list or
  paragraph continues it;
- `---` or `===` under a paragraph makes it a heading, not a second block;
- a thematic break is a block of its own.

Known limits: raw HTML is counted as paragraphs, so an HTML comment or `<pre>`
containing blank lines counts more than once; fenced code inside a list item
is followed by indentation only; a table is not validated, it counts as the
run of lines it occupies. None of these changes the text measure `T_i`.

Observed results: the 19 new cases pass; the complete frontend suite passed 157
tests in 12 files; TypeScript and ESLint passed for the package source, and the
new files follow the host Prettier options. In this checkout the baseline before
the change was 138 tests in 11 files, not the 146 in 14 files recorded in phase
4: the difference matches test files that were never committed. The checks ran
through local copies of `tooling/` pointing at the host by absolute path,
because this checkout has no sibling `../rechi-os`. No browser journey was run,
and nothing visible uses the measure yet.

Security and performance review: pure functions with no endpoint, storage,
rendered text or secret. A test feeds 20000 paragraphs and a 40000-character
line of repeated list markers to confirm the pass stays linear and does not
backtrack. Nothing is cached here; the measure depends only on the source, so a
caller may cache it per document revision. No issue found in the changed paths.

### Decision: the server computes each note's measure

The canvas needs `C_i` for every note of a space, and it holds only the body of
the note being edited. On 2026-11-10 Rechi chose to have the server store the
measure of each document and send it with the context slice, instead of having
the browser download every body. Phase 7 implements it.

## Phase 7 — RF-03 content measure stored and delivered by the server

Branch: `cm-implementação-canva`, 2026-11-10.

| Change | Implementation | Tests |
| --- | --- | --- |
| Same measure in PHP | `src/Domain/Knowledge/Content/NormalNoteContent.php`, `MarkdownBlockCounter.php`, `MarkdownOpenBlock.php` | `tests/Unit/NormalNoteContentTest.php` |
| Cases shared by both languages | `tests/Fixtures/normal-note-measure.json` (40 notes) | read by the PHP test above and by `cosmic-markdown-blocks.test.ts` |
| Measure kept on the document | migration `2026_11_10_000016`, column `cvc_documents.own_content`; written by `CreateMarkdownEntity`, `SaveDocument`, `RestoreVaultVersion` | `tests/Feature/DocumentOwnContentTest.php` |
| Measure in the context slice | `ContextPresenter`, `OpenContextSlice`; `ownContent` in `resources/js/documents/types.ts` | `tests/Feature/ContextSliceOwnContentTest.php` |
| Backfill of earlier documents | `cvc:measure-documents`, `MeasureStoredDocument` | `tests/Feature/MeasureDocumentsCommandTest.php` |

Contract for the canvas, described in full in `docs/architecture/mvp.md`:
`ownContent` is a number, or `null` when the document has not been measured
yet. `null` is not zero; a caller must not size an unmeasured note as empty.

Keeping the two implementations equal: both suites read the same JSON file and
fail if a block count or a measure differs beyond 1e-12. Block counts in that
file were written by hand; the measures were produced by the TypeScript code.
Any change to the rules must change both languages and the file together. Two
inputs made the first TypeScript version disagree with a faithful port and
were fixed there first: no-break spaces counted as indentation, and a Unicode
line separator hid a list item or a fence.

Known difference: characters are split by PCRE on the server and by ICU in the
browser. They agree on every shared case, including combined accents, emoji
sequences, flags, keycaps and decomposed Hangul, but scripts whose clusters
changed in recent Unicode versions may weigh slightly differently. The server
value is the one the canvas uses, so this affects only code that measures in
the browser. Invalid UTF-8, which only the server can receive, is scrubbed
before measuring instead of failing the save.

Observed results on 2026-11-10: the complete package suite passed 132 PHP tests
/ 708 assertions on SQLite; the frontend suite passed 197 tests in 12 files;
TypeScript and ESLint passed. The new migration was rolled back and reapplied
in a test with documents present. Measuring 1.15 MB of accented text took
about 0.6 s and 1.16 MB of CJK text about 1.3 s on the development machine;
2 MB of plain ASCII took 0.04 s. Not verified: MySQL, a browser journey, and
the backfill on real data. Pint is not installed, so the PHP formatter was not
run. Nothing visible uses `ownContent` yet.

Security and performance review: no new endpoint or write path; the measure is
derived from content the same request already stores, and a number per note
reveals less than the body the reader is already authorised to open through
the same slice. The slice loads the owner's document with the existing eager
load, so there is no query per context. The stored column is the cache: it is
keyed by the document and rewritten in the same transaction as every change of
its content. One pre-existing point was noticed and not changed: the save
request has no explicit size limit on `content`; it is bounded by the storage
quota and the PHP request limits, and the measure adds time proportional to
that size to each save.

Deployment order: run the migration, deploy the code, then run
`php artisan cvc:measure-documents` once. Until it runs, older notes are sent
with `ownContent: null`.

## Phase 8 — RF-03 descendant content and the simulator scene

Branch: `cm-implementação-canva`, 2026-11-10. Headless work; nothing visible
changed.

The weight of a note is `Q = 0.5 C + 0.8 H`, and `H` is the content of every
unique descendant. The slice carries only the node in focus and its immediate
children, so the browser cannot compute `H`; the server now sends it.

| Change | Implementation | Tests |
| --- | --- | --- |
| `H` of each shown note and context | `src/Application/Contexts/DescendantContent.php`; `descendantContent` added by `OpenContextSlice` and `ContextPresenter` | `tests/Feature/ContextSliceDescendantContentTest.php` (7 cases) |
| Coefficients in one place | `combineContentWeight` in `resources/js/canvas/math/hierarchy-weight.ts` | existing `cosmic-content.test.ts` |
| Scene for the simulator | `resources/js/canvas/physics/cosmic-scene.ts` (`buildCosmicScene`) | `cosmic-scene.test.ts` (9 cases) |

What counts as a descendant: the notes inside a note's space, the notes inside
their spaces, the notes of nested contexts, and the document of a nested
context that is itself a note. A note reached by several paths counts once per
node. The node's own content, notes in the trash and unmeasured notes add
nothing; an unmeasured descendant counts as zero until
`cvc:measure-documents` runs.

How to use the scene: give `buildCosmicScene` the notes of one space (`id`,
`ownContent`, `descendantContent`, stored `position`, `isPinned`) and its
relations. It returns the bodies and connections `CosmicSimulation` takes, the
empty area of the budget and the ids of notes sized without a measure. Links to
notes outside the space are dropped, because the engine rejects them; showing
them is the external-connection indicator of RF-09.

Decisions taken here that are implementation defaults, not approved product
rules, and are easy to change:

- A note with unknown measure is sized like an empty one, at the minimum
  weight, and listed in `unmeasuredNoteIds` so the interface can mark it.
- A note never positioned starts on a golden-angle spiral around the origin, in
  id order, spaced by twice the largest radius among those notes. The physics
  then settles it. D-12 puts new notes where the user touched, so this covers
  only notes created before positions existed.
- `H` is computed on every slice read, without a cache. The traversal is
  batched (a few queries per level of depth, 200 contexts at a time) but its
  cost grows with everything beneath the shown nodes; the root listing walks
  the whole vault. A cache needs an invalidation signal for every write that
  changes content, membership, position in the hierarchy or trash state, and
  volume targets (D-15) are still open, so it was left out on purpose.

Observed results: the complete package suite passed 139 PHP tests / 732
assertions on SQLite; the frontend suite passed 206 tests in 13 files;
TypeScript and ESLint passed. Not verified: MySQL, response time on a large
vault, any browser journey. Pint is not installed.

Security review: the sums are numbers derived from notes of the configured
vault only; every query is scoped by vault and skips trashed records. A reader
of a slice learns an aggregate of content beneath nodes that the same
authorization already lets them open. No new endpoint, write path or storage.
No issue found in the changed paths.

## Phase 9 — RF-03 open space drawn and moved by the physics

Branch: `cm-canvas-cosmico-cena-visivel`, 2026-11-11. First visible use of the
simulator.

| Change | Implementation | Tests |
| --- | --- | --- |
| Simulation advanced on animation frames | `resources/js/canvas/physics/use-cosmic-simulation.ts` (`useCosmicSimulation`) | `cosmic-simulation-hook.test.tsx` (8 cases) |
| One space of a slice as scene input | `resources/js/canvas/physics/space-scene.ts` (`describeSpaceScene`) | `cosmic-space-scene.test.ts` (4 cases) |
| Note drawn as a circle | `resources/js/canvas/cosmic-note-node.tsx`, `.cvc-cosmic-note` in `resources/css/cvc.css` | `cosmic-note-node.test.tsx` (4 cases) |
| Open space on the page, free and pinned drops | `resources/js/pages/vault.tsx`; pin flag in `relations/api.ts` and `perspectives/api.ts` | `vault-cosmic-space.test.tsx` (10 cases) |

What the canvas shows now: at the root listing, the same cards as before. Inside
an open context, only that space: its notes and its nested contexts as circles
whose area comes from the budget of `buildCosmicScene`, moved by
`CosmicSimulation`. The card of the open context and the notes of nested
contexts are not drawn there; a nested context is entered to see its notes.
Relations between two notes of the space are straight edges. A note whose
measure is unknown is drawn with a dashed outline and says so on hover.

Dragging and pinning (RN-07): while a note is dragged it stays under the
pointer and the others react to it. Dropped freely it is saved with
`pinned: false` and keeps moving with the others; dropped while Ctrl is held it
is saved with `pinned: true` and stays. Before this phase every drop pinned.
The position saved for a note in a space is the centre of its circle, in canvas
units; D-06 converts to logical units only inside the physics.

How to use the hook: give it a scene that keeps its identity between renders
(memoize it) and read `bodies`. A new scene object restarts the simulation, so
an unmemoized scene loops forever; the first version of one test did exactly
that and ran out of memory. When a scene is rebuilt, a body whose stored
position and pin did not change continues from its live position and velocity,
otherwise any unrelated page update would throw the space back to its start.

Implementation defaults taken here, not product decisions, easy to change:

- The title keeps 0.9 rem on screen at any zoom, and the touch target keeps at
  least 44 × 44 px (D-05), through a `--cvc-zoom` custom property the page
  writes on every viewport move. No React render happens for a pan or a zoom.
- Only the dragged note is saved. Notes that the physics moved are not written
  back, so a reopened space settles again from the stored positions. It ends in
  the same place because the simulation is deterministic, but it replays the
  movement. Saving every settled note needs a batch layout endpoint.
- A nested context has no stored position: it starts on the spiral every time
  and a drag is not saved. Storing it needs a schema change.
- With a perspective active, the drop is saved on the perspective, with the
  same pin rule.

Not done in this phase: the root listing as a cosmic space, the zoom thresholds
of D-12, the touch gestures (long press, "Fixar / Liberar"), opening a note by
a single click, and the flowchart metrics.

Observed results on 2026-11-11: the frontend suite passed 232 tests in 17
files, from 206 in 13; TypeScript passed; the PHP suite, untouched, was run
before the change and passed 139 tests / 732 assertions. ESLint reports five
errors in files this phase did not touch (`operational-status-panel.tsx`,
`perspectives-panel.tsx`, `relations-panel.tsx`, `search-panel.tsx`); they are
present on `main` with the host configuration used today, and none is in the
new or changed files. Prettier was applied to the touched files with the host
options minus its Tailwind plugin, which is not installed for this package.
Not verified: any browser. Dragging relies on React Flow reporting the node
position during `onNodeDrag`, and the circle sizes, title size and edge
anchors have only been exercised with the library mocked. Frame cost was not
measured: the page re-renders on every frame while a space is moving, and the
simulation compares every pair of notes of the space twice per frame.

Security review: no endpoint, storage or dependency was added. The pin flag
was already validated as a boolean by the layout requests; the browser now
sends `false` as well as `true`. Titles reach the page as React text and a
`title` attribute, both escaped. The zoom written to the style is a number
from the viewport. No issue found in the changed paths.

## Remaining requirements

| Requirement | State | Next work / blocker |
| --- | --- | --- |
| RF-01 | ready | D-05, D-06 and D-12 decided (zoom enters at 60% and leaves at 30%); not implemented. Zoom animation timings still open; existing contextual capture draft is preserved |
| RF-02 | partial | Title limit and legacy-context document backend implemented; cosmic expansion, full properties/type UI, camera integration and the connection list with "Conectar a…" (D-12) remain |
| RF-03 | partial | Arithmetic, simulator and shared-space backend implemented, restoration cycle regression fixed, measures stored by the server and sent with the slice, simulator scene built from them (phase 8), an open space drawn and moved by the physics with free and pinned drops saved (phase 9, not seen in a browser); flowchart metrics, the root listing as a space, saving the positions the physics settles, and a stored position for nested contexts remain. D-14 moves the measure to the browser: phase 7 has to be reworked when encryption is built |
| RF-04 | ready | Persistence decided: JSON in the document itself, versioned with the note; not implemented |
| RF-05 | ready | D-07 decided: `mermaid` block with position comments, more than one block refuses the conversion, the block leaves the description once rebuilt; not implemented |
| RF-07 | ready | D-11 decided: near is the open space, 300 ms fade, single list with paths at the galaxy view; not implemented |
| RF-08 | ready | D-13 decided: deletion asks about subnotes, removing a participation always asks, 7-day trash, every version kept; migration of existing data still open |
| RF-09 | ready | D-10 decided: grouped by corner, three per corner then "+N", no physics; not implemented |
| RF-10 | ready | D-09 decided: counter events, case- and accent-insensitive prefix, only `/link` and `/l` (`$l` was dropped); not implemented |
| RF-11 | blocked | Depends on the final persistence (RF-04, encryption) and on fixture identity/tombstone handling; last in the delivery order |

Follow-up questions are asked only when their decisions block the next phase.
No open physical constant, formula, migration policy, or content format has been
silently chosen. The user authorized continuation across phases; unresolved
product decisions still require an answer.

Development resumed on 2026-11-10 with the restoration cycle fix and the
content measure and the simulator scene above (phases 6 to 8). Next action:
render the scene in `vault.tsx` and run the simulation there, which needs a
running Rechi OS to be checked in a browser. D-05/D-06/D-12 gesture rules are approved but
not implemented by backend helpers alone. Later product decisions remain open.

## Checkpoint — 2026-11-10

Rechi asked to stop for the day, save the context, push the branch and open a
pull request into `main`. This section is the place to resume from.

### Repository state

- Earlier in the day every branch was compared with the newest one,
  `cm-canvas-cosmico-note-spaces`. All of them were already contained in it, so
  `main` was fast-forwarded to it, made the default branch on GitHub, and the
  four `cm-*` branches were deleted. Nothing had to be merged by hand.
- Today's work is on `cm-implementação-canva`, created from that `main`: the
  restoration cycle fix and phases 6 to 8 above.
- The uncommitted files mentioned in phases 4 and 5 (three frontend test files,
  the first version of `NoteSpaceVersionTest.php`, a storage and navigation
  prototype) were not on the machine used today and are not in the repository.
  The regression test was rewritten from its description. If the others still
  exist on the original machine, they have to be brought in from there.

### What works now, verified by tests only

- Restoring a version that would close a subnote cycle is refused with 422.
- The server measures every normal note on create, save and version
  restoration, and `cvc:measure-documents` measures the earlier ones.
- A context slice carries `ownContent` and `descendantContent` for each note and
  context, without any body.
- `buildCosmicScene` turns the notes and relations of a space into the bodies
  and connections of `CosmicSimulation`.

Last complete runs: 139 PHP tests / 732 assertions on SQLite; 206 frontend tests
in 13 files; TypeScript and ESLint clean. Never verified: MySQL, a browser, real
vault data, lock order under concurrency, response time on a large vault. Pint
is not installed in the package, so PHP formatting was not checked by a tool.

### Before deploying this branch

1. Run the migrations (`2026_11_10_000016` adds `cvc_documents.own_content`).
2. Deploy the code.
3. Run `php artisan cvc:measure-documents` once.

### Next step

Render the scene in `resources/js/pages/vault.tsx`: feed the slice into
`buildCosmicScene`, run `CosmicSimulation` in an animation loop, draw each note
as a circle of its radius with a touch target of at least 44×44 px, and persist
positions and pins through the existing layout endpoint. D-05, D-06 and the
gestures of D-12 are approved and not implemented. This step needs a running
Rechi OS to be checked in a browser; component tests alone do not show it.

### Open points for Rechi

- The descendant sum is not cached (phase 8). Decide on a cache once volume
  targets exist (D-15).
- The save request has no explicit size limit on `content` (phase 7).
- Product decisions still blocking requirements: D-07, D-09, D-10, D-11, D-13,
  the rest of D-12 and D-14, and D-15. See the table of remaining requirements.

### Decisions closed on 2026-11-11

Rechi answered the open decisions point by point; they are recorded in section
15.3 of `canvas-cosmico.md`. This was a documentation session: no code changed
and no test was run. It supersedes the list under "Open points for Rechi"
above, which is kept as the record of that day.

- Closed: D-07, D-09, D-10, D-11, the zoom thresholds and editor connections of
  D-12, the deletion, trash and history rules of D-13, the encryption scope of
  D-14, and the volume, size limit and delivery order of D-15.
- The save request now has a decided limit, 5 MB per note. It is not enforced
  yet.
- Delivery order after the visible part of RF-03: RF-01 and RF-02; RF-07,
  RF-10 and RF-09; RF-08 with deletion and trash; RF-04 and RF-05; encryption;
  RF-11.
- `$l` is no longer a command. RF-10 accepts only `/link` and `/l`.

Encryption is end to end for the content only, and it invalidates part of
phases 6 to 8: the server can no longer read a body, so the measure has to be
computed in the browser and sent as a number, `cvc:measure-documents` and the
measurement on version restoration stop working, and existing plain content
needs a conversion run by the browser. Because a lost recovery code is
requested from the administrator, the server has to keep a recoverable copy of
the key, so the administrator can read the content. Encryption is fifth in the
delivery order, so phases 6 to 8 stay as they are until then.

Still open: zoom animation timings and cancellation during a move (D-12),
migration of the current layout and of existing data (D-13), key design and
the final Rechi OS integration (D-14), environments, operation and costs
(D-15). Three statements in section 15.3 were proposed by the writer and
confirmed by Rechi the same day: shared subnotes survive in their other
spaces, versions are removed with the note on permanent deletion, and the
descendant sum stays uncached until a measurement at 5,000 notes says
otherwise.

### Running the checks without a sibling `../rechi-os`

`tooling/` expects the host at `../rechi-os`. Where the host lives elsewhere, a
directory junction does not work, because Vite resolves it to the real path and
then refuses to serve files outside the allowed roots. Use a local copy of
`tooling/vitest.config.mjs` and `tooling/tsconfig.json` with the absolute path
of the host instead, kept outside the repository. PHP tests need only
`composer install`, or an existing `vendor` directory built from the same
`composer.lock`.
