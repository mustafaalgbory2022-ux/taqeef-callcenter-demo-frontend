import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import type { CriterionEvaluation } from '@/shared/types/domain';
import { OverallValue, ResultValue } from './ResultValue';

const wrap = (ui: ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

const base: CriterionEvaluation = {
  criterionId: 'c',
  rationale: '',
  evidence: [],
  penaltyPoints: 0,
  result: 'partially_met',
  reasonCode: null,
  aiDeclaredReason: null,
  awardedPoints: 2,
  possiblePoints: 3,
};

describe('result presentation in the UI', () => {
  it('shows the explicit no-score outcomes distinctly and never a score', () => {
    wrap(
      <>
        <OverallValue evaluation={{ outcome: 'not_assessable', displayHundredths: null }} />
        <OverallValue evaluation={{ outcome: 'insufficient_evidence', displayHundredths: null }} />
      </>,
    );
    expect(screen.getByText('Not assessable — No score')).toBeInTheDocument();
    expect(screen.getByText('Insufficient evidence — No score')).toBeInTheDocument();
    expect(screen.queryByText(/\/ 10/)).toBeNull();
  });

  it('renders the backend display_hundredths exactly, truncated: 699 → 6.99, 1000 → 10.00', () => {
    wrap(
      <>
        <OverallValue evaluation={{ outcome: 'scored', displayHundredths: 699 }} />
        <OverallValue evaluation={{ outcome: 'scored', displayHundredths: 1000 }} />
        <OverallValue evaluation={{ outcome: 'scored', displayHundredths: 5 }} />
      </>,
    );
    expect(screen.getByText('6.99')).toBeInTheDocument();
    expect(screen.getByText('10.00')).toBeInTheDocument();
    expect(screen.getByText('0.05')).toBeInTheDocument();
    expect(screen.queryByText('7.00')).toBeNull();
  });

  it('writes points in words, singular and plural, with the criterion result', () => {
    wrap(
      <>
        <ResultValue result={base} />
        <ResultValue result={{ ...base, result: 'met', awardedPoints: 1, possiblePoints: 1 }} />
      </>,
    );
    expect(screen.getByText('2 of 3 points')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 point')).toBeInTheDocument();
    expect(screen.getByText('Partially met:')).toBeInTheDocument();
    expect(screen.getByText('Met:')).toBeInTheDocument();
  });

  it('labels not-assessable criteria with their reason code and the AI-declared reason', () => {
    wrap(
      <>
        <ResultValue
          result={{
            ...base,
            result: 'not_assessable',
            reasonCode: 'roles_unreliable',
            awardedPoints: null,
          }}
        />
        <ResultValue
          result={{
            ...base,
            result: 'not_assessable',
            reasonCode: 'ai_declared',
            aiDeclaredReason: 'insufficient_evidence',
            awardedPoints: null,
          }}
        />
      </>,
    );
    expect(screen.getByText('Not assessable')).toBeInTheDocument();
    expect(screen.getByText('Speaker roles unreliable')).toBeInTheDocument();
    expect(screen.getByText('Insufficient evidence')).toBeInTheDocument();
    expect(screen.getByText('AI declared: insufficient evidence')).toBeInTheDocument();
    expect(screen.queryByText(/points/)).toBeNull();
  });
});
