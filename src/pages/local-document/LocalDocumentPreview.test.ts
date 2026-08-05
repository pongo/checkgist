import type { ComarkElement, ComarkNode, ComarkTree } from "comark";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LocalDocumentPreview from "./LocalDocumentPreview.vue";

const prepareMarkdown = vi.hoisted(() =>
  vi.fn<(markdown: string) => Promise<{ tree: ComarkTree; taskItemCount: number }>>(),
);

vi.mock("@/checklist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/checklist")>();

  return {
    ...actual,
    prepareMarkdown,
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
    prepareMarkdown.mockReset();
    prepareMarkdown.mockImplementation(checklist.prepareMarkdown);
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits 150 ms and renders the latest unsaved Markdown draft", async () => {
    const wrapper = mountPreview("# First draft");

    expect(wrapper.find("[role='alert']").exists()).toBe(false);
    expect(wrapper.text()).toContain("Loading Markdown...");

    await vi.advanceTimersByTimeAsync(149);
    expect(prepareMarkdown).not.toHaveBeenCalled();

    await wrapper.setProps({ content: "# Latest draft" });
    await finishDebounce();

    expect(prepareMarkdown).toHaveBeenCalledTimes(1);
    expect(prepareMarkdown).toHaveBeenCalledWith("# Latest draft");
    expect(wrapper.text()).toContain("Latest draft");
    expect(wrapper.text()).not.toContain("First draft");
  });

  it("cancels a scheduled parse when the preview is unmounted", async () => {
    const wrapper = mountPreview("# Draft being closed");

    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(150);

    expect(prepareMarkdown).not.toHaveBeenCalled();
  });

  it("keeps the latest preview when Markdown parses finish out of order", async () => {
    let resolveFirst: ((tree: ComarkTree) => void) | undefined;
    let resolveSecond: ((tree: ComarkTree) => void) | undefined;
    prepareMarkdown
      .mockImplementationOnce(
        () =>
          new Promise<{ tree: ComarkTree; taskItemCount: number }>((resolve) => {
            resolveFirst = (tree) => resolve({ tree, taskItemCount: 0 });
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<{ tree: ComarkTree; taskItemCount: number }>((resolve) => {
            resolveSecond = (tree) => resolve({ tree, taskItemCount: 0 });
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

  it("does not replace the latest preview with an error from a stale parse", async () => {
    let rejectFirst: ((error: Error) => void) | undefined;
    prepareMarkdown
      .mockImplementationOnce(
        () =>
          new Promise<{ tree: ComarkTree; taskItemCount: number }>((_, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce({
        tree: createTree([["p", {}, "Latest draft"]]),
        taskItemCount: 0,
      });
    const wrapper = mountPreview("First draft");

    await vi.advanceTimersByTimeAsync(150);
    await wrapper.setProps({ content: "Latest draft" });
    await finishDebounce();
    rejectFirst?.(new Error("stale parse failed"));
    await flushPromises();

    expect(wrapper.text()).toContain("Latest draft");
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
  });

  it("keeps the draft and shows a visible error when Markdown parsing fails", async () => {
    prepareMarkdown.mockRejectedValueOnce(new Error("parse failed"));
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

  it("keeps preview Task Items visual without changing the URL hash", async () => {
    prepareMarkdown.mockResolvedValueOnce({
      tree: createTree([["input", { type: "checkbox", class: "task-list-item-checkbox" }]]),
      taskItemCount: 1,
    });
    const wrapper = mountPreview("- [ ] Visual task");

    await finishDebounce();
    const taskItem = wrapper.get<HTMLInputElement>("input[type='checkbox']");
    await taskItem.trigger("click");

    expect(taskItem.element.checked).toBe(false);
    expect(window.location.hash).toBe("");
  });

  it("does not cancel events from non-task inputs", async () => {
    prepareMarkdown.mockResolvedValueOnce({
      tree: createTree([["input", { type: "text", value: "Draft title" }]]),
      taskItemCount: 0,
    });
    const wrapper = mountPreview("Draft title");

    await finishDebounce();
    const input = wrapper.get<HTMLInputElement>("input[type='text']");
    const event = new Event("change", { bubbles: true, cancelable: true });

    expect(input.element.dispatchEvent(event)).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });
});
