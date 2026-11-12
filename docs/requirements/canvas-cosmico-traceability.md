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

## Phase 10 — only the canvas on screen

Branch: `cm-canvas-cosmico-cena-visivel`, 2026-11-11. Rechi saw phase 9 in the
browser and asked for the rest of the rejected screen to go. The decisions are
in section 15.4 of `canvas-cosmico.md`. This phase supersedes what phase 9 says
about the root listing keeping its cards.

| Change | Implementation | Tests |
| --- | --- | --- |
| Vault root drawn as the outermost space | `activeSpace` in `resources/js/pages/vault.tsx`; universes are bodies of that space | `vault-cosmic-space.test.tsx`, `vault-page.test.tsx` |
| Explorer column and panel column removed from the layout | one floating panel, `.cvc-tools`, opened by a header button; `VaultPath` in `explorer/vault-explorer.tsx` puts the path in the header | `vault-cosmic-space.test.tsx` (3 cases) |
| Card node and semantic zoom levels removed | `knowledge-node.tsx`, `semantic-zoom.ts` and their styles deleted | title cases moved to `canvas-title.test.tsx` against the circle |
| Space framed when entered | `frameCircles` in `resources/js/canvas/math/geometry.ts` | `cosmic-framing.test.ts` (4 cases), one page case |
| No background, wide zoom | dotted background removed; zoom bounds 0.01 to 100 | `vault-cosmic-space.test.tsx` (2 cases) |
| Viewport saved only when it changed | `handleMoveEnd` in `vault.tsx` | one page case |

What the screen is now: a header with the brand, the current path, "Nova
nota" and a button for the tools; under it, the canvas and nothing else. At the
vault root the canvas shows the universes as circles; inside a context, its
notes and nested contexts. Double-clicking a circle of a context enters it and
the path in the header goes back. "Nova nota" is disabled at the root, because
a note has to belong to a context and the root would not show it.

The tools panel holds everything the two columns held: explorer and context
creation, operational status, search, trash, perspectives and versions,
properties, attachments and relations. It floats over the right edge of the
canvas, starts closed, and closes with its button or with Escape. Its panels
stay mounted while it is closed, so the operational status keeps polling.

Framing: entering a space sets the viewport so every circle is visible with a
margin of a tenth of the smaller side of the canvas, never above 200 % zoom,
and saves it as the workspace viewport. The first load keeps the stored
viewport. The canvas library needs finite zoom bounds; 1 % and 10000 % are
far outside what the space budget can produce, so they are not a limit a user
meets.

Two defects found by looking at the page, not by the tests, each fixed in a
commit of its own:

- Escape did not close the tools, because the key was listened for on the panel
  and the focus stays on the header button.
- A universe was drawn as unmeasured. A context that is not a note has no
  document, and the missing own content was read as a missing measure; it is a
  known zero.

Observed on 2026-11-11, before the second look below: the frontend suite passed 239 tests in 17 files;
TypeScript passed; ESLint reports the same five errors as phase 9, all in
panel files this work did not touch. The PHP suite was not rerun, since no PHP
changed after its 139 passing tests.

Seen in a browser, on the local Docker environment of Rechi OS with a test
user: the root and an entered space drawn as circles with no background, the
title keeping its size from 1.3 % to 1300 % zoom, the touch target staying at
44 px when the circle is smaller, entering a space by double click, the space
framed after entering, the path in the header, the tools panel opening.
Migrations `2026_11_08_000015` and `2026_11_10_000016` ran forward on MySQL
there for the first time; their rollback was not run on MySQL.

### Second look at the page, same day

Rechi allowed the ownership of the local vault storage to be corrected (138 of
147 entries under `/var/lib/cvc` belonged to root; all now belong to `sail`),
which made creating a note work there and gave a space with two bodies. That
look found four more defects, each fixed in its own commit:

- After a drop every circle jumped by half its diameter. The canvas library
  centres a node with the size it measured, and nodes rebuilt on every frame
  lose that measurement. Each node now states its size.
- A new note was born on the spiral for unplaced notes, usually off screen. It
  is now created at the middle of the view and saved there unpinned.
- With a perspective active, saving the layout of a note that sits directly in
  a universe answered 404: `UpdatePerspectiveLayout` accepted only contexts of
  kind `context`. It now accepts any available context of the vault that holds
  the note, as `UpdateEntityLayout` already did.
- The page error took the row of the canvas and pushed the canvas off screen.
  It has a row of its own.

