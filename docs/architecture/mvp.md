# CVC MVP architecture

This document records the implemented MVP architecture after the accepted vertical slice. Product requirements remain authoritative for behavior that is not implemented yet.

## Authorized explorer

`OpenVault` loads the fixed authorized vault and its universe, context, entity, and document metadata after the Rechi OS middleware has authenticated and authorized the request. The explorer receives only this server-approved structure; it has no separate public endpoint or client-side cache.

An entity keeps one stable UUID even when it participates in several contexts. Each context creates a distinct React Flow visual node ID from the context ID and entity ID. Opening or editing always uses the stable entity ID, so visual instances never duplicate Markdown or history.

Explorer selection updates semantic detail, focuses the matching canvas instance, and persists the resulting viewport through the authorized workspace endpoint.

## Entity properties

Capture remains unstructured. A document may later receive an optional `entity_type` and up to 50 scalar properties without changing its UUID, Markdown, or revision. Properties are stored as JSON metadata in `cvc_entities`; Markdown remains the canonical document content in private revision files.

`PATCH /vault/entities/{entity}` requires the host's authenticated write permission, CSRF token, and entity-write throttle. The server scopes the entity to the configured vault, validates property names and values, and rejects nested data. Empty properties are serialized to clients as an object to keep the frontend contract stable.

The properties panel edits only the focused entity. A successful response replaces every summary with the same stable ID, keeping shared visual instances synchronized without duplicating database rows.

## Relations and context layouts

`cvc_relations` stores soft-deletable links between stable entity IDs. A relation may be free or typed, directed or undirected, and global or scoped to a context. Contextual relations require both entities to participate in that context. Undirected endpoints are normalized before duplicate detection, so reversing the submitted endpoints cannot create the same relation twice.

The context/entity pivot stores position and pin state for each visual instance. Dragging one instance writes only its context-specific pivot row; the same entity can therefore keep a different position in every context without duplicating content.

The inspector can reuse the focused entity in another context, create relations, and soft-delete existing relations. Relation edges are derived for the current canvas payload, while the relational models remain the source of truth.

## Independent perspectives

`cvc_perspectives` stores a named filter configuration for the fixed vault. Filters can limit visible contexts and entity types without deleting or changing the underlying entities and relations. `cvc_perspective_layouts` stores position and pin state by perspective, context, and entity; the base context layout remains the fallback when a perspective has no override.

A manual perspective starts from the current base layout. A derived perspective copies its source filters and effective layouts inside one transaction. The source ID remains only provenance: later filter or layout changes write exclusively to the derived perspective, so the origin cannot drift.

The active perspective ID is part of the per-user workspace state. The React client applies filters and layout overrides only to the already authorized vault payload, while every mutation revalidates the perspective, context, and entity against the configured vault on the server. User-pinned items are never moved by an automatic layout flow; no automatic layout exists in this MVP stage.

## Security and caching

React renders explorer labels, types, keys, and values as escaped text. No raw HTML or executable URL is accepted by these flows. Mutations are authorized, throttled, and validated on the server.

Explorer, property, relation, perspective, and layout data are not cached because they are permission-bound, mutable, and already included in the live vault payload. A future cache must include vault and authorization identity in its key and be invalidated by every related write.
