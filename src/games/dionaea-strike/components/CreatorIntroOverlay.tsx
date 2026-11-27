import { useCallback, useEffect, useRef, useState } from 'react';
import { SkipForward, Volume2, VolumeX } from 'lucide-react';

export const CREATOR_INTRO_VIDEO_PATH = '/assets/aistudio/gemini_generated_video_832af8a2_66b49cec.webm';

const REVEAL_AT_MS = 340;
const COMPLETE_AT_MS = 900;
const REDUCED_COMPLETE_MS = 240;
const AUDIO_FADE_MS = 260;

interface CreatorIntroOverlayProps {
  assetBasePath?: string;
  initialMuted?: boolean;
  volume?: number;
  exitRequested?: boolean;
  onRevealTitle?: () => void;
  onComplete: () => void;
}

function resolveIntroUrl(basePath: string | undefined, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!basePath || basePath === '/') return path;
  const cleanBase = basePath.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export function CreatorIntroOverlay({
  assetBasePath = '/',
  initialMuted = false,
  volume = 0.8,
  exitRequested = false,
  onRevealTitle,
  onComplete,
}: CreatorIntroOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const revealTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const audioFadeRafRef = useRef<number | null>(null);

  const [isMuted, setIsMuted] = useState(initialMuted);
  const [transitioning, setTransitioning] = useState(false);
  const [videoHidden, setVideoHidden] = useState(false);
  const [reducedFadeOut, setReducedFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [needsGestureToPlay, setNeedsGestureToPlay] = useState(false);

  const clearScheduledWork = useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (completeTimerRef.current !== null) {
      window.clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    if (audioFadeRafRef.current !== null) {
      window.cancelAnimationFrame(audioFadeRafRef.current);
      audioFadeRafRef.current = null;
    }
  }, []);

  const fadeOutVideoAudio = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.muted || video.paused || video.volume <= 0.01) {
      video?.pause();
      return;
    }
    const startVolume = video.volume;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / AUDIO_FADE_MS);
      if (videoRef.current) {
        videoRef.current.volume = Math.max(0, startVolume * (1 - ratio));
      }
      if (ratio < 1) {
        audioFadeRafRef.current = window.requestAnimationFrame(step);
      } else {
        audioFadeRafRef.current = null;
        videoRef.current?.pause();
      }
    };

    audioFadeRafRef.current = window.requestAnimationFrame(step);
  }, []);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearScheduledWork();
    fadeOutVideoAudio();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setReducedFadeOut(true);
      onRevealTitle?.();
      completeTimerRef.current = window.setTimeout(() => {
        completeTimerRef.current = null;
        onComplete();
      }, REDUCED_COMPLETE_MS);
      return;
    }

    setTransitioning(true);

    revealTimerRef.current = window.setTimeout(() => {
      revealTimerRef.current = null;
      videoRef.current?.pause();
      setVideoHidden(true);
      onRevealTitle?.();
    }, REVEAL_AT_MS);

    completeTimerRef.current = window.setTimeout(() => {
      completeTimerRef.current = null;
      onComplete();
    }, COMPLETE_AT_MS);
  }, [clearScheduledWork, fadeOutVideoAudio, onComplete, onRevealTitle]);

  useEffect(() => {
    if (exitRequested) {
      finishIntro();
    }
  }, [exitRequested, finishIntro]);

  useEffect(() => clearScheduledWork, [clearScheduledWork]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = Math.max(0, Math.min(1, volume));
    video.muted = initialMuted;

    let cancelled = false;
    const attemptPlay = async () => {
      try {
        await video.play();
        if (!cancelled) {
          setIsMuted(video.muted);
          setNeedsGestureToPlay(false);
        }
      } catch {
        // Autoplay with audio blocked by browser policy -> fallback cleanly to muted autoplay
        try {
          video.muted = true;
          await video.play();
          if (!cancelled) {
            setIsMuted(true);
            setNeedsGestureToPlay(false);
          }
        } catch {
          if (!cancelled) {
            setNeedsGestureToPlay(true);
          }
        }
      }
    };

    void attemptPlay();

    return () => {
      cancelled = true;
      video.pause();
    };
  }, [initialMuted, volume]);

  const handleToggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    video.volume = Math.max(0.15, Math.min(1, volume));
    setIsMuted(nextMuted);
    if (video.paused) {
      video.play().catch(() => {});
    }
  }, [isMuted, volume]);

  const handleManualPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = Math.max(0.2, Math.min(1, volume));
    video
      .play()
      .then(() => {
        setIsMuted(false);
        setNeedsGestureToPlay(false);
      })
      .catch(() => {
        finishIntro();
      });
  }, [finishIntro, volume]);

  const videoSrc = resolveIntroUrl(assetBasePath, CREATOR_INTRO_VIDEO_PATH);

  return (
    <div
      data-testid="creator-intro-overlay"
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${
        videoHidden ? 'bg-transparent pointer-events-none' : 'bg-[#04070E]'
      } ${reducedFadeOut ? 'transition-opacity duration-[240ms] opacity-0 pointer-events-none' : ''}`}
    >
      {!videoHidden && (
        <>
          <video
            ref={videoRef}
            data-testid="creator-intro-video"
            src={videoSrc}
            playsInline
            autoPlay
            preload="auto"
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              if (el.duration && Number.isFinite(el.duration) && el.duration > 0) {
                setProgress(Math.max(0, Math.min(1, el.currentTime / el.duration)));
              }
            }}
            onEnded={finishIntro}
            onError={finishIntro}
            className={`w-full h-full object-contain bg-[#04070E] ${
              transitioning ? 'animate-intro-video-exit' : ''
            }`}
          />

          {needsGestureToPlay && !transitioning && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#04070E]/75">
              <button
                type="button"
                onClick={handleManualPlay}
                className="touch-manipulation px-6 py-3 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-display font-black text-sm sm:text-base border-2 border-[#050810] shadow-[0_4px_0_#050810] cursor-pointer"
              >
                Reproducir Intro
              </button>
            </div>
          )}

          {/* Subtle bottom progress hairline */}
          <div
            aria-hidden="true"
            className={`fixed bottom-0 left-0 right-0 h-1 bg-slate-900/80 pointer-events-none transition-opacity duration-200 ${
              transitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div
              className="h-full w-full origin-left bg-amber-400/90 transition-transform duration-100 linear"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>

          {/* Bottom-right intro controls (Safe area aware) */}
          <div
            className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] sm:bottom-6 sm:right-6 z-20 flex items-center gap-2 transition-opacity duration-200 ${
              transitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={handleToggleSound}
              aria-label={isMuted ? 'Activar sonido de la intro' : 'Silenciar intro'}
              className="touch-manipulation inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0B1422]/90 hover:bg-[#162338] text-slate-100 text-xs font-semibold border border-slate-700/80 shadow-[0_3px_0_#050810] cursor-pointer whitespace-nowrap"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-amber-400" />
                  <span>Activar sonido</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Sonido On</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="skip-intro-btn"
              onClick={finishIntro}
              aria-label="Saltar video de introducción"
              className="touch-manipulation inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-[#0B1422]/92 hover:bg-[#1E293B] text-white text-xs sm:text-sm font-display font-bold border border-slate-600/90 shadow-[0_3px_0_#050810] cursor-pointer whitespace-nowrap"
            >
              <span>Saltar intro</span>
              <SkipForward className="w-4 h-4 text-sky-400" />
            </button>
          </div>
        </>
      )}

      {/* Cinematic diagonal squadron wipe & emerald/sky glow flash */}
      {transitioning && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-30 pointer-events-none animate-intro-flash"
            style={{
              background:
                'radial-gradient(circle at 55% 48%, rgba(56, 189, 248, 0.55) 0%, rgba(74, 222, 128, 0.35) 38%, transparent 72%)',
            }}
          />

          <div
            data-testid="intro-transition-curtain"
            aria-hidden="true"
            className="fixed inset-y-0 -left-[18vw] w-[136vw] z-40 pointer-events-none animate-intro-curtain bg-[#060D18] flex items-center justify-between overflow-hidden shadow-[0_0_60px_rgba(4,7,14,0.95)]"
          >
            {/* Leading diagonal squadron stripes */}
            <div className="h-full flex shrink-0">
              <div className="w-3 sm:w-5 h-full bg-[#38BDF8]" />
              <div className="w-2 sm:w-3 h-full bg-[#F8FAFC]" />
              <div className="w-3 sm:w-5 h-full bg-[#4ADE80]" />
            </div>

            {/* Center squadron flash emblem */}
            <div className="flex flex-col items-center justify-center px-6 text-center select-none skew-x-[14deg]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-1.5 w-8 rounded-full bg-[#38BDF8]" />
                <span className="h-1.5 w-4 rounded-full bg-[#F8FAFC]" />
                <span className="h-1.5 w-8 rounded-full bg-[#4ADE80]" />
              </div>
              <span className="text-[11px] sm:text-xs font-mono font-extrabold uppercase tracking-[0.28em] text-amber-300">
                ESCUADRÓN PAMPA
              </span>
              <span className="mt-1 font-display font-black uppercase tracking-tight text-2xl sm:text-4xl text-white">
                DIONAEA <span className="text-[#4ADE80]">STRIKE</span>
              </span>
            </div>

            {/* Trailing diagonal squadron stripes */}
            <div className="h-full flex shrink-0">
              <div className="w-3 sm:w-5 h-full bg-[#FACC15]" />
              <div className="w-2 sm:w-3 h-full bg-[#4ADE80]" />
              <div className="w-3 sm:w-5 h-full bg-[#38BDF8]" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
