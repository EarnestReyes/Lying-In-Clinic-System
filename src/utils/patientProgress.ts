import { PrenatalVisit } from '../models/PatientRecord';

export function bloodPressure(value: {
  systolic?: unknown;
  diastolic?: unknown;
  bp?: unknown;
  bloodPressure?: unknown;
}) {
  const rawBP = String(value.bp ?? value.bloodPressure ?? '').trim();

  // Supports:
  // 130/80
  // 130 / 80
  const pair = rawBP.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);

  const systolic =
    value.systolic != null
      ? Number(value.systolic)
      : Number(pair?.[1]);

  const diastolic =
    value.diastolic != null
      ? Number(value.diastolic)
      : Number(pair?.[2]);

  if (
    !Number.isFinite(systolic) ||
    !Number.isFinite(diastolic) ||
    systolic <= 0 ||
    diastolic <= 0 ||
    systolic <= diastolic
  ) {
    return null;
  }

  return {
    systolic,
    diastolic,
  };
}

/**
 * Converts the prenatal visit date into milliseconds.
 *
 * Priority:
 * 1. Firestore createdAt Timestamp
 * 2. JS Date
 * 3. Numeric timestamp
 * 4. YYYY-MM-DD
 * 5. "Sep 19, 2026"
 */
function getVisitTime(visit: PrenatalVisit): number | null {
  const createdAt = (visit as any).createdAt;

  // Firestore Timestamp
  if (createdAt?.toMillis instanceof Function) {
    return createdAt.toMillis();
  }

  if (createdAt?.toDate instanceof Function) {
    const time = createdAt.toDate().getTime();

    if (Number.isFinite(time)) {
      return time;
    }
  }

  // createdAt is already a Date
  if (createdAt instanceof Date) {
    const time = createdAt.getTime();

    if (Number.isFinite(time)) {
      return time;
    }
  }

  // createdAt is numeric milliseconds
  if (typeof createdAt === 'number') {
    if (Number.isFinite(createdAt)) {
      return createdAt;
    }
  }

  const dateString = String(visit.date ?? '').trim();

  if (!dateString) {
    return null;
  }

  // YYYY-MM-DD
  const isoMatch = dateString.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  );

  if (isoMatch) {
    const [, year, month, day] = isoMatch;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).getTime();
  }

  // Example:
  // Sep 19, 2026
  const humanDateMatch = dateString.match(
    /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/
  );

  if (humanDateMatch) {
    const [, monthName, day, year] = humanDateMatch;

    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const month = months[monthName];

    if (month !== undefined) {
      return new Date(
        Number(year),
        month,
        Number(day)
      ).getTime();
    }
  }

  return null;
}

export function bpHistory(visits: PrenatalVisit[] = []) {
  return visits
    .flatMap((visit, index) => {
      const bp = bloodPressure(visit);

      if (!bp) {
        console.warn('Invalid BP:', visit.bp);
        return [];
      }

      const time = getVisitTime(visit);

      if (time === null || !Number.isFinite(time)) {
        console.warn(
          'Invalid prenatal visit date:',
          visit.date,
          (visit as any).createdAt
        );

        return [];
      }

      return [
        {
          ...bp,
          date: visit.date,
          time,
          id: visit.id || String(index),
        },
      ];
    })
    .sort((a, b) => a.time - b.time);
}