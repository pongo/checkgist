import type { ComarkNode, ComarkTree } from "comark";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Checklist } from "@/checklist";
import { copyToClipboard } from "@/shared/clipboard.ts";

import ChecklistView from "./ChecklistView.vue";

// Public DOM contract: the rendered label class is part of the markdown output.
const RENDERED_TASK_LABEL_CLASS = "checkgist-task-label";

const route = vi.hoisted(() => ({
  path: "/pastebin.com/source-1",
  query: { debug: "1" },
}));
const routerReplace = vi.hoisted(() =>
  vi.fn<
    (location: { path: string; query: Record<string, string>; hash: string }) => Promise<void>
  >(),
);

vi.mock("vue-router", () => ({
  useRoute: () => route,
  useRouter: () => ({ replace: routerReplace }),
}));

vi.mock("@/shared/clipboard.ts", () => ({
  copyToClipboard: vi.fn<(text: string) => Promise<void>>(() => Promise.resolve()),
}));

function createTree(taskCount: number): ComarkTree {
  return {
    frontmatter: {},
    meta: {},
    nodes: Array.from({ length: taskCount }, (_, taskIndex) => [
      "input",
      {
        class: "task-list-item-checkbox",
        type: "checkbox",
        "data-checkgist-task-index": String(taskIndex),
      },
    ]) as ComarkNode[],
  };
}

function createSession(): Checklist {
  return {
    source: {
      reference: { type: "pastebin", pasteId: "source-1" },
      metadata: {
        title: "source-1",
        url: "https://pastebin.com/source-1",
      },
      files: [],
    },
    hasTaskItems: true,
    files: [
      {
        status: "ready",
        id: "one.md",
        sourceFile: {
          status: "ready",
          id: "one.md",
          name: "one.md",
          content: "",
        },
        tree: createTree(2),
        checked: [true, false],
      },
      {
        status: "error",
        id: "broken.md",
        sourceFile: {
          status: "error",
          id: "broken.md",
          name: "broken.md",
          error: { message: "Broken file." },
        },
        error: { message: "Broken file." },
      },
      {
        status: "ready",
        id: "two.md",
        sourceFile: {
          status: "ready",
          id: "two.md",
          name: "two.md",
          content: "",
        },
        tree: createTree(2),
        checked: [false, true],
      },
    ],
  };
}

const ComarkRendererStub = defineComponent({
  props: {
    tree: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h("div", [
        ...(props.tree as ComarkTree).nodes.map((node) => {
          if (!Array.isArray(node) || node[0] !== "input") {
            return null;
          }

          const taskIndex = node[1]["data-checkgist-task-index"];
          return h("label", { class: RENDERED_TASK_LABEL_CLASS }, [
            h("input", node[1]),
            h("span", `task-${taskIndex}`),
            h("a", { href: `/documentation-${taskIndex}` }, "documentation"),
            h("code", `command-${taskIndex}`),
          ]);
        }),
        // Markdown outside a task label must not be interpreted as a task interaction.
        h("p", "Introduction"),
      ]);
  },
});

function mountSession(session: Checklist) {
  return mount(ChecklistView, {
    props: { session },
    global: {
      stubs: {
        ComarkRenderer: ComarkRendererStub,
      },
    },
  });
}

