"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Use `next/navigation`

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login'); // Use `push` instead of `replace`
  }, [router]);

  return null; // Render nothing while redirecting
}
