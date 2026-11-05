import { syntheticSegmentId } from '../ids';
import type { Judgment, WireCall, WireSegment } from '../types';

/**
 * SYNTHETIC demo calls: invented dialogue, fictional agents, masked account numbers.
 * Audio is generated in the browser (see ../audio.ts); there are no real recordings.
 */
export interface CallFixture {
  call: WireCall;
  segments: WireSegment[];
  judgments: Judgment[];
}

/** Fixture lines are written as s1, s2, …; served as the confirmed `seg-0001` format. */
const segId = (short: string) => syntheticSegmentId(Number(short.slice(1)));

const s = (
  id: string,
  start: number,
  end: number,
  speaker: WireSegment['speaker'],
  language: WireSegment['language'],
  text: string,
): WireSegment => ({
  segment_id: segId(id),
  start_ms: start * 1000,
  end_ms: end * 1000,
  speaker,
  language,
  text,
});

/** Simulated model judgment in ACTUAL points (see the approved default scorecard). */
const j = (
  criterionId: string,
  awardedPoints: number | null,
  rationale: string,
  segmentIds: string[],
  result: Judgment['result'] = 'scored',
): Judgment => ({
  criterionId,
  result,
  awardedPoints,
  rationale,
  segmentIds: segmentIds.map(segId),
});

const call = (
  id: string,
  title: string,
  agentId: string,
  queueId: string,
  language: WireCall['language'],
  durationSec: number,
  recordedAt: string,
): WireCall => ({
  id,
  title,
  agent_id: agentId,
  queue_id: queueId,
  language,
  duration_ms: durationSec * 1000,
  recorded_at: recordedAt,
  status: 'scored',
  // Set from the seeded transcript revision (see ../db.ts).
  current_transcript_revision_id: null,
  synthetic: true,
  simulated: true,
  source: 'fixture',
  // Fixtures assume agent and customer on separate channels (reliable attribution).
  channel_layout: 'dual',
});

