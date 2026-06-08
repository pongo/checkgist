import type { ComarkElement, ComarkNode, ComarkTree } from "comark";
import type { VueWrapper } from "@vue/test-utils";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SourceContent, SourceReference } from "@/source-services/types";

import SourceReferenceView from "./SourceReferenceView.vue";

const route = reactive({ path: "/pastebin.com/HdpnureE" });
const loadSource = vi.hoisted(() =>
  vi.fn<
    (reference: SourceReference, options: { signal?: AbortSignal }) => Promise<SourceContent>
  >(),
);
const writeClipboardText = vi.fn<(data: string) => Promise<void>>();

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

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
      byType: new Map([
        ["github-gist", { type: "github-gist", load: loadSource }],
        ["pastebin", { type: "pastebin", load: loadSource }],
      ]),
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

function createPastebinSource(pasteId: string, content: string): SourceContent {
  return createSource({
    reference: { type: "pastebin", pasteId },
    metadata: {
      title: pasteId,
      url: `https://pastebin.com/${pasteId}`,
    },
    files: [
      {
        status: "ready",
        id: pasteId,
        name: pasteId,
        content,
      },
    ],
  });
}

function createGitHubGistSource(gistId: string): SourceContent {
  return createSource({
    reference: { type: "github-gist", gistId },
    metadata: {
      title: gistId,
      description: "Gist description",
      url: `https://gist.github.com/${gistId}`,
    },
    files: [
      {
        status: "ready",
        id: "one.md",
        name: "one.md",
        content: "- [ ] First task",
      },
      {
        status: "ready",
        id: "two.md",
        name: "two.md",
        content: "- [ ] Second task",
      },
    ],
  });
}

function createDeferred<T>(): Deferred<T> {
  let resolve: Deferred<T>["resolve"] | undefined;
  let reject: Deferred<T>["reject"] | undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  if (resolve === undefined || reject === undefined) {
    throw new Error("Deferred promise was not initialized.");
  }

  return { promise, resolve, reject };
}

function mountSourceReferenceView(options: { errorHandler?: (error: unknown) => void } = {}) {
  return mount(SourceReferenceView, {
    global: {
      config:
        options.errorHandler === undefined
          ? undefined
          : {
              errorHandler: options.errorHandler,
            },
      stubs: {
        ComarkRenderer: defineComponent({
          props: {
            tree: {
              type: Object,
              required: true,
            },
          },
          setup(props) {
            return () => h("div", (props.tree as ComarkTree).nodes.map(renderComarkNode));
          },
        }),
      },
    },
  });
}

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

async function mountLoadedSource(source: SourceContent) {
  loadSource.mockResolvedValueOnce(source);
  const wrapper = mountSourceReferenceView();

  await flushPromises();
  return wrapper;
}

