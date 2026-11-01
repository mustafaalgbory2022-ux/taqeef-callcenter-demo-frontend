import { normalizeTerm, splitList } from '@/shared/utils/arabic';
import { dictionaryIssues, type DictionaryIssue } from '@/shared/utils/dictionaryRules';
import { ACTOR, recordAudit } from '../audit';
import { nextId } from '../db';
import type { WireCorrection, WireDictionaryEntry } from '../fixtures/dictionary';
import { created, fail, invalid, ok, type Route } from '../router';
import type { MockState } from '../types';

const KINDS = ['dialect_expression', 'spelling_variant', 'product_term'] as const;
type Kind = (typeof KINDS)[number];

const MESSAGES: Record<DictionaryIssue, string> = {
  required: 'This field is required.',
  too_long: 'This value is too long.',
  arabic_required: 'Use Arabic script for dialect expressions and spelling variants.',
  duplicate: 'An entry with this term already exists.',
  variant_same_as_term: 'A variant cannot repeat the term.',
  variant_conflict: 'This spelling is already mapped to another entry.',
  too_many: 'Use at most 20 variants.',
};
const WIRE_FIELD = {
  term: 'term',
  variants: 'variants',
  standard: 'standard',
  meaningEn: 'meaning_en',
  notes: 'notes',
  changeNote: 'change_note',
} as const;

interface Body {
  kind?: unknown;
  term?: unknown;
  variants?: unknown;
  standard?: unknown;
  meaning_en?: unknown;
  notes?: unknown;
  status?: unknown;
  change_note?: unknown;
}

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown) => (Array.isArray(v) ? splitList(v.map(String).join('\n')) : []);

