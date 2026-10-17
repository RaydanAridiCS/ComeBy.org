"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RsvpStatusValue } from "@/features/rsvp/schema";

export type ResponseSort = "newest" | "oldest" | "name";

type ResponseFiltersState = {
  search: string;
  status: RsvpStatusValue | "all";
  sort: ResponseSort;
  setSearch: (search: string) => void;
  setStatus: (status: RsvpStatusValue | "all") => void;
  setSort: (sort: ResponseSort) => void;
};

/**
 * UI state for the responses table. The sort order is remembered across visits;
 * the search box and status filter reset with each page load.
 */
export const useResponseFilters = create<ResponseFiltersState>()(
  persist(
    (set) => ({
      search: "",
      status: "all",
      sort: "newest",
      setSearch: (search) => set({ search }),
      setStatus: (status) => set({ status }),
      setSort: (sort) => set({ sort }),
    }),
    {
      name: "comeby-response-filters",
      partialize: (state) => ({ sort: state.sort }),
    },
  ),
);
