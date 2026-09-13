import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// The root domain this account system is shared across, e.g. "mysite.com".
// Every subdomain (checkin.mysite.com, app2.mysite.com, ...) that shares
// this value and the same AUTH_SECRET will see the same login.
const ROOT_DOMAIN = process.env.AUTH_COOKIE_DOMAIN; // ".mysite.com" (leading dot)

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      id: "email-code",
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.toLowerCase().trim();
        const code = credentials?.code as string;
        if (!email || !code) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Most recent, unused, unexpired code for this user.
        const record = await prisma.verificationCode.findFirst({
          where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        if (!record) return null;

        const valid = await bcrypt.compare(code, record.codeHash);
        if (!valid) return null;

        // Single-use: mark it consumed so it can't be replayed.
        await prisma.verificationCode.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // Carry id/role from the user object into the JWT, then into the session.
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },

  // Share the session cookie across every subdomain of ROOT_DOMAIN so other
  // Vercel projects on the same apex domain see the same logged-in session.
  cookies: ROOT_DOMAIN
    ? {
        sessionToken: {
          name: "__Secure-authjs.session-token",
          options: {
            domain: ROOT_DOMAIN,
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
          },
        },
      }
    : undefined,
});
