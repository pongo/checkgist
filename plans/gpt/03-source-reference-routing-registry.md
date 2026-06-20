# План 3 — Source Reference routing в Source Service registry

Углубить registry-owned routing для Source Reference. Source Service seam уже полезный, но route invariants сейчас зеркалятся в нескольких modules.

## Текущее состояние

- `src/source-services/types.ts` задает adapter shape: `fromUrl`, `fromRoute`, `toRoute`, `load`.
- `src/source-services/registry.ts` содержит `referenceFromUrlInput`, `referenceFromRoute`, `routeForReference`.
- `src/source-services/github-gist.ts` и `src/source-services/pastebin.ts` знают route conversion своих Source Services.
- `src/app/router.ts` отдельно hardcode-ит `/gist.github.com/:gistId` и `/pastebin.com/:pasteId`.
- `src/pages/Home/HomePage.vue`, `src/pages/SourceReference/SourceReferencePage.vue` тоже участвуют в route facts.

## Целевая форма

Source Service registry становится deep module для Source URL и route conversion. App modules не должны зеркалить host/path invariants конкретных Source Services.

Source Service adapters остаются adapters под registry seam: они знают external Source URL, route shape и Loaded Source loading для своей Source Service.

## Implementation Plan

1. Зафиксировать round-trip tests: Source URL -> Source Reference -> route -> Source Reference для GitHub Gist и Pastebin.
2. Проверить, какие route facts сейчас нужны router 5, и выбрать минимальную форму registry-owned route records или centralized matcher.
3. Перенести hardcoded route records из `src/app/router.ts` к данным registry, если vue-router позволяет безопасно генерировать records.
4. Убрать локальный `referenceFromRoutePath` из `SourceReferencePage.vue`; page должна спрашивать registry.
5. Обновить `HomePage.vue`, чтобы Source URL parsing и route generation шли через один registry interface.
6. Добавить тест на добавление fake Source Service adapter: один adapter должен обеспечивать URL parsing, route matching и route generation без правок page/bookmark modules.
7. Verify: `npm run typecheck && npm run agent:lint && npm run agent:test`.

## Риски

- Vue-router dynamic records могут требовать статически известных path strings; если так, registry все равно должен быть единственным источником этих strings.
- Нельзя ухудшить Bookmark URL stability.
- Нельзя смешать этот refactor с fetch policy: это другой seam.

## Тест на удаление

Если удалить registry-owned routing, route facts должны снова появиться в router, Home, SourceReferencePage и Bookmark routes. Это значит, module дает leverage при добавлении Source Service.

---

`refactor(source-services): centralize source reference routing in registry`
