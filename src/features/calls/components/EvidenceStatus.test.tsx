import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { EvidenceStatus } from './EvidenceStatus';

const evidence = { segmentId: 's9', startMs: 27_000, endMs: 31_000, quote: 'Synthetic quote' };

function renderStatus(props: Partial<Parameters<typeof EvidenceStatus>[0]> = {}) {
  const handlers = { onPlay: vi.fn(), onShowLine: vi.fn(), onClear: vi.fn() };
  render(
    <I18nProvider>
      <EvidenceStatus selection={null} {...handlers} {...props} />
    </I18nProvider>,
  );
  return handlers;
}

describe('EvidenceStatus', () => {
  it('announces an unavailable location and offers no playback', () => {
    renderStatus({
      selection: { evidence, location: { status: 'unavailable', reason: 'mismatch' } },
    });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Evidence location unavailable.');
    expect(status).toHaveTextContent('The quote and time do not match the cited transcript line.');
    expect(screen.queryByRole('button', { name: /Play from/ })).toBeNull();
  });

  it('offers playback and navigation for a located quote', () => {
    const h = renderStatus({
      selection: {
        evidence,
        location: { status: 'located', segmentId: 's9', startMs: 27_000, range: [0, 5] },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Play from 0:27' }));
    expect(h.onPlay).toHaveBeenCalledWith(27_000);
    fireEvent.click(screen.getByRole('button', { name: 'Go to transcript line' }));
    expect(h.onShowLine).toHaveBeenCalledWith('s9');
  });

  it('keeps an empty live region mounted when nothing is selected', () => {
    renderStatus();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
