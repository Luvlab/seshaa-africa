import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, PortalType } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  portal: PortalType;
  setAuth: (user: User, token: string) => void;
  setPortal: (portal: PortalType) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isSalesRep: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      portal: 'consumer',
      setAuth: (user, token) => {
        const portal: PortalType =
          user.role === 'ADMIN' ? 'admin' :
          user.role === 'SALES_REP' ? 'salesrep' :
          user.role === 'BUSINESS_OWNER' ? 'business' : 'consumer';
        set({ user, token, portal });
      },
      setPortal: (portal) => set({ portal }),
      logout: () => set({ user: null, token: null, portal: 'consumer' }),
      isAdmin: () => get().user?.role === 'ADMIN',
      isSalesRep: () => get().user?.role === 'SALES_REP',
    }),
    { name: 'seshaa-auth' }
  )
);
