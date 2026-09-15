import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendLoginCode } from "@/lib/email";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const MAX_CODES_PER_EMAIL_PER_HOUR = 5;
const MAX_CODES_PER_IP_PER_HOUR = 15;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIp(req: Request): string {
  // Vercel/most proxies set this; falls back to a constant if absent so
  // requests aren't silently unlimited (they'll just all share one bucket).
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const ip = getClientIp(req);
  const windowStart = new Date(Date.now() - WINDOW_MS);

  // Per-email throttle
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const recentForEmail = await prisma.verificationCode.count({
      where: { userId: existingUser.id, createdAt: { gt: windowStart } },
    });
    if (recentForEmail >= MAX_CODES_PER_EMAIL_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many codes requested. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Per-IP throttle (covers the case of many different emails from one attacker)
  const recentForIp = await prisma.rateLimitEvent.count({
    where: { ip, type: "send_code", createdAt: { gt: windowStart } },
  });
  if (recentForIp >= MAX_CODES_PER_IP_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let user = existingUser;
  if (!user) {
    user = await prisma.user.create({ data: { email: normalizedEmail } });
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.verificationCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await prisma.rateLimitEvent.create({
    data: { ip, type: "send_code" },
  });

  await sendLoginCode(normalizedEmail, code);

  return NextResponse.json({ ok: true });
}