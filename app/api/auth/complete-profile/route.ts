import { NextResponse } from "next/server";
import { auth } from "@/auth"; // path to this NextAuth(...) config file
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { firstName, lastName } = await req.json();

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email.toLowerCase().trim() },
    data: { firstName, lastName },
  });

  return NextResponse.json({ ok: true });
}