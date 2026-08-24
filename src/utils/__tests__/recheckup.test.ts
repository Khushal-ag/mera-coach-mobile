import {
  RECHECKUP_INTERVAL_DAYS,
  needsRecheckup,
  rankForRecheckup,
  dueForRecheckup,
  describeCheckup,
  describeLastCheckup,
  daysUntilRecheckup,
  describeRecheckupGate,
} from '../recheckup';
import type { ClientSummary } from '../../types/models';

function client(partial: Partial<ClientSummary> & { name: string }): ClientSummary {
  return partial;
}

const TODAY = new Date(2026, 7, 25); // 25 Aug 2026 local

describe('recheckup', () => {
  it('marks never-checked clients as never / due', () => {
    const ranked = rankForRecheckup([client({ name: 'A' })], TODAY);
    expect(ranked[0]!.status.urgency).toBe('never');
    expect(needsRecheckup(ranked[0]!.status)).toBe(true);
    expect(describeCheckup(ranked[0]!.status)).toBe('Due now');
    expect(describeLastCheckup(ranked[0]!.status)).toBe('No check-up recorded');
  });

  it('treats unparseable but present dates as due', () => {
    const ranked = rankForRecheckup(
      [client({ name: 'B', lastCheckupDate: 'sometime last week' })],
      TODAY,
    );
    expect(ranked[0]!.status.urgency).toBe('due');
    expect(ranked[0]!.status.daysSince).toBeNull();
    expect(describeCheckup(ranked[0]!.status)).toBe('Check-up due');
  });

  it('classifies DD/MM/YYYY within the weekly window as ok', () => {
    // 3 days ago
    const ranked = rankForRecheckup([client({ name: 'C', lastCheckupDate: '22/08/2026' })], TODAY);
    expect(ranked[0]!.status.urgency).toBe('ok');
    expect(ranked[0]!.status.daysSince).toBe(3);
    expect(daysUntilRecheckup(ranked[0]!.status)).toBe(RECHECKUP_INTERVAL_DAYS - 3);
    expect(describeRecheckupGate(ranked[0]!.status)).toBe('Available in 4 days');
  });

  it('classifies overdue when past the interval', () => {
    const ranked = rankForRecheckup([client({ name: 'D', lastCheckupDate: '10/08/2026' })], TODAY);
    expect(ranked[0]!.status.urgency).toBe('overdue');
    expect(ranked[0]!.status.daysSince).toBe(15);
    expect(describeCheckup(ranked[0]!.status)).toBe('15d overdue');
  });

  it('parses DD-MM-YYYY and ISO date prefixes', () => {
    const dash = rankForRecheckup([client({ name: 'E', lastCheckupDate: '22-08-2026' })], TODAY);
    expect(dash[0]!.status.urgency).toBe('ok');
    expect(dash[0]!.status.daysSince).toBe(3);

    const iso = rankForRecheckup([client({ name: 'F', lastCheckupDate: '2026-08-22' })], TODAY);
    expect(iso[0]!.status.urgency).toBe('ok');
    expect(iso[0]!.status.daysSince).toBe(3);
  });

  it('ranks never before overdue before due before ok, then by age', () => {
    const ranked = rankForRecheckup(
      [
        client({ name: 'Ok', lastCheckupDate: '22/08/2026' }),
        client({ name: 'Never' }),
        client({ name: 'OldOverdue', lastCheckupDate: '01/08/2026' }),
        client({ name: 'NewOverdue', lastCheckupDate: '10/08/2026' }),
        client({ name: 'DueWeird', lastCheckupDate: '???' }),
      ],
      TODAY,
    );
    expect(ranked.map(r => r.client.name)).toEqual([
      'Never',
      'OldOverdue',
      'NewOverdue',
      'DueWeird',
      'Ok',
    ]);
  });

  it('dueForRecheckup filters out ok clients', () => {
    const due = dueForRecheckup(
      [client({ name: 'Ok', lastCheckupDate: '22/08/2026' }), client({ name: 'Never' })],
      TODAY,
    );
    expect(due.map(r => r.client.name)).toEqual(['Never']);
  });
});