Observed after these: the PHP suite passed 141 tests / 740 assertions on
SQLite; the frontend suite passed 243 tests in 17 files; TypeScript passed;
ESLint unchanged.

Still not seen in a browser: notes moving under the physics, a drag following
the pointer, a free drop and a Ctrl drop. The browser pane used for the check
was hidden, and a hidden page gets no animation frames, so the simulation did
not advance and the positions read during those attempts prove nothing either
way. The jump after a drop and the 404 were read from the page and the
network, which do not depend on frames. These four behaviours need a look with
the page visible.

### Creation by double click, same day

Rechi pointed out that the header still had a "Nova nota" button, against his
request to remove the old interface and against RN-02. This replaces what the
text above says about that button and about a note born at the middle of the
view.

| Change | Implementation | Tests |
| --- | --- | --- |
| Note created by double-clicking an empty point of the space | `handleCanvasDoubleClick` in `vault.tsx`; `screenToCanvasPoint` in `geometry.ts` | `vault-cosmic-space.test.tsx` (4 cases), `cosmic-framing.test.ts` (2 cases) |
| Header button removed | header holds the brand, the path, "Voltar ao Rechi OS" and the tools button | same page tests |
| Viewport saved once the camera rests | 400 ms after the last move, in `handleMoveEnd` | one page case |

The note is created at the clicked point, saved there unpinned, and opened. A
double click on a circle still enters a context or opens a note, and the
canvas library no longer zooms on double click. At the vault root a double
click creates nothing, because the root holds universes and a note needs a
context; a universe is created from the tools panel. While the request runs
the canvas is marked busy and the header says "Criando nota…".

Why the button looked broken to him: in the local environment the server
answers one request at a time and each takes 5 to 25 seconds. Every wheel
notch ended a camera move and saved the viewport, so five saves were queued
ahead of his creation request, which was answered about a minute later with no
sign on screen. The log shows it succeeded. The viewport is now saved only
400 ms after the camera stops, and creation shows a status.

Observed: the frontend suite passed 246 tests in 17 files; TypeScript passed;
ESLint unchanged. Not seen in a browser: the double click itself, the status
text and the single viewport save.

Still not done: saving the positions the physics settles, a stored position
for nested contexts and universes, the 60 % / 30 % zoom navigation of D-12,
touch gestures, opening a note by a single click, and the compass search of
RF-07. The explorer inside the tools still lists two levels and asks the
canvas to locate notes that may not be in the open space.

Security review: no endpoint, storage or dependency was added, and nothing
that was reachable stopped requiring authorization. The panels moved; their
requests are the same. No issue found in the changed paths.

## Browser check — 2026-11-12

First look at phases 9 and 10 with the page visible (119.7 frames per
second), on the local Docker environment rebuilt from new sibling checkouts
in `Documents\CrowVaultCanvas`, with a local test user.

Seen working: the root drawn as a cosmic space; entering a universe by
double click; a space of two bodies at rest, as D-04 predicts at that
distance (1.27 logical units: the attraction stays under the rest
threshold); a free drop saved with `200`, the centre of the circle and
`isPinned: false`, the note drifting freely afterwards; creation by double
click, with "Criando nota…", the note born at the clicked point (670, 425
→ 670, 426 px) and every circle shrinking from 577.7 to 516.7 px as the
fixed budget redistributed among three bodies (D-02).

Found:

- The workspace endpoint refused any zoom below 0.25 with 422 since phase
  10 widened the canvas zoom; fixed in phase 11.
- Holding Ctrl for the whole drag pans the camera instead of moving the
  note, so the Ctrl drop never pinned. Pressing Ctrl only at the drop could
  not be produced by the tool and was not checked. Open.
- A free drag moved the note about 64 % of the pointer's path; it may be
  the synthetic drag. Twice, every body shifted together by exactly
  (−0.135, −0.135) px. A nested context cannot be dragged. None of these
  was investigated.

Environment: every request took 5 s to over a minute and the page often
did not open. `artisan serve` handles one request at a time, the code is
read from Windows over a 9p share, and OPcache was off for the built-in
server (`opcache.enable_cli = 0`), so each request recompiled Laravel from
that share; the Compose health check alone kept the single worker busy.
`PHP_CLI_SERVER_WORKERS=4` in `.env` and an OPcache file inside the
container (`opcache.enable_cli=1`, `validate_timestamps=0`) brought `/up`
from 4–10 s to 0.6 s and opening `/vault` to about 10 s. Both are local:
the file inside the container is lost when the container is recreated,
and with timestamps off a PHP change needs `docker compose restart
laravel.test` to take effect.

