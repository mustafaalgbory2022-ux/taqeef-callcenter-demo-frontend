import { useEffect, useRef, useState } from 'react';
import { describeError } from '@/shared/i18n/errorMessage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import type { BackupComponent, BackupRun, RestoreRequest } from '@/shared/types/domain';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { Checkbox, Field } from '@/shared/ui/Field';
import { layout } from '@/shared/ui/layout';
import { Notice } from '@/shared/ui/Notice';
import { useToast } from '@/shared/ui/Toaster';
import { useRestore } from '../hooks/useBackups';
import {
  orderedComponents,
  restoreBlock,
  restoreImpact,
  WIZARD_STEPS,
  type WizardStep,
} from '../model/backups';

/** Four-step restore wizard: source and mode → components → impact → typed confirmation. */
export function RestoreWizard({ run, onClose }: { run: BackupRun; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const restore = useRestore();
  const [step, setStep] = useState<WizardStep>('source');
  const [request, setRequest] = useState<RestoreRequest>({
    backupId: run.id,
    mode: 'test',
    components: run.components.map((c) => c.component),
    confirmText: '',
  });
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const index = WIZARD_STEPS.indexOf(step);
  // Move focus into the new step: the footer buttons that triggered the change may unmount.
  const stepRef = useRef<HTMLParagraphElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    stepRef.current?.focus();
  }, [step]);
  const block = restoreBlock(run, request);
  const toggle = (c: BackupComponent, on: boolean) =>
    setRequest((r) => ({
      ...r,
      components: orderedComponents(
        on ? [...r.components, c] : r.components.filter((x) => x !== c),
      ),
    }));

  const canNext =
    (step === 'source' &&
      !(request.mode === 'full' && run.verification.status === 'not_verified')) ||
    (step === 'components' && request.components.length > 0) ||
    step === 'impact';

  async function confirm() {
    setError(null);
    try {
      const result = await restore.mutate(request);
      toast('success', t('backups.wizard.done', { id: result.id }));
      onClose();
    } catch (err) {
      setError(describeError(err, t));
    }
  }

  return (
    <Dialog
      open
      title={t('backups.wizard.title', { id: run.id })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          {index > 0 && (
            <Button key="back" onClick={() => setStep(WIZARD_STEPS[index - 1] ?? 'source')}>
              {t('backups.wizard.back')}
            </Button>
          )}
          {step !== 'confirm' ? (
            <Button
              key="next"
              variant="primary"
              disabled={!canNext}
              onClick={() => setStep(WIZARD_STEPS[index + 1] ?? 'confirm')}
            >
              {t('backups.wizard.next')}
            </Button>
          ) : (
            <Button
              key="start"
              variant={request.mode === 'full' ? 'danger' : 'primary'}
              loading={restore.isPending}
              disabled={block !== null || !ack}
              onClick={confirm}
            >
              {t(request.mode === 'full' ? 'backups.wizard.startFull' : 'backups.wizard.startTest')}
            </Button>
          )}
        </>
      }
    >
      <div className={layout.stack}>
        <p className={layout.muted} ref={stepRef} tabIndex={-1} data-testid="wizard-step">
          {t('backups.wizard.step', {
            n: index + 1,
            total: WIZARD_STEPS.length,
            name: t(`backups.wizard.steps.${step}`),
          })}
        </p>
        <Notice tone="mock" title={t('backups.wizard.simulated')} />
        {step === 'source' && (
          <fieldset className={layout.checks}>
            <legend>{t('backups.wizard.mode')}</legend>
            <p className={layout.muted}>
              <bdi>{run.id}</bdi> · <bdi>{fmt.dateTime(run.startedAt)}</bdi> ·{' '}
              {t(`backups.verification.${run.verification.status}`)}
            </p>
            {(['test', 'full'] as const).map((m) => (
              <label key={m}>
                <input
                  type="radio"
                  name="restore-mode"
                  checked={request.mode === m}
                  onChange={() => setRequest((r) => ({ ...r, mode: m }))}
                />{' '}
                {t(`backups.restores.modes.${m}`)} —{' '}
                <span className={layout.muted}>{t(`backups.wizard.modeHint.${m}`)}</span>
              </label>
            ))}
            {request.mode === 'full' && run.verification.status === 'not_verified' && (
              <Notice tone="warning" title={t('backups.wizard.verifyFirst')} />
            )}
          </fieldset>
        )}
        {step === 'components' && (
          <fieldset className={layout.checks}>
            <legend>{t('backups.wizard.components')}</legend>
            {run.components.map((c) => (
              <Checkbox
                key={c.component}
                checked={request.components.includes(c.component)}
                onChange={(on) => toggle(c.component, on)}
              >
                {t(`backups.components.${c.component}`)}{' '}
                <span className={layout.muted}>
                  ({fmt.integer(c.items)} · {fmt.number(c.sizeGb)} GB)
                </span>
              </Checkbox>
            ))}
          </fieldset>
        )}
        {step === 'impact' && (
          <div data-testid="restore-impact">
            <p>
              <strong>{t('backups.wizard.impactTitle')}</strong>{' '}
              <Badge tone={request.mode === 'full' ? 'danger' : 'neutral'}>
                {t(`backups.restores.modes.${request.mode}`)}
              </Badge>
            </p>
            <ul className={layout.list}>
              {restoreImpact(request.mode, request.components).map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </div>
        )}
        {step === 'confirm' && (
          <div className={layout.form}>
            {request.mode === 'full' && (
              <Field
                label={t('backups.wizard.typeId', { id: run.id })}
                required
                error={
                  block === 'confirmText' && request.confirmText
                    ? t('backups.wizard.idMismatch')
                    : undefined
                }
              >
                {(p) => (
                  <input
                    {...p}
                    dir="ltr"
                    autoComplete="off"
                    value={request.confirmText}
                    onChange={(e) => setRequest((r) => ({ ...r, confirmText: e.target.value }))}
                  />
                )}
              </Field>
            )}
            <Checkbox checked={ack} onChange={setAck}>
              {t(request.mode === 'full' ? 'backups.wizard.ackFull' : 'backups.wizard.ackTest')}
            </Checkbox>
          </div>
        )}
        {error && <Notice tone="danger" title={error} />}
      </div>
    </Dialog>
  );
}