describe("ChecklistView", () => {
  beforeEach(() => {
    routerReplace.mockReset();
    vi.mocked(copyToClipboard).mockClear();
  });

  it("renders per-file Reset controls for ready files and error files without reset controls", () => {
    const wrapper = mountSession(createSession());

    expect(wrapper.text()).toContain("one.md");
    expect(wrapper.text()).toContain("two.md");
    expect(wrapper.text()).toContain("broken.md");
    expect(wrapper.text()).toContain("Broken file.");
    expect(wrapper.findAll("button").map((button) => button.text())).toEqual(["Reset", "Reset"]);
  });

  it("updates file-local checkbox state and replaces the route hash", async () => {
    const session = createSession();
    const wrapper = mountSession(session);

    const inputs = wrapper.findAll("input");
    await inputs[2]?.setValue(true);

    expect(session.files[2]).toMatchObject({
      status: "ready",
      checked: [true, true],
    });
    expect(routerReplace).toHaveBeenCalledWith({
      path: "/pastebin.com/source-1",
      query: { debug: "1" },
      hash: "#1011",
    });
  });

  it("ignores changes from non-Task Item form controls", () => {
    const session = createSession();
    const wrapper = mountSession(session);
    const select = document.createElement("select");
    select.append(new Option("Default", "default"));

    wrapper.get("article").element.append(select);
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [true, false],
    });
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("does not navigate when a checkbox points outside the file Task Items", () => {
    const session = createSession();
    const wrapper = mountSession(session);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.checkgistTaskIndex = "99";

    wrapper.get("article").element.append(checkbox);
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));

    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [true, false],
    });
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("resets only one ready file and preserves checked state in other files", async () => {
    const session = createSession();
    const wrapper = mountSession(session);

    await wrapper.findAll("input")[0]?.setValue(true);
    await wrapper.findAll("input")[3]?.setValue(true);
    await wrapper.findAll("button")[0]?.trigger("click");

    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [false, false],
    });
    expect(session.files[2]).toMatchObject({
      status: "ready",
      checked: [false, true],
    });
    expect(wrapper.findAll<HTMLInputElement>("input")[0]?.element.checked).toBe(false);
    expect(wrapper.findAll<HTMLInputElement>("input")[1]?.element.checked).toBe(false);
    expect(wrapper.findAll<HTMLInputElement>("input")[3]?.element.checked).toBe(true);
    expect(routerReplace).toHaveBeenLastCalledWith({
      path: "/pastebin.com/source-1",
      query: { debug: "1" },
      hash: "#0001",
    });
  });

  it("copies code text without toggling the task checkbox", async () => {
    const session = createSession();
    const wrapper = mountSession(session);

    await wrapper.find("code").trigger("click");

    expect(copyToClipboard).toHaveBeenCalledWith("command-0");
    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [true, false],
    });
    expect(wrapper.find<HTMLInputElement>("input").element.checked).toBe(false);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("keeps native checkbox clicks from being toggled again by label handling", async () => {
    const session = createSession();
    session.files = [session.files[2]!];
    const wrapper = mountSession(session);

    const checkbox = wrapper.find<HTMLInputElement>("input");
    checkbox.element.click();
    await checkbox.trigger("change");
    await nextTick();

    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [true, true],
    });
    expect(routerReplace).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith({
      path: "/pastebin.com/source-1",
      query: { debug: "1" },
      hash: "#11",
    });
  });

  it("toggles a Task Item when its label text is clicked", async () => {
    const session = createSession();
    session.files = [session.files[2]!];
    const wrapper = mountSession(session);

    await wrapper.find("span").trigger("click");

    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [true, true],
    });
    expect(wrapper.find<HTMLInputElement>("input").element.checked).toBe(true);
    expect(routerReplace).toHaveBeenCalledWith({
      path: "/pastebin.com/source-1",
      query: { debug: "1" },
      hash: "#11",
    });
  });

  it("does not toggle a Task Item when its link is clicked", async () => {
    const session = createSession();
    const wrapper = mountSession(session);
    wrapper.find("a").element.addEventListener("click", (event) => event.preventDefault());

    await wrapper.find("a").trigger("click");

    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [true, false],
    });
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("ignores clicks outside Task Items", async () => {
    const session = createSession();
    const wrapper = mountSession(session);

    await wrapper.get("p").trigger("click");

    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [true, false],
    });
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("ignores clicks on a Task Item label without a checkbox", () => {
    const session = createSession();
    const wrapper = mountSession(session);
    const label = document.createElement("label");
    label.className = RENDERED_TASK_LABEL_CLASS;
    label.textContent = "Missing checkbox";
    wrapper.get("article").element.append(label);

    expect(() => label.dispatchEvent(new MouseEvent("click", { bubbles: true }))).not.toThrow();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("ignores clicks on a Task Item label with an unindexed checkbox", () => {
    const session = createSession();
    const wrapper = mountSession(session);
    const label = document.createElement("label");
    label.className = RENDERED_TASK_LABEL_CLASS;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    label.append(checkbox);
    wrapper.get("article").element.append(label);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    label.dispatchEvent(event);

    expect(checkbox.checked).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("ignores clicks whose target is a text node", () => {
    const session = createSession();
    const wrapper = mountSession(session);
    const text = document.createTextNode("plain text");
    wrapper.get("article").element.append(text);

    expect(() => text.dispatchEvent(new MouseEvent("click", { bubbles: true }))).not.toThrow();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("copies empty inline code without toggling its Task Item", async () => {
    const session = createSession();
    const wrapper = mountSession(session);
    const code = wrapper.find("code");
    code.element.textContent = "";

    await code.trigger("click");

    expect(copyToClipboard).toHaveBeenCalledWith("");
    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [true, false],
    });
    expect(routerReplace).not.toHaveBeenCalled();
  });
});