## Phase 11 — zoom navigation, subnotes and a canvas without header

Branch: `cm-navegacao-zoom-canvas`, 2026-11-12, based on
`cm-canvas-cosmico-cena-visivel`. Rechi tried phase 10 and found the
navigation broken, the zoom not behaving as documented, no way to create
subnotes, and the header in the way.

| Change | Implementation | Tests |
| --- | --- | --- |
| Zoom bounds accepted by the workspace endpoint | `UpdateWorkspaceStateRequest`, 0.01 to 100 like `zoomLimits` | `WorkspaceStateTest` (5 cases), not run |
| Enter at 60 %, leave at 30 % (D-12) | `decideZoomNavigation` in `resources/js/canvas/zoom-navigation.ts`; `enclosingCircle`, `circleOnScreen`, `viewportPlacingCircle` in `geometry.ts`; `navigateByZoom` and `placeArrivingSpace` in `vault.tsx` | none yet |
| A note's subnotes reached by zoom | `openNoteSpace` in `contexts/api.ts` over `POST /vault/documents/{entity}/space`; `handleOpenNoteSpace` in `vault.tsx` | none yet |
| Trail kept across note spaces | `continueTrail` in `explorer/navigation-trail.ts` | none yet |
| One workspace save per space opened | `handleOpenContext` no longer saves; the framing does | none yet |
| No header | path, status and tools button float over the canvas (`.cvc-overlay`); "Voltar ao Rechi OS" in the tools panel | none yet; page tests still expect the header |

How the zoom navigates: only a move made by the user is examined. The
circle entered is a context or a note whose screen circle covers 60 % of
the smaller side of the canvas and contains its middle; the nearest to the
middle wins. The open space is left when the circle enclosing all its
bodies (or its whole budget, X = 1, when it is empty) shrinks to 30 %. The
arriving space is placed so that what was entered fills the circle it was
entered through, or so that the space just left sits where it was; the
placement reads that circle when the slice arrives, not when the threshold
was crossed. Entering therefore starts at 60 % or more and leaving at 30 %
or less, away from the other threshold. The switch is instant, because
D-12 left the animation timings open. Double click and the path still
navigate too.

Implementation defaults, not product decisions: the middle of the screen
chooses the circle; an empty space is measured by its whole budget; the
first zoom into a note creates its space of subnotes (an empty context
named "Subnotas"), once per note.

Subnotes: the space of a note has no parent context, because a note may sit
in several spaces, so the server's breadcrumbs start at it. The page keeps
the trail it walked and appends the note's space to it, so leaving goes back
to where the note was entered from. Reaching a note's space from the
explorer or the search starts the trail at that space, since the page did
not walk to it. A double click inside the space creates a subnote through
the existing document endpoint, which already accepts a note space whose
owner is not in the trash.

Observed: TypeScript passed through the host's `npx tsc --noEmit`, also on
the intermediate state between the two feature commits, and the host
build compiled. Rechi tried it by hand and found it on the right path but
not fluid. No automated suite was run, at his request; the new code has no
tests yet and the page tests that look for the header will fail.

Security review: the only new request is the existing note-space endpoint,
behind the same session, authorization, CSRF and throttles; it is sent by a
zoom gesture, so a user zooming in and out repeatedly sends at most one
request per crossing. The zoom bounds widened a validated range and stay
finite. No storage, cache or rendered user text was added beyond titles
already shown as escaped React text. No issue found in the changed paths.

## Phase 12 — links between notes

Branch: `cm-ligacoes-entre-notas`, 2026-11-12, based on
`cm-navegacao-zoom-canvas`. Rechi found no way to connect two notes: no dot
on the circles and `/link` doing nothing. Both were specified (RN-02,
RF-10) and never built.

| Change | Implementation | Tests |
| --- | --- | --- |
| Dot on the edge of a note | `linkDotHandleId`, `linkDotClassName` in `canvas/cosmic-note-node.tsx`; `.cvc-cosmic-note__dot` | `cosmic-note-node.test.tsx` (3 cases) |
| Drag from the dot onto a note links them | `handleConnectEnd` and `linkNotes` in `vault.tsx` | none at page level |
| Click on the dot creates a linked sibling | `createLinkedSibling` in `vault.tsx`; `handleCreate` returns the new id | none at page level |
| `/link` and `/l` in the editor | `link-command.ts`, `linking-textarea.tsx`, `findLinkTargets` in `relations/api.ts` | `link-command.test.ts` (6 cases) |
| Targets by prefix, score and path | `FindLinkTargets`, `GET /vault/link-targets` | `LinkTargetsTest` (5 cases) |

