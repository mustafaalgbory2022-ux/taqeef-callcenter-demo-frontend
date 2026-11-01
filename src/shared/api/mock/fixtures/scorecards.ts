import type { WireScorecard } from '../types';

/**
 * PLACEHOLDER criteria: six criteria matching the approved count. Replace labels with the
 * approved Taqeef criteria when supplied — they are data, editable in the GUI.
 */
const criteria = [
  {
    id: 'c-greeting',
    label: { en: 'Greeting and identification', ar: 'الترحيب والتعريف' },
    description: {
      en: 'Professional greeting, identifies the service and the call-recording notice.',
      ar: 'ترحيب مهني وتعريف بالخدمة وإشعار تسجيل المكالمة.',
    },
    weight: 1,
  },
  {
    id: 'c-discovery',
    label: { en: "Understanding the customer's need", ar: 'فهم احتياج العميل' },
    description: {
      en: 'Asks relevant questions and confirms the issue.',
      ar: 'يطرح أسئلة مناسبة ويتأكد من فهم المشكلة.',
    },
    weight: 1,
  },
  {
    id: 'c-accuracy',
    label: { en: 'Accuracy of information and resolution', ar: 'دقة المعلومات والحل' },
    description: {
      en: 'Gives correct information and resolves or routes the issue properly.',
      ar: 'يقدم معلومات صحيحة ويحل المشكلة أو يحولها بالشكل الصحيح.',
    },
    weight: 1,
  },
  {
    id: 'c-compliance',
    label: { en: 'Compliance and required disclosures', ar: 'الامتثال والإفصاحات المطلوبة' },
    description: {
      en: 'Verifies identity before account actions and gives required disclosures.',
      ar: 'يتحقق من الهوية قبل إجراءات الحساب ويقدم الإفصاحات المطلوبة.',
    },
    weight: 1,
  },
  {
    id: 'c-courtesy',
    label: { en: 'Courtesy and professional tone', ar: 'اللباقة والأسلوب المهني' },
    description: {
      en: 'Polite, patient and professional throughout the call.',
      ar: 'لبق وصبور ومهني طوال المكالمة.',
    },
    weight: 1,
  },
  {
    id: 'c-closing',
    label: { en: 'Call closing and next steps', ar: 'إنهاء المكالمة والخطوات التالية' },
    description: {
      en: 'Summarises next steps, offers further help and closes politely.',
      ar: 'يلخص الخطوات التالية ويعرض المساعدة ويختم بلباقة.',
    },
    weight: 1,
  },
];

const name = { en: 'Call quality scorecard', ar: 'بطاقة تقييم جودة المكالمات' };

export const scorecardVersions: WireScorecard[] = [
  {
    scorecard_id: 'sc-quality',
    version: 1,
    name,
    low_score_threshold: 7,
    criteria,
    prohibited_expressions: [
      { id: 'px-1', phrase: 'مو شغلي', language: 'ar' },
      { id: 'px-2', phrase: 'not my problem', language: 'en' },
    ],
    created_at: '2026-10-01T09:00:00+03:00',
    created_by: 'Synthetic administrator',
    change_note: 'Initial scorecard (placeholder criteria).',
  },
  {
    scorecard_id: 'sc-quality',
    version: 2,
    name,
    low_score_threshold: 7,
    criteria: criteria.map((c) => (c.id === 'c-accuracy' ? { ...c, weight: 2 } : c)),
    prohibited_expressions: [
      { id: 'px-1', phrase: 'مو شغلي', language: 'ar' },
      { id: 'px-2', phrase: 'not my problem', language: 'en' },
      { id: 'px-3', phrase: 'ما أدري', language: 'ar' },
    ],
    created_at: '2026-10-27T10:30:00+03:00',
    created_by: 'Synthetic administrator',
    change_note: 'Accuracy weighted ×2; added prohibited expression "ما أدري".',
  },
];
