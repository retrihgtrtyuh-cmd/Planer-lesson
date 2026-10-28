import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Calendar = require('../js/calendar.js');
const Store = require('../js/store.js');

// Attach Calendar to global TutorPlanner so Store can call Calendar helpers during tests
(globalThis as Record<string, unknown>).TutorPlanner = {
  Calendar,
  Store,
};

test('getMondayOfWeek returns Monday for any day of week (including Sunday)', () => {
  assert.equal(Calendar.getMondayOfWeek('2026-10-27'), '2026-10-26');
  assert.equal(Calendar.getMondayOfWeek('2026-11-01'), '2026-10-26');
  assert.equal(Calendar.getMondayOfWeek('2026-10-26'), '2026-10-26');
});

test('addMinutesToTime defaults to 1 hour (60 min) and supports custom durations and formatCurrency', () => {
  assert.equal(Calendar.addMinutesToTime('15:00', 60), '16:00');
  assert.equal(Calendar.addMinutesToTime('15:00'), '16:00');
  assert.equal(Calendar.addMinutesToTime('15:30', 45), '16:15');
  assert.equal(Calendar.addMinutesToTime('15:00', 90), '16:30');
  assert.equal(Calendar.getDurationMinutes('15:00', '16:00'), 60);
  assert.equal(Calendar.formatCurrency(1800), '1 800 ₽');
  assert.equal(Calendar.formatCurrency(0), '0 ₽');
});

test('isLessonInPast and autoCompletePastLessons automatically mark past planned lessons as completed', () => {
  const now = new Date(2026, 9, 28, 16, 30, 0); // Oct 28, 2026, 16:30 local

  assert.equal(Calendar.isLessonInPast('2026-10-27', '18:00', now), true);
  assert.equal(Calendar.isLessonInPast('2026-10-28', '16:00', now), true);
  assert.equal(Calendar.isLessonInPast('2026-10-28', '17:00', now), false);
  assert.equal(Calendar.isLessonInPast('2026-10-29', '10:00', now), false);

  const lessons = [
    {
      id: 'past_planned',
      studentId: 's1',
      date: '2026-10-27',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'planned',
      price: 1800,
      isPaid: false,
    },
    {
      id: 'past_cancelled',
      studentId: 's1',
      date: '2026-10-27',
      startTime: '17:00',
      endTime: '18:00',
      subject: 'eng',
      status: 'cancelled',
      price: 1800,
      isPaid: false,
    },
    {
      id: 'future_planned',
      studentId: 's1',
      date: '2026-10-29',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'planned',
      price: 1800,
      isPaid: false,
    },
  ];

  const autoRes = Calendar.autoCompletePastLessons(lessons, now);
  assert.equal(autoRes.updatedCount, 1);
  assert.equal(autoRes.lessons[0].status, 'completed');
  assert.equal(autoRes.lessons[1].status, 'cancelled');
  assert.equal(autoRes.lessons[2].status, 'planned');
});

test('calculateWeeklyStats counts paid sums and ONLY counts past/completed lessons in unpaid debt', () => {
  const now = new Date(2026, 9, 27, 14, 0, 0); // Tue Oct 27, 2026, 14:00

  const sampleLessons = [
    {
      id: '1_paid_past',
      studentId: 's1',
      date: '2026-10-26',
      startTime: '10:00',
      endTime: '11:00',
      subject: 'eng',
      status: 'completed',
      price: 1800,
      isPaid: true,
    },
    {
      id: '2_unpaid_past',
      studentId: 's2',
      date: '2026-10-27',
      startTime: '12:00',
      endTime: '13:00',
      subject: 'rus',
      status: 'planned', // ended at 13:00 before 14:00 now -> past!
      price: 1600,
      isPaid: false,
    },
    {
      id: '3_unpaid_future',
      studentId: 's1',
      date: '2026-10-29',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'planned', // future lesson -> must NOT be counted as unpaid!
      price: 1800,
      isPaid: false,
    },
    {
      id: '4_cancelled',
      studentId: 's1',
      date: '2026-10-28',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'cancelled',
      price: 1800,
      isPaid: false,
    },
  ];

  const stats = Calendar.calculateWeeklyStats(sampleLessons, '2026-10-26', 'all', now);
  assert.equal(stats.totalActiveLessons, 3);
  assert.equal(stats.engLessons, 2);
  assert.equal(stats.rusLessons, 1);
  assert.equal(stats.cancelledLessons, 1);
  assert.equal(stats.paidLessonsCount, 1);
  assert.equal(stats.paidAmount, 1800);
  // Only lesson #2 is unpaid in the past; lesson #3 is in the future and excluded from unpaid debt
  assert.equal(stats.unpaidLessonsCount, 1);
  assert.equal(stats.unpaidAmount, 1600);
});