How it behaves: Rechi chose that the dot does both things. Dragging it
onto any point of another note's circle creates a global, undirected
relation; the drop is resolved from the element under the pointer, so it
does not have to hit a handle. A click creates a sibling 1.5 diameters to
the right, in the same space, linked to the note, and opens it. Contexts
have no dot, since relations connect notes.

`/link` and `/l` followed by a space and the start of a title, right before
the caret, list at most five notes of the vault. D-09 rules apply: prefix
only, case, accents and leading spaces ignored, score then alphabetical,
`$l` not accepted. A note does not offer itself. Equal titles show the path
of each, from the universe down, using the first space the note was placed
in. Choosing links the two notes and removes the command from the text.

Implementation defaults, not product decisions: links made on the canvas or
by command are global and undirected; the score counts only links, because
accesses and searches are not counted yet (RF-10 counters remain); the
endpoint filters titles in PHP for accent-free prefix matching that works
the same on MySQL and SQLite, within the 5,000-note target; a sibling opens
its editor like any new note.

Not verified: the suites were written and not run, at Rechi's request,
until every remaining item is built. The drag and the click were not seen
in a browser.

Security review: the new endpoint is a read behind the vault's session,
authorization and search throttle, scoped to the configured vault; it
returns titles and paths the same user can already open. Relations reuse
the existing endpoint and its validation. Titles render as escaped React
text. No issue found in the changed paths.

## Phase 13 — renaming a note

Branch: `cm-renomear-nota`, 2026-11-12, based on `cm-ligacoes-entre-notas`.
Rechi could not change a note's title with the note open: titles were set
only at creation, always empty, and the editor showed "Sem título" as text.

| Change | Implementation | Tests |
| --- | --- | --- |
| Title field in the editor | `documents/note-title-field.tsx`, used by `document-editor.tsx` | `note-title-field.test.tsx` (5 cases) |
| Rename endpoint | `RenameEntity`, `RenameEntityRequest`, `PATCH /vault/entities/{entity}/title` | `RenameEntityTest` (5 cases) |
| Every place follows the new name | `handleRenameNote` in `vault.tsx` | none at page level |

The field saves when it is left or on Enter, Escape restores the saved
title, and an empty title is refused both in the field and by the server.
Titles are trimmed and limited to 120 characters, the limit of a context
name. A note that stands for a legacy context keeps that context's name in
step, the mirror of renaming the context; the space of subnotes of an
ordinary note keeps its own name, since the page always shows the owner's
title for it. The search version advances so the index follows.

Not verified: written and not run, at Rechi's request; not seen in a
browser.

Security review: the endpoint reuses the entity write authorization and
throttle, scopes the entity to the configured vault (404 outside it),
validates on the server and renders the title as escaped text. No issue
found in the changed paths.

## Phase 14 — the cosmic reaver palette

Branch: `cm-paleta-rapinante-cosmico`, 2026-11-12, based on
`cm-renomear-nota`. Decision recorded in section 15.5 of `canvas-cosmico.md`.

| Change | Implementation | Tests |
| --- | --- | --- |
| Palette F as the theme tokens, plus `--cvc-energy` and `--cvc-gilt` | `resources/css/presets.css` | `theme-tokens.test.ts` (3 cases) |
| Fonts served by the package | `resources/css/fonts.css`, `resources/fonts/*` with their OFL licences | same file |
| Type and signature applied | `resources/css/cvc.css` | same file |

Measured: every text or line pair used reaches 4.5:1 (from 4.58:1 for the
violet lines on the background to 17:1 for text). The test keeps raw colors
out of `cvc.css` (RN-20) and every token it uses defined in the preset.
Seen in a browser on the local environment: the background, the path in
Cinzel, the champagne trim and the note in focus; Cinzel and Manrope
loaded. Not seen: the editor, the tools panel and the dot up close. The
suites were not run, at Rechi's request.

Security review: no request, endpoint or script added; the fonts are local
static files, so the content security policy stays as strict as before.

## Phase 15 — the editor and the gestures of D-12

