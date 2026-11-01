import type { ScoreBand } from '@/api/contract';

/** Distinct shapes per band so state never relies on colour alone. */
export function BandIcon({ band }: { band: ScoreBand }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {band === 'high' && (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="M4.8 8.2 7 10.3l4.2-4.6"
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {band === 'mid' && (
        <>
          <path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" fill="currentColor" />
          <path
            d="M5.5 8h5"
            stroke="var(--color-surface)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}
      {band === 'low' && (
        <>
          <path d="M8 1.2 15 14H1Z" fill="currentColor" />
          <path
            d="M8 6v3.6"
            stroke="var(--color-surface)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="8" cy="11.7" r="0.95" fill="var(--color-surface)" />
        </>
      )}
    </svg>
  );
}
