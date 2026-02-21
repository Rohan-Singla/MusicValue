import { AUDIUS_API_BASE, AUDIUS_API_KEY, APP_URL } from "@/lib/constants";

export interface AudiusAuthUser {
  userId: string;
  handle: string;
  name: string;
  profilePicture: string | null;
  jwt: string;
  linkedAt: number;
}

const STORAGE_KEY = "audius_auth";
const AUDIUS_ORIGIN = "https://audius.co";

function randomState(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/**
 * Open the Audius OAuth popup. Must be called synchronously in a click handler
 * — no await before window.open.
 */
export function openOAuthPopup(): Promise<AudiusAuthUser> {
  const state = randomState();

  // Use the actual running origin so Audius can target the postMessage correctly.
  // APP_URL is a fallback for SSR, but in the browser window.location.origin is authoritative.
  const appOrigin =
    typeof window !== "undefined" ? window.location.origin : APP_URL;

  const params = new URLSearchParams({
    scope: "read",
    api_key: AUDIUS_API_KEY,
    redirect_uri: "postmessage",
    state,
    origin: appOrigin,
  });

  // window.open must be synchronous with the click — no await above this line
  const popup = window.open(
    `${AUDIUS_ORIGIN}/oauth/auth?${params.toString()}`,
    "audius_oauth",
    "width=500,height=700,left=200,top=100"
  );

  return new Promise((resolve, reject) => {
    if (!popup) {
      reject(new Error("Popup blocked. Allow popups for this site."));
      return;
    }

    let done = false;

    /** Call exactly once to clean up listeners and timers */
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearInterval(closedPoll);
      window.removeEventListener("message", handler);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error("OAuth timed out. Please try again.")));
    }, 120_000);

    const handler = async (event: MessageEvent) => {
      // Accept messages from audius.co or any audius subdomain
      if (!event.origin.includes("audius.co")) return;

      const data = (event.data ?? {}) as Record<string, string>;
      const { token, state: returnedState, error } = data;

      if (error) {
        finish(() => reject(new Error(error)));
        return;
      }

      // Skip unrelated postMessages (wrong state or no token)
      if (!token || returnedState !== state) return;

      finish(() => {
        popup.close();
        verifyJwt(token).then(resolve).catch(reject);
      });
    };

    window.addEventListener("message", handler);

    // Detect if the user closed the popup manually.
    // Wait 1 s after close to let any queued postMessages fire first.
    const closedPoll = setInterval(() => {
      if (!popup.closed) return;
      clearInterval(closedPoll);
      if (done) return;
      setTimeout(() => {
        finish(() =>
          reject(new Error("Popup was closed. Please try connecting again."))
        );
      }, 1000);
    }, 300);
  });
}

/** Verify JWT with Audius and return user info */
async function verifyJwt(token: string): Promise<AudiusAuthUser> {
  const url = new URL(`${AUDIUS_API_BASE}/users/verify_token`);
  url.searchParams.set("token", token);

  const res = await fetch(url.toString(), {
    headers: {
      ...(AUDIUS_API_KEY ? { Authorization: `Bearer ${AUDIUS_API_KEY}` } : {}),
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`JWT verification failed: ${res.status}`);
  }

  const json = await res.json();
  const data = json.data ?? json;

  return {
    userId: data.userId ?? data.id ?? data.user_id ?? "",
    handle: data.handle ?? "",
    name: data.name ?? "",
    profilePicture: data.profile_picture?.["150x150"] ?? data.profilePicture ?? null,
    jwt: token,
    linkedAt: Date.now(),
  };
}

/** Persist auth user to localStorage */
export function saveAuthUser(user: AudiusAuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

/** Load auth user from localStorage (SSR-safe) */
export function loadAuthUser(): AudiusAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AudiusAuthUser) : null;
  } catch {
    return null;
  }
}

/** Remove auth from localStorage */
export function clearAuthUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
