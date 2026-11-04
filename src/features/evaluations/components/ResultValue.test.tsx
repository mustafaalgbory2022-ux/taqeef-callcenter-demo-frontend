import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { OverallValue, ResultValue } from './ResultValue';

const wrap = (ui: ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

describe('result presentation in the UI', () => {
  it('distinguishes "Not assessable — No score" from "Insufficient evidence — No score"', () => {
    wrap(
      <>
        <OverallValue
          evaluation={{
            status: 'completed',
            outcome: 'insufficient_evidence',
            overallScore: null,
            assessablePoints: 0,
          }}
        />
        <OverallValue
          evaluation={{
            status: 'completed',
            outcome: 'insufficient_evidence',
            overallScore: null,
            assessablePoints: 4,
          }}
        />
      </>,
    );
    expect(screen.getByText('Not assessable — No score')).toBeInTheDocument();
    expect(screen.getByText('Insufficient evidence — No score')).toBeInTheDocument();
    expect(screen.queryByText(/\/ 10/)).toBeNull();
  });

  it('writes points in words, singular and plural', () => {
    const base = {
      criterionId: 'c',
      rationale: '',
      evidence: [],
      penaltyPoints: 0,
      result: 'scored' as const,
    };
    wrap(
      <>
        <ResultValue result={{ ...base, awardedPoints: 2, possiblePoints: 3 }} />
        <ResultValue result={{ ...base, awardedPoints: 1, possiblePoints: 1 }} />
      </>,
    );
    expect(screen.getByText('2 of 3 points')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 point')).toBeInTheDocument();
  });
});
