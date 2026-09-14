"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/Button";

function Sparkle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 71 112" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M34.0842 5.00024C36.1659 32.3071 39.9734 45.0186 60.8435 53.8204C43.2615 68.9484 37.8959 81.9723 34.0842 111C31.2151 79.9997 26.929 66.1442 9.84351 53.8204C26.7067 45.9754 31.8813 35.3111 34.0842 6.0034"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Only allow redirecting to your own subdomains, never to an arbitrary host
// a "next" param could smuggle in.
function sanitizeNext(next: string | null): string {
  if (!next) return "/dashboard";
  try {
    const url = next.startsWith("http")
      ? new URL(next)
      : new URL(next, "https://limelightcreatives.org");
    if (url.hostname.endsWith("limelightcreatives.org")) {
      return url.toString();
    }
  } catch {
    // fall through to default
  }
  return "/dashboard";
}

type Step = "email" | "code" | "name";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = sanitizeNext(params.get("next"));
  const { update } = useSession();

  const [step, setStep] = useState<Step>("email");
  const [isNewUser, setIsNewUser] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "checking" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      const data = await res.json();
      setIsNewUser(Boolean(data.isNewUser));
      setStep("code");
      setStatus("idle");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setStatus("checking");
    setError("");

    const res = await signIn("email-code", { email, code, redirect: false });

    if (res?.ok) {
      if (isNewUser) {
        setStep("name");
        setStatus("idle");
      } else {
        router.push(next);
      }
    } else {
      setError("That code didn't work. Check it and try again.");
      setStatus("idle");
    }
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    setStatus("checking");
    setError("");

    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });

    if (res.ok) {
      // Force the JWT to pick up the name we just saved, since it was
      // baked in as null at sign-in time (session strategy is jwt).
      await update({ name: `${firstName} ${lastName}` });
      router.push(next);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      setStatus("idle");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="relative w-full max-w-sm">
        <div className="absolute inset-0 translate-x-3 translate-y-3 bg-[var(--ontik-accent)] md:translate-x-4 md:translate-y-4" />

        <div className="relative border-2 border-black p-8" style={{ background: "var(--background)" }}>
          {step === "email" && (
            <>
              <h1 className="mb-2 text-3xl font-display font-bold" style={{ color: "var(--foreground)" }}>
                Sign in
              </h1>
              <p className="mb-8 text-sm" style={{ color: "var(--foreground)", opacity: 0.65 }}>
                We&rsquo;ll email you a 6-digit code.
              </p>

              <form onSubmit={handleSendCode} className="flex flex-col gap-3">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-[2px] px-4 py-3 text-sm font-body outline-none"
                  style={{
                    borderColor: "var(--foreground)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    borderRadius: 0,
                  }}
                />
                <Button type="submit" disabled={status === "sending"} className="w-full text-center">
                  {status === "sending" ? "Sending code…" : "Send code"}
                </Button>
                {error && (
                  <p className="text-sm" style={{ color: "#c0392b" }}>
                    {error}
                  </p>
                )}
              </form>
            </>
          )}

          {step === "code" && (
            <>
              <h1 className="mb-2 text-2xl font-display font-bold" style={{ color: "var(--foreground)" }}>
                Enter your code
              </h1>
              <p className="mb-8 text-sm" style={{ color: "var(--foreground)", opacity: 0.65 }}>
                Sent to {email}. It expires in 10 minutes.
              </p>

              <form onSubmit={handleVerify} className="flex flex-col gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="border-[2px] px-4 py-3 text-center text-lg tracking-[0.5em] outline-none font-body"
                  style={{
                    borderColor: "var(--foreground)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    borderRadius: 0,
                  }}
                />
                <Button
                  type="submit"
                  disabled={status === "checking" || code.length !== 6}
                  className="w-full text-center"
                >
                  {status === "checking" ? "Checking…" : "Verify"}
                </Button>
                {error && (
                  <p className="text-sm" style={{ color: "#c0392b" }}>
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-xs underline"
                  style={{ color: "var(--foreground)", opacity: 0.6 }}
                >
                  Use a different email
                </button>
              </form>
            </>
          )}

          {step === "name" && (
            <>
              <h1 className="mb-2 text-2xl font-display font-bold" style={{ color: "var(--foreground)" }}>
                Welcome! What&rsquo;s your name?
              </h1>
              <p className="mb-8 text-sm" style={{ color: "var(--foreground)", opacity: 0.65 }}>
                Just need this to finish setting up your account.
              </p>

              <form onSubmit={handleCompleteProfile} className="flex flex-col gap-3">
                <input
                  type="text"
                  required
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border-[2px] px-4 py-3 text-sm font-body outline-none"
                  style={{
                    borderColor: "var(--foreground)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    borderRadius: 0,
                  }}
                />
                <input
                  type="text"
                  required
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border-[2px] px-4 py-3 text-sm font-body outline-none"
                  style={{
                    borderColor: "var(--foreground)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    borderRadius: 0,
                  }}
                />
                <Button type="submit" disabled={status === "checking"} className="w-full text-center">
                  {status === "checking" ? "Saving…" : "Finish"}
                </Button>
                {error && (
                  <p className="text-sm" style={{ color: "#c0392b" }}>
                    {error}
                  </p>
                )}
              </form>
            </>
          )}

          <Sparkle className="pointer-events-none absolute -top-12 -right-10 h-14 w-9 rotate-[16deg] text-[var(--ontik-accent)]" />
          <Sparkle className="pointer-events-none absolute -top-8 right-0 h-6 w-4 rotate-[-6deg] text-[#1B2340]" />
          <Sparkle className="pointer-events-none absolute -bottom-10 -left-5 h-9 w-6 rotate-[-15deg] text-[#1B2340]" />
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}