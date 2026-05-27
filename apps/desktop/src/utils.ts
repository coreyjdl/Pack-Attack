export function makeId(name: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "item"}-${Math.random().toString(36).slice(2, 7)}`;
}

export function downloadTextFile(fileName: string, content: string, mime = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

/** Try to write to localStorage; returns a friendly error message on quota / other failures, or null on success. */
export function safeWriteStorage(key: string, value: string): string | null {
  try {
    localStorage.setItem(key, value);
    return null;
  } catch (err) {
    if (err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22)) {
      return "Storage full — couldn't save. Try removing some photos.";
    }
    return "Couldn't save to local storage.";
  }
}

/** Filter a dropped/picked file list down to plausible images. */
export function pickImageFiles(files: Iterable<File>): File[] {
  return Array.from(files).filter((f) => f.type.startsWith("image/"));
}
