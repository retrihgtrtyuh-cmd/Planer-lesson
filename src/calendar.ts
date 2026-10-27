import {
  AutoTransferResult,
  Lesson,
  SubjectFilter,
  WeekDayInfo,
  WeeklyDashboardStats,
} from './types';

const MONTHS_GENITIVE_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_NAMES_FULL = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

/**
 * Parses a YYYY-MM-DD string into a local Date at noon to avoid DST boundary shifts.
 */
export function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/**
 * Formats a Date object into YYYY-MM-DD in local time.
 */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date in YYYY-MM-DD format.
 */
export function getTodayISO(now: Date = new Date()): string {
  return toISODateString(now);
}

/**
 * Given any Date or YYYY-MM-DD string, returns the Monday of that week in YYYY-MM-DD format.
 * Week starts on Monday (ISO-8601).
 */
export function getMondayOfWeek(input: Date | string = new Date()): string {
  const d = typeof input === 'string' ? parseISODate(input) : new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return toISODateString(d);
}

/**
 * Shifts an ISO date string by a given number of days.
 */
export function addDaysISO(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  d.setDate(d.getDate() + days);
  return toISODateString(d);
}

/**
 * Generates the 7 days (Mon-Sun) for a week starting at mondayISO.
 */
export function getWeekDays(mondayISO: string, todayISO: string = getTodayISO()): WeekDayInfo[] {
  const monday = getMondayOfWeek(mondayISO);
  const days: WeekDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const currentISO = addDaysISO(monday, i);
    const d = parseISODate(currentISO);
    days.push({
      date: currentISO,
      dayNameShort: DAY_NAMES_SHORT[i],
      dayNameFull: DAY_NAMES_FULL[i],
      dayNumber: d.getDate(),
      monthShort: MONTHS_GENITIVE_SHORT[d.getMonth()],
      isToday: currentISO === todayISO,
    });
  }

  return days;
}

/**
 * Formats a week range display string in Russian, e.g. "26 окт – 1 ноя 2026" or "19 – 25 окт 2026".
 */
export function formatWeekRange(mondayISO: string): string {
  const monday = parseISODate(getMondayOfWeek(mondayISO));
  const sunday = parseISODate(addDaysISO(getMondayOfWeek(mondayISO), 6));

  const mDay = monday.getDate();
  const sDay = sunday.getDate();
  const mMonth = MONTHS_GENITIVE_SHORT[monday.getMonth()];
  const sMonth = MONTHS_GENITIVE_SHORT[sunday.getMonth()];
  const mYear = monday.getFullYear();
  const sYear = sunday.getFullYear();

  if (mYear !== sYear) {
    return `${mDay} ${mMonth} ${mYear} – ${sDay} ${sMonth} ${sYear}`;
  }
  if (monday.getMonth() === sunday.getMonth()) {
    return `${mDay} – ${sDay} ${sMonth} ${sYear}`;
  }
  return `${mDay} ${mMonth} – ${sDay} ${sMonth} ${sYear}`;
}

/**
 * Formats a single YYYY-MM-DD date in Russian, e.g. "27 окт 2026, Вт".
 */
export function formatRussianDate(dateStr: string, includeWeekday = true): string {
  if (!dateStr) return '';
  const d = parseISODate(dateStr);
  const day = d.getDate();
  const month = MONTHS_GENITIVE_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const jsDay = d.getDay();
  const weekdayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const weekday = DAY_NAMES_SHORT[weekdayIdx];
  return includeWeekday ? `${day} ${month} ${year}, ${weekday}` : `${day} ${month} ${year}`;
}

/**
 * Sorts lessons chronologically by date, then startTime, then endTime.
 */
export function sortLessonsChronologically(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    if (a.startTime !== b.startTime) {
      return a.startTime.localeCompare(b.startTime);
    }
    return a.endTime.localeCompare(b.endTime);
  });
}

/**
 * Filters lessons by optional week date range, subject filter, exact date filter, and student query.
 */
export function filterLessons(
  lessons: Lesson[],
  options: {
    weekMondayISO?: string;
    subjectFilter?: SubjectFilter;
    exactDate?: string;
    studentId?: string;
  }
): Lesson[] {
  const { weekMondayISO, subjectFilter = 'all', exactDate, studentId } = options;

  let weekStart = '';
  let weekEnd = '';
  if (weekMondayISO) {
    weekStart = getMondayOfWeek(weekMondayISO);
    weekEnd = addDaysISO(weekStart, 6);
  }

  const filtered = lessons.filter((lesson) => {
    if (subjectFilter !== 'all' && lesson.subject !== subjectFilter) {
      return false;
    }
    if (studentId && lesson.studentId !== studentId) {
      return false;
    }
    if (exactDate) {
      return lesson.date === exactDate;
    }
    if (weekStart && weekEnd) {
      return lesson.date >= weekStart && lesson.date <= weekEnd;
    }
    return true;
  });

  return sortLessonsChronologically(filtered);
}

/**
 * Calculates weekly dashboard metrics for the given week (and optional subject filter).
 * Cancelled lessons are excluded from active lesson counts and financial totals.
 */
