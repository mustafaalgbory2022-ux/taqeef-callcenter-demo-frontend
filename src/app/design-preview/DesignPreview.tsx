import { computeOverallScore, scoreBand, type Language } from '@/api/contract';
import { BandIcon } from '@/components/ui/BandIcon';
import { Card } from '@/components/ui/Card';
import { ScoreMeter } from '@/components/ui/ScoreMeter';
import { StatTile } from '@/components/ui/StatTile';
import { formatDuration, formatNumber, translate } from '@/i18n';
import { calls, criteria, TARGET, transcript } from './sample';
import styles from './DesignPreview.module.css';

const SWATCHES = [
  '--color-bg',
  '--color-surface',
  '--color-text',
  '--color-text-muted',
  '--color-accent',
  '--color-score-high',
  '--color-score-mid',
  '--color-score-low',
];

export function DesignPreview({ lang }: { lang: Language }) {
  const t = (key: string) => translate(lang, key);
  const n1 = (v: number) => formatNumber(lang, v, 1);
  const bandLabels = {
    high: t('preview.band.high'),
    mid: t('preview.band.mid'),
    low: t('preview.band.low'),
  };

  // Every KPI is derived from the sample rows — no free-standing numbers.
  const avgScore = calls.reduce((s, c) => s + c.score, 0) / calls.length;
  const meeting = calls.filter((c) => c.score >= TARGET).length;
  const belowTarget = criteria.filter((c) => c.avg < TARGET).length;
  const weighted = computeOverallScore(
    criteria,
    criteria.map((c) => ({ criterionId: c.id, score: c.avg, rationale: '', evidence: [] })),
  );

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>{t('preview.eyebrow')}</p>
          <h1 className={styles.title}>{t('preview.title')}</h1>
          <p className={styles.subtitle}>{t('preview.subtitle')}</p>
        </div>
        <span className={styles.period}>{t('preview.period')}</span>
      </div>

      <section className={styles.kpis} aria-label={t('preview.title')}>
        <StatTile
          label={t('preview.kpi.calls')}
          value={formatNumber(lang, calls.length)}
          footnote={t('preview.kpi.basis')}
        />
        <StatTile
          label={t('preview.kpi.avg')}
          value={n1(avgScore)}
          unit={t('preview.kpi.ofTen')}
          footnote={`${t('preview.kpi.weighted')}: ${n1(weighted ?? 0)}`}
        />
        <StatTile
          label={t('preview.kpi.pass')}
          value={formatNumber(lang, meeting)}
          unit={t('preview.kpi.ofFive')}
          footnote={t('preview.kpi.basis')}
        />
        <StatTile
          label={t('preview.kpi.below')}
          value={formatNumber(lang, belowTarget)}
          unit={`${t('preview.kpi.ofFive')}`}
          footnote={t('preview.criteria.caption')}
        />
      </section>

      <div className={styles.split}>
        <Card
          title={t('preview.criteria.title')}
          caption={t('preview.criteria.caption')}
          headingId="criteria-h"
        >
          <ul className={styles.criteria}>
            {criteria.map((c) => (
              <li key={c.id}>
                <ScoreMeter
                  label={t(`preview.criteria.${c.key}`)}
                  score={c.avg}
                  target={TARGET}
                  formattedScore={n1(c.avg)}
                  maxLabel={t('preview.kpi.ofTen')}
                  bandLabels={bandLabels}
                  meta={`${t('preview.criteria.weight')}: ${formatNumber(lang, c.weight)}`}
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={t('preview.transcript.title')}
          caption={t('preview.transcript.caption')}
          flush
          headingId="transcript-h"
        >
          <ol className={styles.segments}>
            {transcript.map((s) => (
              <li key={s.id} className={`${styles.segment} ${s.evidence ? styles.evidence : ''}`}>
                <span className={styles.time}>{formatDuration(s.startMs)}</span>
                <div>
                  <span className={styles.speaker}>{t(`preview.transcript.${s.speaker}`)}</span>
                  <p
                    className={styles.text}
                    lang={s.language}
                    dir={s.language === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {s.text}
                  </p>
                  {s.evidence && (
                    <p className={styles.note}>
                      <span className={styles.noteLabel}>{t('preview.transcript.evidence')}:</span>
                      <span>{s.evidence[lang]}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card
        title={t('preview.table.title')}
        caption={t('preview.table.caption')}
        flush
        headingId="calls-h"
      >
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-labelledby="calls-h">
          <table className={styles.table} aria-labelledby="calls-h">
            <thead>
              <tr>
                <th scope="col">{t('preview.table.id')}</th>
                <th scope="col">{t('preview.table.topic')}</th>
                <th scope="col">{t('preview.table.agent')}</th>
                <th scope="col">{t('preview.table.duration')}</th>
                <th scope="col">{t('preview.table.status')}</th>
                <th scope="col">{t('preview.table.score')}</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => {
                const band = scoreBand(c.score, TARGET);
                return (
                  <tr key={c.id}>
                    <td className={styles.mono}>{c.id}</td>
                    <td>{c.topic[lang]}</td>
                    <td className={styles.mono}>{c.agent}</td>
                    <td className={styles.num}>
                      <bdi>{formatDuration(c.durationMs)}</bdi>
                    </td>
                    <td>
                      <span className={styles.status}>{t('preview.status.scored')}</span>
                    </td>
                    <td>
                      <span className={`${styles.chip} ${styles[band]}`} title={bandLabels[band]}>
                        <BandIcon band={band} />
                        <span className={styles.chipValue}>{n1(c.score)}</span>
                        <span className="visually-hidden">{bandLabels[band]}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title={t('preview.tokens.title')}
        caption={t('preview.tokens.caption')}
        headingId="tokens-h"
      >
        <div className={styles.swatches}>
          {SWATCHES.map((v) => (
            <div key={v} className={styles.swatch}>
              <span className={styles.chipColor} style={{ background: `var(${v})` }} />
              <code dir="ltr">{v.replace('--color-', '')}</code>
            </div>
          ))}
        </div>
        <div className={styles.typeScale}>
          {(['3xl', '2xl', 'xl', 'base', 'md', 'sm'] as const).map((s) => (
            <span key={s} style={{ fontSize: `var(--text-${s})`, lineHeight: 1.3 }}>
              {s} · {lang === 'ar' ? 'مؤشرات جودة مركز الاتصال' : 'Call center quality metrics'}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