test('buildStudentStatsMap aggregates per-student stats in a single pass O(N) and excludes future unpaid lessons', () => {
  const now = new Date(2026, 9, 27, 14, 0, 0);
  const lessons = [
    {
      id: 'l1',
      studentId: 'stu_1',
      date: '2026-10-26',
      startTime: '15:00',
      endTime: '16:00',
      status: 'completed',
      price: 1800,
      isPaid: false,
    },
    {
      id: 'l2',
      studentId: 'stu_1',
      date: '2026-10-30',
      startTime: '15:00',
      endTime: '16:00',
      status: 'planned',
      price: 1800,
      isPaid: false,
    },
  ];

  const map = Calendar.buildStudentStatsMap(lessons, now);
  assert.equal(map.stu_1.totalCount, 2);
  assert.equal(map.stu_1.completedCount, 1);
  assert.equal(map.stu_1.unpaidPastCount, 1);
  assert.equal(map.stu_1.unpaidPastAmount, 1800);
});

test('calculateDayWorkload computes lesson count, time range, and total hours for compact day header', () => {
  const dayLessons = [
    {
      id: 'a',
      date: '2026-10-26',
      startTime: '15:00',
      endTime: '16:00',
      status: 'completed',
    },
    {
      id: 'b',
      date: '2026-10-26',
      startTime: '17:00',
      endTime: '18:30',
      status: 'planned',
    },
    {
      id: 'c',
      date: '2026-10-26',
      startTime: '19:00',
      endTime: '20:00',
      status: 'cancelled',
    },
  ];

  const workload = Calendar.calculateDayWorkload(dayLessons);
  assert.equal(workload.count, 2);
  assert.equal(workload.firstStart, '15:00');
  assert.equal(workload.lastEnd, '18:30');
  assert.equal(workload.totalMinutes, 150);
  assert.equal(workload.durationLabel, '2.5 ч');
});

test('resolveActiveTeacherNote returns active teacher note across subsequent lessons until disabled', () => {
  const students = [
    {
      id: 's1',
      name: 'Алина Соколова',
      defaultSubject: 'eng',
      notes: '',
      teacherNote: 'Повторить фразовые глаголы и артикли',
      teacherNoteActive: true,
    },
    {
      id: 's2',
      name: 'Максим Морозов',
      defaultSubject: 'rus',
      notes: '',
      teacherNote: 'Старая заметка',
      teacherNoteActive: false,
    },
  ];

  const activeNote = Calendar.resolveActiveTeacherNote(students, [], 's1', '2026-11-05');
  assert.equal(activeNote.active, true);
  assert.equal(activeNote.text, 'Повторить фразовые глаголы и артикли');

  const disabledNote = Calendar.resolveActiveTeacherNote(students, [], 's2', '2026-11-05');
  assert.equal(disabledNote.active, false);
  assert.equal(disabledNote.text, '');
});

test('serializeDatabaseBackup and parseDatabaseBackupJSON preserve defaultPrice, color, and lesson price', () => {
  const students = [
    {
      id: 'stu_1',
      name: 'Иван Петров',
      defaultSubject: 'eng',
      defaultPrice: 2000,
      color: '#ec4899',
      notes: 'B1',
      teacherNote: 'Заметка учителю',
      teacherNoteActive: true,
    },
  ];
  const lessons = [
    {
      id: 'les_1',
      studentId: 'stu_1',
      date: '2026-10-27',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'planned',
      price: 2000,
      classwork: 'Grammar',
      homework: 'Ex 1',
      hwChecked: false,
      isPaid: true,
      paymentNote: 'Оплачено',
      teacherNote: 'Заметка учителю',
      teacherNoteActive: true,
    },
  ];

  const json = Store.serializeDatabaseBackup(students, lessons);
  const parsed = Store.parseDatabaseBackupJSON(json);
  assert.equal(parsed.students.length, 1);
  assert.equal(parsed.students[0].defaultPrice, 2000);
  assert.equal(parsed.students[0].color, '#ec4899');
  assert.equal(parsed.lessons.length, 1);
  assert.equal(parsed.lessons[0].price, 2000);
  assert.equal(parsed.lessons[0].isPaid, true);
});

