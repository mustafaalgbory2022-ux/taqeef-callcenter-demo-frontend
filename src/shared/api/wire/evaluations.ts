import type { Evaluation, RunSummary, SegmentRole } from '@/shared/types/domain';
import { isDisplayHundredths } from '@/shared/utils/score';
import {
  arrayOf,
  bool,
  DecodeError,
  nullable,
  num,
  object,
  oneOf,
  str,
  type Decoded,
  type Decoder,
} from '../decode';
import { utcTimestamp, wireTimeToMs } from './common';
import { opaqueId, revisionId, segmentId } from './ids';

/** Non-negative integer point units. */
const units: Decoder<number> = (v, path = '') => {
  const n = num(v, path);
  if (!Number.isInteger(n) || n < 0 || n > 2000) throw new DecodeError(path, 'integer units');
  return n;
};
const count: Decoder<number> = (v, path = '') => {
  const n = num(v, path);
  if (!Number.isInteger(n) || n < 0) throw new DecodeError(path, 'a non-negative integer');
  return n;
};
const pointUnit: Decoder<1 | 2> = (v, path = '') => {
  if (v !== 1 && v !== 2) throw new DecodeError(path, '1 or 2');
  return v;
};
/** Integer 0–1000 (`*_hundredths`, `*_permille`; contract v0.3 §2). */
const thousandths: Decoder<number> = (v, path = '') => {
  const n = num(v, path);
  if (!isDisplayHundredths(n)) throw new DecodeError(path, 'an integer 0–1000');
  return n;
};
const wordSpan: Decoder<readonly [number, number]> = (v, path = '') => {
  if (!Array.isArray(v) || v.length !== 2) throw new DecodeError(path, '[start, end]');
  const [a, b] = v.map((x, i) => count(x, `${path}[${i}]`)) as [number, number];
  if (a > b) throw new DecodeError(path, 'start ≤ end');
  return [a, b];
};

const TRIGGERS = ['initial', 'rescore', 'rescore_all'] as const;
const OUTCOMES = ['scored', 'insufficient_evidence', 'not_assessable'] as const;
const RESULTS = ['met', 'partially_met', 'not_met', 'not_assessable'] as const;
const NA_REASONS = ['insufficient_evidence', 'not_applicable'] as const;
const REASON_CODES = [
  'roles_unreliable',
  'no_transcript',
  'too_long',
  'no_evidence',
  'low_confidence_evidence',
  'ai_declared',
] as const;
const ROLES = ['agent', 'customer', 'unknown'] as const;

/** Run summary (contract v0.3 §7.2 = §5.3 `latest_run` + `trigger`, `previous_run_id`). */
export const wireRunSummary = object({
  run_id: opaqueId,
  scorecard_version_id: opaqueId,
  scorecard_version_number: count,
  outcome: oneOf(OUTCOMES),
  display_hundredths: nullable(thousandths),
  below_threshold: nullable(bool),
  threshold_hundredths: thousandths,
  completed_at: utcTimestamp,
  trigger: oneOf(TRIGGERS),
  previous_run_id: nullable(opaqueId),
});

function assertScoreFields(
  w: { outcome: string; display_hundredths: number | null; below_threshold: boolean | null },
  at = '',
): void {
  const scored = w.outcome === 'scored';
  if (scored !== (w.display_hundredths !== null)) {
    throw new DecodeError(`${at}display_hundredths`, 'a value exactly when outcome is "scored"');
  }
  if (scored !== (w.below_threshold !== null)) {
    throw new DecodeError(`${at}below_threshold`, 'a value exactly when outcome is "scored"');
  }
}

export function runSummaryFromWire(w: Decoded<typeof wireRunSummary>): RunSummary {
  assertScoreFields(w);
  return {
    runId: w.run_id,
    scorecardVersionId: w.scorecard_version_id,
    scorecardVersionNumber: w.scorecard_version_number,
    outcome: w.outcome,
    displayHundredths: w.display_hundredths,
    belowThreshold: w.below_threshold,
    thresholdHundredths: w.threshold_hundredths,
    completedAt: w.completed_at,
    trigger: w.trigger,
    previousRunId: w.previous_run_id,
  };
}

/** Evidence item (§7.5, fields CONFIRMED). */
const wireEvidence = object({
  transcript_revision_id: revisionId,
  segment_id: segmentId,
  start_ms: num,
  end_ms: num,
  excerpt: str,
  excerpt_truncated: bool,
  counted: bool,
});

