"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    // Redirect based on role
    if (session.user.role === "ADMIN") {
      router.push("/admin/dashboard");
    } else {
      router.push("/client/dashboard");
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
