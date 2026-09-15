import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LoginForm from "./login-form"; // moved client component here, see below

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; step?: string }>;
}) {
  const { next, step } = await searchParams;
  const session = await auth();

  if (session?.user && step !== "name") {
    const user = session.user as { needsProfile?: boolean };
    if (!user.needsProfile) {
      redirect(next ?? "https://dashboard.limelightcreatives.org/");
    }
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}