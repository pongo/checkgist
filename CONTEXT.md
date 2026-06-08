# Checkgist

Checkgist is a client-side checklist manager for rendering Markdown task lists from external text-sharing services.

## Language

**Checklist Session**:
The interactive checklist state for loaded source content.
_Avoid_: Rendered source, checklist run

**Source Content**:
The content loaded from a Source Service for a Source Reference.
_Avoid_: Source data, source snapshot

**Source File**:
A text file loaded from a Source Service and rendered as Markdown, becoming interactive when it contains Task Items.
_Avoid_: Checklist document, document

**Source URL**:
The external URL entered by the user to load checklist content.
_Avoid_: Checklist URL, document URL

**Source Reference**:
The normalized, route-friendly reference to a supported external source.
_Avoid_: Denormalized URL, encoded URL

**Source Service**:
A supported external service that can resolve a Source URL into Source Content.
_Avoid_: Provider, backend, integration

**Source Metadata**:
Descriptive information about Source Content, such as its title, description, and original URL.
_Avoid_: Source title, source info

**Task Item**:
A Markdown task-list item rendered as an interactive checkbox. When Source Content has no explicit Markdown task-list items, ordinary Markdown list items may be treated as Task Items.
_Avoid_: Checkbox, todo

**Task Item Tree**:
The prepared Markdown render tree for a Source File, annotated so Task Items can be indexed, clicked through labels, and synced with Task Item State.
Ordinary Markdown list items are promoted to Task Items only when the whole Checklist Session has no explicit Task Items in any Source File.
_Avoid_: Checkbox DOM, rendered task markup

**Task Item State**:
The global positional checked-or-unchecked state of the Task Items in the current Checklist Session. It is applied best-effort to the current source content, and trailing unchecked positions may be omitted.
_Avoid_: Progress, checkbox state
