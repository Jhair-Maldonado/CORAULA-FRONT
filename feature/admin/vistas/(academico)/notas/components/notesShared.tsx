'use client';

import { useEffect, useState } from 'react';
import { adminGradesErrorMessage } from '@/services/admin/adminGradesService';

export const button = 'min-h-10 px-3 py-2 rounded-xl border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';
export const input = 'w-full mt-2 p-3 rounded-xl border border-line bg-neutral/30 text-ink focus-visible:outline-accent';

// One read per memoized `load` and revision; late answers from a previous load or revision are dropped.
export function useRead<T>(load: () => Promise<T>, message: (error: unknown) => string = adminGradesErrorMessage) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; revision: number; data?: T; error?: string }>();
  const loading = result?.load !== load || result?.revision !== revision;
  useEffect(() => {
    let current = true;
    load().then(data => { if (current) setResult({ load, revision, data }); })
      .catch(error => { if (current) setResult({ load, revision, error: message(error) }); });
    return () => { current = false; };
  }, [load, revision, message]);
  return { loading, data: loading ? undefined : result?.data, error: loading ? undefined : result?.error,
    refresh: () => setRevision(n => n + 1), publish: (data: T) => setResult({ load, revision, data }) };
}

export function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="p-4 text-sm text-rose-700"><p>{message}</p><button type="button" className={`${button} bg-white mt-3`} onClick={retry}>Reintentar</button></div>;
}