test('Rule A: propagateLessonToMonthEnd clones planned lessons until end of month with price and no duplicates', () => {
  const now = new Date(2026, 9, 1, 10, 0, 0); // Oct 1, 2026
  const students = [
    {
      id: 'stu_1',
      name: 'Алина Соколова',
      defaultSubject: 'eng',
      defaultPrice: 1800,
      color: '#3b82f6',
      notes: '',
      teacherNote: 'Проверять артикли',
      teacherNoteActive: true,
    },
  ];
  const baseLesson = {
    id: 'les_base',
    studentId: 'stu_1',
    date: '2026-10-05',
    startTime: '15:00',
    endTime: '16:00',
    subject: 'eng',
    status: 'planned',
    price: 1800,
    classwork: 'Intro topic',
    homework: 'HW 1',
    hwChecked: false,
    isPaid: true,
    paymentNote: 'Оплачен первый урок',
    teacherNote: 'Проверять артикли',
    teacherNoteActive: true,
    repeatWeekly: true,
  };

  const firstRun = Calendar.propagateLessonToMonthEnd(
    [baseLesson],
    baseLesson,
    students,
    undefined,
    now
  );
  assert.equal(firstRun.createdClones.length, 3);
  assert.equal(firstRun.lessons.length, 4);

  for (const clone of firstRun.createdClones) {
    assert.equal(clone.classwork, '');
    assert.equal(clone.homework, '');
    assert.equal(clone.paymentNote, '');
    assert.equal(clone.isPaid, false);
    assert.equal(clone.price, 1800);
    assert.equal(clone.status, 'planned');
    assert.equal(clone.teacherNote, 'Проверять артикли');
    assert.equal(clone.autoGenerated, true);
  }

  const secondRun = Calendar.propagateLessonToMonthEnd(
    firstRun.lessons,
    baseLesson,
    students,
    undefined,
    now
  );
  assert.equal(secondRun.createdClones.length, 0);
  assert.equal(secondRun.lessons.length, 4);
});

test('Rule B: autoRolloverToNextMonth generates full next-month schedule on last day of month and is idempotent', () => {
  const students = [
    {
      id: 'stu_1',
      name: 'Алина Соколова',
      defaultSubject: 'eng',
      defaultPrice: 1800,
      color: '#3b82f6',
      notes: '',
      teacherNote: 'Тайминг эссе',
      teacherNoteActive: true,
    },
  ];
  const octLessons = [
    {
      id: 'oct_mon',
      studentId: 'stu_1',
      date: '2026-10-26',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'completed',
      price: 1800,
      classwork: 'Done',
      homework: 'HW',
      hwChecked: true,
      isPaid: true,
      paymentNote: 'Paid',
      teacherNote: 'Тайминг эссе',
      teacherNoteActive: true,
      repeatWeekly: true,
    },
  ];

  const rollover = Calendar.autoRolloverToNextMonth(
    octLessons,
    students,
    '2026-10-31',
    ''
  );
  assert.equal(rollover.triggered, true);
  assert.equal(rollover.targetMonthKey, '2026-11');
  assert.equal(rollover.createdLessons.length, 5);
  assert.equal(rollover.createdLessons[0].price, 1800);
  assert.deepEqual(
    rollover.createdLessons.map((l: { date: string }) => l.date),
    ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']
  );

  const repeatCall = Calendar.autoRolloverToNextMonth(
    rollover.lessons,
    students,
    '2026-10-31',
    '2026-11'
  );
  assert.equal(repeatCall.triggered, false);
  assert.equal(repeatCall.createdLessons.length, 0);
});
