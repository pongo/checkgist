import type { ComarkNode, ComarkTree } from "comark";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChecklistSession } from "@/checklist-session/types";

import ChecklistSessionView from "./ChecklistSessionView.vue";

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

function createSession(): ChecklistSession {
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
      h(
        "div",
        (props.tree as ComarkTree).nodes.map((node) => {
          if (!Array.isArray(node) || node[0] !== "input") {
            return null;
          }

          return h("input", node[1]);
        }),
      );
  },
});

function mountSession(session: ChecklistSession) {
  return mount(ChecklistSessionView, {
    props: { session },
    global: {
      stubs: {
        ComarkRenderer: ComarkRendererStub,
      },
    },
  });
}

describe("ChecklistSessionView", () => {
  beforeEach(() => {
    routerReplace.mockReset();
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
});
