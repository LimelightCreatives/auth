# Shared account system

Passwordless (email code) accounts for admins and participants, built to be
shared across multiple Vercel projects on the same root domain.

## 1. Set up the database once

1. Create a free Postgres database at [neon.tech](https://neon.tech).
2. Copy the pooled connection string into `DATABASE_URL`, and the direct
   (non-pooled) connection string into `DIRECT_URL`.
3. Run the migration once from this project:
   ```bash
   npx prisma migrate dev --name init
   ```
   This creates the `users` and `verification_codes` tables in Neon.

This one Neon database is now your single source of truth for accounts.
Every other project just points at it — nobody needs their own copy.

## 2. Create your first admin

Neon gives you a SQL console in its dashboard. Run:

```sql
insert into users (id, email, "firstName", "lastName", role)
values (gen_random_uuid(), 'you@example.com', 'Your', 'Name', 'ADMIN');
```

(Participant accounts can self-create by signing in with a name + email —
see `app/api/auth/send-code/route.ts`. Admins should be added manually or
through an internal admin tool, not the public sign-up flow.)

## 3. Deploy this project to Vercel

Add these environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_COOKIE_DOMAIN` | `.mysite.com` (your root domain, leading dot) |
| `RESEND_API_KEY` | from resend.com (optional in dev — codes log to console if unset) |
| `EMAIL_FROM` | e.g. `sign-in@mysite.com` |

Point this project at a subdomain of your root domain, e.g.
`accounts.mysite.com` or `checkin.mysite.com`.

## 4. Sharing this with your OTHER Vercel projects

Every other app that should recognize the same logged-in user needs three
things, copied identically:

1. **The same `DATABASE_URL` / `DIRECT_URL`** — so it reads/writes the same
   `users` table. Copy `prisma/schema.prisma` into that project too (or move
   it into a shared private npm package once you have 3+ projects).
2. **The same `AUTH_SECRET`** — this is what lets one app trust a session
   token issued by another.
3. **The same `AUTH_COOKIE_DOMAIN`** — this is what makes the browser send
   the cookie to every subdomain in the first place.

Copy env vars between Vercel projects by hand for now (Settings →
Environment Variables in each project). If you end up with many projects,
Vercel Teams supports **shared environment variables** at the team level so
you only maintain one copy.

Once wired up, a user who signs in on `checkin.mysite.com` will already be
signed in on `app2.mysite.com` — that project just needs `auth()` from its
own copy of `auth.ts` to read the session, no separate login required.

**Note:** this only works because everything sits under one apex domain.
A project on a completely different domain name can't read this cookie —
that would need a real OAuth/OIDC layer, which isn't necessary yet.

## Local development

`AUTH_COOKIE_DOMAIN` should be left unset locally (localhost can't use a
custom cookie domain). Leave `RESEND_API_KEY` unset too — codes will be
printed to your terminal instead of emailed.
