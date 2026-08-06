'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFirstVisit } from '@/hooks/useFirstVisit';
import {
  useVideoPlayback,
  PlaybackState,
} from '@/hooks/useVideoPlayback';

const VIDEO_DURATION = 80;

export default function IntroExperience({
  onExited,
}: {
  onExited: () => void;
}) {
  const { markAsSeen } = useFirstVisit();
  const reducedMotionRef = useRef<boolean>(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mql.matches;
    const handler = (e: MediaQueryListEvent | { matches: boolean }) => {
      reducedMotionRef.current = (e as MediaQueryListEvent).matches !== undefined
        ? (e as MediaQueryListEvent).matches
        : (e as { matches: boolean }).matches;
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', handler as EventListener);
    } else if (mql.addListener) {
      mql.addListener(handler as any);
    }
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handler as EventListener);
      } else if (mql.removeListener) {
        mql.removeListener(handler as any);
      }
    };
  }, []);

  const handleCompleted = useCallback((reason: string) => {
    markAsSeen();
    if (onExited) onExited();
  }, [markAsSeen, onExited]);

  const handleFallbackEnter = useCallback(() => {
    markAsSeen();
    if (onExited) onExited();
  }, [markAsSeen, onExited]);

  return (
    <IntroSplash
      reducedMotion={reducedMotionRef.current}
      onCompleted={handleCompleted}
      onFallbackEnter={handleFallbackEnter}
    />
  );
}

interface IntroSplashProps {
  reducedMotion: boolean;
  onCompleted: (reason: string) => void;
  onFallbackEnter: () => void;
}

function IntroSplash({
  reducedMotion,
  onCompleted,
  onFallbackEnter,
}: IntroSplashProps) {
  const {
    videoRef,
    state,
    playSound,
    skip,
  } = useVideoPlayback({
    onCompleted,
  });

  // Set video source and attributes once on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = '/videos/ocean-intro-720p.webm';
    video.poster = '/images/ocean-intro-cover.webp';
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.play().catch(() => {
      // Autoplay was blocked, fallback to static cover via error handler
    });
  }, [videoRef]);

  // Handle video ended events
  const endedRef = useRef(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (endedRef.current) return;
      endedRef.current = true;

      if (video.muted) {
        onCompleted('completed-muted');
      } else {
        onCompleted('completed-with-sound');
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoRef, onCompleted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [videoRef]);

  // Keyboard: Escape to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skip();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [skip]);

  const isExitting = state === 'exiting' || state === 'completed';
  const isPlayingSound = state === 'playing-with-sound' || state === 'restarting-with-sound';
  const isPlayingMuted = state === 'playing-muted';
  const isFallback = state === 'fallback';

  const isSoundButtonVisible = isPlayingMuted;
  const isBrandVisible = !isExitting && !isFallback;
  const isSkipVisible = state !== 'exiting' && state !== 'completed';
  const isSoundButtonPlaying = isPlayingSound;

  return (
    <div
      className={`intro-splash ${isExitting ? 'intro-exiting' : ''}`}
      role="dialog"
      aria-label="Youchao 启动页"
    >
      {/* Background color matching video first frame */}
      <div className="intro-bg" style={{ backgroundColor: '#0c1220' }} />

      {/* Video poster / cover - visible before video starts playing */}
      {!reducedMotion && !isExitting && (
        <div className={`intro-poster ${isPlayingMuted || isPlayingSound ? 'poster-fade' : ''}`} />
      )}

      {/* Video element */}
      {!reducedMotion && (
        <video
          ref={videoRef}
          className="intro-video"
          playsInline
          aria-label="Youchao 海面沉浸式启动视频"
        />
      )}

      {/* Reduced motion static image */}
      {reducedMotion && (
        <div
          className="intro-reduced-motion-bg"
          style={{ backgroundImage: 'url(/images/ocean-intro-cover.webp)' }}
        />
      )}

      {/* Gradient overlay */}
      <div className="intro-overlay" />

      {/* Brand content */}
      {isBrandVisible && (
        <div className="intro-brand">
          <h1
            className="intro-brand-name"
            style={{ animationDelay: '800ms' }}
          >
            Youchao
          </h1>
          <p
            className="intro-slogan"
            style={{ animationDelay: '1800ms' }}
          >
            承载灵感，原型有巢
          </p>

          <button
            className="intro-sound-btn"
            style={{
              animationDelay: '3000ms',
              visibility: isSoundButtonPlaying ? 'hidden' : 'visible',
            }}
            onClick={playSound}
            aria-label="从头播放视频并开启声音"
          >
              <span className="intro-play-icon" aria-hidden="true" />
              <span className="intro-button-copy">
                <span className="intro-button-title">
                  戴上耳机，点击播放
                </span>
                <span className="intro-button-description">
                  视频时长约 {VIDEO_DURATION} 秒·可以点击右上角跳过
                </span>
              </span>
            </button>
        </div>
      )}

      {/* Skip button */}
      {isSkipVisible && (
        <button
          className="intro-skip-btn"
          style={{ animationDelay: '1500ms' }}
          onClick={skip}
          aria-label="跳过启动页"
        >
          跳过
        </button>
      )}

      {/* Fallback state (video load failure) */}
      {isFallback && (
        <div className="intro-fallback">
          <h1 className="intro-fallback-name">Youchao</h1>
          <p className="intro-fallback-slogan">承载灵感，原型有巢</p>
          <button
            className="intro-fallback-btn"
            onClick={onFallbackEnter}
            aria-label="进入 Youchao"
          >
            进入 Youchao
          </button>
        </div>
      )}
    </div>
  );
}
