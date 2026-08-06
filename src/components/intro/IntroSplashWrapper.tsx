'use client';

import { useState, useEffect } from 'react';
import '@/components/intro/IntroExperience.css';
import IntroExperience from '@/components/intro/IntroExperience';

/**
 * Client-side wrapper for the intro experience.
 * Ensures the intro only renders on the client and handles exit/unmount logic.
 * Locks body scroll while intro is visible.
 */
export default function IntroSplashWrapper() {
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    // Read from localStorage on mount — prevents flash for returning users
    const hasSeen = localStorage.getItem('hasSeenYouchaoIntro') === 'true';
    setShowIntro(!hasSeen);
  }, []);

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
        window.location.replace('/dashboard');
      }}
    />
  );
}