import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadChecklist } from "@/checklist";
import { closeCheckgistDatabaseForTests } from "@/database/checkgistDatabase";
import {
  createLocalDocument,
  localDocumentEditRoute,
  localDocumentViewRoute,
  saveLocalDocument,
} from "@/local-documents";
import { referenceFromUrlInput, routeForUrlInput, SourceLoadError } from "@/source-services";

import { localDocumentService } from "./local-document.ts";

const documentId = "11111111-1111-4111-8111-111111111111";

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

function applicationUrl(route: string): URL {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return new URL(`${basePath}${route}`, window.location.origin);
}

describe("Local Document source service", () => {
  beforeEach(async () => {
    await closeCheckgistDatabaseForTests();
    resetIndexedDb();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it.each([localDocumentViewRoute(documentId), localDocumentEditRoute(documentId)])(
    "canonicalizes same-origin Local Document URLs through public Source Addressing",
    (route) => {
      const url = applicationUrl(route);

      expect(referenceFromUrlInput(url.href)).toEqual({ type: "local-document", documentId });
      expect(routeForUrlInput(url.href)).toBe(localDocumentViewRoute(documentId));
    },
  );

  it("rejects foreign and malformed Local Document URLs through public Source Addressing", () => {
    const foreignUrl = new URL(localDocumentViewRoute(documentId), "https://example.com");
    const malformedUrl = applicationUrl("/local/not-a-uuid");
    const incompleteUrl = applicationUrl("/local");

    expect(referenceFromUrlInput(foreignUrl.href)).toBeNull();
    expect(referenceFromUrlInput(malformedUrl.href)).toBeNull();
    expect(referenceFromUrlInput(incompleteUrl.href)).toBeNull();
  });

  it("recognizes Local Document URLs only below a nested application base path", () => {
    vi.stubEnv("BASE_URL", "/projects/checkgist/");
    const sourceUrl = applicationUrl(localDocumentViewRoute(documentId));
    const editorUrl = applicationUrl(localDocumentEditRoute(documentId));
    const sameOriginUrlOutsideApp = new URL(
      localDocumentViewRoute(documentId),
      window.location.origin,
    );

    expect(referenceFromUrlInput(sourceUrl.href)).toEqual({ type: "local-document", documentId });
    expect(routeForUrlInput(editorUrl.href)).toBe(localDocumentViewRoute(documentId));
    expect(referenceFromUrlInput(sameOriginUrlOutsideApp.href)).toBeNull();
  });

  it("loads a Local Document through the registered Checklist pipeline", async () => {
    await createLocalDocument(documentId);
    await saveLocalDocument({ id: documentId, title: "Packing", content: "- [ ] Passport" });

    const result = await loadChecklist({ type: "local-document", documentId }, { stateHash: "#1" });

    expect(result).toMatchObject({
      status: "loaded",
      browserTitle: "Packing - Checkgist",
      session: {
        source: {
          reference: { type: "local-document", documentId },
          metadata: { title: "Packing", url: localDocumentEditRoute(documentId) },
        },
      },
    });
    if (result.status !== "loaded") {
      return;
    }

    expect(result.session.files).toHaveLength(1);
    expect(result.session.files).toMatchObject([
      {
        status: "ready",
        sourceFile: { id: documentId, name: "Packing", content: "- [ ] Passport" },
        checked: [true],
      },
    ]);
  });

  it("propagates a missing Local Document error through the Checklist pipeline", async () => {
    await expect(loadChecklist({ type: "local-document", documentId })).rejects.toMatchObject({
      name: SourceLoadError.name,
      message: "Local document not found.",
    });
  });
});
