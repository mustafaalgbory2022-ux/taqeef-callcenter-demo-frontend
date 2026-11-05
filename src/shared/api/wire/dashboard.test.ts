import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../client';
import type { Transport } from '../transport';

const base = {
  scope: 'all_versions',
  scorecard_version_id: null,
  agent_id: null,
  agent_display_name: null,
  as_of: '2026-11-05T09:30:00.000Z',
  calls_total: 5,
  outcomes: { scored: 3, insufficient_evidence: 1, not_assessable: 1 },
  evaluation_failed: 0,
  not_yet_evaluated: 0,
  average: { display_hundredths: 712, based_on_n: 3 },
  threshold: { mode: 'single', threshold_hundredths: 700, average_below_threshold: false },
  below_threshold_count: 1,
  criteria: [
    {
      criterion_id: 'greeting',
      criterion_version: 1,
      name_en: 'Greeting',
      name_ar: 'الترحيب',
      met: 2,
      partially_met: 0,
      not_met: 1,
      not_assessable: 2,
    },
  ],
  prohibited_hits: { penalty: 0, review_flag: 1, none: 0 },
};
const respond = (body: unknown) => vi.fn<Transport>().mockResolvedValue({ status: 200, body });

describe('GET /dashboard decoding (contract v0.3 §11.4)', () => {
  it('maps the server figures as given and sends the scope query', async () => {
    const transport = respond(base);
    const d = await createApiClient(transport, 'live').getDashboard({
      scorecardVersionId: null,
      agentId: 'agt 1',
    });
    expect(d).toMatchObject({
      average: { displayHundredths: 712, basedOnN: 3 },
      threshold: { mode: 'single', thresholdHundredths: 700, averageBelowThreshold: false },
      belowThresholdCount: 1,
      criteria: [{ name: { en: 'Greeting', ar: 'الترحيب' }, met: 2, notAssessable: 2 }],
    });
    expect(transport.mock.calls[0]?.[0]).toMatchObject({
      path: '/dashboard',
      query: { scope: 'all_versions', agent_id: 'agt 1' },
    });
  });

  it('accepts mixed thresholds only without a threshold or classification', async () => {
    const mixed = { mode: 'mixed', threshold_hundredths: null, average_below_threshold: null };
    const d = await createApiClient(respond({ ...base, threshold: mixed }), 'live').getDashboard({
      scorecardVersionId: null,
      agentId: null,
    });
    expect(d.threshold).toEqual({
      mode: 'mixed',
      thresholdHundredths: null,
      averageBelowThreshold: null,
    });
    for (const bad of [
      { ...mixed, threshold_hundredths: 700 },
      { ...mixed, average_below_threshold: false },
      { mode: 'single', threshold_hundredths: null, average_below_threshold: null },
    ]) {
      await expect(
        createApiClient(respond({ ...base, threshold: bad }), 'live').getDashboard({
          scorecardVersionId: null,
          agentId: null,
        }),
      ).rejects.toMatchObject({ code: 'contract_mismatch' });
    }
  });

  it('rejects inconsistent averages, counts and scope', async () => {
    const bad = [
      { ...base, average: null },
      { ...base, average: { display_hundredths: 712.5, based_on_n: 3 } },
      { ...base, below_threshold_count: 4 },
      { ...base, scope: 'version' },
      { ...base, average: undefined },
    ];
    for (const body of bad) {
      await expect(
        createApiClient(respond(body), 'live').getDashboard({
          scorecardVersionId: null,
          agentId: null,
        }),
      ).rejects.toMatchObject({ code: 'contract_mismatch' });
    }
  });
});
