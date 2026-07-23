# 04 — Add responsive live Markdown preview

**What to build:** Give document authors immediate, safe feedback on their unsaved Markdown. Desktop users see equal independently scrolling editor and preview panes, while mobile users switch a full-width workspace between editing and preview with an accessible control.

**Blocked by:** 02 — Create, edit, and discover Local Documents.

**Status:** ready-for-agent

- [ ] On desktop, the textarea and preview split the workspace equally and each scrolls independently within the viewport space below the header.
- [ ] On small screens, only one full-width pane is visible at a time.
- [ ] A `Preview` control above the mobile workspace exposes its pressed state, changes visual treatment while active, and returns to the textarea when pressed again.
- [ ] Preview renders the current unsaved draft rather than the last stored version.
- [ ] Markdown parsing begins after a 150 ms debounce instead of on every keystroke.
- [ ] When asynchronous parses finish out of order, only the result for the latest draft is displayed.
- [ ] Preview applies the same unsafe-content restrictions and Markdown styling as Checklist rendering.
- [ ] Task Items in preview are visual only and cannot change Checklist State, the route, or the URL hash.
- [ ] A parse failure has a usable visible error state and does not clear the textarea draft.
- [ ] Editor and preview remain legible in automatic light and dark themes.
- [ ] Component tests use fake timers to cover debounce, stale results, mode switching, errors, and non-interactive Task Items through observable behavior.
