/**
 * Seshaa Radio store
 * Manages the global audio player state.
 * When `currentTrack` is non-null, FooterPlayer renders.
 * Sets --player-bar-h on :root so other components can adjust their height.
 */
import { create } from 'zustand';

export interface RadioTrack {
  id: string;
  name: string;       // track title
  artist: string;
  album?: string;
  image: string;
  audio: string;      // streaming URL
  duration?: number;  // seconds
  source: 'jamendo' | 'community';
  genre?: string;
  country?: string;
}

interface RadioState {
  currentTrack: RadioTrack | null;
  playlist: RadioTrack[];
  trackIndex: number;
  playing: boolean;
  volume: number;          // 0–1
  muted: boolean;
  elapsed: number;         // seconds

  // actions
  play:        (track: RadioTrack, playlist?: RadioTrack[]) => void;
  pause:       () => void;
  resume:      () => void;
  togglePlay:  () => void;
  next:        () => void;
  prev:        () => void;
  close:       () => void;
  setVolume:   (v: number) => void;
  toggleMute:  () => void;
  setElapsed:  (s: number) => void;
  setPlaylist: (tracks: RadioTrack[], index?: number) => void;
}

function setPlayerBarHeight(px: number) {
  document.documentElement.style.setProperty('--player-bar-h', `${px}px`);
}

export const useRadioStore = create<RadioState>((set, get) => ({
  currentTrack: null,
  playlist: [],
  trackIndex: 0,
  playing: false,
  volume: 0.8,
  muted: false,
  elapsed: 0,

  play(track, playlist) {
    const list  = playlist ?? get().playlist;
    const index = list.findIndex(t => t.id === track.id);
    setPlayerBarHeight(72);
    set({
      currentTrack: track,
      playlist: list.length ? list : [track],
      trackIndex: index >= 0 ? index : 0,
      playing: true,
      elapsed: 0,
    });
  },

  pause() { set({ playing: false }); },
  resume() { set({ playing: true }); },
  togglePlay() { set(s => ({ playing: !s.playing })); },

  next() {
    const { playlist, trackIndex } = get();
    if (!playlist.length) return;
    const next = (trackIndex + 1) % playlist.length;
    setPlayerBarHeight(72);
    set({ currentTrack: playlist[next], trackIndex: next, playing: true, elapsed: 0 });
  },

  prev() {
    const { playlist, trackIndex, elapsed } = get();
    if (elapsed > 5) { set({ elapsed: 0 }); return; }    // restart current if >5s
    if (!playlist.length) return;
    const prev = (trackIndex - 1 + playlist.length) % playlist.length;
    setPlayerBarHeight(72);
    set({ currentTrack: playlist[prev], trackIndex: prev, playing: true, elapsed: 0 });
  },

  close() {
    setPlayerBarHeight(0);
    set({ currentTrack: null, playing: false, elapsed: 0 });
  },

  setVolume(v) { set({ volume: Math.max(0, Math.min(1, v)), muted: false }); },
  toggleMute() { set(s => ({ muted: !s.muted })); },
  setElapsed(s) { set({ elapsed: s }); },

  setPlaylist(tracks, index = 0) {
    set({ playlist: tracks, trackIndex: index });
  },
}));
