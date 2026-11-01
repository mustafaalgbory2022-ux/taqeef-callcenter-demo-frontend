import { describe, expect, it } from 'vitest';
import type { Agent, Queue } from '@/shared/types/domain';
import { assignmentDiff, needsRenumberConfirmation, sortQueues, validateQueue } from './queues';

const q = (id: string, number: string, status: 'active' | 'disabled' = 'active'): Queue => ({
  id,
  number,
  name: { en: `Q${number}`, ar: `ط${number}` },
  status,
});
const agent = (id: string, queueIds: string[]): Agent => ({
  id,
  displayName: id,
  extension: id,
  status: 'active',
  queueIds,
  synthetic: true,
  createdAt: '',
  updatedAt: '',
});

describe('queue administration rules', () => {
  const queues = [q('a', '6001'), q('b', '6002')];

  it('validates number format, uniqueness and bilingual names', () => {
    expect(
      validateQueue({ number: '60', name: { en: '', ar: 'x' }, description: '' }, queues, null),
    ).toEqual({
      number: 'queueAdmin.errors.numberFormat',
      nameEn: 'queueAdmin.errors.nameRequired',
    });
    expect(
      validateQueue({ number: '6002', name: { en: 'x', ar: 'y' }, description: '' }, queues, 'a'),
    ).toEqual({ number: 'queueAdmin.errors.numberTaken' });
    expect(
      validateQueue({ number: '6001', name: { en: 'x', ar: 'y' }, description: '' }, queues, 'a'),
    ).toEqual({});
  });

  it('requires confirmation only when an existing queue is renumbered', () => {
    const input = { number: '6003', name: { en: 'x', ar: 'y' }, description: '' };
    expect(needsRenumberConfirmation(null, input)).toBe(false);
    expect(needsRenumberConfirmation(queues[0] ?? null, input)).toBe(true);
    expect(needsRenumberConfirmation(queues[0] ?? null, { ...input, number: ' 6001 ' })).toBe(
      false,
    );
  });

  it('computes added and removed agents for an assignment change', () => {
    const agents = [agent('x', ['a']), agent('y', []), agent('z', ['a', 'b'])];
    const diff = assignmentDiff('a', agents, new Set(['x', 'y']));
    expect(diff.added.map((a) => a.id)).toEqual(['y']);
    expect(diff.removed.map((a) => a.id)).toEqual(['z']);
  });

  it('lists active queues first, by number', () => {
    expect(
      sortQueues([q('c', '7000', 'disabled'), q('b', '6002'), q('a', '6001')]).map((x) => x.id),
    ).toEqual(['a', 'b', 'c']);
  });
});