export function calculateWeeklyStats(
  lessons: Lesson[],
  weekMondayISO: string,
  subjectFilter: SubjectFilter = 'all'
): WeeklyDashboardStats {
  const weekStart = getMondayOfWeek(weekMondayISO);
  const weekEnd = addDaysISO(weekStart, 6);

  const weekLessons = lessons.filter((l) => {
    const inWeek = l.date >= weekStart && l.date <= weekEnd;
    const matchesSubject = subjectFilter === 'all' || l.subject === subjectFilter;
    return inWeek && matchesSubject;
  });

  let totalActiveLessons = 0;
  let engLessons = 0;
  let rusLessons = 0;
  let completedLessons = 0;
  let cancelledLessons = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;

  for (const lesson of weekLessons) {
    if (lesson.status === 'cancelled') {
      cancelledLessons += 1;
      continue;
    }

    totalActiveLessons += 1;
    if (lesson.subject === 'eng') engLessons += 1;
    if (lesson.subject === 'rus') rusLessons += 1;
    if (lesson.status === 'completed') completedLessons += 1;

    const price = Number(lesson.price) || 0;
    if (lesson.isPaid) {
      paidAmount += price;
    } else {
      unpaidAmount += price;
    }
  }

  return {
    totalActiveLessons,
    engLessons,
    rusLessons,
    completedLessons,
    cancelledLessons,
    paidAmount,
    unpaidAmount,
    totalExpectedAmount: paidAmount + unpaidAmount,
  };
}

/**
 * Finds the most recent previous lesson for the same student before the given date (and time)
 * to show the smart "ДЗ с прошлого урока" prompt.
 * Prioritizes 'completed' lessons with homework, or falls back to the latest non-cancelled lesson before targetDate.
 */
export function findPreviousStudentLesson(
  lessons: Lesson[],
  studentId: string,
  currentLessonDate: string,
  currentLessonId?: string
): Lesson | null {
  if (!studentId || !currentLessonDate) return null;

  const candidates = lessons.filter((l) => {
    if (l.studentId !== studentId) return false;
    if (currentLessonId && l.id === currentLessonId) return false;
    if (l.status === 'cancelled') return false;
    return l.date < currentLessonDate;
  });

  if (candidates.length === 0) return null;

  const completedCandidates = candidates.filter((l) => l.status === 'completed');
  const pool = completedCandidates.length > 0 ? completedCandidates : candidates;

  const sorted = sortLessonsChronologically(pool);
  return sorted[sorted.length - 1] || null;
}

/**
 * Prepares the auto-transfer (+7 days) of a week's schedule from sourceMondayISO to targetMondayISO.
 * Rules:
 * - New lesson objects with shifted dates (+7 days relative to source week offset).
 * - Copies only: studentId, startTime, endTime, subject, price.
 * - Sets: classwork = '', homework = '', paymentNote = '', hwChecked = false, isPaid = false, status = 'planned'.
 * - Cancelled lessons ('cancelled') are NOT transferred.
 * - Duplicate protection: does not duplicate a lesson if target date + startTime already has a non-cancelled lesson
 *   (or any lesson at that exact date and startTime).
 */
export function buildAutoTransferredLessons(
  allLessons: Lesson[],
  sourceMondayISO: string,
  targetMondayISO: string,
  generateId: () => string = () => `les_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
): AutoTransferResult {
  const normSourceMonday = getMondayOfWeek(sourceMondayISO);
  const normTargetMonday = getMondayOfWeek(targetMondayISO);
  const sourceEnd = addDaysISO(normSourceMonday, 6);
  const targetEnd = addDaysISO(normTargetMonday, 6);

  const sourceWeekLessons = sortLessonsChronologically(
    allLessons.filter((l) => l.date >= normSourceMonday && l.date <= sourceEnd)
  );

  const targetWeekExisting = allLessons.filter(
    (l) => l.date >= normTargetMonday && l.date <= targetEnd
  );

  let skippedCancelled = 0;
  let skippedDuplicates = 0;
  const createdLessons: Lesson[] = [];

  const sourceMonDate = parseISODate(normSourceMonday);

  for (const src of sourceWeekLessons) {
    if (src.status === 'cancelled') {
      skippedCancelled += 1;
      continue;
    }

    const srcDate = parseISODate(src.date);
    const dayOffset = Math.round(
      (srcDate.getTime() - sourceMonDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const newDate = addDaysISO(normTargetMonday, dayOffset);

    // Check if there is already a lesson on newDate at the same startTime
    const hasDuplicateInExisting = targetWeekExisting.some(
      (existing) => existing.date === newDate && existing.startTime === src.startTime
    );
    const hasDuplicateInCreated = createdLessons.some(
      (created) => created.date === newDate && created.startTime === src.startTime
    );

    if (hasDuplicateInExisting || hasDuplicateInCreated) {
      skippedDuplicates += 1;
      continue;
    }

    createdLessons.push({
      id: generateId(),
      studentId: src.studentId,
      date: newDate,
      startTime: src.startTime,
      endTime: src.endTime,
      subject: src.subject,
      status: 'planned',
      classwork: '',
      homework: '',
      hwChecked: false,
      price: Number(src.price) || 0,
      isPaid: false,
      paymentNote: '',
    });
  }

  return {
    createdLessons,
    skippedCancelled,
    skippedDuplicates,
    sourceWeekRange: formatWeekRange(normSourceMonday),
    targetWeekRange: formatWeekRange(normTargetMonday),
  };
}
