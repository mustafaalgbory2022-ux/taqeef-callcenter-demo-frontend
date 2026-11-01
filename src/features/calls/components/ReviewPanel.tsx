import { useState, type FormEvent } from 'react';
import { mapFieldIssues } from '@/shared/api/fieldIssues';
import { usePermission } from '@/shared/hooks/usePermission';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { Call, ReviewStatus } from '@/shared/types/domain';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Field } from '@/shared/ui/Field';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useReviewCall } from '../hooks/useCallData';
import { REVIEW_STATUSES } from '../hooks/useCallFilters';
import { ReviewBadge } from './ReviewBadge';

/** Supervisor review of a call: status + note. Read-only without the review permission. */
export function ReviewPanel({ call }: { call: Call }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const canReview = usePermission('calls.review');
  const review = useReviewCall();
  const [status, setStatus] = useState<ReviewStatus>(call.review.status);
  const [note, setNote] = useState(call.review.note);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (status === 'needs_follow_up' && !note.trim()) {
      setError(t('calls.review.noteRequired'));
      return;
    }
    try {
      await review.mutate({ id: call.id, review: { status, note } });
      toast('success', t('calls.review.saved'));
    } catch (err) {
      const mapped = mapFieldIssues(err, { note: 'note', status: 'status' } as const);
      setError(
        mapped
          ? Object.values(mapped.fields).concat(mapped.unmapped).join(' ')
          : describeError(err, t),
      );
    }
  }

  return (
    <Card
      title={t('calls.review.title')}
      caption={
        call.review.reviewedAt
          ? t('calls.review.last', {
              by: call.review.reviewedBy ?? '—',
              at: fmt.dateTime(call.review.reviewedAt),
            })
          : t('calls.review.none')
      }
      actions={<ReviewBadge status={call.review.status} />}
    >
      {canReview ? (
        <form onSubmit={submit} noValidate>
          <Field label={t('calls.review.label')}>
            {(p) => (
              <select
                {...p}
                value={status}
                onChange={(e) => setStatus(e.target.value as ReviewStatus)}
              >
                {REVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`calls.review.status.${s}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label={t('calls.review.note')}
            hint={t('calls.review.noteHint')}
            error={error ?? undefined}
          >
            {(p) => (
              <textarea
                {...p}
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </Field>
          <p>
            <Button variant="primary" type="submit" loading={review.isPending}>
              {t('calls.review.save')}
            </Button>
          </p>
        </form>
      ) : (
        <>
          {call.review.note && <p dir="auto">{call.review.note}</p>}
          <Notice tone="info" title={t('common.readOnly')} />
        </>
      )}
    </Card>
  );
}
