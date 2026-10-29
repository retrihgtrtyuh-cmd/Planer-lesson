import { Lesson, PlannerDatabaseBackup, Student } from './types';

export const STORAGE_KEYS = {
  STUDENTS: 'tutor_planner_students_v3',
  LESSONS: 'tutor_planner_lessons_v3',
  INITIALIZED: 'tutor_planner_initialized_v3',
};

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Returns a clean empty initial database without fictional demo students, prices, or lessons
 * so a newly installed app is ready for immediate synchronization or user entry.
 */
export function createInitialDemoData(): {
  students: Student[];
  lessons: Lesson[];
} {
  return {
    students: [],
    lessons: [],
  };
}

/**
 * Loads students and lessons from localStorage, starting with a clean empty database if uninitialized.
 */
export function loadPlannerState(): { students: Student[]; lessons: Lesson[] } {
  try {
    const rawStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const rawLessons = localStorage.getItem(STORAGE_KEYS.LESSONS);
    const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);

    if (!initialized && !rawStudents && !rawLessons) {
      const emptyState = createInitialDemoData();
      savePlannerState(emptyState.students, emptyState.lessons);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return emptyState;
    }

    const students: Student[] = rawStudents ? JSON.parse(rawStudents) : [];
    const lessons: Lesson[] = rawLessons ? JSON.parse(rawLessons) : [];

    return { students, lessons };
  } catch {
    return createInitialDemoData();
  }
}

export function savePlannerState(students: Student[], lessons: Lesson[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

/**
 * Validates and parses an imported JSON string into { students, lessons }.
 */
export function parseDatabaseBackupJSON(jsonString: string): {
  students: Student[];
  lessons: Lesson[];
} {
  const parsed = JSON.parse(jsonString) as Partial<PlannerDatabaseBackup>;

  if (!parsed || !Array.isArray(parsed.students) || !Array.isArray(parsed.lessons)) {
    throw new Error('Некорректный формат файла: отсутствуют массивы students или lessons.');
  }

  const validStudents: Student[] = parsed.students.map((s, idx) => {
    if (!s || typeof s.name !== 'string' || !s.name.trim()) {
      throw new Error(`Ошибка в данных ученика #${idx + 1}: отсутствует имя.`);
    }
    return {
      id: String(s.id || createId('stu')),
      name: s.name.trim(),
      defaultSubject: s.defaultSubject === 'rus' ? 'rus' : 'eng',
      defaultPrice: Number(s.defaultPrice) || 0,
      notes: typeof s.notes === 'string' ? s.notes : '',
    };
  });

  const validLessons: Lesson[] = parsed.lessons.map((l, idx) => {
    if (!l || typeof l.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(l.date)) {
      throw new Error(`Ошибка в данных урока #${idx + 1}: некорректная дата.`);
    }
    return {
      id: String(l.id || createId('les')),
      studentId: String(l.studentId || ''),
      date: l.date,
      startTime: typeof l.startTime === 'string' ? l.startTime : '15:00',
      endTime: typeof l.endTime === 'string' ? l.endTime : '16:00',
      subject: l.subject === 'rus' ? 'rus' : 'eng',
      status:
        l.status === 'completed' || l.status === 'cancelled' || l.status === 'rescheduled'
          ? l.status
          : 'planned',
      classwork: typeof l.classwork === 'string' ? l.classwork : '',
      homework: typeof l.homework === 'string' ? l.homework : '',
      hwChecked: Boolean(l.hwChecked),
      price: Number(l.price) || 0,
      isPaid: Boolean(l.isPaid),
      paymentNote: typeof l.paymentNote === 'string' ? l.paymentNote : '',
    };
  });

  return { students: validStudents, lessons: validLessons };
}

export function serializeDatabaseBackup(students: Student[], lessons: Lesson[]): string {
  const backup: PlannerDatabaseBackup = {
    version: 4,
    exportedAt: new Date().toISOString(),
    students,
    lessons,
  };
  return JSON.stringify(backup, null, 2);
}