/** Criterion result (§7.4; enums CONFIRMED, shape PROPOSED). */
const wireCriterion = object({
  criterion_id: str,
  criterion_version: count,
  name_en: str,
  name_ar: str,
  order: count,
  result: oneOf(RESULTS),
  level_id: nullable(str),
  units_awarded: units,
  units_possible: units,
  source: oneOf(['ai', 'code_override', 'code_na']),
  reason_code: nullable(oneOf(REASON_CODES)),
  na_reason: nullable(oneOf(NA_REASONS)),
  explanation: str,
  explanation_truncated: bool,
  evidence: arrayOf(wireEvidence),
  ai_original_decision: nullable(
    object({
      result: oneOf(RESULTS),
      level_id: nullable(str),
      na_reason: nullable(oneOf(NA_REASONS)),
      evidence: arrayOf(segmentId),
    }),
  ),
});

/** Run detail `GET /api/evaluations/{run_id}` (§7.3; field names as-built, shape PROPOSED). */
export const wireEvaluation = object({
  run_id: opaqueId,
  call_id: opaqueId,
  trigger: oneOf(TRIGGERS),
  previous_run_id: nullable(opaqueId),
  transcript_revision_id: revisionId,
  scorecard_version_id: opaqueId,
  scorecard_version_number: count,
  completed_at: utcTimestamp,
  outcome: oneOf(OUTCOMES),
  unit: pointUnit,
  min_assessable_units: units,
  points_awarded_sum: units,
  points_possible_sum: units,
  display_hundredths: nullable(thousandths),
  threshold_hundredths: thousandths,
  below_threshold: nullable(bool),
  ai_declared_count: count,
  code_na_count: count,
  preliminary: bool,
  criteria: arrayOf(wireCriterion),
  // §7.6: no excerpt on hits (qa-security S5).
  prohibited_hits: arrayOf(
    object({
      phrase_id: str,
      match_mode: oneOf(['whole_words_clitic', 'whole_words', 'contains']),
      transcript_revision_id: revisionId,
      segment_id: segmentId,
      word_span: wordSpan,
      start_ms: num,
      end_ms: num,
      speaker_role: oneOf(ROLES),
      reliability_permille: thousandths,
      outcome: oneOf(['penalty', 'review_flag', 'none']),
      flag_type: nullable(str),
    }),
  ),
  review_flags: arrayOf(
    object({
      flag_id: opaqueId,
      flag_type: str,
      segment_id: nullable(segmentId),
      reviewed: bool,
      reviewed_at: nullable(utcTimestamp),
    }),
  ),
  segment_roles: arrayOf(
    object({ segment_id: segmentId, speaker_role: oneOf(ROLES), non_party: bool }),
  ),
});

export type WireEvaluation = Decoded<typeof wireEvaluation>;

/** Consistency rules beyond field types (fail loudly on contract drift). */
function assertConsistent(w: WireEvaluation): void {
  assertScoreFields(w);
  const rev = w.transcript_revision_id;
  w.criteria.forEach((c, i) => {
    const at = `criteria[${i}]`;
    const assessed = c.result !== 'not_assessable';
    // §7.4: not_assessable has units_possible = units_awarded = 0.
    if (!assessed && (c.units_awarded !== 0 || c.units_possible !== 0)) {
      throw new DecodeError(`${at}.units_possible`, '0 of 0 when not_assessable');
    }
    if (c.units_awarded > c.units_possible) {
      throw new DecodeError(`${at}.units_awarded`, 'at most units_possible');
    }
    if (assessed === (c.reason_code !== null)) {
      throw new DecodeError(`${at}.reason_code`, 'a reason code exactly when not_assessable');
    }
    if ((c.reason_code === 'ai_declared') !== (c.na_reason !== null)) {
      throw new DecodeError(`${at}.na_reason`, 'a declared reason exactly when ai_declared');
    }
    if ((c.result === 'partially_met') !== (c.level_id !== null)) {
      throw new DecodeError(`${at}.level_id`, 'a level exactly when partially_met');
    }
    if ((c.source === 'code_override') !== (c.ai_original_decision !== null)) {
      throw new DecodeError(`${at}.ai_original_decision`, 'present exactly on code_override');
    }
    c.evidence.forEach((e, j) => {
      if (e.transcript_revision_id !== rev) {
        throw new DecodeError(`${at}.evidence[${j}].transcript_revision_id`, "the run's revision");
      }
      if ([...e.excerpt].length > 2000) {
        throw new DecodeError(`${at}.evidence[${j}].excerpt`, 'at most 2,000 characters');
      }
    });
  });
  w.prohibited_hits.forEach((h, i) => {
    if (h.transcript_revision_id !== rev) {
      throw new DecodeError(`prohibited_hits[${i}].transcript_revision_id`, "the run's revision");
    }
  });
  if (w.points_awarded_sum > w.points_possible_sum) {
    throw new DecodeError('points_awarded_sum', 'at most points_possible_sum');
  }
  if (w.outcome === 'scored') {
    if (w.points_possible_sum === 0) {
      throw new DecodeError('points_possible_sum', 'assessed points for a scored run');
    }
    // Integrity only (display_hundredths = floor(1000·A/P)); the served value is displayed.
    if (
      w.display_hundredths !== Math.floor((1000 * w.points_awarded_sum) / w.points_possible_sum)
    ) {
      throw new DecodeError(
        'display_hundredths',
        '(1000 × points_awarded_sum) ÷ points_possible_sum',
      );
    }
  }
}

