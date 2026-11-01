import { beforeEach, describe, expect, it } from 'vitest';
import { createApiClient, type ApiClient } from '../client';
import { createMockTransport } from './server';

let api: ApiClient;
let n = 0;

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  api = createApiClient(createMockTransport({ latencyMs: 0 }), 'mock');
  n += 1;
  await api.openSession(`SYN-ADMIN${n}-DEMO`);
});

describe('simulated queue administration', () => {
  it('creates queues with validation and an audit record', async () => {
    await expect(
      api.queueAdmin.create({ number: '6001', name: { en: 'X', ar: 'س' }, description: '' }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    const q = await api.queueAdmin.create({
      number: '6003',
      name: { en: 'Retention', ar: 'الاحتفاظ' },
      description: '',
    });
    expect(q).toMatchObject({ number: '6003', status: 'active', synthetic: true });
    const audit = await api.audit.list({ resource: 'queue', resourceId: q.id });
    expect(audit[0]).toMatchObject({ action: 'created', simulated: true });
  });

  it('rejects destructive changes without confirmation and keeps history', async () => {
    await expect(api.queueAdmin.update('q-6001', { number: '6009' }, false)).rejects.toMatchObject({
      code: 'conflict',
    });
    const renamed = await api.queueAdmin.update('q-6001', { number: '6009' }, true);
    expect(renamed.number).toBe('6009');
    const disabled = await api.queueAdmin.setStatus('q-6001', 'disabled');
    expect(disabled.status).toBe('disabled');
    expect((await api.listQueues()).map((q) => q.id)).toContain('q-6001'); // never deleted
    const actions = (await api.audit.list({ resource: 'queue', resourceId: 'q-6001' })).map(
      (e) => e.action,
    );
    expect(actions).toEqual(['disabled', 'updated', 'created']);
  });

  it('assigns agents, requires confirmation for removals and blocks disabled queues', async () => {
    // agt-002 and agt-004 are in 6001 in the seed.
    await expect(api.queueAdmin.assignAgents('q-6001', ['agt-002'], false)).rejects.toMatchObject({
      code: 'conflict',
    });
    await api.queueAdmin.assignAgents('q-6001', ['agt-002', 'agt-001'], true);
    const agents = await api.listAgents();
    expect(agents.find((a) => a.id === 'agt-001')?.queueIds).toContain('q-6001');
    expect(agents.find((a) => a.id === 'agt-004')?.queueIds).not.toContain('q-6001');
    await api.queueAdmin.setStatus('q-6002', 'disabled');
    await expect(
      api.updateAgent('agt-002', { queueIds: ['q-6001', 'q-6002'] }),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });
});

describe('simulated AI administration', () => {
  it('saves validated configuration as a new immutable version', async () => {
    const v1 = await api.ai.getCurrentConfig();
    const draft = { ...v1, changeNote: 'Use the small speech model.' };
    await expect(
      api.ai.saveConfig({ ...draft, evaluationModelId: 'syn-llm-70b' }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    await expect(
      api.ai.saveConfig({ ...draft, prompts: { ...v1.prompts, summary: 'No placeholder' } }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    await expect(api.ai.saveConfig(draft)).rejects.toMatchObject({ code: 'conflict' }); // no change
    const v2 = await api.ai.saveConfig({ ...draft, transcriptionModelId: 'syn-asr-small' });
    expect(v2.version).toBe(2);
    const versions = await api.ai.listConfigVersions();
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
    expect(versions[1]?.transcriptionModelId).toBe('syn-asr-large'); // unchanged history
    const status = await api.ai.getStatus();
    expect(status.services.find((s) => s.kind === 'transcription')).toMatchObject({
      state: 'loading',
      modelId: 'syn-asr-small',
    });
  });

  it('controls the job queue with retry limits and audit', async () => {
    const queue = await api.ai.getJobs();
    expect(queue.simulated).toBe(true);
    await expect(api.ai.retryJob('job-6')).rejects.toMatchObject({ code: 'conflict' }); // limit
    const retried = await api.ai.retryJob('job-5');
    expect(retried.jobs.find((j) => j.id === 'job-5')).toMatchObject({
      state: 'queued',
      attempts: 2,
    });
    await expect(api.ai.cancelJob('job-7')).rejects.toMatchObject({ code: 'conflict' });
    expect((await api.ai.pauseJobs()).paused).toBe(true);
    const actions = (await api.audit.list({ resource: 'ai_jobs' })).map((e) => e.action);
    expect(actions).toEqual(['paused', 'retried']);
  });
});

describe('simulated Iraqi Arabic dictionary', () => {
  it('searches by normalized form and versions every change', async () => {
    expect((await api.dictionary.listEntries({ search: 'هسة' })).map((e) => e.id)).toEqual([
      'dict-2',
    ]);
    await expect(
      api.dictionary.createEntry({
        kind: 'dialect_expression',
        term: 'هسة',
        variants: [],
        standard: 'الآن',
        meaningEn: '',
        notes: '',
        changeNote: 'dup',
      }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    const [entry] = await api.dictionary.listEntries({ search: 'شلونك' });
    if (!entry) throw new Error('missing');
    const updated = await api.dictionary.updateEntry(entry.id, {
      ...entry,
      variants: [...entry.variants, 'شلونچ'],
      changeNote: 'Add variant',
    });
    expect(updated.version).toBe(2);
    await api.dictionary.setEntryStatus(entry.id, 'disabled', 'Under review');
    const versions = await api.dictionary.listVersions(entry.id);
    expect(versions.map((v) => [v.version, v.action])).toEqual([
      [3, 'disabled'],
      [2, 'updated'],
      [1, 'created'],
    ]);
    expect(versions[2]?.variants).not.toContain('شلونچ'); // older versions unchanged
  });

  it('applies the four-eyes rule and adds approved spellings as variants', async () => {
    const own = await api.dictionary.proposeCorrection({
      callId: 'DEMO-001',
      segmentId: 's1',
      heard: 'شلونكك',
      proposed: 'شلونك',
      kind: 'dialect_expression',
    });
    await expect(
      api.dictionary.reviewCorrection(own.id, {
        decision: 'approve',
        note: '',
        addToDictionary: true,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      api.dictionary.reviewCorrection('corr-2', {
        decision: 'reject',
        note: '',
        addToDictionary: false,
      }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    const approved = await api.dictionary.reviewCorrection('corr-1', {
      decision: 'approve',
      note: 'ok',
      addToDictionary: true,
    });
    expect(approved).toMatchObject({ status: 'approved', entryId: 'dict-8' });
    const [router] = await api.dictionary.listEntries({ search: 'راوتر' });
    expect(router?.variants).toContain('رواتر');
    await expect(
      api.dictionary.reviewCorrection('corr-1', {
        decision: 'reject',
        note: 'again',
        addToDictionary: false,
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});
