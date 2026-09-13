import { NextResponse } from "next/server";

export function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error") ?? "Configuration";
  return NextResponse.redirect(new URL(`/tr/giris?error=${encodeURIComponent(error)}`, url.origin));
}
