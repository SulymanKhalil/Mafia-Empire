import { NextResponse } from "next/server";

export async function POST() {
  // Deprecated: Presence channel subscription handles joins natively.
  return NextResponse.json({ ok: true });
}
