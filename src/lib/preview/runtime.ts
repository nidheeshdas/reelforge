'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { applyCompositionState, buildComposition } from './composition';
import { PreviewEngine } from './engine';

export type PreviewRuntimeStatus = 'loading' | 'ready' | 'error';

interface PreviewRuntimeOptions {
  code: string;
  width: number;
  height: number;
  initialDuration?: number;
}

interface PreviewRuntimeState {
  status: PreviewRuntimeStatus;
  error: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  engineRevision: number;
}

type PreviewRuntimeAction =
  | { type: 'engine-ready' }
  | { type: 'load-start' }
  | { type: 'load-success'; duration: number }
  | { type: 'load-error'; error: string }
  | { type: 'time-update'; time: number }
  | { type: 'playing-changed'; isPlaying: boolean };

function getInitialState(initialDuration: number): PreviewRuntimeState {
  return {
    status: 'loading',
    error: null,
    duration: initialDuration,
    currentTime: 0,
    isPlaying: false,
    engineRevision: 0,
  };
}

function previewRuntimeReducer(state: PreviewRuntimeState, action: PreviewRuntimeAction): PreviewRuntimeState {
  switch (action.type) {
    case 'engine-ready':
      return {
        ...state,
        engineRevision: state.engineRevision + 1,
      };
    case 'load-start':
      return {
        ...state,
        status: 'loading',
        error: null,
        currentTime: 0,
        isPlaying: false,
      };
    case 'load-success':
      return {
        ...state,
        status: 'ready',
        error: null,
        duration: action.duration,
        currentTime: 0,
        isPlaying: false,
      };
    case 'load-error':
      return {
        ...state,
        status: 'error',
        error: action.error,
        currentTime: 0,
        isPlaying: false,
      };
    case 'time-update':
      return {
        ...state,
        currentTime: action.time,
        isPlaying: action.time >= state.duration ? false : state.isPlaying,
      };
    case 'playing-changed':
      return {
        ...state,
        isPlaying: action.isPlaying,
      };
    default:
      return state;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Preview failed';
}

async function loadPreviewComposition(
  engine: PreviewEngine,
  code: string,
  width: number,
  height: number,
): Promise<number> {
  engine.resetComposition();

  const composition = await buildComposition(engine, code, width, height);
  engine.setCompositionDuration(composition.duration);
  engine.setFrameUpdater((time) => {
    applyCompositionState(engine, composition, time);
  });
  await engine.seekTo(0);

  return composition.duration;
}

export function usePreviewRuntime({
  code,
  width,
  height,
  initialDuration = 10,
}: PreviewRuntimeOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PreviewEngine | null>(null);
  const [state, dispatch] = useReducer(previewRuntimeReducer, initialDuration, getInitialState);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    try {
      const engine = new PreviewEngine({
        width,
        height,
        container: containerRef.current,
      });

      engine.setOnTimeUpdate((time) => {
        if (!disposed) {
          dispatch({ type: 'time-update', time });
        }
      });

      engineRef.current = engine;
      dispatch({ type: 'engine-ready' });
    } catch (error) {
      dispatch({ type: 'load-error', error: getErrorMessage(error) });
      return;
    }

    return () => {
      disposed = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [height, width]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    let cancelled = false;
    dispatch({ type: 'load-start' });

    const load = async () => {
      try {
        const duration = await loadPreviewComposition(engine, code, width, height);
        if (!cancelled) {
          dispatch({ type: 'load-success', duration });
        }
      } catch (error) {
        if (!cancelled) {
          dispatch({ type: 'load-error', error: getErrorMessage(error) });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [code, height, state.engineRevision, width]);

  const seekTo = useCallback(async (time: number) => {
    const engine = engineRef.current;
    if (!engine) {
      dispatch({ type: 'time-update', time });
      return { time };
    }

    await engine.seekTo(time);
    const nextTime = engine.getCurrentTime();
    dispatch({ type: 'time-update', time: nextTime });
    return { time: nextTime };
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    dispatch({ type: 'playing-changed', isPlaying: false });
  }, []);

  const play = useCallback(() => {
    if (!engineRef.current || state.status !== 'ready') return;
    engineRef.current.play();
    dispatch({ type: 'playing-changed', isPlaying: true });
  }, [state.status]);

  return {
    containerRef,
    status: state.status,
    error: state.error,
    duration: state.duration,
    currentTime: state.currentTime,
    isPlaying: state.isPlaying,
    isReady: state.status === 'ready',
    isLoading: state.status === 'loading',
    seekTo,
    play,
    pause,
  };
}
