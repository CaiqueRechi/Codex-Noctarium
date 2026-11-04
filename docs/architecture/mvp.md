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

## Security and caching

React renders explorer labels, types, keys, and values as escaped text. No raw HTML or executable URL is accepted by these flows. Mutations are authorized, throttled, and validated on the server.

Explorer and property data are not cached because they are permission-bound, mutable, and already included in the live vault payload. A future cache must include vault and authorization identity in its key and be invalidated by every related write.
