# Checkgist

Checkgist is a client-side checklist manager for rendering Markdown task lists from external text-sharing services.

## Language

**Checklist**:
An interactive rendering of a Loaded Source where Task Items can be checked or unchecked.
_Avoid_: Checklist Session, rendered source, checklist run

**Loaded Source**:
The resolved content loaded from a Source URL, including its Source Metadata and Source Files.
_Avoid_: Source Content, source data, source snapshot

**Source File**:
A file belonging to a Loaded Source. Text Source Files can be rendered as Markdown and become interactive when they contain Task Items.
_Avoid_: Checklist document, document

**Source URL**:
An external URL that identifies content on a supported Source Service.
_Avoid_: Checklist URL, document URL

**Source Service**:
A supported external service that can provide a Loaded Source from a Source URL.
_Avoid_: Provider, backend, integration

**Source Metadata**:
Descriptive information about a Loaded Source, such as its title, description, and original URL.
_Avoid_: Source info, source details

**Task Item**:
A Markdown task-list item rendered as an interactive checkbox. When a Loaded Source has no explicit Markdown task-list items, ordinary Markdown list items may be treated as Task Items.
_Avoid_: Checkbox, todo

**Checklist State**:
The checked-or-unchecked state of Task Items in a Checklist. It is applied best-effort to the current Loaded Source, and trailing unchecked positions may be omitted.
_Avoid_: Task Item State, progress, checkbox state
