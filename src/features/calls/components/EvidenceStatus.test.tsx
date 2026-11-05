import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/shared/i18n/I18nProvider';
import { EvidenceStatus } from './EvidenceStatus';

const evidence = {
  segmentId: 'seg-0009',
  transcriptRevisionId: '0193a000-0000-7000-8000-000000000001',
};

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
      selection: { evidence, location: { status: 'unavailable', reason: 'revision_mismatch' } },
    });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Evidence location unavailable.');
    expect(status).toHaveTextContent('different transcript revision');
    expect(screen.queryByRole('button', { name: /Play from/ })).toBeNull();
  });

  it('offers playback and navigation for a located quote', () => {
    const h = renderStatus({
      selection: {
        evidence,
        location: {
          status: 'located',
          segmentId: 'seg-0009',
          startMs: 27_000,
          endMs: 31_000,
          text: 'Synthetic transcript line',
        },
      },
    });
    // The quoted text comes from the transcript revision.
    expect(screen.getByRole('status')).toHaveTextContent('Synthetic transcript line');
    fireEvent.click(screen.getByRole('button', { name: 'Play from 0:27' }));
    expect(h.onPlay).toHaveBeenCalledWith(27_000);
    fireEvent.click(screen.getByRole('button', { name: 'Go to transcript line' }));
    expect(h.onShowLine).toHaveBeenCalledWith('seg-0009');
  });

  it('says the transcript is still loading instead of "not found"', () => {
    renderStatus({
      selection: { evidence, location: { status: 'unavailable', reason: 'transcript_loading' } },
    });
    expect(screen.getByRole('status')).toHaveTextContent('still loading');
    expect(screen.getByRole('status')).not.toHaveTextContent('not found');
  });

  it('keeps an empty live region mounted when nothing is selected', () => {
    renderStatus();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
