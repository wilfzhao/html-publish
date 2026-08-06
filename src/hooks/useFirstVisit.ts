/**
 * Hook to manage first-visit state for the intro experience.
 * Uses localStorage to remember if the user has seen the intro.
 *
 * NOTE: The actual first-visit check is done in IntroSplashWrapper
 * to prevent SSR flashes. This hook just handles marking and resetting.
 */
import { useCallback } from 'react';

const INTRO_STORAGE_KEY = "hasSeenYouchaoIntro";

export function useFirstVisit() {
  const markAsSeen = useCallback(() => {
    localStorage.setItem(INTRO_STORAGE_KEY, "true");
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(INTRO_STORAGE_KEY);
  }, []);

  const check = useCallback((): boolean => {
    return localStorage.getItem(INTRO_STORAGE_KEY) !== "true";
  }, []);

  return { markAsSeen, reset, check };
}
