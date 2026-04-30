"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSetupRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile page where users can complete their profile
    router.replace("/profile");
  }, [router]);

  return null;
}