export function dictionaryRoutes(state: MockState, persist: () => void): Route[] {
  const d = state.dictionary;
  const find = (id: string | undefined) => d.entries.find((e) => e.id === id);

  function check(e: WireDictionaryEntry, changeNote: string, selfId: string | null) {
    const issues = dictionaryIssues(
      {
        kind: e.kind,
        term: e.term,
        variants: e.variants,
        standard: e.standard,
        meaningEn: e.meaning_en,
        notes: e.notes,
        changeNote,
      },
      d.entries,
      selfId,
    );
    const first = Object.entries(issues)[0] as
      [keyof typeof WIRE_FIELD, DictionaryIssue] | undefined;
    return first ? invalid(WIRE_FIELD[first[0]], MESSAGES[first[1]]) : null;
  }

  function snapshot(
    e: WireDictionaryEntry,
    action: 'created' | 'updated' | 'disabled' | 'enabled',
    note: string,
  ) {
    (d.versions[e.id] ??= []).unshift({
      entry_id: e.id,
      version: e.version,
      action,
      kind: e.kind,
      term: e.term,
      variants: e.variants,
      standard: e.standard,
      meaning_en: e.meaning_en,
      notes: e.notes,
      status: e.status,
      change_note: note,
      changed_at: e.updated_at,
      changed_by: e.updated_by,
    });
    recordAudit(state, {
      resource: 'dictionary_entry',
      resourceId: e.id,
      action,
      summary: `“${e.term}” v${e.version}: ${note}`,
      at: e.updated_at,
    });
  }

  function createEntry(
    fields: Omit<
      WireDictionaryEntry,
      'id' | 'version' | 'updated_at' | 'updated_by' | 'synthetic' | 'status'
    >,
    note: string,
  ) {
    const now = new Date().toISOString();
    const e: WireDictionaryEntry = {
      ...fields,
      id: nextId(state, 'dict'),
      status: 'active',
      version: 1,
      updated_at: now,
      updated_by: ACTOR,
      synthetic: true,
    };
    d.entries.push(e);
    snapshot(e, 'created', note);
    return e;
  }

  return [
    {
      method: 'GET',
      pattern: '/dictionary/entries',
      handler: ({ query }) => {
        const q = normalizeTerm(query.search ?? '');
        return ok(
          d.entries
            .filter((e) => !query.kind || e.kind === query.kind)
            .filter((e) => !query.status || e.status === query.status)
            .filter(
              (e) =>
                !q ||
                [e.term, e.standard, e.meaning_en, ...e.variants].some((x) =>
                  normalizeTerm(x).includes(q),
                ),
            )
            .sort((a, b) => a.term.localeCompare(b.term, 'ar')),
        );
      },
    },
    {
      method: 'POST',
      pattern: '/dictionary/entries',
      handler: ({ body }) => {
        const b = (body ?? {}) as Body;
        const kind = KINDS.find((k) => k === b.kind);
        if (!kind) return invalid('kind', 'Select a type.');
        const fields = {
          kind,
          term: s(b.term),
          variants: list(b.variants),
          standard: s(b.standard),
          meaning_en: s(b.meaning_en),
          notes: s(b.notes),
        };
        const note = s(b.change_note);
        const error = check({ ...fields } as WireDictionaryEntry, note, null);
        if (error) return error;
        const e = createEntry(fields, note);
        persist();
        return created(e);
      },
    },
    {
      method: 'PATCH',
      pattern: '/dictionary/entries/:id',
      handler: ({ params, body }) => {
        const current = find(params.id);
        if (!current) return fail(404, 'Entry not found.');
        const b = (body ?? {}) as Body;
        const note = s(b.change_note);
        if (b.status !== undefined) {
          if (b.status !== 'active' && b.status !== 'disabled')
            return invalid('status', 'Invalid status.');
          if (note.length < 3) return invalid('change_note', MESSAGES.required);
          if (b.status === current.status) return ok(current);
          current.status = b.status;
          current.version += 1;
          current.updated_at = new Date().toISOString();
          current.updated_by = ACTOR;
          snapshot(current, b.status === 'disabled' ? 'disabled' : 'enabled', note);
          persist();
          return ok(current);
        }
        const next: WireDictionaryEntry = {
          ...current,
          kind: KINDS.find((k) => k === b.kind) ?? current.kind,
          term: b.term === undefined ? current.term : s(b.term),
          variants: b.variants === undefined ? current.variants : list(b.variants),
          standard: b.standard === undefined ? current.standard : s(b.standard),
          meaning_en: b.meaning_en === undefined ? current.meaning_en : s(b.meaning_en),
          notes: b.notes === undefined ? current.notes : s(b.notes),
        };
        const error = check(next, note, current.id);
        if (error) return error;
        const same = (
          ['kind', 'term', 'variants', 'standard', 'meaning_en', 'notes'] as const
        ).every((k) => JSON.stringify(next[k]) === JSON.stringify(current[k]));
        if (same) return fail(409, 'No changes compared with the current version.');
        Object.assign(current, next, {
          version: current.version + 1,
          updated_at: new Date().toISOString(),
          updated_by: ACTOR,
        });
        snapshot(current, 'updated', note);
        persist();
        return ok(current);
      },
    },
    {
      method: 'GET',
      pattern: '/dictionary/entries/:id/versions',
      handler: ({ params }) =>
        find(params.id) ? ok(d.versions[params.id ?? ''] ?? []) : fail(404, 'Entry not found.'),
    },
    {
      method: 'GET',
      pattern: '/dictionary/corrections',
      handler: ({ query }) =>
        ok(
          d.corrections
            .filter((c) => !query.status || c.status === query.status)
            .sort((a, b) => b.proposed_at.localeCompare(a.proposed_at)),
        ),
    },
    {
      method: 'POST',
      pattern: '/dictionary/corrections',
      handler: ({ body }) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const callId = s(b.call_id);
        if (!state.calls.some((c) => c.id === callId)) return invalid('call_id', 'Unknown call.');
        const segmentId = s(b.segment_id) || null;
        if (segmentId && !state.transcripts[callId]?.segments.some((x) => x.id === segmentId))
          return invalid('segment_id', 'This segment does not exist in the call transcript.');
        const heard = s(b.heard);
        const proposed = s(b.proposed);
        if (!heard) return invalid('heard', MESSAGES.required);
        if (!proposed) return invalid('proposed', MESSAGES.required);
        if (normalizeTerm(heard) === normalizeTerm(proposed))
          return invalid('proposed', 'The correction must differ from the transcript text.');
        const kind = KINDS.find((k) => k === b.kind);
        if (!kind) return invalid('kind', 'Select a type.');
        const c: WireCorrection = {
          id: nextId(state, 'corr'),
          call_id: callId,
          segment_id: segmentId,
          heard,
          proposed,
          kind,
          proposed_by: ACTOR,
          proposed_at: new Date().toISOString(),
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          review_note: '',
          entry_id: null,
          synthetic: true,
        };
        d.corrections.push(c);
        recordAudit(state, {
          resource: 'dictionary_correction',
          resourceId: c.id,
          action: 'proposed',
          summary: `“${heard}” → “${proposed}” (${callId})`,
        });
        persist();
        return created(c);
      },
    },
    {
      method: 'POST',
      pattern: '/dictionary/corrections/:id/review',
      handler: ({ params, body }) => {
        const c = d.corrections.find((x) => x.id === params.id);
        if (!c) return fail(404, 'Correction not found.');
        if (c.status !== 'pending') return fail(409, 'This correction has already been reviewed.');
        // Four-eyes rule: the proposer cannot review their own correction.
        if (c.proposed_by === ACTOR) return fail(403, 'You cannot review your own correction.');
        const b = (body ?? {}) as Record<string, unknown>;
        const note = s(b.note);
        const decision = b.decision === 'approve' || b.decision === 'reject' ? b.decision : null;
        if (!decision) return invalid('decision', 'Choose approve or reject.');
        if (decision === 'reject' && note.length < 3)
          return invalid('note', 'Explain why the correction is rejected.');
        if (decision === 'approve' && b.add_to_dictionary === true) {
          const kind: Kind = c.kind;
          const target = d.entries.find(
            (e) => e.kind === kind && normalizeTerm(e.term) === normalizeTerm(c.proposed),
          );
          const already =
            target &&
            [target.term, ...target.variants].some(
              (v) => normalizeTerm(v) === normalizeTerm(c.heard),
            );
          if (target && !already) {
            target.variants = [...target.variants, c.heard];
            target.version += 1;
            target.updated_at = new Date().toISOString();
            target.updated_by = ACTOR;
            snapshot(target, 'updated', `Variant added from correction ${c.id}.`);
            c.entry_id = target.id;
          } else if (!target) {
            const error = check(
              {
                kind,
                term: c.proposed,
                variants: [c.heard],
                standard: c.proposed,
                meaning_en: '',
                notes: '',
              } as unknown as WireDictionaryEntry,
              'From correction',
              null,
            );
            if (error) return error;
            c.entry_id = createEntry(
              {
                kind,
                term: c.proposed,
                variants: [c.heard],
                standard: c.proposed,
                meaning_en: '',
                notes: `From correction ${c.id}.`,
              },
              `Created from correction ${c.id}.`,
            ).id;
          } else {
            c.entry_id = target.id;
          }
        }
        c.status = decision === 'approve' ? 'approved' : 'rejected';
        c.reviewed_by = ACTOR;
        c.reviewed_at = new Date().toISOString();
        c.review_note = note;
        recordAudit(state, {
          resource: 'dictionary_correction',
          resourceId: c.id,
          action: c.status,
          summary: `“${c.heard}” → “${c.proposed}”${note ? `: ${note}` : ''}`,
        });
        persist();
        return ok(c);
      },
    },
  ];
}
