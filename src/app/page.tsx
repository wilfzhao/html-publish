'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Landing page redirects to dashboard for returning users.
 * First-time users see the intro splash (rendered by IntroSplashWrapper in layout).
 * Returning users (hasSeenYouchaoIntro === true) are redirected to /dashboard.
 */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenYouchaoIntro') === 'true';
    if (hasSeen) {
      router.replace('/dashboard');
    }
  }, [router]);
  return null;
}
