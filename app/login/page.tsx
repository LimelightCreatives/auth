"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-2 text-2xl" style={{ color: "var(--ink)" }}>
        Sign in
      </h1>
      <p className="mb-8 text-sm" style={{ color: "#6b6862" }}>
        We&rsquo;ll email you a 6-digit code. No password to remember.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border px-4 py-3 text-sm outline-none focus:ring-2"
          style={{ borderColor: "var(--line)" }}
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-md px-4 py-3 text-sm font-medium text-white transition disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {status === "sending" ? "Sending code…" : "Send code"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </main>
  );
}
