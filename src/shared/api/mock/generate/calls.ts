import type { Judgment, WireAgent, WireCall, WireSegment, WireTranscript } from '../types';
import { DATA_END, DATA_START, eachDate, maskedNumber, prng, weekday, weighted } from './random';

type Reason = NonNullable<WireCall['classification']>['reason'];

/** Synthetic per-agent quality profile (share of points typically earned). */
const PROFILE: Record<string, number> = {
  'agt-001': 0.72,
  'agt-002': 0.84,
  'agt-003': 0.64,
  'agt-004': 0.78,
};

const REASONS_BY_QUEUE: Record<string, readonly (readonly [Reason, number])[]> = {
  'q-6001': [
    ['new_service', 4],
    ['plan_change', 4],
    ['general_inquiry', 2],
    ['billing', 1],
    ['other', 1],
  ],
  'q-6002': [
    ['technical', 5],
    ['billing', 4],
    ['cancellation', 1],
    ['general_inquiry', 2],
    ['other', 1],
  ],
};

const DEFAULT_REASONS: readonly (readonly [Reason, number])[] = [['other', 1]];

const TITLES: Record<Reason, string> = {
  billing: 'Billing question',
  technical: 'Technical issue',
  plan_change: 'Plan change',
  new_service: 'New service request',
  cancellation: 'Cancellation request',
  general_inquiry: 'General inquiry',
  other: 'Other request',
};

const CUSTOMER_LINE: Record<Reason, string> = {
  billing: 'عندي سؤال عن الفاتورة، المبلغ مو واضح إلي.',
  technical: 'الإنترنت يقطع من الصبح، شنو المشكلة؟',
  plan_change: 'أريد أغير الباقة لباقة أكبر.',
  new_service: 'أريد أفعّل خدمة جديدة على الخط.',
  cancellation: 'أريد ألغي الاشتراك مالتي.',
  general_inquiry: 'عندي استفسار عام عن العروض.',
  other: 'عندي طلب بسيط إذا ممكن.',
};

/** Generated synthetic calls: ~3 recorded calls per working day across 4 agents. */
export function generateCalls(agents: readonly WireAgent[]) {
  const rand = prng('calls-v1');
  const calls: WireCall[] = [];
  const judgments: Record<string, Judgment[]> = {};
  for (const date of eachDate(DATA_START, DATA_END)) {
    const perDay = weekday(date) === 5 ? 1 : 2 + Math.floor(rand() * 3);
    for (let n = 1; n <= perDay; n++) {
      const agent = agents[Math.floor(rand() * agents.length)];
      if (!agent) continue;
      const queueId = agent.queue_ids[Math.floor(rand() * agent.queue_ids.length)] ?? 'q-6002';
      const reason = weighted(rand, REASONS_BY_QUEUE[queueId] ?? DEFAULT_REASONS);
      const durationS =
        rand() < 0.12 ? 25 + Math.floor(rand() * 30) : 60 + Math.floor(rand() * 360);
      const hour = 9 + Math.floor(rand() * 8);
      const minute = Math.floor(rand() * 60);
      const id = `C-${date.replaceAll('-', '')}-${String(n).padStart(2, '0')}`;
      const english = rand() < 0.12;
      calls.push({
        id,
        title: TITLES[reason],
        agent_id: agent.id,
        queue_id: queueId,
        language: english ? 'en' : 'ar',
        duration_ms: durationS * 1000,
        recorded_at: `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`,
        status: 'scored',
        audio_url: null,
        synthetic: true,
        simulated: true,
        source: 'pbx',
        channel_layout: rand() < 0.1 ? 'mixed' : 'dual',
        caller_masked: maskedNumber(rand),
        classification: {
          reason,
          complaint: rand() < (reason === 'billing' || reason === 'technical' ? 0.25 : 0.08),
          service_request: reason === 'new_service' || reason === 'plan_change' || rand() < 0.1,
          confidence: Math.round((0.7 + rand() * 0.29) * 100) / 100,
        },
        review: { status: 'unreviewed', note: '', reviewed_by: null, reviewed_at: null },
      });
      judgments[id] = generateJudgments(rand, agent.id, durationS, reason);
    }
  }
  return { calls, judgments };
}

function generateJudgments(
  rand: () => number,
  agentId: string,
  durationS: number,
  reason: Reason,
): Judgment[] {
  const profile = PROFILE[agentId] ?? 0.7;
  const award = (max: number) =>
    Math.max(0, Math.min(max, Math.round(max * (profile + (rand() - 0.5) * 0.5))));
  const short = durationS < 50;
  const scored = (criterionId: string, max: number, seg: string): Judgment => ({
    criterionId,
    result: 'scored',
    awardedPoints: award(max),
    rationale: 'Simulated judgment for a generated synthetic call.',
    segmentIds: [seg],
  });
  const insufficient = (criterionId: string): Judgment => ({
    criterionId,
    result: 'insufficient_evidence',
    awardedPoints: null,
    rationale: 'Simulated: the call is too short to assess this criterion.',
    segmentIds: [],
  });
  return [
    scored('c-greeting', 1, 's1'),
    reason === 'general_inquiry'
      ? {
          criterionId: 'c-verification',
          result: 'not_assessable',
          awardedPoints: null,
          rationale: 'No account action required verification.',
          segmentIds: [],
        }
      : scored('c-verification', 1, 's3'),
    short ? insufficient('c-needs') : scored('c-needs', 2, 's3'),
    short ? insufficient('c-resolution') : scored('c-resolution', 3, 's4'),
    scored('c-language', 2, 's4'),
    short ? insufficient('c-closing') : scored('c-closing', 1, 's6'),
  ];
}

/** Template transcript for a generated call, timed across its duration. */
export function generatedTranscript(call: WireCall): WireTranscript {
  const d = (call.duration_ms ?? 60_000) / 1000;
  const reason = call.classification?.reason ?? 'other';
  const rand = prng(call.id);
  const agent = call.channel_layout === 'mixed' ? 'unresolved' : 'agent';
  const customer = call.channel_layout === 'mixed' ? 'unresolved' : 'customer';
  const rude = rand() < 0.05;
  const lines: [WireSegment['speaker'], string][] = [
    [agent, 'هلا بيك، وياك خدمة العملاء. المكالمة مسجلة لأغراض الجودة.'],
    [customer, CUSTOMER_LINE[reason]],
    [agent, 'تدلل، ممكن تأكد لي رقم الحساب لو سمحت؟'],
    [
      agent,
      rude
        ? 'هذا الموضوع مو شغلي، بس راح أحولك.'
        : 'تمام، راجعت الطلب وراح أكمله هسه وتوصلك رسالة تأكيد.',
    ],
    [customer, 'زين، شكراً.'],
    [agent, 'أكو شي ثاني أقدر أساعدك بيه؟ يومك سعيد.'],
  ];
  const step = d / lines.length;
  return {
    call_id: call.id,
    segments: lines.map(([speaker, text], i) => ({
      id: `s${i + 1}`,
      start_ms: Math.round((i * step + 0.3) * 1000),
      end_ms: Math.round(((i + 1) * step - 0.3) * 1000),
      speaker,
      language: 'ar',
      text,
    })),
  };
}
