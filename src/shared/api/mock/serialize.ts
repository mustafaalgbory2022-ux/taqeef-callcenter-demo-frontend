import type { MockState, WireCall, WireEvaluation, WireTranscript } from './types';

/**
 * SIMULATED serializers: the mock's internal storage → contract v0.3 wire shapes
 * (§6.1 revisions, §6.2 segments, §7.2 run summary, §7.3–7.7 run detail). Values that the
 * synthetic pipeline cannot produce are fixed, clearly synthetic constants (for example
 * confidence 900‰, flag type "prohibited_phrase", level id "partial").
 */

const allTranscripts = (state: MockState): WireTranscript[] => [
  ...Object.values(state.transcripts),
  ...state.revisions,
];

export const findRevision = (state: MockState, revisionId: string) =>
  allTranscripts(state).find((t) => t.transcript_revision_id === revisionId);

const stereoMapped = (call: WireCall | undefined) =>
  call?.channels === 2 && call.channel_map !== null && call.channel_map !== 'none';

/** §6.2 segments of one revision. */
export function serializeSegments(state: MockState, t: WireTranscript) {
  const call = state.calls.find((c) => c.call_id === t.call_id);
  const mono = call?.channels !== 2;
  return {
    transcript_revision_id: t.transcript_revision_id,
    items: t.segments.map((s) => {
      const channel = mono ? 'M' : s.speaker === 'customer' ? 'R' : 'L';
      return {
        segment_id: s.segment_id,
        start_ms: s.start_ms,
        end_ms: s.end_ms,
        channel,
        speaker_label: channel === 'M' ? 'MONO' : channel === 'L' ? 'CH-L' : 'CH-R',
        text: s.text,
        language: s.language,
        asr_confidence_permille: 900,
        low_confidence: false,
        flags: [],
      };
    }),
  };
}

/** §6.1 revision list of a call, oldest first. */
export function serializeRevisions(state: MockState, callId: string) {
  const call = state.calls.find((c) => c.call_id === callId);
  return allTranscripts(state)
    .filter((t) => t.call_id === callId)
    .sort((a, b) => a.revision_no - b.revision_no)
    .map((t) => ({
      transcript_revision_id: t.transcript_revision_id,
      revision_no: t.revision_no,
      trigger: t.revision_no === 0 ? 'initial' : 'retranscribe',
      is_current: t.transcript_revision_id === call?.current_transcript_revision_id,
      created_at: call?.uploaded_at ?? new Date(0).toISOString(),
      channel_mode: stereoMapped(call)
        ? 'stereo_mapped'
        : call?.channels === 2
          ? 'stereo_unmapped'
          : 'mono',
      channel_map: call?.channel_map ?? 'none',
      channel_map_source: stereoMapped(call) ? 'configured' : 'none',
      language_setting: 'ar',
      language_detected: null,
    }));
}

/** §7.2 run summary. */
export function serializeRunSummary(state: MockState, run: WireEvaluation) {
  const version = state.scorecards.find((v) => v.version === run.scorecard_version);
  return {
    run_id: run.id,
    scorecard_version_id: version?.scorecard_version_id ?? '',
    scorecard_version_number: run.scorecard_version,
    outcome: run.outcome,
    display_hundredths: run.display_hundredths,
    below_threshold: run.below_threshold,
    threshold_hundredths: run.threshold_hundredths ?? 0,
    completed_at: run.created_at,
    trigger: run.trigger,
    previous_run_id: run.supersedes_id,
  };
}

/** Index of the first word of `phrase` inside `text` (whitespace tokens), or 0. */
function wordSpanOf(text: string, phrase: string): [number, number] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const target = phrase.toLowerCase().split(/\s+/).filter(Boolean);
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((w, k) => (words[i + k] ?? '').includes(w))) return [i, i + target.length - 1];
  }
  return [0, Math.max(0, target.length - 1)];
}

