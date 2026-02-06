/**
 * useContextMood — React hook for the Skynet Context Engine mood vector.
 *
 * Subscribes to `context:mood` WebSocket messages and returns the current
 * mood vector for a given location. Smooths locally between server updates
 * so CSS-driven animations feel fluid even with 2-second broadcast intervals.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface MoodVector {
  energy: number;      // 0 (calm) → 1 (intense)
  warmth: number;      // 0 (cool blues) → 1 (warm ambers)
  urgency: number;     // 0 (relaxed) → 1 (alert/emergency)
  density: number;     // 0 (minimal/sparse) → 1 (rich/detailed)
  tempo: number;       // 0 (slow animations) → 1 (fast animations)
  brightness: number;  // 0 (dark/moody) → 1 (bright/airy)
  formality: number;   // 0 (playful/casual) → 1 (corporate/serious)
}

export const DEFAULT_MOOD: MoodVector = {
  energy: 0.5,
  warmth: 0.5,
  urgency: 0.0,
  density: 0.3,
  tempo: 0.5,
  brightness: 0.5,
  formality: 0.5,
};

// Local lerp for smooth interpolation between server pushes
function lerp(current: number, target: number, speed: number): number {
  return current + (target - current) * speed;
}

const LOCAL_LERP_SPEED = 0.08; // smooth local interpolation
const LOCAL_TICK_MS = 100;     // interpolation tick rate

/**
 * Subscribe to context:mood WebSocket messages and return the current mood.
 *
 * @param locationId — filter by location (optional, receives all if omitted)
 * @param socket — optional existing socket.io connection to reuse
 */
export function useContextMood(locationId?: string, socket?: Socket | null): MoodVector {
  const [mood, setMood] = useState<MoodVector>({ ...DEFAULT_MOOD });
  const targetRef = useRef<MoodVector>({ ...DEFAULT_MOOD });
  const currentRef = useRef<MoodVector>({ ...DEFAULT_MOOD });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Local lerp loop — runs continuously to smooth between server pushes
  useEffect(() => {
    tickRef.current = setInterval(() => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      let changed = false;

      const next: MoodVector = { ...cur };
      for (const key of Object.keys(DEFAULT_MOOD) as (keyof MoodVector)[]) {
        const newVal = lerp(cur[key], tgt[key], LOCAL_LERP_SPEED);
        const rounded = Math.round(newVal * 1000) / 1000;
        if (Math.abs(rounded - cur[key]) > 0.001) {
          changed = true;
        }
        next[key] = rounded;
      }

      if (changed) {
        currentRef.current = next;
        setMood(next);
      }
    }, LOCAL_TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Listen for context:mood events
  useEffect(() => {
    const s = socket;
    if (!s) return;

    const handler = (data: {
      type?: string;
      locationId?: string;
      mood?: MoodVector;
    }) => {
      // Filter by location if specified
      if (locationId && data.locationId && data.locationId !== locationId && data.locationId !== 'default') {
        return;
      }
      if (data.mood) {
        targetRef.current = { ...data.mood };
      }
    };

    s.on('context:mood', handler);
    return () => {
      s.off('context:mood', handler);
    };
  }, [socket, locationId]);

  return mood;
}
