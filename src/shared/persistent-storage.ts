let persistentStorageRequestStarted = false;

async function requestPersistentStorage(): Promise<void> {
  if (navigator.storage?.persist === undefined) {
    return;
  }

  if (await navigator.storage.persisted()) {
    return;
  }

  await navigator.storage.persist();
}

export function requestPersistentStorageOnce(): void {
  if (persistentStorageRequestStarted) {
    return;
  }

  persistentStorageRequestStarted = true;
  void requestPersistentStorage();
}
