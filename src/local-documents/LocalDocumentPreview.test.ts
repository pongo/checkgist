import type { ComarkElement, ComarkNode, ComarkTree } from "comark";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LocalDocumentPreview from "./LocalDocumentPreview.vue";

const parseChecklistMarkdown = vi.hoisted(() => vi.fn<(markdown: string) => Promise<ComarkTree>>());

vi.mock("@/checklist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/checklist")>();

  return {
    ...actual,
    parseChecklistMarkdown,
  };
});

const ComarkRendererStub = defineComponent({
  props: {
    tree: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    return () => h("div", (props.tree as ComarkTree).nodes.map(renderComarkNode));
  },
});

const TreeTextRendererStub = defineComponent({
  props: {
    tree: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    return () => h("pre", JSON.stringify((props.tree as ComarkTree).nodes));
  },
});

function renderComarkNode(node: ComarkNode): ReturnType<typeof h> | string | null {
  if (typeof node === "string") {
    return node;
  }
  if (!Array.isArray(node) || node[0] === null) {
    return null;
  }

  const [tag, attributes, ...children] = node as ComarkElement;
  return h(tag, attributes, children.map(renderComarkNode));
}

function createTree(nodes: ComarkNode[]): ComarkTree {
  return { nodes } as ComarkTree;
}

function mountPreview(content: string, renderer = ComarkRendererStub) {
  return mount(LocalDocumentPreview, {
    props: { content },
    global: {
      stubs: { ComarkRenderer: renderer },
    },
  });
}

async function finishDebounce() {
  await vi.advanceTimersByTimeAsync(150);
  await flushPromises();
}

describe("LocalDocumentPreview", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    const checklist = await vi.importActual<typeof import("@/checklist")>("@/checklist");
    parseChecklistMarkdown.mockReset();
    parseChecklistMarkdown.mockImplementation(checklist.parseChecklistMarkdown);
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits 150 ms and renders the latest unsaved Markdown draft", async () => {
    const wrapper = mountPreview("# First draft");

    await vi.advanceTimersByTimeAsync(149);
    expect(parseChecklistMarkdown).not.toHaveBeenCalled();

    await wrapper.setProps({ content: "# Latest draft" });
    await finishDebounce();

    expect(parseChecklistMarkdown).toHaveBeenCalledTimes(1);
    expect(parseChecklistMarkdown).toHaveBeenCalledWith("# Latest draft");
    expect(wrapper.text()).toContain("Latest draft");
    expect(wrapper.text()).not.toContain("First draft");
  });

  it("keeps the latest preview when Markdown parses finish out of order", async () => {
    let resolveFirst: ((tree: ComarkTree) => void) | undefined;
    let resolveSecond: ((tree: ComarkTree) => void) | undefined;
    parseChecklistMarkdown
      .mockImplementationOnce(
        () =>
          new Promise<ComarkTree>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<ComarkTree>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const wrapper = mountPreview("First draft");

    await vi.advanceTimersByTimeAsync(150);
    await wrapper.setProps({ content: "Latest draft" });
    await vi.advanceTimersByTimeAsync(150);

    resolveSecond?.(createTree([["p", {}, "Latest draft"]]));
    await flushPromises();
    expect(wrapper.text()).toContain("Latest draft");

    resolveFirst?.(createTree([["p", {}, "First draft"]]));
    await flushPromises();
    expect(wrapper.text()).toContain("Latest draft");
    expect(wrapper.text()).not.toContain("First draft");
  });

  it("keeps the draft and shows a visible error when Markdown parsing fails", async () => {
    parseChecklistMarkdown.mockRejectedValueOnce(new Error("parse failed"));
    const wrapper = mountPreview("# Keep this draft");

    await finishDebounce();

    expect(wrapper.get("[role='alert']").text()).toBe("Failed to preview this Markdown.");
    expect(wrapper.props("content")).toBe("# Keep this draft");
  });

  it("uses a full-height, independently scrolling preview pane", async () => {
    const wrapper = mountPreview("# Preview");

    await finishDebounce();

    expect(wrapper.get("article").classes()).toEqual(
      expect.arrayContaining(["markdown-body", "checkgist-markdown", "h-full", "overflow-auto"]),
    );
  });

  it("applies the Checklist security policy to rendered Markdown", async () => {
    const wrapper = mountPreview(
      '<script>alert("unsafe")</script><a href="javascript:alert(1)">Link</a>',
      TreeTextRendererStub,
    );

    await finishDebounce();

    expect(wrapper.get("pre").text()).not.toContain('["script"');
    expect(wrapper.get("pre").text()).not.toContain("javascript:");
  });

  it("keeps preview Task Items visual without changing the URL hash", async () => {
    parseChecklistMarkdown.mockResolvedValueOnce(
      createTree([["input", { type: "checkbox", class: "task-list-item-checkbox" }]]),
    );
    const wrapper = mountPreview("- [ ] Visual task");

    await finishDebounce();
    const taskItem = wrapper.get<HTMLInputElement>("input[type='checkbox']");
    await taskItem.trigger("click");

    expect(taskItem.element.checked).toBe(false);
    expect(window.location.hash).toBe("");
  });

  it("unwraps the parent task paragraph before nested task items", async () => {
    const wrapper = mountPreview("- [ ] Parent task\n  - [ ] Child task");

    await finishDebounce();

    expect(wrapper.html()).toContain('class="task-list-item"');
    expect(wrapper.html()).not.toContain('<p><input class="task-list-item-checkbox"');
  });
});
