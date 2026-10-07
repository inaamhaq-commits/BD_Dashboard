"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type UserRole = "user" | "manager";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  setUserFromResponse: (data: unknown, fallbackEmail?: string) => AuthUser;
  clearUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const storageKey = "inzix.auth.user";
const authStorageEvent = "inzix.auth.storage";

function readString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeRole(value: string): UserRole {
  return value.toLowerCase() === "manager" ? "manager" : "user";
}

function normalizeUser(data: unknown, fallbackEmail = ""): AuthUser {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const nested =
    root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>)
      : root;
  const email = readString(nested, ["email"]) || fallbackEmail;
  const fullName =
    readString(nested, ["full_name", "fullName", "name"]) ||
    email.split("@")[0] ||
    "User";

  return {
    id: readString(nested, ["id", "user_id"]) || email,
    fullName,
    email,
    role: normalizeRole(readString(nested, ["role"])),
    avatarUrl: readString(nested, [
      "avatar_url",
      "avatarUrl",
      "profile_image",
      "profileImage",
      "image_url",
      "imageUrl",
      "photo_url",
      "photoUrl",
    ]),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const storedUser = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(authStorageEvent, onStoreChange);

      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(authStorageEvent, onStoreChange);
      };
    },
    () => window.localStorage.getItem(storageKey),
    () => null
  );

  const user = useMemo(() => {
    if (!storedUser) return null;

    try {
      return normalizeUser(JSON.parse(storedUser));
    } catch {
      window.localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event(authStorageEvent));
      return null;
    }
  }, [storedUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady: true,
      setUserFromResponse(data, fallbackEmail) {
        const nextUser = normalizeUser(data, fallbackEmail);
        window.localStorage.setItem(storageKey, JSON.stringify(nextUser));
        window.dispatchEvent(new Event(authStorageEvent));
        return nextUser;
      },
      clearUser() {
        window.localStorage.removeItem(storageKey);
        window.dispatchEvent(new Event(authStorageEvent));
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
