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