function getButtonByText(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll("button").find((candidate) => candidate.text() === text);

  if (button === undefined) {
    throw new Error(`Button not found: ${text}`);
  }

  return button;
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

  afterEach(() => {
    vi.useRealTimers();
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
    expect(wrapper.text()).toContain("Reset all");
    expect(wrapper.text()).toContain("Copy link");

    expect(wrapper.text()).toContain("Source description");
    expect(wrapper.find("h1").exists()).toBe(false);
    expect(wrapper.text()).toContain("HdpnureE");
    expect(wrapper.text()).toContain("No task items found in this source.");
    expect(document.title).toBe("HdpnureE - Checkgist");
  });

  it("renders the primary Pastebin flow and updates the checkbox hash", async () => {
    window.history.replaceState(null, "", "/pastebin.com/HdpnureE");
    const wrapper = await mountLoadedSource(
      createPastebinSource("HdpnureE", "- [ ] Pastebin task"),
    );

    expect(loadSource).toHaveBeenCalledWith(
      { type: "pastebin", pasteId: "HdpnureE" } satisfies SourceReference,
      { signal: expect.any(AbortSignal) },
    );
    expect(wrapper.text()).toContain("HdpnureE");
    expect(wrapper.text()).toContain("Pastebin task");

    await wrapper.get("input[type='checkbox']").setValue(true);

    expect(window.location.hash).toBe("#1");
  });

  it("updates the checkbox hash when clicking Task Item text", async () => {
    window.history.replaceState(null, "", "/pastebin.com/HdpnureE");
    const wrapper = await mountLoadedSource(
      createPastebinSource("HdpnureE", "- [ ] Clickable task text"),
    );

    await wrapper.get("label").trigger("click");

    expect(wrapper.get<HTMLInputElement>("input[type='checkbox']").element.checked).toBe(true);
    expect(window.location.hash).toBe("#1");
  });

  it("renders the primary GitHub Gist flow in file order and updates the checkbox hash", async () => {
    route.path = "/gist.github.com/gist-1";
    window.history.replaceState(null, "", "/gist.github.com/gist-1");
    const wrapper = await mountLoadedSource(createGitHubGistSource("gist-1"));

    expect(loadSource).toHaveBeenCalledWith(
      { type: "github-gist", gistId: "gist-1" } satisfies SourceReference,
      { signal: expect.any(AbortSignal) },
    );
    expect(wrapper.findAll("h2").map((heading) => heading.text())).toEqual(["one.md", "two.md"]);
    expect(wrapper.text()).toContain("First task");
    expect(wrapper.text()).toContain("Second task");
    expect(wrapper.text()).toContain("Gist description");

    await wrapper.findAll("input[type='checkbox']")[1]?.setValue(true);

    expect(window.location.hash).toBe("#01");
  });

  it("renders file-level errors without hiding ready files", async () => {
    const wrapper = await mountLoadedSource(
      createSource({
        files: [
          {
            status: "ready",
            id: "ready.md",
            name: "ready.md",
            content: "- [ ] Ready task",
          },
          {
            status: "error",
            id: "broken.md",
            name: "broken.md",
            error: { message: "Raw file failed." },
          },
        ],
      }),
    );

    expect(wrapper.text()).toContain("ready.md");
    expect(wrapper.text()).toContain("Ready task");
    expect(wrapper.text()).toContain("broken.md");
    expect(wrapper.text()).toContain("Raw file failed.");
  });

  it("resets all ready files from the source header while tolerating error files", async () => {
    window.history.replaceState(null, "", "/pastebin.com/HdpnureE");
    const wrapper = await mountLoadedSource(
      createSource({
        files: [
          {
            status: "ready",
            id: "one.md",
            name: "one.md",
            content: "- [ ] First task",
          },
          {
            status: "error",
            id: "broken.md",
            name: "broken.md",
            error: { message: "Raw file failed." },
          },
          {
            status: "ready",
            id: "two.md",
            name: "two.md",
            content: "- [ ] Second task",
          },
        ],
      }),
    );

    const checkboxes = wrapper.findAll<HTMLInputElement>("input[type='checkbox']");
    await checkboxes[0]?.setValue(true);
    await checkboxes[1]?.setValue(true);

    expect(window.location.hash).toBe("#11");

    await getButtonByText(wrapper, "Reset all").trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("broken.md");
    expect(wrapper.text()).toContain("Raw file failed.");
    expect(
      wrapper
        .findAll<HTMLInputElement>("input[type='checkbox']")
        .map((input) => input.element.checked),
    ).toEqual([false, false]);
    expect(window.location.hash).toBe("");
  });

  it("treats invalid hash state as unchecked and normalizes it on the next checkbox change", async () => {
    window.history.replaceState(null, "", "/pastebin.com/HdpnureE#not-state");
    const wrapper = await mountLoadedSource(createPastebinSource("HdpnureE", "- [x] Ignored"));
    const checkbox = wrapper.get<HTMLInputElement>("input[type='checkbox']");

    expect(checkbox.element.checked).toBe(false);

    await checkbox.setValue(true);

    expect(window.location.hash).toBe("#1");
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
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/pastebin.com/HdpnureE#10");
    const wrapper = await mountLoadedSource(createSource());

    const copyLinkButton = getButtonByText(wrapper, "Copy link");
    await copyLinkButton.trigger("click");
    await flushPromises();

    expect(writeClipboardText).toHaveBeenCalledWith(
      expect.stringMatching(/\/pastebin\.com\/HdpnureE#10$/),
    );
    expect(copyLinkButton.text()).toBe("Copied");
    expect(window.location.hash).toBe("#10");

    vi.advanceTimersByTime(2000);
    await nextTick();

    expect(copyLinkButton.text()).toBe("Copy link");
  });

  it("does not show a visible error when copying the Checklist Session URL fails", async () => {
    writeClipboardText.mockRejectedValueOnce(new Error("denied"));
    loadSource.mockResolvedValueOnce(createSource());
    const wrapper = mountSourceReferenceView({
      errorHandler: (error) => {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("denied");
      },
    });

    await flushPromises();
    await getButtonByText(wrapper, "Copy link").trigger("click");
    await flushPromises();

    expect(wrapper.find("[role='alert']").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Could not copy link.");
    expect(getButtonByText(wrapper, "Copy link").text()).toBe("Copy link");
  });

  it("aborts the previous source load and ignores its stale resolved result", async () => {
    const firstLoad = createDeferred<SourceContent>();
    const secondLoad = createDeferred<SourceContent>();
    loadSource.mockImplementation((reference) =>
      reference.type === "pastebin" && reference.pasteId === "HdpnureE"
        ? firstLoad.promise
        : secondLoad.promise,
    );
    const wrapper = mountSourceReferenceView();
    await nextTick();

    const firstSignal = loadSource.mock.calls[0]?.[1].signal;
    expect(firstSignal?.aborted).toBe(false);

    route.path = "/pastebin.com/newer";
    await nextTick();

    expect(firstSignal?.aborted).toBe(true);
    expect(loadSource).toHaveBeenLastCalledWith(
      { type: "pastebin", pasteId: "newer" } satisfies SourceReference,
      { signal: expect.any(AbortSignal) },
    );

    secondLoad.resolve(createPastebinSource("newer", "Newer Markdown."));
    await flushPromises();

    expect(wrapper.text()).toContain("newer");
    expect(wrapper.text()).toContain("Newer Markdown.");
    expect(document.title).toBe("newer - Checkgist");

    firstLoad.resolve(createPastebinSource("HdpnureE", "Stale Markdown."));
    await flushPromises();

    expect(wrapper.text()).toContain("Newer Markdown.");
    expect(wrapper.text()).not.toContain("Stale Markdown.");
    expect(document.title).toBe("newer - Checkgist");
  });

  it("ignores stale rejected source load errors while the current load renders normally", async () => {
    const firstLoad = createDeferred<SourceContent>();
    const secondLoad = createDeferred<SourceContent>();
    loadSource.mockImplementation((reference) =>
      reference.type === "pastebin" && reference.pasteId === "HdpnureE"
        ? firstLoad.promise
        : secondLoad.promise,
    );
    const wrapper = mountSourceReferenceView();
    await nextTick();

    route.path = "/pastebin.com/current";
    await nextTick();

    firstLoad.reject(new Error("Stale load failed."));
    await flushPromises();

    expect(wrapper.text()).not.toContain("Stale load failed.");

    secondLoad.resolve(createPastebinSource("current", "Current Markdown."));
    await flushPromises();

    expect(wrapper.text()).toContain("Current Markdown.");
    expect(wrapper.text()).not.toContain("Stale load failed.");
    expect(document.title).toBe("current - Checkgist");
  });
});
