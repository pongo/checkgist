import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { closeCheckgistDatabaseForTests } from "@/database/checkgistDatabase";

import {
  createLocalDocument,
  deleteLocalDocument,
  getLocalDocument,
  listLocalDocuments,
  saveLocalDocument,
} from "./db";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const invalidId = "not-a-local-document-id";
type UuidShapedId = `${string}-${string}-${string}-${string}-${string}`;

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

describe("Local Document persistence", () => {
  beforeEach(async () => {
    await closeCheckgistDatabaseForTests();
    resetIndexedDb();
    vi.restoreAllMocks();
  });

  it("creates an immutable Untitled document with an empty exact Markdown body", async () => {
    vi.spyOn(Date, "now").mockReturnValue(100);

    const document = await createLocalDocument(firstId);

    expect(document).toEqual({
      id: firstId,
      title: "Untitled document",
      content: "",
      createdAt: 100,
      updatedAt: 100,
    });
    expect(await getLocalDocument(firstId)).toEqual(document);
  });

  it("rejects malformed IDs before accessing IndexedDB", async () => {
    vi.stubGlobal("indexedDB", undefined);

    await expect(createLocalDocument(invalidId)).rejects.toThrow(
      "Local Document IDs must be UUIDs.",
    );
    await expect(getLocalDocument(invalidId)).resolves.toBeNull();
    await expect(
      saveLocalDocument({ id: invalidId, title: "Valid title", content: "content" }),
    ).resolves.toBeNull();
    await expect(deleteLocalDocument(invalidId)).resolves.toBeNull();
  });

  it("trims a valid title while preserving content exactly and the creation timestamp", async () => {
    vi.spyOn(Date, "now").mockReturnValue(100);
    await createLocalDocument(firstId);
    vi.spyOn(Date, "now").mockReturnValue(200);

    const saved = await saveLocalDocument({
      id: firstId,
      title: "  Release checklist  ",
      content: "  # Exact\n\n- [ ] Keep whitespace  \n",
    });

    expect(saved).toEqual({
      id: firstId,
      title: "Release checklist",
      content: "  # Exact\n\n- [ ] Keep whitespace  \n",
      createdAt: 100,
      updatedAt: 200,
    });
  });

  it("persists a title at the maximum permitted length", async () => {
    const title = "a".repeat(200);
    await createLocalDocument(firstId);

    await expect(
      saveLocalDocument({ id: firstId, title, content: "content" }),
    ).resolves.toMatchObject({
      id: firstId,
      title,
      content: "content",
    });
  });

  it.each(["   ", "a".repeat(201)])("rejects an invalid title %s", async (title) => {
    await createLocalDocument(firstId);

    await expect(saveLocalDocument({ id: firstId, title, content: "content" })).rejects.toThrow(
      /title/i,
    );
    expect((await getLocalDocument(firstId))?.title).toBe("Untitled document");
  });

  it.each([`prefix-${firstId}` as UuidShapedId, `${firstId}-suffix` as UuidShapedId])(
    "rejects an ID that contains a UUID but is not one",
    async (invalidId) => {
      vi.stubGlobal("indexedDB", undefined);

      await expect(createLocalDocument(invalidId)).rejects.toThrow(
        "Local Document IDs must be UUIDs.",
      );
    },
  );

  it("orders documents by last successful save", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(100);
    await createLocalDocument(firstId);
    now.mockReturnValue(200);
    await createLocalDocument(secondId);
    now.mockReturnValue(300);
    await saveLocalDocument({ id: firstId, title: "First", content: "" });

    expect((await listLocalDocuments()).map((document) => document.id)).toEqual([
      firstId,
      secondId,
    ]);
  });

  it("uses last-write-wins saves and returns null for a missing record", async () => {
    await createLocalDocument(firstId);
    await saveLocalDocument({ id: firstId, title: "First write", content: "one" });
    await saveLocalDocument({ id: firstId, title: "Second write", content: "two" });

    expect(await getLocalDocument(firstId)).toMatchObject({
      title: "Second write",
      content: "two",
    });
    expect(await saveLocalDocument({ id: secondId, title: "Missing", content: "" })).toBeNull();
    expect(await deleteLocalDocument(secondId)).toBeNull();
  });

  it("deletes only the requested Local Document", async () => {
    await createLocalDocument(firstId);
    await createLocalDocument(secondId);

    expect(await deleteLocalDocument(firstId)).toMatchObject({ id: firstId });

    expect(await getLocalDocument(firstId)).toBeNull();
    expect(await getLocalDocument(secondId)).toMatchObject({ id: secondId });
  });
});
