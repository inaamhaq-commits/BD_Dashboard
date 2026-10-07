function formatPathPart(value: string | number) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readPath(value: unknown) {
  if (!Array.isArray(value)) return "";

  return value
    .filter((part) => typeof part === "string" || typeof part === "number")
    .filter((part) => part !== "body" && part !== "query" && part !== "path")
    .map(formatPathPart)
    .join(" ");
}

function formatValidationItem(value: Record<string, unknown>) {
  const message = typeof value.msg === "string" ? value.msg : "";
  const path = readPath(value.loc);

  if (path && message) {
    return `${path}: ${message}`;
  }

  return message || "";
}

export function getErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object" || !("detail" in data)) {
    return fallback;
  }

  const detail = (data as { detail: unknown }).detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        item && typeof item === "object"
          ? formatValidationItem(item as Record<string, unknown>)
          : typeof item === "string"
            ? item
            : ""
      )
      .filter(Boolean);

    return messages.length ? messages.join("; ") : fallback;
  }

  if (detail && typeof detail === "object") {
    const message = formatValidationItem(detail as Record<string, unknown>);
    return message || fallback;
  }

  return fallback;
}

export function toDisplayMessage(value: unknown, fallback = "Something went wrong.") {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return getErrorMessage({ detail: value }, fallback);
}
