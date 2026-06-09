import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

// Verified CC0 ambient sound clips (Wikimedia Commons + Internet Archive)
const SOUND_URLS: Record<string, string> = {
  '🌊  Ocean': 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Waves.ogg',
  '🌧  Rain':  'https://upload.wikimedia.org/wikipedia/commons/8/8a/Sound_of_rain.ogg',
  '🔥  Fire':  'https://upload.wikimedia.org/wikipedia/commons/b/b1/Campfire_sound_ambience.ogg',
  '🍃  Forest':'https://ia600906.us.archive.org/7/items/various-bird-sounds/mixkit-forest-birds-ambience-1210.mp3',
};

export function useAmbientSound(volumePct: number = 50) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [active, setActive] = useState<string | null>(null);

  // Sync volume live when settings change
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume = volumePct / 100;
    }
  }, [volumePct]);

  const stopCurrent = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch {}
      playerRef.current = null;
    }
  }, []);

  const play = useCallback(async (label: string) => {
    if (active === label) {
      stopCurrent();
      setActive(null);
      return;
    }

    const url = SOUND_URLS[label];
    if (!url) return;

    stopCurrent();

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      });

      // createAudioPlayer initialises with the source so buffering starts immediately
      const p = createAudioPlayer({ uri: url });
      p.loop = true;
      p.volume = volumePct / 100;
      p.play();
      playerRef.current = p;
      setActive(label);
    } catch (e) {
      console.error('[AmbientSound] failed to play', label, e);
      setActive(null);
    }
  }, [active, volumePct, stopCurrent]);

  // Release player on unmount
  useEffect(() => () => stopCurrent(), [stopCurrent]);

  return { active, play };
}
