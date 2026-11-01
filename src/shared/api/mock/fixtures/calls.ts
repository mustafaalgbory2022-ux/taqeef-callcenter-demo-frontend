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

const s = (
  id: string,
  start: number,
  end: number,
  speaker: WireSegment['speaker'],
  language: WireSegment['language'],
  text: string,
): WireSegment => ({ id, start_ms: start * 1000, end_ms: end * 1000, speaker, language, text });

const j = (
  criterionId: string,
  score: number | null,
  rationale: string,
  segmentIds: string[],
  result: Judgment['result'] = 'scored',
): Judgment => ({ criterionId, result, score, rationale, segmentIds });

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
  audio_url: null,
  synthetic: true,
  simulated: true,
  source: 'fixture',
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
      j('c-greeting', 9, 'ترحيب واضح مع إشعار تسجيل المكالمة.', ['s1']),
      j('c-discovery', 8, 'تحقق من الحساب وفهم سبب المبلغ الإضافي.', ['s3']),
      j('c-accuracy', 9, 'شرح سبب الرسوم بدقة ونفذ الإلغاء.', ['s5', 's7']),
      j('c-compliance', 9, 'إشعار التسجيل والتحقق من الحساب قبل الإجراء.', ['s1', 's3']),
      j('c-courtesy', 8, 'أسلوب ودود ومهني.', ['s3']),
      j('c-closing', 9, 'عرض مساعدة إضافية وختام لبق.', ['s8']),
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
      j('c-greeting', 8, 'ترحيب مناسب مع إشعار التسجيل.', ['s1']),
      j('c-discovery', 8, 'سأل عن حجم الاستخدام قبل الاقتراح.', ['s3']),
      j('c-accuracy', 7, 'عرض الخيارات دون ذكر الأسعار الدقيقة.', ['s5']),
      j('c-compliance', 6, 'لم يؤكد شروط الباقة أو مدة الالتزام قبل التفعيل.', ['s7']),
      j('c-courtesy', 8, 'أسلوب مهني.', ['s3']),
      j('c-closing', 7, 'ختام مختصر دون عرض مساعدة إضافية.', ['s7']),
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
      j('c-greeting', 3, 'لا يوجد ترحيب مهني ولا إشعار بتسجيل المكالمة.', ['s1']),
      j('c-discovery', 5, 'طلب رقم الحساب دون استيضاح تفاصيل الخصم.', ['s3']),
      j('c-accuracy', 6, 'رفع طلب مراجعة بعد محاولة تحويل المسؤولية.', ['s7']),
      j('c-compliance', 4, 'غياب إشعار التسجيل وتحقق ناقص من الهوية.', ['s1', 's3']),
      j('c-courtesy', 4, 'عبارة غير مهنية تجاه العميل.', ['s5']),
      j('c-closing', 5, 'ختام مقتضب دون تلخيص الخطوات.', ['s9']),
    ],
  },
  {
    call: call(
      'DEMO-004',
      'Internet outage',
      'agt-003',
      'q-support',
      'en',
      84,
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
      s(
        's5',
        26,
        40,
        'agent',
        'en',
        'Thank you. I can see a reported outage in your area; engineers expect service back by 4 p.m. today.',
      ),
      s('s6', 41, 47, 'customer', 'en', 'Will I get a credit for the downtime?'),
      s(
        's7',
        48,
        66,
        'agent',
        'en',
        "Outages longer than 24 hours are credited automatically. I've added a note to your account.",
      ),
      s('s8', 67, 72, 'customer', 'en', 'Okay, thanks, I just need to—'),
    ],
    judgments: [
      j('c-greeting', 9, 'Clear greeting with recording notice.', ['s1']),
      j('c-discovery', 7, 'Confirmed the account but did not ask about affected devices.', ['s3']),
      j('c-accuracy', 8, 'Accurate outage status and credit policy.', ['s5', 's7']),
      j('c-compliance', 9, 'Recording notice and account verification given.', ['s1', 's3']),
      j('c-courtesy', 9, 'Empathetic and professional.', ['s3']),
      j(
        'c-closing',
        null,
        'The call ended abruptly; the closing was not captured.',
        ['s8'],
        'insufficient_evidence',
      ),
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
      j('c-greeting', 8, 'ترحيب مع إشعار التسجيل.', ['s1']),
      j('c-discovery', 6, 'سؤال واحد عن حالة الأضواء دون تشخيص كافٍ.', ['s3']),
      j('c-accuracy', 5, 'لم يقدم تشخيصاً واضحاً قبل تحويل الطلب.', ['s5', 's7']),
      j('c-compliance', 6, 'لم يتحقق من هوية العميل قبل حجز زيارة فني.', ['s7']),
      j('c-courtesy', 7, 'أسلوب مقبول.', ['s8']),
      j('c-closing', 8, 'ختام لبق مع توضيح الخطوة التالية.', ['s8']),
    ],
  },
];

/** Synthetic transcript used for simulated processing of uploaded files. */
export const uploadTranscriptTemplate: WireSegment[] = [
  s('s1', 0.5, 6, 'agent', 'ar', 'هلا بيك، خدمة العملاء وياك. المكالمة مسجلة لأغراض الجودة.'),
  s('s2', 7, 14, 'customer', 'ar', 'عندي استفسار عن خدمة مفعلة على حسابي.'),
  s('s3', 15, 22, 'agent', 'ar', 'تدلل، ممكن تأكد لي رقم الحساب؟'),
  s('s4', 23, 27, 'customer', 'ar', 'ينتهي بـ 0000.'),
  s('s5', 28, 44, 'agent', 'ar', 'الخدمة مفعلة من بداية الشهر، وأقدر ألغيها إذا تحب.'),
  s('s6', 45, 58, 'agent', 'ar', 'أكو شي ثاني أقدر أساعدك بيه؟ شكراً لاتصالك.'),
];
