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

describe('simulated PBX administration', () => {
  const base = {
    name: 'Main PBX',
    settings: {
      host: 'pbx.local',
      port: 443,
      use_tls: true,
      verify_certificate: true,
      api_client_id: 'taqeef01',
    },
    queueIds: ['q-6001', 'q-6002'],
    ingestionStartDate: '2026-08-01',
    pollIntervalMinutes: 5,
    secret: '',
  };

  it('starts unconfigured, never returns the secret and audits replacement', async () => {
    const [c] = await api.pbx.listConnectors();
    expect(c).toMatchObject({ state: 'not_configured', credentialSet: false, enabled: false });
    await expect(
      api.pbx.updateConnector(
        'pbx-main',
        { ...base, settings: { ...base.settings, host: 'http://x/y' } },
        false,
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
    const saved = await api.pbx.updateConnector(
      'pbx-main',
      { ...base, secret: 'synthetic-secret' },
      false,
    );
    expect(saved).toMatchObject({ credentialSet: true, state: 'disabled' });
    expect(JSON.stringify(saved)).not.toContain('synthetic-secret');
    const audit = await api.audit.list({ resource: 'pbx_connector' });
    expect(audit.map((e) => e.action)).toContain('credential_replaced');
    expect(JSON.stringify(audit)).not.toContain('synthetic-secret');
  });

  it('requires confirmation for ingestion changes and simulates tests and syncs', async () => {
    await api.pbx.updateConnector('pbx-main', { ...base, secret: 'synthetic-secret' }, false);
    await expect(
      api.pbx.updateConnector('pbx-main', { ...base, ingestionStartDate: '2026-07-01' }, false),
    ).rejects.toMatchObject({ code: 'conflict' });
    const test = await api.pbx.testConnector('pbx-main');
    expect(test.ok).toBe(true);
    expect(test.steps.find((s) => s.step === 'network')?.result).toBe('skipped');
    await expect(
      api.pbx.startSync('pbx-main', { from: '2026-10-01', to: '2026-10-07' }),
    ).rejects.toMatchObject({
      code: 'conflict',
    });
    await api.pbx.setEnabled('pbx-main', true);
    await expect(
      api.pbx.startSync('pbx-main', { from: '2026-07-01', to: '2026-07-07' }),
    ).rejects.toMatchObject({
      code: 'validation_error',
    });
    const run = await api.pbx.startSync('pbx-main', { from: '2026-10-01', to: '2026-10-07' });
    expect(run).toMatchObject({ status: 'simulated', trigger: 'manual' });
    expect(run.cdrRecords).toBeGreaterThan(0);
    expect((await api.pbx.listSyncs('pbx-main'))[0]?.id).toBe(run.id);
  });
});

describe('simulated notifications and email', () => {
  const guid = '00000000-0000-4000-8000-000000000001';
  const sender = {
    senderAddress: 'callcenter.ai@example.invalid',
    displayName: 'Call Center AI',
    tenantId: guid,
    clientId: guid,
    replyTo: '',
    secret: '',
  };

  it('configures the sender with a write-only secret and simulates tests', async () => {
    expect((await api.notifications.getSender()).state).toBe('not_configured');
    await expect(api.notifications.saveSender(sender)).rejects.toMatchObject({
      code: 'validation_error',
    });
    await expect(api.notifications.sendTestEmail('qa@example.invalid')).rejects.toMatchObject({
      code: 'conflict',
    });
    const saved = await api.notifications.saveSender({ ...sender, secret: 'synthetic-secret' });
    expect(saved).toMatchObject({ credentialSet: true, state: 'configured' });
    expect(JSON.stringify(saved)).not.toContain('synthetic-secret');
    const test = await api.notifications.testSender();
    expect(test.steps.find((s) => s.step === 'network')?.result).toBe('skipped');
    const d = await api.notifications.sendTestEmail('qa@example.invalid');
    expect(d).toMatchObject({ kind: 'test', status: 'simulated' });
  });

  it('validates rules and templates, tests rules and records report emails', async () => {
    await expect(
      api.notifications.createRule({
        name: 'X',
        trigger: 'low_score',
        enabled: true,
        thresholdMode: 'custom',
        customThreshold: 12,
        queueIds: [],
        recipients: ['a@example.invalid'],
        delivery: 'immediate',
        templateId: 'tpl-alert-en',
      }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    const alert = await api.notifications.testRule('rule-low');
    expect(alert).toMatchObject({ kind: 'low_quality_alert', status: 'simulated' });
    expect(alert.subject).toMatch(/^Quality alert: call /);
    const [tpl] = await api.notifications.listTemplates();
    if (!tpl) throw new Error('missing');
    await expect(
      api.notifications.saveTemplate(tpl.id, {
        ...tpl,
        body: 'No placeholders',
        changeNote: 'edit',
      }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    const v2 = await api.notifications.saveTemplate(tpl.id, {
      ...tpl,
      subject: `${tpl.subject}!`,
      changeNote: 'edit',
    });
    expect(v2.version).toBe(2);
    const report = await api.saveReport({
      title: 'W',
      period: 'weekly',
      range: { from: '2026-10-24', to: '2026-10-30' },
      queueIds: [],
      agentIds: [],
    });
    await api.emailReport(report.id);
    const [latest] = await api.notifications.listDeliveries('management_report');
    expect(latest).toMatchObject({
      relatedId: report.id,
      status: 'simulated',
      recipients: ['management@example.invalid'],
    });
  });
});

describe('simulated report configuration', () => {
  it('versions settings, flags policy changes and refuses automatic scheduling', async () => {
    const s = await api.reportSettings.get();
    expect(s).toMatchObject({
      callsPerAgent: 5,
      minDurationSeconds: 60,
      answeredOnly: true,
      schedulingAuthorized: false,
    });
    const input = {
      callsPerAgent: 6,
      minDurationSeconds: 60,
      defaultQueueIds: ['q-6001'],
      agentSelection: 'all_active' as const,
      defaultAgentIds: [],
      delivery: 'email_on_generate' as const,
      automaticScheduling: false,
      changeNote: 'Pilot',
    };
    await expect(
      api.reportSettings.save({ ...input, automaticScheduling: true }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const v2 = await api.reportSettings.save(input);
    expect(v2.version).toBe(2);
    const [entry] = await api.audit.list({ resource: 'report_settings' });
    expect(entry?.summary).toContain('differs from the approved');
  });

  it('generates a weekly report with the configured sample and optional simulated email', async () => {
    await expect(
      api.reportSettings.generate({
        period: 'weekly',
        range: { from: '2026-10-25', to: '2026-10-31' },
        agentIds: ['agt-001'],
        queueIds: ['q-6001'],
        deliver: false,
      }),
    ).rejects.toMatchObject({ code: 'validation_error' }); // not Saturday–Friday
    const run = await api.reportSettings.generate({
      period: 'weekly',
      range: { from: '2026-10-17', to: '2026-10-23' },
      agentIds: ['agt-001', 'agt-002'],
      queueIds: ['q-6001', 'q-6002'],
      deliver: true,
    });
    expect(run.report).toMatchObject({
      period: 'weekly',
      emailStatus: 'simulated_sent',
      simulated: true,
    });
    expect(run.sample.agents).toHaveLength(2);
    expect(
      run.sample.agents.every(
        (a) => a.requested === 5 && a.calls.every((c) => (c.durationMs ?? 0) >= 60_000),
      ),
    ).toBe(true);
    expect(run.delivery?.status).toBe('simulated');
    expect((await api.listReports())[0]?.id).toBe(run.report.id);
  });
});

describe('simulated audit log', () => {
  it('filters by object, action, result and text and records audited exports', async () => {
    await api.queueAdmin.setStatus('q-6002', 'disabled');
    const entries = await api.audit.list({ resource: 'queue', action: 'disabled' });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ result: 'success', simulated: true });
    expect(entries[0]?.correlationId).toMatch(/^cid-/);
    const byCid = await api.audit.list({ search: entries[0]?.correlationId });
    expect(byCid.map((e) => e.id)).toEqual([entries[0]?.id]);
    expect(await api.audit.list({ result: 'denied', resource: 'queue' })).toEqual([]);
    const exported = await api.audit.export({ resource: 'queue' });
    expect(exported.count).toBe(exported.entries.length);
    const [latest] = await api.audit.list({ resource: 'audit_log' });
    expect(latest).toMatchObject({ action: 'exported' });
  });
});

describe('simulated users, roles and authentication', () => {
  it('enforces unique emails, no agent accounts and last-admin/self protections', async () => {
    await expect(
      api.users.create({
        username: 'new.user',
        displayName: 'New',
        email: 'QUALITY.LEAD@example.invalid',
        role: 'viewer',
      }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    await expect(
      api.users.create({
        username: 'agent.a',
        displayName: 'Agent',
        email: 'a@example.invalid',
        role: 'agent' as never,
      }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    const created = await api.users.create({
      username: 'new.user',
      displayName: 'New',
      email: 'new@example.invalid',
      role: 'viewer',
    });
    expect(created).toMatchObject({
      emailStatus: 'verification_sent',
      mfaState: 'not_enrolled',
      mustChangePassword: true,
    });
    await expect(api.users.setStatus('usr-admin', 'disabled')).rejects.toMatchObject({
      code: 'conflict',
    });
    await expect(
      api.users.update('usr-supervisor', { role: 'viewer' }, false),
    ).rejects.toMatchObject({ code: 'conflict' });
    await api.users.update('usr-supervisor', { role: 'viewer' }, true);
    // usr-admin is now the only active admin and cannot demote themself.
    await expect(api.users.update('usr-admin', { role: 'viewer' }, true)).rejects.toMatchObject({
      code: 'conflict',
    });
    const denied = await api.audit.list({ resource: 'user', result: 'denied' });
    expect(denied.length).toBeGreaterThan(0);
  });

  it('resets passwords and MFA with the required authorization and revokes sessions', async () => {
    await expect(api.users.resetPassword('usr-ops')).rejects.toMatchObject({ code: 'conflict' }); // unverified email
    await expect(api.users.resetMfa('usr-admin', 'Lost my phone yesterday')).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(api.users.resetMfa('usr-viewer', 'short')).rejects.toMatchObject({
      code: 'validation_error',
    });
    const reset = await api.users.resetMfa(
      'usr-viewer',
      'Ticket SYN-42: lost phone, identity checked',
    );
    expect(reset).toMatchObject({ mfaState: 'not_enrolled', recoveryCodesRemaining: null });
    expect((await api.auth.sessions()).some((s) => s.userId === 'usr-viewer')).toBe(false);
    await expect(api.auth.revokeSession('sess-demo')).rejects.toMatchObject({ code: 'conflict' });
    const unlocked = await api.users.unlock('usr-ops');
    expect(unlocked.locked).toBe(false);
  });

  it('keeps MFA mandatory and never generates secrets or recovery codes', async () => {
    const policy = await api.auth.policy();
    expect(policy.mfaRequired).toBe(true);
    await expect(
      api.auth.savePolicy({ ...policy, sessionIdleMinutes: 700, changeNote: 'x' }),
    ).rejects.toMatchObject({
      code: 'validation_error',
    });
    const enrollment = await api.auth.startEnrollment();
    expect(enrollment).toMatchObject({ secretAvailable: false, simulated: true });
    await expect(
      api.auth.verifyEnrollment(enrollment.enrollmentId, '12ab56'),
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect((await api.auth.verifyEnrollment(enrollment.enrollmentId, '123456')).state).toBe(
      'enrolled',
    );
    const codes = await api.auth.regenerateRecoveryCodes();
    expect(codes).toMatchObject({ generated: false, codes: [], simulated: true });
    expect(JSON.stringify(await api.audit.list())).not.toContain('123456');
  });
});

describe('simulated storage and retention', () => {
  it('keeps everything by default and confirms risky changes', async () => {
    const s = await api.storage.settings();
    expect(s.automaticPermanentDeletion).toBe(false);
    expect(s.retention.every((r) => r.mode === 'keep')).toBe(true);
    const overview = await api.storage.overview();
    expect(overview.categories.find((c) => c.category === 'recordings')?.items).toBeGreaterThan(
      200,
    );
    const input = {
      locations: s.locations,
      retention: s.retention.map((r) =>
        r.category === 'logs' ? { ...r, mode: 'recover_after' as const, days: 400 } : r,
      ),
      changeNote: 'Expire old logs',
    };
    await expect(api.storage.saveSettings(input, false)).rejects.toMatchObject({
      code: 'conflict',
    });
    await expect(
      api.storage.saveSettings(
        {
          ...input,
          retention: input.retention.map((r) => ({
            ...r,
            mode: 'recover_after' as const,
            days: 10,
          })),
        },
        true,
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect((await api.storage.saveSettings(input, true)).version).toBe(2);
  });

  it('moves items to recovery (hiding them) and restores them with audit', async () => {
    await expect(
      api.storage.moveToRecovery('recording', 'NOPE-1', 'Customer asked for removal'),
    ).rejects.toMatchObject({ code: 'validation_error' });
    const item = await api.storage.moveToRecovery(
      'recording',
      'DEMO-002',
      'Synthetic removal request #7',
    );
    expect((await api.getCall('DEMO-002')).audioUrl).toBeNull();
    await expect(
      api.storage.moveToRecovery('recording', 'DEMO-002', 'Synthetic removal request #7'),
    ).rejects.toMatchObject({ code: 'conflict' });
    await api.storage.moveToRecovery('transcript', 'DEMO-002', 'Synthetic removal request #7');
    await expect(api.getTranscript('DEMO-002')).rejects.toMatchObject({ code: 'not_found' });
    expect((await api.storage.restore(item.id)).status).toBe('restored');
    const actions = (await api.audit.list({ resource: 'storage_item' })).map((e) => e.action);
    expect(actions).toEqual(['restored', 'soft_deleted', 'soft_deleted']);
  });
});
