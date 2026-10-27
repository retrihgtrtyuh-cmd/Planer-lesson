import { addDaysISO, getMondayOfWeek, getTodayISO } from './calendar';
import { Lesson, PlannerDatabaseBackup, Student } from './types';

export const STORAGE_KEYS = {
  STUDENTS: 'tutor_planner_students_v1',
  LESSONS: 'tutor_planner_lessons_v1',
  INITIALIZED: 'tutor_planner_initialized_v1',
};

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Builds rich, realistic initial demo data anchored to the current week and previous week
 * so the schedule grid, dashboard metrics, smart "ДЗ с прошлого урока", and auto-transfer
 * work immediately on first launch.
 */
export function createInitialDemoData(todayISO: string = getTodayISO()): {
  students: Student[];
  lessons: Lesson[];
} {
  const currentMonday = getMondayOfWeek(todayISO);
  const prevMonday = addDaysISO(currentMonday, -7);

  const students: Student[] = [
    {
      id: 'stu_1',
      name: 'Алина Соколова',
      defaultSubject: 'eng',
      defaultPrice: 2500,
      notes: 'Уровень B2 (Upper-Intermediate). Подготовка к IELTS Academic, цель 7.5. Учебник: Mindset for IELTS 2 + разбор эссе.',
    },
    {
      id: 'stu_2',
      name: 'Максим Морозов',
      defaultSubject: 'rus',
      defaultPrice: 2200,
      notes: '11 класс, подготовка к ЕГЭ по русскому языку. Особый упор на задания 8, 16–21 (пунктуация) и структуру сочинения (задание 27).',
    },
    {
      id: 'stu_3',
      name: 'София Лебедева',
      defaultSubject: 'eng',
      defaultPrice: 2000,
      notes: 'Уровень B1, 9 класс. Разговорный практикум, расширение словарного запаса, грамматика в контексте (Outcomes Intermediate).',
    },
    {
      id: 'stu_4',
      name: 'Артем Ковалев',
      defaultSubject: 'rus',
      defaultPrice: 1800,
      notes: '8 класс. Повышение успеваемости, причастные и деепричастные обороты, правописание Н и НН в разных частях речи.',
    },
  ];

  const lessons: Lesson[] = [
    // Previous week lessons (completed, with homework so smart prompt works on current week!)
    {
      id: 'les_prev_1',
      studentId: 'stu_1',
      date: addDaysISO(prevMonday, 0), // Prev Mon
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'completed',
      classwork: 'Unit 4: Academic Writing Task 1 (Line graphs & bar charts). Разбор структуры описания трендов.',
      homework: 'Написать отчет по графику стр. 48 (150+ слов), выучить 15 глаголов движения трендов.',
      hwChecked: true,
      price: 2500,
      isPaid: true,
      paymentNote: 'Перевод на карту',
    },
    {
      id: 'les_prev_2',
      studentId: 'stu_2',
      date: addDaysISO(prevMonday, 1), // Prev Tue
      startTime: '17:00',
      endTime: '18:30',
      subject: 'rus',
      status: 'completed',
      classwork: 'Задание 27 ЕГЭ: формулировка авторской позиции и связка примеров-иллюстраций.',
      homework: 'Написать вступление и комментарий по тексту К. Паустовского (вариант 12), прорешать задания 9–15.',
      hwChecked: true,
      price: 2200,
      isPaid: true,
      paymentNote: 'Абонемент (3 из 4)',
    },
    {
      id: 'les_prev_3',
      studentId: 'stu_3',
      date: addDaysISO(prevMonday, 2), // Prev Wed
      startTime: '16:00',
      endTime: '17:00',
      subject: 'eng',
      status: 'completed',
      classwork: 'Present Perfect vs Past Simple в живых диалогах. Аудирование Unit 3.',
      homework: 'Workbook p. 24 ex. 1-4, записать голосовое сообщение на 2 минуты о поездке.',
      hwChecked: true,
      price: 2000,
      isPaid: true,
      paymentNote: 'Оплачено после урока',
    },
    {
      id: 'les_prev_4',
      studentId: 'stu_4',
      date: addDaysISO(prevMonday, 3), // Prev Thu
      startTime: '16:30',
      endTime: '17:30',
      subject: 'rus',
      status: 'completed',
      classwork: 'Обособление определений, выраженных причастным оборотом.',
      homework: 'Упр. 142 (выписать 10 предложений, выделить графически причастные обороты).',
      hwChecked: false,
      price: 1800,
      isPaid: true,
      paymentNote: 'СБП',
    },

    // Current week lessons
    {
      id: 'les_curr_1',
      studentId: 'stu_1',
      date: addDaysISO(currentMonday, 0), // Mon
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'completed',
      classwork: 'Проверка отчета Writing Task 1. Переход к Speaking Part 2 (Technology & Education).',
      homework: 'Эссе Writing Task 2 на тему дистанционного образования (250 слов) + карточка говорения.',
      hwChecked: true,
      price: 2500,
      isPaid: true,
      paymentNote: 'СБП Т-Банк',
    },
    {
      id: 'les_curr_2',
      studentId: 'stu_3',
      date: addDaysISO(currentMonday, 0), // Mon
      startTime: '17:00',
      endTime: '18:00',
      subject: 'eng',
      status: 'completed',
      classwork: 'Разбор ошибок из Workbook. Тема Travel & Accommodation, ролевая игра в аэропорту.',
      homework: 'Выучить фразовые глаголы (check in, set off, take off, get back), стр. 31 упр. 5.',
      hwChecked: true,
      price: 2000,
      isPaid: false,
      paymentNote: 'Оплата в конце недели',
    },
    {
      id: 'les_curr_3',
      studentId: 'stu_2',
      date: addDaysISO(currentMonday, 1), // Tue
      startTime: '17:00',
      endTime: '18:30',
      subject: 'rus',
      status: 'completed',
      classwork: 'Разбор сочинения по Паустовскому. Синтаксические нормы (задание 8 ЕГЭ) — ошибки с деепричастным оборотом.',
      homework: 'Прорешать 25 прототипов задания 8 в рабочей тетради, исправить речевые ошибки в абзаце 3.',
      hwChecked: true,
      price: 2200,
      isPaid: true,
      paymentNote: 'Абонемент (4 из 4)',
    },
    {
      id: 'les_curr_4',
      studentId: 'stu_4',
      date: addDaysISO(currentMonday, 2), // Wed
      startTime: '16:00',
      endTime: '17:00',
      subject: 'rus',
      status: 'planned',
      classwork: 'Правописание Н и НН в полных и кратких страдательных причастиях.',
      homework: '',
      hwChecked: false,
      price: 1800,
      isPaid: false,
      paymentNote: '',
    },
    {
      id: 'les_curr_5',
      studentId: 'stu_1',
      date: addDaysISO(currentMonday, 3), // Thu
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'planned',
      classwork: 'IELTS Reading: True / False / Not Given стратегии быстрого сканирования текста.',
      homework: 'Cambridge IELTS 18 Test 2 Reading Passage 1 & 2 с таймером (40 мин).',
      hwChecked: false,
      price: 2500,
      isPaid: true,
      paymentNote: 'Предоплата',
    },
    {
      id: 'les_curr_6',
      studentId: 'stu_2',
      date: addDaysISO(currentMonday, 4), // Fri
      startTime: '16:30',
      endTime: '18:00',
      subject: 'rus',
      status: 'planned',
      classwork: 'Пунктуация в сложноподчиненном и бессоюзном предложении (задания 19–21 ЕГЭ).',
      homework: '',
      hwChecked: false,
      price: 2200,
      isPaid: false,
      paymentNote: 'Новый абонемент со следующей недели',
    },
    {
      id: 'les_curr_7',
      studentId: 'stu_3',
      date: addDaysISO(currentMonday, 4), // Fri
      startTime: '18:30',
      endTime: '19:30',
      subject: 'eng',
      status: 'cancelled',
      classwork: 'Отмена по просьбе родителей (школьная олимпиада).',
      homework: '',
      hwChecked: false,
      price: 2000,
      isPaid: false,
      paymentNote: 'Перенос не требуется',
    },
    {
      id: 'les_curr_8',
      studentId: 'stu_4',
      date: addDaysISO(currentMonday, 5), // Sat
      startTime: '11:00',
      endTime: '12:00',
      subject: 'rus',
      status: 'planned',
      classwork: 'Контрольный диктант с грамматическим заданием по теме «Причастие и деепричастие».',
      homework: '',
      hwChecked: false,
      price: 1800,
      isPaid: true,
      paymentNote: 'Оплачено заранее',
    },
  ];

  return { students, lessons };
}

/**
 * Loads students and lessons from localStorage, initializing demo data if empty.
 */
export function loadPlannerState(): { students: Student[]; lessons: Lesson[] } {
  try {
    const rawStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const rawLessons = localStorage.getItem(STORAGE_KEYS.LESSONS);
    const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);

    if (!initialized && !rawStudents && !rawLessons) {
      const demo = createInitialDemoData();
      savePlannerState(demo.students, demo.lessons);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return demo;
    }

    const students: Student[] = rawStudents ? JSON.parse(rawStudents) : [];
    const lessons: Lesson[] = rawLessons ? JSON.parse(rawLessons) : [];

    if (students.length === 0 && lessons.length === 0 && !initialized) {
      const demo = createInitialDemoData();
      savePlannerState(demo.students, demo.lessons);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return demo;
    }

    return { students, lessons };
  } catch {
    const demo = createInitialDemoData();
    return demo;
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
    version: 1,
    exportedAt: new Date().toISOString(),
    students,
    lessons,
  };
  return JSON.stringify(backup, null, 2);
}
