import type { WireScorecard } from '../types';

/**
 * APPROVED default scorecard: six criteria, 10 points in total, minimum 6 assessable
 * points, low score strictly below 7.00. Prohibited expressions are flag-only (no approved
 * penalty rule yet). Labels/guidance wording is editable data in the GUI.
 */
const criteria = [
  {
    id: 'c-greeting',
    label: { en: 'Greeting and identification', ar: 'الترحيب والتعريف' },
    description: {
      en: 'Professional greeting, identifies the service and gives the call-recording notice.',
      ar: 'ترحيب مهني وتعريف بالخدمة وإشعار تسجيل المكالمة.',
    },
    max_points: 1,
    allow_partial_credit: true,
  },
  {
    id: 'c-verification',
    label: { en: 'Customer verification, where required', ar: 'التحقق من هوية العميل عند الحاجة' },
    description: {
      en: 'Verifies identity before account actions. Not assessable when no verification is required.',
      ar: 'يتحقق من الهوية قبل إجراءات الحساب. غير قابل للتقييم إذا لم يكن التحقق مطلوباً.',
    },
    max_points: 1,
    allow_partial_credit: true,
  },
  {
    id: 'c-needs',
    label: { en: 'Understanding customer needs', ar: 'فهم احتياجات العميل' },
    description: {
      en: 'Asks relevant questions and confirms the need before acting.',
      ar: 'يطرح أسئلة مناسبة ويتأكد من الاحتياج قبل التصرف.',
    },
    max_points: 2,
    allow_partial_credit: true,
  },
  {
    id: 'c-resolution',
    label: { en: 'Problem resolution and accurate information', ar: 'حل المشكلة ودقة المعلومات' },
    description: {
      en: 'Gives correct information and resolves or routes the issue properly.',
      ar: 'يقدم معلومات صحيحة ويحل المشكلة أو يحولها بالشكل الصحيح.',
    },
    max_points: 3,
    allow_partial_credit: true,
  },
  {
    id: 'c-language',
    label: { en: 'Professional language and courtesy', ar: 'اللغة المهنية واللباقة' },
    description: {
      en: 'Polite, patient and professional language throughout the call.',
      ar: 'لغة لبقة وصبورة ومهنية طوال المكالمة.',
    },
    max_points: 2,
    allow_partial_credit: true,
  },
  {
    id: 'c-closing',
    label: { en: 'Call closing', ar: 'إنهاء المكالمة' },
    description: {
      en: 'Summarises next steps, offers further help and closes politely.',
      ar: 'يلخص الخطوات التالية ويعرض المساعدة ويختم بلباقة.',
    },
    max_points: 1,
    allow_partial_credit: true,
  },
];

const name = { en: 'Call quality scorecard', ar: 'بطاقة تقييم جودة المكالمات' };
const common = {
  scorecard_id: 'sc-quality',
  name,
  low_score_threshold: 7,
  minimum_assessable_points: 6,
  criteria,
  prohibited_penalty: { points: 0, criterion_id: null },
  created_by: 'Synthetic administrator',
};

export const scorecardVersions: WireScorecard[] = [
  {
    ...common,
    version: 1,
    prohibited_expressions: [
      { id: 'px-1', phrase: 'مو شغلي', language: 'ar' },
      { id: 'px-2', phrase: 'not my problem', language: 'en' },
    ],
    created_at: '2026-10-01T06:00:00.000Z',
    change_note: 'Approved default scorecard (six criteria, 10 points).',
  },
  {
    ...common,
    version: 2,
    prohibited_expressions: [
      { id: 'px-1', phrase: 'مو شغلي', language: 'ar' },
      { id: 'px-2', phrase: 'not my problem', language: 'en' },
      { id: 'px-3', phrase: 'ما أدري', language: 'ar' },
    ],
    created_at: '2026-10-27T07:30:00.000Z',
    change_note: 'Added prohibited expression "ما أدري" (flag for review).',
  },
];
