import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { closeCheckgistDatabaseForTests } from "@/database/checkgistDatabase";

import { createLocalDocument, saveLocalDocument } from "./db";
import {
  localDocumentAddressRule,
  localDocumentEditRoute,
  localDocumentService,
  localDocumentViewRoute,
} from "./source-service";
import { SourceLoadError } from "@/source-services";

const documentId = "11111111-1111-4111-8111-111111111111";

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

describe("Local Document source service", () => {
  beforeEach(async () => {
    await closeCheckgistDatabaseForTests();
    resetIndexedDb();
  });

  it("loads a stored Local Document as exactly one ready Source File", async () => {
    await createLocalDocument(documentId);
    await saveLocalDocument({ id: documentId, title: "Packing", content: "- [ ] Passport" });

    await expect(
      localDocumentService.load({ type: "local-document", documentId }),
    ).resolves.toEqual({
      reference: { type: "local-document", documentId },
      metadata: { title: "Packing", url: localDocumentEditRoute(documentId) },
      files: [{ status: "ready", id: documentId, name: "Packing", content: "- [ ] Passport" }],
    });
  });

  it("rejects absent Local Documents with the checklist-facing error", async () => {
    await expect(
      localDocumentService.load({ type: "local-document", documentId }),
    ).rejects.toMatchObject({
      name: SourceLoadError.name,
      message: "Local document not found.",
    });
  });

  it("recognizes same-origin view and edit URLs but rejects foreign lookalikes", () => {
    const localUrl = new URL(localDocumentViewRoute(documentId), window.location.origin);
    const editUrl = new URL(localDocumentEditRoute(documentId), window.location.origin);
    const foreignUrl = new URL(localDocumentViewRoute(documentId), "https://example.com");

    expect(localDocumentAddressRule.fromUrl(localUrl)).toEqual({
      type: "local-document",
      documentId,
    });
    expect(localDocumentAddressRule.fromUrl(editUrl)).toEqual({
      type: "local-document",
      documentId,
    });
    expect(localDocumentAddressRule.fromUrl(foreignUrl)).toBeNull();
    expect(localDocumentAddressRule.fromRoute(["local", "not-a-uuid"])).toBeNull();
  });
});
