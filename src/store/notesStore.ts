/**
 * Global notes store — shares unread count between Navbar bell and Communication Center page.
 * Uses a simple event-based approach so components can subscribe to count changes.
 */
import { create } from "zustand";

interface NotesState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  increment: () => void;
  decrement: () => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  increment: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  decrement: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
}));
