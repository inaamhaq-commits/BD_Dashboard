const accessTokenKey = "inzix.auth.access_token";
const refreshTokenKey = "inzix.auth.refresh_token";

function readString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function readToken(data: unknown, keys: string[]) {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const nested =
    root.tokens && typeof root.tokens === "object"
      ? (root.tokens as Record<string, unknown>)
      : root;

  return readString(nested, keys);
}

export function storeAuthTokens(data: unknown) {
  if (typeof window === "undefined") return;

  const accessToken = readToken(data, ["access_token", "accessToken", "token"]);
  const refreshToken = readToken(data, ["refresh_token", "refreshToken"]);

  if (accessToken) {
    window.localStorage.setItem(accessTokenKey, accessToken);
  }

  if (refreshToken) {
    window.localStorage.setItem(refreshTokenKey, refreshToken);
  }
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(accessTokenKey);
  window.localStorage.removeItem(refreshTokenKey);
}

export function getAccessToken() {
  if (typeof window === "undefined") return "";

  return window.localStorage.getItem(accessTokenKey) ?? "";
}

function withAuthHeader(headersInit?: HeadersInit) {
  const headers = new Headers(headersInit);
  const accessToken = getAccessToken();

  if (accessToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: withAuthHeader(init.headers),
  });
}
