'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import '@/components/intro/IntroExperience.css';
import IntroExperience from '@/components/intro/IntroExperience';

/**
 * Client-side wrapper for the intro experience.
 * Ensures the intro only renders on the client and handles exit/unmount logic.
 * Locks body scroll while intro is visible.
 */
export default function IntroSplashWrapper() {
  const pathname = usePathname();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    // The intro is the root-route landing experience. It must never cover an
    // application page merely because browser storage was cleared or the app
    // is being accessed from a new origin after a deployment.
    if (pathname !== '/') {
      setShowIntro(false);
      return;
    }

    // Read from localStorage on mount — prevents flash for returning users
    const hasSeen = localStorage.getItem('hasSeenYouchaoIntro') === 'true';
    if (hasSeen) {
      router.replace('/dashboard');
      return;
    }

    setShowIntro(true);
  }, [pathname, router]);

  // Lock body scroll while intro is visible
  useEffect(() => {
    if (showIntro === true) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showIntro]);

  if (showIntro === null || !showIntro) return null;

  return (
    <IntroExperience
      onExited={() => {
        setShowIntro(false);
        // Navigate to dashboard after intro exits
        router.replace('/dashboard');
      }}
    />
  );
}