Branch: `cm-editor-e-gestos`, 2026-11-12, based on
`cm-paleta-rapinante-cosmico`.

| Change | Implementation | Tests |
| --- | --- | --- |
| A click opens a note; a double click only enters contexts | `openNote` and `handleNodeClick` in `vault.tsx` | `vault-cosmic-space.test.tsx` (2 cases) |
| Long press on a phone: create on empty, "Fixar / Liberar" on a note | `canvas/use-long-press.ts`; `handleLongPress`, `placeNote` and the pin menu in `vault.tsx` | `long-press.test.tsx` (4 cases) |
| Connections listed in the editor, removable, with "Conectar a…" | `documents/note-connections.tsx`, `relations/use-link-targets.ts`; `RelationPresenter` sends the title of both ends | `note-connections.test.tsx` (4 cases), `RelationTitlesTest` |
| Note color | `NoteColor`, `PaintEntity`, `PATCH /vault/entities/{entity}/color`, migration `2026_11_12_000017`; `documents/note-color-picker.tsx`; `--cvc-note-*` tokens | `PaintEntityTest` (5 cases, rollback included), `note-color-picker.test.tsx` (3), `cosmic-note-node.test.tsx` (2 more) |
| Tests for the zoom navigation of phase 11 | — | `zoom-navigation.test.ts` (12 cases) |

Gestures: only touch counts for the long press (500 ms, at most 10 px of
slide), since the mouse has the double click and Ctrl. The tap reported
when the finger lifts belongs to the long press and opens nothing; the
canvas no longer shows the browser's menu on a long press. Pinning from
the menu takes the same path as a drop with Ctrl.

Color: a note stores the name of one of six tones, never a value, so a
theme change repaints every note (RN-20). The tone is mixed at 30 % into
the dark of the theme, keeping the title between 6.09:1 and 9.72:1.

Refactors done on the way, each in its own commit: relations are written
by one presenter instead of three copies, and the lookup of link targets
became a hook shared by `/link` and "Conectar a…".

Not verified: written and not run, at Rechi's request; none of it seen in
a browser or on a phone.

Security review: the color endpoint accepts only the six names or null,
behind the entity write authorization and throttle, scoped to the vault.
Relation titles are titles the same user can open, sent with the vault
they already load. No new rendered HTML. No issue found in the changed
paths.

## Phase 16 — the compass search (RF-07)

Branch: `cm-rosa-dos-ventos`, 2026-11-12, based on `cm-editor-e-gestos`.

| Change | Implementation | Tests |
| --- | --- | --- |
| Compass in the lower left corner and its floating panel | `search/compass-search.tsx`, `.cvc-compass*` | `compass-search.test.tsx` (4 panel cases) |
| Groups "Neste universo" / "Outros universos", one list at the galaxy view | `groupCompassResults` in `search/compass-groups.ts` | same file (2 cases) |
| Near result approached, far result through a 300 ms fade, "Voltar" | `handleCompassChoose`, `handleCompassReturn`, `.cvc-fade` in `vault.tsx` | `isNearResult` (1 case); the page flow is not covered |
| Path of every result, a subnote through its note | `ContextPath`, used by `SearchVault` and `FindLinkTargets` | `SearchPathTest`, `LinkTargetsTest` (subnote case) |

D-11 rules: near is the space open now, and the camera fits the note and
opens it; anything else goes dark in 150 ms, the space of the result opens,
and the view clears in 150 ms before the note opens. With no universe open
the results form one list with their paths. "Voltar" returns to the exact
viewport and trail that were left, overriding the framing of the space.
Reduced motion skips the fade and the camera travel.

Implementation defaults: search starts at two characters and waits 250 ms;
the compass sits bottom left because the zoom controls take bottom right;
the fade uses the background of the theme.

Found and fixed on the way: the path of a subnote among link targets
stopped at its note, because a space of subnotes has no parent; it now
goes on through the first space the note sits in.

Not verified: written and not run, at Rechi's request; not seen in a
browser. Searches counted for RF-10 are the next item.

Security review: no new endpoint; the existing search adds paths made of
names the same user can open, behind the same authorization and throttle.
Results render as escaped text. No issue found in the changed paths.

## Phase 17 — the counters of the link score (RF-10)

Branch: `cm-contadores-link`, 2026-11-12, based on `cm-rosa-dos-ventos`.

