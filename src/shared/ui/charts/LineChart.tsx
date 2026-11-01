import { useId } from 'react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import styles from './Charts.module.css';

export interface ChartPoint {
  label: string;
  value: number | null;
}

export interface LineChartProps {
  title: string;
  points: readonly ChartPoint[];
  formatValue: (v: number) => string;
  min?: number;
  max?: number;
  /** Optional reference line (e.g. quality threshold). */
  reference?: { value: number; label: string } | undefined;
}

const W = 640;
const H = 200;
const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

/**
 * Single-series line chart (one measure, one axis) with a data-table alternative.
 * Rendered left-to-right in both languages (time axis convention).
 */
export function LineChart({ title, points, formatValue, min, max, reference }: LineChartProps) {
  const { t } = useI18n();
  const id = useId();
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  const lo = min ?? Math.min(0, ...values);
  const hi = max ?? Math.max(1, ...values, reference?.value ?? 0);
  const x = (i: number) =>
    PAD.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
  const segments: string[] = [];
  let current = '';
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current) segments.push(current);
      current = '';
      return;
    }
    current += `${current ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
  });
  if (current) segments.push(current);
  const ticks = [lo, (lo + hi) / 2, hi];
  const labelIdx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])].filter(
    (i) => i >= 0,
  );

  return (
    <figure className={styles.figure}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={id}
        direction="ltr"
      >
        <title id={id}>{title}</title>
        {ticks.map((v) => (
          <g key={v}>
            <line className={styles.grid} x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className={styles.axisLabel} x={PAD.left - 6} y={y(v) + 4} textAnchor="end">
              {formatValue(v)}
            </text>
          </g>
        ))}
        {reference && (
          <g>
            <line
              className={styles.threshold}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(reference.value)}
              y2={y(reference.value)}
            />
            <text
              className={styles.thresholdLabel}
              x={W - PAD.right}
              y={y(reference.value) - 4}
              textAnchor="end"
            >
              {reference.label}
            </text>
          </g>
        )}
        {segments.map((d) => (
          <path key={d} className={styles.line} d={d} />
        ))}
        {points.map((p, i) =>
          p.value === null || points.length > 40 ? null : (
            <circle key={p.label} className={styles.point} cx={x(i)} cy={y(p.value)} r={3.5}>
              <title>{`${p.label}: ${formatValue(p.value)}`}</title>
            </circle>
          ),
        )}
        {labelIdx.map((i) => (
          <text
            key={i}
            className={styles.axisLabel}
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
          >
            {points[i]?.label}
          </text>
        ))}
      </svg>
      <details className={styles.details}>
        <summary>{t('charts.showTable')}</summary>
        <table>
          <caption className="visually-hidden">{title}</caption>
          <tbody>
            {points.map((p) => (
              <tr key={p.label}>
                <th scope="row">
                  <bdi>{p.label}</bdi>
                </th>
                <td>
                  <bdi>{p.value === null ? '—' : formatValue(p.value)}</bdi>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Tiny decorative trend line; always paired with a textual value. */
export function Sparkline({ values }: { values: readonly (number | null)[] }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return null;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const d = values
    .map((v, i) =>
      v === null
        ? null
        : `${(i / (values.length - 1)) * 96},${22 - ((v - lo) / (hi - lo || 1)) * 20}`,
    )
    .filter(Boolean)
    .map((p, i) => `${i ? 'L' : 'M'}${p}`)
    .join('');
  return (
    <svg className={styles.spark} viewBox="0 0 96 24" aria-hidden="true" direction="ltr">
      <path className={styles.line} d={d} />
    </svg>
  );
}
