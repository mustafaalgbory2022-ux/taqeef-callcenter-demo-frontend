import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import type { Evaluation } from '@/shared/types/domain';
import { CriterionResults } from './CriterionResults';

const REV = 'rev-1';
const evaluation = {
  transcriptRevisionId: REV,
  criteria: [
    {
      criterionId: 'greeting',
      name: { en: 'Greeting', ar: 'الترحيب' },
      result: 'met',
      reasonCode: null,
      aiDeclaredReason: null,
      unit: 1,
      awardedUnits: 1,
      possibleUnits: 1,
      penaltyUnits: 0,
      rationale: 'Synthetic explanation',
      explanationTruncated: true,
      evidence: [
        {
          transcriptRevisionId: REV,
          segmentId: 'seg-0001',
          startMs: 4000,
          endMs: 6000,
          excerpt: 'Synthetic excerpt text',
          excerptTruncated: true,
          counted: false,
        },
        {
          transcriptRevisionId: REV,
          segmentId: 'seg-0002',
          startMs: 8000,
          endMs: 9000,
          excerpt: 'Complete excerpt',
          excerptTruncated: false,
          counted: true,
        },
      ],
    },
  ],
} as unknown as Evaluation;

function renderIt(lang: 'en' | 'ar' = 'en') {
  localStorage.setItem('taqeef.lang', lang);
  render(
    <I18nProvider>
      <CriterionResults
        evaluation={evaluation}
        version={undefined}
        resolveEvidence={() => ({ startMs: 0, text: '' })}
        onEvidence={vi.fn()}
      />
    </I18nProvider>,
  );
}

describe('evidence excerpts (contract v0.3 §7.5, alignment note §C3)', () => {
  it('shows the server excerpt as given, with a separate truncation indicator', () => {
    renderIt();
    const excerpts = screen.getAllByTestId('evidence-excerpt');
    expect(excerpts.map((e) => e.textContent)).toEqual([
      'Synthetic excerpt text',
      'Complete excerpt',
    ]);
    // Exactly one indicator, outside the excerpt text.
    const indicators = screen.getAllByTestId('excerpt-truncated');
    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toHaveTextContent('Excerpt truncated');
    expect(excerpts[0]?.contains(indicators[0] ?? null)).toBe(false);
    expect(excerpts[0]?.textContent).not.toContain('truncated');
    expect(screen.getByTestId('evidence-not-counted')).toBeInTheDocument();
    expect(screen.getByTestId('explanation-truncated')).toHaveTextContent('Explanation shortened');
  });

  it('has the indicator in Arabic', () => {
    renderIt('ar');
    expect(screen.getByTestId('excerpt-truncated')).toHaveTextContent('المقتطف مقتطع');
    localStorage.removeItem('taqeef.lang');
  });
});
