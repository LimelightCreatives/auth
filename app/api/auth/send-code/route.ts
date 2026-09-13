import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendLoginCode } from "@/lib/email";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

export async function POST(req: Request) {
  const { email, firstName, lastName } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const normalizedEmail = email.toLowerCase().trim();

  // Look the account up; only auto-create it as a participant if names were
  // supplied (e.g. a self-service signup form). Admin accounts should be
  // created directly in the database/admin console, not through this route.
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "No account found for this email" }, { status: 404 });
    }
    user = await prisma.user.create({
      data: { email: normalizedEmail, firstName, lastName },
    });
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.verificationCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  await sendLoginCode(normalizedEmail, code);

  return NextResponse.json({ ok: true });
}
