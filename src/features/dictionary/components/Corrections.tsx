import { useState, type FormEvent } from 'react';
import { focusFirstInvalid } from '@/shared/ui/focusInvalid';
import { ChangeArrow } from '@/shared/ui/ChangeArrow';
import { Link } from 'react-router';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { useSession } from '@/shared/hooks/useSession';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type {
  CorrectionProposal,
  CorrectionStatus,
  DictionaryCorrection,
  DictionaryKind,
} from '@/shared/types/domain';
import { Badge, SyntheticBadge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Dialog } from '@/shared/ui/Dialog';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { EmptyState, QueryView } from '@/shared/ui/States';
import { tableStyles, TableRegion } from '@/shared/ui/Table';
import { useToast } from '@/shared/ui/Toaster';
import { useCorrections, useProposeCorrection, useReviewCorrection } from '../hooks/useDictionary';
import { DICTIONARY_KINDS, reviewBlock } from '../model/dictionary';

const TONE: Record<CorrectionStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'neutral',
};

/** Supervised transcript corrections: proposals are reviewed by a second person (four-eyes). */
export function CorrectionsCard() {
  const { t, fmt } = useI18n();
  const session = useSession();
  const canPropose = usePermission('dictionary.manage');
  const canReview = usePermission('dictionary.review');
  const [status, setStatus] = useState<CorrectionStatus | ''>('pending');
  const corrections = useCorrections(status || undefined);
  const [reviewing, setReviewing] = useState<DictionaryCorrection | null>(null);
  const [proposing, setProposing] = useState(false);

  return (
    <Card
      title={t('dictionary.corrections.title')}
      caption={t('dictionary.corrections.caption')}
      actions={
        canPropose && (
          <Button icon="plus" onClick={() => setProposing(true)}>
            {t('dictionary.corrections.propose')}
          </Button>
        )
      }
      flush
    >
      <div className={layout.toolbar}>
        <Field label={t('dictionary.corrections.filter')}>
          {(p) => (
            <select
              {...p}
              value={status}
              onChange={(e) => setStatus(e.target.value as CorrectionStatus | '')}
            >
              <option value="pending">{t('dictionary.corrections.status.pending')}</option>
              <option value="approved">{t('dictionary.corrections.status.approved')}</option>
              <option value="rejected">{t('dictionary.corrections.status.rejected')}</option>
              <option value="">{t('dictionary.corrections.all')}</option>
            </select>
          )}
        </Field>
      </div>
      <QueryView query={corrections}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('dictionary.corrections.empty')} />
          ) : (
            <TableRegion label={t('dictionary.corrections.table')}>
              <thead>
                <tr>
                  <th scope="col">{t('dictionary.corrections.correction')}</th>
                  <th scope="col">{t('dictionary.corrections.call')}</th>
                  <th scope="col">{t('dictionary.corrections.proposedBy')}</th>
                  <th scope="col">{t('dictionary.corrections.state')}</th>
                  <th scope="col">
                    <span className="visually-hidden">{t('common.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const block = reviewBlock(c, session.displayName, canReview);
                  return (
                    <tr key={c.id} data-testid={`correction-${c.id}`}>
                      <td className={tableStyles.wrap}>
                        <span lang="ar" dir="auto">
                          <span className="visually-hidden">{t('common.heard')} </span>
                          <del>{c.heard}</del>
                          <ChangeArrow />
                          <span className="visually-hidden">{t('common.proposed')} </span>
                          <strong>{c.proposed}</strong>
                        </span>
                        <div className={tableStyles.muted}>
                          {t(`dictionary.kinds.${c.kind}`)} {c.synthetic && <SyntheticBadge />}
                        </div>
                      </td>
                      <td className={tableStyles.mono}>
                        <Link to={`/calls/${encodeURIComponent(c.callId)}`}>
                          <bdi>{c.callId}</bdi>
                        </Link>
                        {c.segmentId && (
                          <>
                            {' '}
                            · <bdi>{c.segmentId}</bdi>
                          </>
                        )}
                      </td>
                      <td className={tableStyles.wrap}>
                        {c.proposedBy}
                        <div className={tableStyles.muted}>
                          <bdi>{fmt.dateTime(c.proposedAt)}</bdi>
                        </div>
                      </td>
                      <td className={tableStyles.wrap}>
                        <Badge tone={TONE[c.status]}>
                          {t(`dictionary.corrections.status.${c.status}`)}
                        </Badge>
                        {c.reviewedBy && (
                          <div className={tableStyles.muted}>
                            {c.reviewedBy} · <bdi>{fmt.dateTime(c.reviewedAt ?? '')}</bdi>
                            {c.reviewNote && <> · {c.reviewNote}</>}
                          </div>
                        )}
                      </td>
                      <td>
                        {block === null ? (
                          <Button size="sm" variant="primary" onClick={() => setReviewing(c)}>
                            {t('dictionary.corrections.review')}
                            <span className="visually-hidden"> — {c.heard}</span>
                          </Button>
                        ) : block !== 'reviewed' ? (
                          <span className={tableStyles.muted}>
                            {t(`dictionary.corrections.block.${block}`)}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableRegion>
          )
        }
      </QueryView>
      {reviewing && <ReviewDialog correction={reviewing} onClose={() => setReviewing(null)} />}
      {proposing && <ProposeDialog onClose={() => setProposing(false)} />}
    </Card>
  );
}

function ReviewDialog({
  correction,
  onClose,
}: {
  correction: DictionaryCorrection;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const review = useReviewCorrection();
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [note, setNote] = useState('');
  const [add, setAdd] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (decision === 'reject' && note.trim().length < 3) {
      setError(t('dictionary.corrections.rejectNote'));
      return;
    }
    try {
      await review.mutate({
        id: correction.id,
        review: { decision, note, addToDictionary: decision === 'approve' && add },
      });
      toast(
        'success',
        t(
          decision === 'approve'
            ? 'dictionary.corrections.approvedToast'
            : 'dictionary.corrections.rejectedToast',
        ),
      );
      onClose();
    } catch (err) {
      setError(describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={t('dictionary.corrections.reviewTitle')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant={decision === 'reject' ? 'danger' : 'primary'}
            type="submit"
            form="correction-review"
            loading={review.isPending}
          >
            {t(
              decision === 'approve'
                ? 'dictionary.corrections.approve'
                : 'dictionary.corrections.reject',
            )}
          </Button>
        </>
      }
    >
      <form id="correction-review" onSubmit={submit} noValidate className={layout.form}>
        <p lang="ar" dir="auto">
          <span className="visually-hidden">{t('common.heard')} </span>
          <del>{correction.heard}</del>
          <ChangeArrow />
          <span className="visually-hidden">{t('common.proposed')} </span>
          <strong>{correction.proposed}</strong>
        </p>
        <fieldset className={layout.checks}>
          <legend>{t('dictionary.corrections.decision')}</legend>
          {(['approve', 'reject'] as const).map((d) => (
            <label key={d}>
              <input
                type="radio"
                name="decision"
                checked={decision === d}
                onChange={() => setDecision(d)}
              />{' '}
              {t(
                d === 'approve'
                  ? 'dictionary.corrections.approve'
                  : 'dictionary.corrections.reject',
              )}
            </label>
          ))}
        </fieldset>
        {decision === 'approve' && (
          <Checkbox checked={add} onChange={setAdd}>
            {t('dictionary.corrections.addToDictionary')}
          </Checkbox>
        )}
        <Field
          label={t('dictionary.corrections.note')}
          required={decision === 'reject'}
          error={error ?? undefined}
        >
          {(p) => (
            <textarea
              {...p}
              rows={2}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

const SERVER_FIELD = {
  call_id: 'callId',
  segment_id: 'segmentId',
  heard: 'heard',
  proposed: 'proposed',
} as const;

function ProposeDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const propose = useProposeCorrection();
  const [v, setV] = useState<CorrectionProposal>({
    callId: '',
    segmentId: '',
    heard: '',
    proposed: '',
    kind: 'spelling_variant',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CorrectionProposal, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = <K extends keyof CorrectionProposal>(k: K, value: CorrectionProposal[K]) =>
    setV((x) => ({ ...x, [k]: value }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    e.preventDefault();
    setFormError(null);
    const client: Partial<Record<keyof CorrectionProposal, string>> = {};
    if (!v.callId.trim()) client.callId = t('dictionary.errors.required');
    if (!v.heard.trim()) client.heard = t('dictionary.errors.required');
    if (!v.proposed.trim()) client.proposed = t('dictionary.errors.required');
    setErrors(client);
    if (Object.keys(client).length > 0) {
      focusFirstInvalid(form);
      return;
    }
    try {
      await propose.mutate(v);
      toast('success', t('dictionary.corrections.proposedToast'));
      onClose();
    } catch (err) {
      const mapped = mapFieldIssues(err, SERVER_FIELD);
      if (mapped) setErrors(mapped.fields);
      focusFirstInvalid(form);
      if (!mapped || mapped.unmapped.length > 0)
        setFormError(mapped?.unmapped.join(' ') || describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={t('dictionary.corrections.proposeTitle')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            type="submit"
            form="correction-propose"
            loading={propose.isPending}
          >
            {t('dictionary.corrections.submit')}
          </Button>
        </>
      }
    >
      <form id="correction-propose" onSubmit={submit} noValidate className={layout.form}>
        <div className={layout.row}>
          <Field
            label={t('dictionary.corrections.call')}
            hint={t('dictionary.corrections.callHint')}
            required
            error={errors.callId}
          >
            {(p) => (
              <input
                {...p}
                dir="ltr"
                value={v.callId}
                onChange={(e) => set('callId', e.target.value)}
              />
            )}
          </Field>
          <Field
            label={t('dictionary.corrections.segment')}
            hint={t('dictionary.corrections.segmentHint')}
            error={errors.segmentId}
          >
            {(p) => (
              <input
                {...p}
                dir="ltr"
                value={v.segmentId}
                onChange={(e) => set('segmentId', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('dictionary.fields.kind')}>
            {(p) => (
              <select
                {...p}
                value={v.kind}
                onChange={(e) => set('kind', e.target.value as DictionaryKind)}
              >
                {DICTIONARY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`dictionary.kinds.${k}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className={layout.row}>
          <Field label={t('dictionary.corrections.heard')} required error={errors.heard}>
            {(p) => (
              <input
                {...p}
                dir="auto"
                lang="ar"
                value={v.heard}
                onChange={(e) => set('heard', e.target.value)}
              />
            )}
          </Field>
          <Field label={t('dictionary.corrections.proposed')} required error={errors.proposed}>
            {(p) => (
              <input
                {...p}
                dir="auto"
                lang="ar"
                value={v.proposed}
                onChange={(e) => set('proposed', e.target.value)}
              />
            )}
          </Field>
        </div>
        <Notice tone="info">{t('dictionary.corrections.fourEyes')}</Notice>
      </form>
      {formError && <Notice tone="danger" title={formError} />}
    </Dialog>
  );
}
