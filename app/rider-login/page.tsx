'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components';

export default function RiderLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified login page
    router.push('/login?role=rider');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fafc] to-[#eef2ff] dark:from-[#071025] dark:via-[#041022] dark:to-[#011018] flex items-center justify-center">
      <Spinner className="w-8 h-8" />
    </div>
  );
}