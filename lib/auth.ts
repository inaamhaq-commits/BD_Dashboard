const fallbackBackendUrl = "http://localhost:8000";

export function getBackendUrl() {
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? fallbackBackendUrl;
}

export async function parseBackendResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return text ? { detail: text } : {};
}

export function appendSetCookieHeaders(target: Headers, source: Headers) {
  const getSetCookie = (source as Headers & {
    getSetCookie?: () => string[];
  }).getSetCookie;

  if (typeof getSetCookie === "function") {
    for (const cookie of getSetCookie.call(source)) {
      target.append("set-cookie", cookie);
    }
    return;
  }

  const singleCookie = source.get("set-cookie");
  if (singleCookie) {
    target.append("set-cookie", singleCookie);
  }
}