export const callFixtures: CallFixture[] = [
  {
    call: call(
      'DEMO-001',
      'Billing inquiry',
      'agt-001',
      'q-billing',
      'ar',
      78,
      '2026-10-20T10:12:00+03:00',
    ),
    segments: [
      s(
        's1',
        0.5,
        6,
        'agent',
        'ar',
        'هلا بيك، وياك خدمة العملاء. هذه المكالمة مسجلة لأغراض الجودة. شلون أقدر أساعدك؟',
      ),
      s('s2', 7, 14, 'customer', 'ar', 'هلا، عندي سؤال عن فاتورة هذا الشهر، شايف مبلغ إضافي.'),
      s('s3', 15, 22, 'agent', 'ar', 'تدلل، ممكن تأكد لي رقم الحساب أو رقم الهاتف المسجل؟'),
      s('s4', 23, 28, 'customer', 'ar', 'الرقم ينتهي بـ 0000.'),
      s(
        's5',
        29,
        42,
        'agent',
        'ar',
        'شكراً. المبلغ الإضافي هو رسوم باقة البيانات الإضافية اللي تفعلت بتاريخ 12. تحب ألغيها من الشهر الجاي؟',
      ),
      s('s6', 43, 49, 'customer', 'ar', 'إي، رجاءً ألغيها.'),
      s(
        's7',
        50,
        64,
        'agent',
        'ar',
        'تم الإلغاء، وراح توصلك رسالة تأكيد. الفاتورة الجاية ترجع للمبلغ الطبيعي.',
      ),
      s('s8', 65, 76, 'agent', 'ar', 'أكو شي ثاني أقدر أساعدك بيه؟ شكراً لاتصالك، يومك سعيد.'),
    ],
    judgments: [
      j('c-greeting', 1, 'ترحيب واضح مع إشعار تسجيل المكالمة.', ['s1']),
      j('c-verification', 1, 'تحقق من رقم الحساب قبل مراجعة الفاتورة.', ['s3']),
      j('c-needs', 1, 'فهم سبب الاتصال دون استيضاح استخدام العميل للباقة.', ['s3']),
      j('c-resolution', 3, 'شرح سبب الرسوم بدقة ونفذ الإلغاء.', ['s5', 's7']),
      j('c-language', 2, 'أسلوب ودود ومهني.', ['s3', 's7']),
      j('c-closing', 1, 'عرض مساعدة إضافية وختام لبق.', ['s8']),
    ],
  },
  {
    call: call(
      'DEMO-002',
      'Plan change',
      'agt-002',
      'q-sales',
      'ar',
      70,
      '2026-10-21T13:40:00+03:00',
    ),
    segments: [
      s('s1', 0.5, 6, 'agent', 'ar', 'مساء الخير، خدمة العملاء وياك. المكالمة مسجلة لضمان الجودة.'),
      s('s2', 7, 12, 'customer', 'ar', 'أريد أغير باقتي لباقة أكبر بالبيانات.'),
      s('s3', 13, 19, 'agent', 'ar', 'أكيد. شكد تستخدم بيانات تقريباً بالشهر؟'),
      s('s4', 20, 24, 'customer', 'ar', 'حوالي 50 جيجا.'),
      s(
        's5',
        25,
        38,
        'agent',
        'ar',
        'عدنا باقة 60 جيجا بنفس السعر تقريباً، وباقة 100 جيجا بسعر أعلى شوية.',
      ),
      s('s6', 39, 44, 'customer', 'ar', 'خلّي الـ 60.'),
      s('s7', 45, 68, 'agent', 'ar', 'تم تفعيل الباقة الجديدة من بداية الدورة الجاية. شكراً إلك.'),
    ],
    judgments: [
      j('c-greeting', 1, 'ترحيب مناسب مع إشعار التسجيل.', ['s1']),
      j('c-verification', 0, 'غيّر الباقة دون التحقق من هوية صاحب الحساب.', ['s7']),
      j('c-needs', 2, 'سأل عن حجم الاستخدام قبل الاقتراح.', ['s3']),
      j('c-resolution', 2, 'عرض الخيارات دون ذكر الأسعار الدقيقة.', ['s5']),
      j('c-language', 2, 'أسلوب مهني.', ['s3']),
      j('c-closing', 1, 'ختام لبق مع توضيح موعد التفعيل.', ['s7']),
    ],
  },
  {
    call: call(
      'DEMO-003',
      'Billing dispute',
      'agt-001',
      'q-billing',
      'ar',
      92,
      '2026-10-22T09:05:00+03:00',
    ),
    segments: [
      s('s1', 0.5, 3, 'agent', 'ar', 'نعم، خدمة العملاء.'),
      s('s2', 4, 11, 'customer', 'ar', 'السلام عليكم، انخصم مني مبلغ مرتين بنفس الفاتورة.'),
      s('s3', 12, 15, 'agent', 'ar', 'رقم الحساب؟'),
      s(
        's4',
        16,
        26,
        'customer',
        'ar',
        'ينتهي بـ 0000. والمشكلة صارت بعد ما دفعت عن طريق التطبيق.',
      ),
      s(
        's5',
        27,
        38,
        'agent',
        'ar',
        'الدفع عن طريق التطبيق مو شغلي، لازم تراجع قسم الدفع الإلكتروني.',
      ),
      s('s6', 39, 47, 'customer', 'ar', 'بس آني متصل بيكم حتى تحلون المشكلة.'),
      s('s7', 48, 66, 'agent', 'ar', 'زين، راح أرفع طلب مراجعة، وخلال 3 أيام عمل يتواصلون وياك.'),
      s('s8', 67, 72, 'customer', 'ar', 'ماشي، شكراً.'),
      s('s9', 73, 76, 'agent', 'ar', 'مع السلامة.'),
    ],
    judgments: [
      j('c-greeting', 0, 'لا يوجد ترحيب مهني ولا إشعار بتسجيل المكالمة.', ['s1']),
      j('c-verification', 1, 'طلب رقم الحساب قبل مناقشة الخصم.', ['s3']),
      j('c-needs', 1, 'لم يستوضح تفاصيل الخصم المكرر.', ['s3']),
      j('c-resolution', 1, 'رفع طلب مراجعة بعد محاولة تحويل المسؤولية.', ['s5', 's7']),
      j('c-language', 0, 'عبارة غير مهنية تجاه العميل.', ['s5']),
      j('c-closing', 0, 'ختام مقتضب دون تلخيص الخطوات.', ['s9']),
    ],
  },
  {
    // The call drops after verification: only 4 of 10 points are assessable (< 6), so the
    // evaluation is "Insufficient evidence — no score".
    call: call(
      'DEMO-004',
      'Internet outage (call dropped)',
      'agt-003',
      'q-support',
      'en',
      32,
      '2026-10-23T08:30:00+03:00',
    ),
    segments: [
      s(
        's1',
        0.5,
        7,
        'agent',
        'en',
        "Good morning, you're through to customer support. This call is recorded for quality purposes. How can I help?",
      ),
      s('s2', 8, 13, 'customer', 'en', 'Hi, my internet has been down since last night.'),
      s(
        's3',
        14,
        20,
        'agent',
        'en',
        "I'm sorry to hear that. Can I confirm the account number, please?",
      ),
      s('s4', 21, 25, 'customer', 'en', 'It ends in 0000.'),
      s('s5', 26, 30, 'agent', 'en', 'Thank you. Let me just check the—'),
    ],
    judgments: [
      j('c-greeting', 1, 'Clear greeting with recording notice.', ['s1']),
      j('c-verification', 1, 'Confirmed the account before checking.', ['s3']),
      j(
        'c-needs',
        null,
        'The call dropped before the need was explored.',
        ['s5'],
        'insufficient_evidence',
      ),
      j(
        'c-resolution',
        null,
        'No resolution was reached before the call dropped.',
        ['s5'],
        'insufficient_evidence',
      ),
      j('c-language', 2, 'Empathetic and professional.', ['s3']),
      j('c-closing', null, 'The closing was not captured.', ['s5'], 'insufficient_evidence'),
    ],
  },
  {
    call: call(
      'DEMO-005',
      'Router setup',
      'agt-004',
      'q-support',
      'ar',
      88,
      '2026-10-24T16:20:00+03:00',
    ),
    segments: [
      s('s1', 0.5, 6, 'agent', 'ar', 'هلا وغلا، الدعم الفني وياك. المكالمة مسجلة.'),
      s('s2', 7, 13, 'customer', 'ar', 'اشتريت راوتر جديد وما يشتغل الواي فاي.'),
      s('s3', 14, 20, 'agent', 'ar', 'الأضوية اللي بالراوتر شنو لونها هسه؟'),
      s('s4', 21, 25, 'customer', 'ar', 'الضوء الأحمر يرمش.'),
      s('s5', 26, 36, 'agent', 'ar', 'ما أدري بالضبط، بس جرّب طفّيه وشغّله.'),
      s('s6', 37, 45, 'customer', 'ar', 'سويتها وبعده نفس الشي.'),
      s('s7', 46, 62, 'agent', 'ar', 'راح أحول طلبك لفريق الدعم الميداني حتى يزورك فني.'),
      s('s8', 63, 74, 'agent', 'ar', 'شكراً لصبرك، وإذا احتجت أي شي اتصل بينا.'),
    ],
    judgments: [
      j('c-greeting', 1, 'ترحيب مع إشعار التسجيل.', ['s1']),
      j('c-verification', 0, 'لم يتحقق من هوية العميل قبل حجز زيارة فني.', ['s7']),
      j('c-needs', 1, 'سؤال واحد عن حالة الأضواء دون تشخيص كافٍ.', ['s3']),
      j('c-resolution', 1, 'لم يقدم تشخيصاً واضحاً قبل تحويل الطلب.', ['s5', 's7']),
      j('c-language', 1, 'أسلوب مقبول مع عبارة غير واثقة.', ['s5']),
      j('c-closing', 1, 'ختام لبق مع توضيح الخطوة التالية.', ['s8']),
    ],
  },
];

/**
 * Synthetic transcript for simulated processing of uploads. Uploads are treated as a single
 * MIXED channel, so speakers stay unresolved (no evidence supports attribution).
 */
export const uploadTranscriptTemplate: WireSegment[] = [
  s('s1', 0.5, 6, 'unknown', 'ar', 'هلا بيك، خدمة العملاء وياك. المكالمة مسجلة لأغراض الجودة.'),
  s('s2', 7, 14, 'unknown', 'ar', 'عندي استفسار عن خدمة مفعلة على حسابي.'),
  s('s3', 15, 22, 'unknown', 'ar', 'تدلل، ممكن تأكد لي رقم الحساب؟'),
  s('s4', 23, 27, 'unknown', 'ar', 'ينتهي بـ 0000.'),
  s('s5', 28, 44, 'unknown', 'ar', 'الخدمة مفعلة من بداية الشهر، وأقدر ألغيها إذا تحب.'),
  s('s6', 45, 58, 'unknown', 'ar', 'أكو شي ثاني أقدر أساعدك بيه؟ شكراً لاتصالك.'),
];
