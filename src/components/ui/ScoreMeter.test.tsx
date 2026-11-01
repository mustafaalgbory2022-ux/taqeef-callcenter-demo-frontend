import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScoreMeter } from './ScoreMeter';

const bandLabels = { high: 'Meets target', mid: 'Near target', low: 'Below target' };

describe('ScoreMeter', () => {
  it('exposes an accessible meter with a text band label', () => {
    render(
      <ScoreMeter
        label="Compliance"
        score={4.6}
        target={7}
        formattedScore="4.6"
        maxLabel="/ 10"
        bandLabels={bandLabels}
      />,
    );
    const meter = screen.getByRole('meter', { name: 'Compliance' });
    expect(meter).toHaveAttribute('aria-valuenow', '4.6');
    expect(meter).toHaveAttribute('aria-valuetext', '4.6 / 10, Below target');
    expect(screen.getByText('Below target')).toBeVisible();
  });
});
