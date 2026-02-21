import { NextRequest, NextResponse } from "next/server";

const AUDIUS_API_BASE = "https://api.audius.co/v1";
// Server-side: prefer non-public env var, fall back to public
const AUDIUS_API_KEY =
  process.env.AUDIUS_API_KEY || process.env.NEXT_PUBLIC_AUDIUS_API_KEY || "";

function audiusHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (AUDIUS_API_KEY) h["Authorization"] = `Bearer ${AUDIUS_API_KEY}`;
  return h;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jwt, trackId } = body as { jwt?: string; trackId?: string };

    if (!jwt || !trackId) {
      return NextResponse.json(
        { error: "Missing jwt or trackId" },
        { status: 400 }
      );
    }

    // 1. Verify JWT with Audius to get the requesting user's ID
    const verifyUrl = new URL(`${AUDIUS_API_BASE}/users/verify_token`);
    verifyUrl.searchParams.set("token", jwt);

    const verifyRes = await fetch(verifyUrl.toString(), {
      headers: audiusHeaders(),
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const verifyJson = await verifyRes.json();
    const userId: string | undefined = verifyJson.data?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Token missing userId" },
        { status: 401 }
      );
    }

    // 2. Fetch track from Audius to get the track owner's ID
    const trackRes = await fetch(`${AUDIUS_API_BASE}/tracks/${trackId}`, {
      headers: audiusHeaders(),
    });

    if (!trackRes.ok) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const trackJson = await trackRes.json();
    const trackOwnerId: string | undefined = trackJson.data?.user?.id;

    if (!trackOwnerId) {
      return NextResponse.json(
        { error: "Could not determine track owner" },
        { status: 500 }
      );
    }

    // 3. Ownership check
    if (userId !== trackOwnerId) {
      return NextResponse.json(
        { error: "You do not own this track" },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, userId, trackOwnerId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
