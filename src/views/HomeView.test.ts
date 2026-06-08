import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { unsupportedSourceUrlMessage } from "@/source-services/registry";

import HomeView from "./HomeView.vue";

const push = vi.fn<(path: string) => Promise<void>>();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

describe("HomeView", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("focuses the source input when mounted", async () => {
    const wrapper = mount(HomeView, { attachTo: document.body });

    await nextTick();

    expect(document.activeElement).toBe(wrapper.get("input").element);
    wrapper.unmount();
  });

  it("opens a normalized route from the Open button", async () => {
    push.mockResolvedValueOnce(undefined);
    const wrapper = mount(HomeView);

    await wrapper.get("input").setValue("gist.github.com/octocat/abc123/");
    await wrapper.get("form").trigger("submit");

    expect(push).toHaveBeenCalledWith("/gist.github.com/abc123");
    expect(wrapper.text()).not.toContain(unsupportedSourceUrlMessage);
  });

  it("opens a normalized route from Enter submit", async () => {
    push.mockResolvedValueOnce(undefined);
    const wrapper = mount(HomeView);

    await wrapper.get("input").setValue("https://pastebin.com/raw/HdpnureE");
    await wrapper.get("input").trigger("keydown.enter");
    await wrapper.get("form").trigger("submit");

    expect(push).toHaveBeenCalledWith("/pastebin.com/HdpnureE");
  });

  it("shows an inline error for unsupported input", async () => {
    const wrapper = mount(HomeView);

    await wrapper.get("input").setValue("HdpnureE");
    await wrapper.get("form").trigger("submit");

    expect(push).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(unsupportedSourceUrlMessage);
  });
});
