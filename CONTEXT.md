# Checkgist

Checkgist is a client-side checklist manager for rendering Markdown task lists from external text-sharing services.

## Language

**Checklist**:
An interactive rendering of a Loaded Source where Task Items can be checked or unchecked.
_Avoid_: Checklist Session, rendered source, checklist run

**Bookmark**:
A user-saved reference to a Checklist for opening it again later. Its user-managed title is independent of the target's title; it does not include Checklist State, and is removed when its locally owned Local Document is deleted.
_Avoid_: Favorite, saved checklist, pinned checklist

**Loaded Source**:
The resolved content loaded from a Source URL or adapted from a Local Document, including its Source Metadata and Source Files.
_Avoid_: Source Content, source data, source snapshot

**Local Document**:
An editable Markdown document owned by Checkgist, identified by a stable Local Document ID, and stored in the user's browser. It has a non-empty title and can be adapted into a Loaded Source for checklist viewing.
_Avoid_: Local Source, draft, note

**Local Document ID**:
An immutable UUID that identifies a Local Document independently of its title or content.
_Avoid_: Local Source ID, document slug

**Source File**:
A file belonging to a Loaded Source. Text Source Files can be rendered as Markdown and become interactive when they contain Task Items.
_Avoid_: Checklist document, document

**Source URL**:
A URL that identifies content on a supported Source Service. It may be an external URL or Checkgist's edit route for a Local Document.
_Avoid_: Checklist URL, document URL

**Source Service**:
A supported source of content that can provide a Loaded Source from a stable reference. A Source Service may be external or owned locally by Checkgist.
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
