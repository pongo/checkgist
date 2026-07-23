# 01 — Centralize the Checkgist database lifecycle

**What to build:** Preserve every existing Bookmark workflow while moving IndexedDB connection, typed schema, upgrade, version-change, and test-reset ownership behind one shared Checkgist database boundary. This prefactor must leave the application green and make a later transaction across Bookmark and Local Document data possible without duplicate database connections.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Existing Bookmark add, list, rename, reorder, remove, and restore behavior remains unchanged.
- [ ] Existing Bookmark records remain readable after the database lifecycle is centralized.
- [ ] The application uses one shared, strongly typed database connection lifecycle rather than a Bookmark-owned connection.
- [ ] Version changes close stale application connections so later schema upgrades are not unnecessarily blocked.
- [ ] Tests can close and reopen the shared connection against a fresh fake IndexedDB instance without leaking state between cases.
- [ ] Existing Bookmark, typecheck, lint, and agent test suites pass without product behavior changes.
