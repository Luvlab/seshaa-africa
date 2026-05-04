/**
 * favorites.ts — local favourites store (persisted to localStorage)
 *
 * Works for ANY item type: listings, classifieds, merch, events, news.
 * Auth is only required when the user actually tries to toggle a favourite.
 * The gate is enforced by the <FavoriteButton> component, not here.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FavItemType = 'listing' | 'classified' | 'merch' | 'event' | 'news' | 'track';

interface FavItem {
  id: string;
  type: FavItemType;
  name: string;
  addedAt: number;
}

interface FavoritesState {
  items: FavItem[];
  isFav: (id: string, type: FavItemType) => boolean;
  toggle: (item: FavItem) => void;
  remove: (id: string, type: FavItemType) => void;
  clear: () => void;
  count: () => number;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],

      isFav: (id, type) =>
        get().items.some(i => i.id === id && i.type === type),

      toggle: (item) => {
        const exists = get().isFav(item.id, item.type);
        if (exists) {
          set(s => ({ items: s.items.filter(i => !(i.id === item.id && i.type === item.type)) }));
        } else {
          set(s => ({ items: [...s.items, { ...item, addedAt: Date.now() }] }));
        }
      },

      remove: (id, type) =>
        set(s => ({ items: s.items.filter(i => !(i.id === id && i.type === type)) })),

      clear: () => set({ items: [] }),

      count: () => get().items.length,
    }),
    { name: 'seshaa-favorites' }
  )
);
