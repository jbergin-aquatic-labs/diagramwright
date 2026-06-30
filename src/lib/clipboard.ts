export async function copyToClipboard(value: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  // Fallback for non-secure contexts or older browsers.
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const ok = document.execCommand("copy");
      if (!ok) throw new Error("Copy command was rejected by the browser.");
      return;
    } finally {
      document.body.removeChild(textarea);
    }
  }

  throw new Error("Clipboard API is not available in this browser.");
}
