import type { NextRequest } from "next/server";

import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

const NO_STORE = "private, no-store, no-cache, must-revalidate";

function withoutStore(response: Response): Response {
  response.headers.set("Cache-Control", NO_STORE);
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: NextRequest) {
  return withoutStore(await handlers.GET(request));
}

export async function POST(request: NextRequest) {
  return withoutStore(await handlers.POST(request));
}