/** §7.3 run detail. */
export function serializeRunDetail(state: MockState, run: WireEvaluation) {
  const version = state.scorecards.find((v) => v.version === run.scorecard_version);
  const call = state.calls.find((c) => c.call_id === run.call_id);
  const transcript = findRevision(state, run.transcript_revision_id);
  const segment = (id: string) => transcript?.segments.find((s) => s.segment_id === id);
  const roleOf = (speaker: string | undefined) =>
    stereoMapped(call) && (speaker === 'agent' || speaker === 'customer') ? speaker : 'unknown';
  const hits = run.prohibited_hits.map((h) => {
    const seg = segment(h.segment_id);
    return {
      phrase_id: h.expression_id.replace(/-/g, '_'),
      match_mode: 'contains',
      transcript_revision_id: run.transcript_revision_id,
      segment_id: h.segment_id,
      word_span: wordSpanOf(seg?.text ?? '', h.phrase),
      start_ms: seg?.start_ms ?? 0,
      end_ms: seg?.end_ms ?? 0,
      speaker_role: roleOf(h.speaker),
      reliability_permille: stereoMapped(call) ? 980 : 0,
      outcome: h.disposition === 'penalty_applied' ? 'penalty' : 'review_flag',
      flag_type: h.disposition === 'penalty_applied' ? null : 'prohibited_phrase',
    };
  });
  const na = run.criteria.filter((c) => c.result === 'not_assessable');
  return {
    run_id: run.id,
    call_id: run.call_id,
    trigger: run.trigger,
    previous_run_id: run.supersedes_id,
    batch_id: null,
    transcript_revision_id: run.transcript_revision_id,
    scorecard_version_id: version?.scorecard_version_id ?? '',
    scorecard_version_number: run.scorecard_version,
    requested_at: run.created_at,
    completed_at: run.created_at,
    outcome: run.outcome,
    unit: run.unit,
    min_assessable_units: run.minimum_assessable_points,
    points_awarded_sum: run.points_awarded_sum,
    points_possible_sum: run.points_possible_sum,
    display_hundredths: run.display_hundredths,
    threshold_hundredths: run.threshold_hundredths ?? 0,
    below_threshold: run.below_threshold,
    ai_declared_count: na.filter((c) => c.reason_code === 'ai_declared').length,
    code_na_count: na.filter((c) => c.reason_code !== 'ai_declared').length,
    preliminary: true,
    criteria: run.criteria.map((c, i) => {
      const def = version?.criteria.find((d) => d.id === c.criterion_id);
      const assessed = c.result !== 'not_assessable';
      return {
        criterion_id: c.criterion_id,
        criterion_version: 1,
        name_en: def?.label.en ?? c.criterion_id,
        name_ar: def?.label.ar ?? c.criterion_id,
        order: i + 1,
        result: c.result,
        level_id: c.result === 'partially_met' ? 'partial' : null,
        // §7.4: not_assessable has units_possible = units_awarded = 0.
        units_awarded: assessed ? (c.units_awarded ?? 0) : 0,
        units_possible: assessed ? c.units_possible : 0,
        source: !assessed && c.reason_code !== 'ai_declared' ? 'code_na' : 'ai',
        reason_code: c.reason_code,
        na_reason: c.na_reason,
        explanation: c.explanation,
        explanation_truncated: c.explanation_truncated,
        retried: false,
        evidence: c.evidence,
        ai_original_decision: null,
      };
    }),
    prohibited_hits: hits,
    review_flags: hits
      .filter((h) => h.outcome === 'review_flag')
      .map((h, i) => ({
        flag_id: `${run.id}-flag-${i + 1}`,
        flag_type: 'prohibited_phrase',
        segment_id: h.segment_id,
        reviewed: false,
        reviewed_at: null,
      })),
    segment_roles: (transcript?.segments ?? []).map((s) => ({
      segment_id: s.segment_id,
      speaker_role: roleOf(s.speaker),
      non_party: false,
    })),
  };
}
