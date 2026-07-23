import type { ComarkTree } from "comark";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LocalDocumentPreview from "./LocalDocumentPreview.vue";

const ComarkRendererStub = defineComponent({
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

describe("LocalDocumentPreview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("unwraps the parent task paragraph before nested task items", async () => {
    const wrapper = mount(LocalDocumentPreview, {
      props: {
        content: "- [ ] Parent task\n  - [ ] Child task",
      },
      global: {
        stubs: {
          ComarkRenderer: ComarkRendererStub,
        },
      },
    });

    await vi.advanceTimersByTimeAsync(150);

    const treeJson = wrapper.get("pre").text();
    expect(treeJson).toContain(
      '["li",{"class":"task-list-item"},["label",{"class":"checkgist-task-label"}',
    );
    expect(treeJson).not.toContain('["p",{},["input",{"class":"task-list-item-checkbox"');
  });
});
