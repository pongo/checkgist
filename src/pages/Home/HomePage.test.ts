import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { unsupportedSourceUrlMessage } from "@/source-services";

import HomePage from "./HomePage.vue";

const push = vi.hoisted(() => vi.fn<(path: string) => Promise<void>>());
const homePageMountOptions = {
  global: {
    stubs: {
      RouterLink: true,
    },
  },
} as const;

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

describe("HomePage", () => {
  let wrapper: VueWrapper | undefined;

  beforeEach(() => {
    push.mockReset();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("focuses the source input when mounted", async () => {
    wrapper = mount(HomePage, { ...homePageMountOptions, attachTo: document.body });

    await nextTick();

    expect(document.activeElement).toBe(wrapper.get("input").element);
  });

  it("opens a normalized route from the Open button", async () => {
    push.mockResolvedValueOnce(undefined);
    wrapper = mount(HomePage, homePageMountOptions);

    await wrapper.get("input").setValue("gist.github.com/octocat/abc123/");
    await wrapper.get("form").trigger("submit");

    expect(push).toHaveBeenCalledWith("/gist.github.com/abc123");
    expect(wrapper.text()).not.toContain(unsupportedSourceUrlMessage);
  });

  it("opens a normalized route from Enter submit", async () => {
    push.mockResolvedValueOnce(undefined);
    wrapper = mount(HomePage, homePageMountOptions);

    await wrapper.get("input").setValue("https://pastebin.com/raw/HdpnureE");
    await wrapper.get("input").trigger("keydown.enter");
    await wrapper.get("form").trigger("submit");

    expect(push).toHaveBeenCalledWith("/pastebin.com/HdpnureE");
  });

  it("shows an inline error for unsupported input", async () => {
    wrapper = mount(HomePage, homePageMountOptions);

    await wrapper.get("input").setValue("HdpnureE");
    await wrapper.get("form").trigger("submit");

    expect(push).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(unsupportedSourceUrlMessage);
    const supportedSitesLink = wrapper.get("#source-url-error").get<HTMLAnchorElement>("a");
    expect(supportedSitesLink.text()).toBe("See supported sites");
    expect(supportedSitesLink.attributes("href")).toBe("https://github.com/pongo/checkgist");
    expect(supportedSitesLink.attributes("target")).toBe("_blank");
    expect(supportedSitesLink.attributes("rel")).toBe("noopener noreferrer");
  });
});