export function evaluationFromWire(w: WireEvaluation): Evaluation {
  assertConsistent(w);
  const roles = new Map<string, SegmentRole>(
    w.segment_roles.map((r) => [r.segment_id, { role: r.speaker_role, nonParty: r.non_party }]),
  );
  return {
    id: w.run_id,
    callId: w.call_id,
    agentId: null,
    scorecardVersionId: w.scorecard_version_id,
    scorecardVersion: w.scorecard_version_number,
    transcriptRevisionId: w.transcript_revision_id,
    outcome: w.outcome,
    unit: w.unit,
    awardedUnits: w.points_awarded_sum,
    assessableUnits: w.points_possible_sum,
    possibleUnits: 10 * w.unit,
    minimumAssessableUnits: w.min_assessable_units,
    displayHundredths: w.display_hundredths,
    belowThreshold: w.below_threshold,
    thresholdHundredths: w.threshold_hundredths,
    aiDeclaredCount: w.ai_declared_count,
    codeNaCount: w.code_na_count,
    preliminary: w.preliminary,
    criteria: [...w.criteria]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        criterionId: c.criterion_id,
        criterionVersion: c.criterion_version,
        name: { en: c.name_en, ar: c.name_ar },
        order: c.order,
        result: c.result,
        levelId: c.level_id,
        source: c.source,
        reasonCode: c.reason_code,
        aiDeclaredReason: c.na_reason,
        unit: w.unit,
        awardedUnits: c.result === 'not_assessable' ? null : c.units_awarded,
        possibleUnits: c.units_possible,
        rationale: c.explanation,
        explanationTruncated: c.explanation_truncated,
        evidence: c.evidence.map((e) => ({
          transcriptRevisionId: e.transcript_revision_id,
          segmentId: e.segment_id,
          startMs: wireTimeToMs(e.start_ms),
          endMs: wireTimeToMs(e.end_ms),
          excerpt: e.excerpt,
          excerptTruncated: e.excerpt_truncated,
          counted: e.counted,
        })),
        aiOriginalDecision: c.ai_original_decision && {
          result: c.ai_original_decision.result,
          levelId: c.ai_original_decision.level_id,
          aiDeclaredReason: c.ai_original_decision.na_reason,
          evidenceSegmentIds: c.ai_original_decision.evidence,
        },
      })),
    prohibitedHits: w.prohibited_hits.map((h) => ({
      phraseId: h.phrase_id,
      matchMode: h.match_mode,
      transcriptRevisionId: h.transcript_revision_id,
      segmentId: h.segment_id,
      wordSpan: h.word_span,
      startMs: wireTimeToMs(h.start_ms),
      endMs: wireTimeToMs(h.end_ms),
      speakerRole: h.speaker_role,
      reliabilityPermille: h.reliability_permille,
      outcome: h.outcome,
      flagType: h.flag_type,
    })),
    reviewFlags: w.review_flags.map((f) => ({
      flagId: f.flag_id,
      flagType: f.flag_type,
      segmentId: f.segment_id,
      reviewed: f.reviewed,
      reviewedAt: f.reviewed_at,
    })),
    segmentRoles: roles,
    trigger: w.trigger,
    supersedesId: w.previous_run_id,
    createdAt: w.completed_at,
  };
}
