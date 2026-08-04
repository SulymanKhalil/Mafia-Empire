import { NextResponse } from "next/server";

export async function POST() {
  // Deprecated: Presence channel subscription handles leaves natively.
  return NextResponse.json({ ok: true });
}