| Change | Implementation | Tests |
| --- | --- | --- |
| Accesses counted on every opening of a note | `CountNoteUse::access`, called by `ShowDocumentController` | `UseCountersTest` |
| Searches counted when a compass result is chosen | `POST /vault/entities/{entity}/searches`, `countNoteSearch` in `entities/api.ts` | `UseCountersTest` |
| Score = accesses + searches + links | `FindLinkTargets::scores` | `UseCountersTest` (ordering and values) |
| Counter columns | migration `2026_11_12_000018`, `access_count` and `search_count` | `UseCountersTest` (rollback) |

D-09 is now complete: the counters are added in the database, so two
openings at once never lose one, and existing notes start at zero, as the
specification asks for no invented history. A search that fails to be
counted does not stop the user from reaching the note.

Implementation default: the document endpoint, a GET, now writes a counter;
it serves only the vault's own pages, behind the same authorization.

Not verified: written and not run, at Rechi's request.

Security review: the new endpoint is a write behind the entity write
authorization and throttle, scoped to the vault (404 outside it); it
changes a number only. No issue found in the changed paths.

## Phase 18 — external connections (RF-09)

Branch: `cm-conexoes-externas`, 2026-11-12, based on `cm-contadores-link`.

| Change | Implementation | Tests |
| --- | --- | --- |
| Links leaving the open space found and placed in a corner | `findExternalConnections`, `cornerFor` in `canvas/external-connections.ts` | `external-connections.test.tsx` |
| Three per corner, then "+N" | `groupByCorner`, `canvas/external-connections-overlay.tsx`, `.cvc-external` | same file |
| Travel through the nearest common ancestor | `travelThroughCommonAncestor`; `travelToNote` in `vault.tsx` | same file (4 cases); the page flow is not covered |
| Where a note sits | `GET /vault/entities/{entity}/path`, `ShowEntityPathController` | `EntityPathTest` |

D-10 rules applied: the corner nearest the direction, three per corner then
"+N" opening the list, pinned to the screen and outside the physics. The
travel goes up to the nearest common ancestor, through the galaxy view
between universes, then down to the target's space, and the camera
approaches the target, which is focused, not opened.

Implementation defaults, open in D-10 and D-12 and easy to change: the
direction is taken from the middle of the open space to the inside note,
because the outside note has no position on this canvas; each level of a
travel stays 400 ms on screen; indications sit at 60 % opacity and clear
the other floating controls.

Not verified: written and not run, at Rechi's request; not seen in a
browser.

Security review: one new read endpoint behind the vault's read
authorization and search throttle, scoped to the vault (404 outside it),
returning names the same user can open. Titles render as escaped text. No
issue found in the changed paths.

## Remaining requirements

| Requirement | State | Next work / blocker |
| --- | --- | --- |
| RF-01 | partial | Cosmic spaces, framing, zoom navigation at 60 % / 30 % into notes as well, the linked-sibling dot and the touch gestures are built (phases 10 to 15). Zoom animation timings are still open in D-12; Rechi found the result not yet fluid |
| RF-02 | partial | Title limit, rename, color, the connection list with "Conectar a…" and a single click opening a note are built (phases 13 and 15). The editor still opens over the whole screen instead of expanding on the canvas, and the content type belongs to RF-04 |
| RF-03 | partial | Arithmetic, simulator and shared-space backend implemented, restoration cycle regression fixed, measures stored by the server and sent with the slice, simulator scene built from them (phase 8), an open space drawn and moved by the physics with free drops saved (phase 9, seen in a browser on 2026-11-12; the Ctrl drop did not pin when Ctrl was held for the whole drag); flowchart metrics, saving the positions the physics settles, and a stored position for nested contexts and universes remain. D-14 moves the measure to the browser: phase 7 has to be reworked when encryption is built |
| RF-04 | ready | Persistence decided: JSON in the document itself, versioned with the note; not implemented |
| RF-05 | ready | D-07 decided: `mermaid` block with position comments, more than one block refuses the conversion, the block leaves the description once rebuilt; not implemented |
| RF-07 | built | Compass, groups, approach or fade and "Voltar" built (phase 16); not yet seen in a browser |
| RF-08 | ready | D-13 decided: deletion asks about subnotes, removing a participation always asks, 7-day trash, every version kept; migration of existing data still open |
| RF-09 | built | Corner indications, "+N" and travel through the common ancestor (phase 18); travel timing open in D-12 |
| RF-10 | built | `/link` and `/l` with prefix-only suggestions (phase 12) and the full score of D-09 (phase 17) |
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
