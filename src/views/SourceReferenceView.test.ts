import type { ComarkTree } from "comark";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SourceContent, SourceReference } from "@/source-services/types";

import SourceReferenceView from "./SourceReferenceView.vue";

const route = reactive({ path: "/pastebin.com/HdpnureE" });
const loadSource = vi.hoisted(() =>
  vi.fn<
    (reference: SourceReference, options: { signal?: AbortSignal }) => Promise<SourceContent>
  >(),
);
const writeClipboardText = vi.fn<(data: string) => Promise<void>>();

vi.mock("vue-router", () => ({
  RouterLink: {
    props: ["to"],
    template: '<a :href="to" :data-router-link="to"><slot /></a>',
  },
  useRoute: () => route,
}));

vi.mock("@/source-services/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/source-services/registry")>();

  return {
    ...actual,
    sourceRegistry: {
      services: [],
      byType: new Map([["pastebin", { type: "pastebin", load: loadSource }]]),
    },
  };
});

function createSource(overrides: Partial<SourceContent> = {}): SourceContent {
  return {
    reference: { type: "pastebin", pasteId: "HdpnureE" },
    metadata: {
      title: "HdpnureE",
      description: "Source description",
      url: "https://pastebin.com/HdpnureE",
    },
    files: [
      {
        status: "ready",
        id: "HdpnureE",
        name: "HdpnureE",
        content: "Plain Markdown.",
      },
    ],
    ...overrides,
  };
}

async function mountLoadedSource(source: SourceContent) {
  loadSource.mockResolvedValueOnce(source);
  const wrapper = mount(SourceReferenceView, {
    global: {
      stubs: {
        ComarkRenderer: defineComponent({
          props: {
            tree: {
              type: Object,
              required: true,
            },
          },
          setup(props) {
            return () => h("div", JSON.stringify((props.tree as ComarkTree).nodes));
          },
        }),
      },
    },
  });

  await flushPromises();
  return wrapper;
}

describe("SourceReferenceView", () => {
  beforeEach(() => {
    route.path = "/pastebin.com/HdpnureE";
    loadSource.mockReset();
    writeClipboardText.mockReset();
    writeClipboardText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: writeClipboardText,
      },
    });
    document.title = "Checkgist";
    window.history.replaceState(null, "", "/");
  });

  it("loads the source route and renders the loaded source shell", async () => {
    const source = createSource();
    const wrapper = await mountLoadedSource(source);

    expect(loadSource).toHaveBeenCalledWith(
      { type: "pastebin", pasteId: "HdpnureE" } satisfies SourceReference,
      { signal: expect.any(AbortSignal) },
    );
    expect(wrapper.get("[data-router-link='/']").text()).toBe("Home");

    const sourceLink = wrapper.get("a[href='https://pastebin.com/HdpnureE']");
    expect(sourceLink.text()).toBe("View source");
    expect(sourceLink.attributes("target")).toBe("_blank");
    expect(sourceLink.attributes("rel")).toBe("noopener noreferrer");
    expect(wrapper.text()).toContain("Copy link");

    expect(wrapper.text()).toContain("Source description");
    expect(wrapper.find("h1").exists()).toBe(false);
    expect(wrapper.text()).toContain("HdpnureE");
    expect(wrapper.text()).toContain("No task items found in this source.");
    expect(document.title).toBe("HdpnureE - Checkgist");
  });

  it("does not render an empty Source Metadata description", async () => {
    const wrapper = await mountLoadedSource(
      createSource({
        metadata: {
          title: "HdpnureE",
          description: "",
          url: "https://pastebin.com/HdpnureE",
        },
      }),
    );

    expect(wrapper.text()).not.toContain("Source description");
  });

  it("truncates long browser titles and keeps the Checkgist suffix", async () => {
    await mountLoadedSource(
      createSource({
        metadata: {
          title: "a".repeat(80),
          url: "https://pastebin.com/HdpnureE",
        },
      }),
    );

    expect(document.title).toBe(`${"a".repeat(57)}... - Checkgist`);
  });

  it("shows a source-level load error", async () => {
    loadSource.mockRejectedValueOnce(new Error("Failed to load Pastebin source."));
    const wrapper = mount(SourceReferenceView);

    await flushPromises();

    expect(wrapper.text()).toContain("Failed to load Pastebin source.");
    expect(wrapper.text()).not.toContain("View source");
    expect(document.title).toBe("Checkgist");
  });

  it("copies the current Checklist Session URL including route and Task Item State hash", async () => {
    window.history.replaceState(null, "", "/pastebin.com/HdpnureE#10");
    const wrapper = await mountLoadedSource(createSource());

    await wrapper.get("button[aria-describedby='copy-link-feedback']").trigger("click");
    await flushPromises();

    expect(writeClipboardText).toHaveBeenCalledWith(
      expect.stringMatching(/\/pastebin\.com\/HdpnureE#10$/),
    );
    expect(wrapper.text()).toContain("Link copied.");
    expect(window.location.hash).toBe("#10");
  });

  it("shows a visible error when copying the Checklist Session URL fails", async () => {
    writeClipboardText.mockRejectedValueOnce(new Error("denied"));
    const wrapper = await mountLoadedSource(createSource());

    await wrapper.get("button[aria-describedby='copy-link-feedback']").trigger("click");
    await flushPromises();

    expect(wrapper.get("[role='alert']").text()).toBe("Could not copy link.");
  });
});
