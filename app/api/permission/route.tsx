import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ROOT_DOMAIN = process.env.AUTH_COOKIE_DOMAIN;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin || !ROOT_DOMAIN) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(ROOT_DOMAIN.replace(/^\./, ""));
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null) {
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin as string,
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ authenticated: false }, { status: 401, headers });
  }

  const user = session.user as {
    id?: string;
    email?: string;
    role?: string;
    name?: string;
    needsProfile?: boolean;
  };

  return NextResponse.json(
    {
      authenticated: true,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      needsProfile: Boolean(user.needsProfile),
    },
    { headers }
  );
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}