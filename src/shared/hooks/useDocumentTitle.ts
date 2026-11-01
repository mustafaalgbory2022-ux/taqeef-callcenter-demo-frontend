import { useEffect } from 'react';

export function useDocumentTitle(title: string, suffix: string): void {
  useEffect(() => {
    document.title = `${title} · ${suffix}`;
  }, [title, suffix]);
}
