import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomeView from "./HomeView.vue";

const push = vi.fn<(path: string) => Promise<void>>();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

describe("HomeView", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("renders the Home source input copy", () => {
    const wrapper = mount(HomeView);

    expect(wrapper.text()).toContain("Checkgist");
    expect(wrapper.get("input").attributes("placeholder")).toBe(
      "Paste a GitHub Gist or supported source URL",
    );
    expect(wrapper.text()).toContain("Supports GitHub Gist and Pastebin.");
    expect(wrapper.get("button").text()).toBe("Open");
  });

  it("opens a normalized route from the Open button", async () => {
    push.mockResolvedValueOnce(undefined);
    const wrapper = mount(HomeView);

    await wrapper.get("input").setValue("gist.github.com/octocat/abc123/");
    await wrapper.get("form").trigger("submit");

    expect(push).toHaveBeenCalledWith("/gist.github.com/abc123");
    expect(wrapper.text()).not.toContain("Enter a supported GitHub Gist or Pastebin URL.");
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
    expect(wrapper.text()).toContain("Enter a supported GitHub Gist or Pastebin URL.");
  });
});
