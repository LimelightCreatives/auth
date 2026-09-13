"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "checking">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("checking");
    setError("");

    const res = await signIn("email-code", { email, code, redirect: false });

    if (res?.ok) {
      router.push("/dashboard");
    } else {
      setError("That code didn't work. Check it and try again.");
      setStatus("idle");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-2 text-2xl" style={{ color: "var(--ink)" }}>
        Enter your code
      </h1>
      <p className="mb-8 text-sm" style={{ color: "#6b6862" }}>
        Sent to {email || "your email"}. It expires in 10 minutes.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="rounded-md border px-4 py-3 text-center text-lg tracking-[0.5em] outline-none focus:ring-2"
          style={{ borderColor: "var(--line)" }}
        />
        <button
          type="submit"
          disabled={status === "checking" || code.length !== 6}
          className="rounded-md px-4 py-3 text-sm font-medium text-white transition disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {status === "checking" ? "Checking…" : "Verify and sign in"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
