import { create } from 'zustand';
import { User as FirebaseUserType } from 'firebase/auth';
import { signIn, signOut as firebaseSignOut, onAuthChange } from '../firebase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

// AUTH BYPASS: Mock user for bypass mode
const mockUser: User = {
  id: 'bypass-user-id',
  email: 'demo@shipsmart.local',
  name: 'Demo User',
  role: 'admin',
};

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
  setFirebaseUser: (firebaseUser: FirebaseUserType) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  // AUTH BYPASS: Default to authenticated state with mock user
  user: mockUser,
  token: 'bypass-token',
  isAuthenticated: true,
  isLoading: false,
  initialized: true,

  initialize: () => {
    // Skip if already initialized
    if (get().initialized) return;
    
    // Listen to Firebase Auth state changes
    onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        set({
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: 'user', // Could be enhanced with custom claims
          },
          token,
          isAuthenticated: true,
          initialized: true,
        });
      } else {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          initialized: true,
        });
      }
    });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const user = await signIn(email, password);
      const token = await user.getIdToken();
      set({
        user: {
          id: user.uid,
          email: user.email || '',
          name: user.displayName || user.email?.split('@')[0] || 'User',
          role: 'user',
        },
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await firebaseSignOut();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  setFirebaseUser: async (firebaseUser: FirebaseUserType) => {
    const token = await firebaseUser.getIdToken();
    set({
      user: {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        role: 'user',
      },
      token,
      isAuthenticated: true,
    });
  },
}));
