import { useEffect, useMemo, useState } from 'react';

export type PageSize = 20 | 50 | 100 | 'all';
export const PAGE_SIZE_OPTIONS: PageSize[] = [20, 50, 100, 'all'];
const STORAGE_KEY = 'admin.timeEntries.pageSize';

function readStoredPageSize(): PageSize {
  if (typeof window === 'undefined') return 20;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'all') return 'all';
  const num = Number(raw);
  if (num === 20 || num === 50 || num === 100) return num;
  return 20;
}

export function usePaginatedEntries<T>(
  entries: T[],
  resetSignal: unknown
): {
  pageSize: PageSize;
  setPageSize: (s: PageSize) => void;
  page: number;
  setPage: (n: number) => void;
  pageEntries: T[];
  totalPages: number;
} {
  const [pageSize, setPageSizeState] = useState<PageSize>(20);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPageSizeState(readStoredPageSize());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [resetSignal]);

  const setPageSize = (s: PageSize) => {
    setPageSizeState(s);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(s));
    }
    setPage(1);
  };

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(entries.length / pageSize));
  }, [entries.length, pageSize]);

  const pageEntries = useMemo(() => {
    if (pageSize === 'all') return entries;
    const start = (page - 1) * pageSize;
    return entries.slice(start, start + pageSize);
  }, [entries, page, pageSize]);

  return { pageSize, setPageSize, page, setPage, pageEntries, totalPages };
}
