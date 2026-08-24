/**
 * Hook managing video playback lifecycle for the intro experience.
 * Handles muted autoplay, sound restart, volume fade-out.
 * Fallback only triggers on hard errors (not play/stall events).
 */
import { useState, useRef, useEffect, useCallback } from 'react';

export type PlaybackState =
  | 'checking'
  | 'loading'
  | 'playing-muted'
  | 'restarting-with-sound'
  | 'playing-with-sound'
  | 'fallback'
  | 'exiting'
  | 'completed';

export interface UseVideoPlaybackOptions {
  onStateChange?: (state: PlaybackState) => void;
  onCompleted?: (reason: string) => void;
}

export function useVideoPlayback({
  onStateChange,
  onCompleted,
}: UseVideoPlaybackOptions) {
  const [state, setState] = useState<PlaybackState>('checking');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isFinishing = useRef(false);
  const mountedRef = useRef(true);

  // Track state changes
  useEffect(() => {
    if (onStateChange) onStateChange(state);
  }, [state, onStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }, []);

  const finishIntro = useCallback((reason: string) => {
    if (isFinishing.current || !mountedRef.current) return;
    isFinishing.current = true;
    setState('exiting');
    if (onCompleted) onCompleted(reason);
  }, [onCompleted]);

  const playSound = useCallback(async () => {
    if (!videoRef.current || isFinishing.current) return;

    setState('restarting-with-sound');

    try {
      const video = videoRef.current;
      video.currentTime = 0;
      video.muted = false;
      video.volume = 1;
      await video.play();

      if (!mountedRef.current) return;
      setState('playing-with-sound');
    } catch (err) {
      console.warn('Sound replay failed:', err);
      if (mountedRef.current) {
        setState('playing-muted');
      }
    }
  }, []);

  const skip = useCallback(() => {
    if (isFinishing.current) return;

    const video = videoRef.current;
    if (video && !video.muted) {
      const startTime = Date.now();
      const duration = 600;
      const startVolume = video.volume;

      const fade = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        video.volume = startVolume * (1 - eased);

        if (progress < 1) {
          requestAnimationFrame(fade);
        } else {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }
      };

      requestAnimationFrame(fade);
    } else if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }

    finishIntro('skipped');
  }, [finishIntro]);

  // Set up video event listeners — only once on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => {
      setState('loading');
    };

    const handleCanPlay = () => {
      if (!isFinishing.current) {
        setState('playing-muted');
      }
    };

    // Hard error only — network or decode failure
    const handleError = () => {
      if (!isFinishing.current && mountedRef.current) {
        console.error('[useVideoPlayback] Video error:', video.error?.message);
        setState('fallback');
      }
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, []);

  return {
    videoRef,
    state,
    finishIntro,
    playSound,
    skip,
    cleanup,
  };
}
