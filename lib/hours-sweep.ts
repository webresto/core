/**
 * Opening and closing by the hours. A point or a promotion with hours opens and closes with no write,
 * so no hook of its model tells a storefront that the menu of a kitchen or the prices turned.
 * Once a minute the sweep asks every kind of record with hours what is open now and, for what turned since the sweep
 * before, raises the event a write of it would - a storefront asks again what it shows.
 *
 * Whether a record is open is its owner's answer (`isOpen`), the one orders are judged by, not a guess of the next
 * bound of its hours. Every process sweeps: a storefront is told through the memory of the process it is connected to.
 */

/** the records of one kind that have hours */
export interface HoursSubject<R extends { id: string | number } = any> {
  /** the kind, unique: the key of what was open */
  name: string;
  /** the records whose hours may open or close them: enabled, with hours */
  read(): Promise<R[]>;
  isOpen(record: R, at: Date): boolean;
  /** raises the event of the record turned */
  turned(record: R): void;
}

const subjects = new Map<string, HoursSubject>();
/** what was open at the sweep before, by `kind:id`; a record not swept yet is not told */
let wasOpen = new Map<string, boolean>();
let timer: ReturnType<typeof setTimeout> | null = null;

/** the owner of a kind of records with hours adds it once, at boot */
export function addHoursSubject(subject: HoursSubject): void {
  subjects.set(subject.name, subject);
}

/** one sweep at a moment: what turned since the sweep before is told; the first one only learns what is open */
export async function sweepHours(at: Date = new Date()): Promise<void> {
  const open = new Map<string, boolean>();
  for (const subject of subjects.values()) {
    for (const record of await subject.read()) {
      const key = `${subject.name}:${record.id}`;
      const now = subject.isOpen(record, at);
      open.set(key, now);
      if (wasOpen.has(key) && wasOpen.get(key) !== now) subject.turned(record);
    }
  }
  wasOpen = open;
}

/** sweeps now and then a few seconds into every minute: hours turn on the minute */
export function startHoursSweep(): void {
  stopHoursSweep();
  const tick = () => {
    sweepHours().catch((error) => sails.log.error("RestoCore > hours sweep failed", error));
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 2_000);
    timer.unref?.();
  };
  tick();
}

export function stopHoursSweep(): void {
  if (timer) clearTimeout(timer);
  timer = null;
}
