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
- Full PHPUnit invocation did not start: it reported that it could not open the
  configured `vendor/autoload.php` bootstrap. No PHP code was changed for RF-06.
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

## Remaining requirements

| Requirement | State | Next work / blocker |
| --- | --- | --- |
| RF-01 | blocked | Cosmic creation/zoom and touch rules require D-05, D-06, D-12; existing contextual capture draft is preserved |
| RF-02 | partial | RN-08 title display implemented; cosmic expansion, complete note properties/type UI, and camera integration remain |
| RF-03 | blocked | D-01 through D-06 require aggregation, budget, units, constants, contact, minimum sizes, and viewport decisions |
| RF-04 | blocked | Flowchart domain/UI and persistence contract require clarification before adding schema |
| RF-05 | blocked | D-07 textual format and multiple-block behavior remain open |
| RF-07 | blocked | D-11 proximity/fade and root search behavior remain open |
| RF-08 | blocked | Multiple memberships and movement need reconciliation under D-01/D-13/D-14 |
| RF-09 | blocked | D-10 directions/overlap/physics and transition parameters remain open |
| RF-10 | blocked | D-09 counter events and prefix normalization remain open |
| RF-11 | blocked | Fixture identity/tombstone handling, final persistence, and flowchart format must support examples without replacing edits |

Follow-up questions are asked only when their decisions block the next phase.
No open physical constant, formula, migration policy, or content format has been
silently chosen. The user authorized continuation across phases; unresolved
product decisions still require an answer.

Next dependency: the D-01 question is pending. Proposed aggregation is the sum
of descendants' own content, counting each note once per evaluated space, without
reapplying 0.8 at every depth. This is a proposal awaiting Rechi's answer, not an
approved rule or implemented simulation. D-02 through D-06 also remain open.
