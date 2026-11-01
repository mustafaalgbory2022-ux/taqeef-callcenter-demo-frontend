import { describe, expect, it } from 'vitest';
import type { QueueDailyStat } from '@/shared/types/domain';
import { addDays, daysInRange, periodRange, presetRange } from './dates';
import { dailySeries, slaPercent, summarizeQueue } from './pbx';
import { buildXlsxFiles, crc32, safeSheetName, zipStored } from './xlsx';

const day = (
  date: string,
  incoming: number,
  missed: number,
  abandoned: number,
): QueueDailyStat => ({
  date,
  queueId: 'q',
  incoming,
  answered: incoming - missed - abandoned,
  missed,
  abandoned,
  totalWaitS: incoming * 10,
  maxWaitS: 60,
  totalTalkS: 0,
});

describe('PBX metrics', () => {
  it('uses the approved SLA formula and never folds abandoned into missed', () => {
    expect(slaPercent(200, 10)).toBe(95);
    expect(slaPercent(0, 0)).toBeNull();
    const s = summarizeQueue([day('2026-10-01', 100, 5, 7), day('2026-10-02', 100, 5, 3)]);
    expect(s).toMatchObject({ incoming: 200, missed: 10, abandoned: 10, slaPercent: 95, days: 2 });
  });

  it('builds a daily series', () => {
    expect(
      dailySeries([day('2026-10-02', 50, 5, 0), day('2026-10-01', 40, 0, 2)]).map((p) => p.date),
    ).toEqual(['2026-10-01', '2026-10-02']);
  });
});

describe('dates', () => {
  it('computes presets and report periods', () => {
    expect(presetRange('last7', '2026-11-01')).toEqual({ from: '2026-10-26', to: '2026-11-01' });
    expect(presetRange('lastMonth', '2026-11-01')).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(periodRange('monthly', '2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodRange('yearly', '2026-02-10')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    // Saturday–Friday working week: 2026-10-29 is a Thursday.
    expect(periodRange('weekly', '2026-10-29')).toEqual({ from: '2026-10-24', to: '2026-10-30' });
    expect(daysInRange({ from: '2026-10-01', to: addDays('2026-10-01', 6) })).toBe(7);
  });
});

describe('xlsx writer', () => {
  it('computes standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('writes a valid stored zip with workbook parts and escaped cells', () => {
    const files = buildXlsxFiles([
      {
        name: 'Queues',
        rows: [
          ['Queue', 'SLA %'],
          ['Sales <6001>', 95.5],
        ],
      },
    ]);
    expect(Object.keys(files)).toContain('xl/worksheets/sheet1.xml');
    expect(files['xl/worksheets/sheet1.xml']).toContain('Sales &lt;6001&gt;');
    expect(files['xl/worksheets/sheet1.xml']).toContain('<v>95.5</v>');
    const zip = zipStored(files);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
  });

  it('sanitises and de-duplicates sheet names', () => {
    const used = new Set<string>();
    expect(safeSheetName('Agents: Sales/After-Sales', used)).toBe('Agents  Sales After-Sales');
    expect(safeSheetName('Agents  Sales After-Sales', used)).toBe('Agents  Sales After-Sales 2');
  });
});
