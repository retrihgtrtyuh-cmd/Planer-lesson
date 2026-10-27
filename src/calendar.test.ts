import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDaysISO,
  buildAutoTransferredLessons,
  calculateWeeklyStats,
  filterLessons,
  findPreviousStudentLesson,
  formatWeekRange,
  getMondayOfWeek,
  getWeekDays,
} from './calendar';
import { parseDatabaseBackupJSON, serializeDatabaseBackup } from './store';
import { Lesson, Student } from './types';

test('getMondayOfWeek returns Monday for any day of week (including Sunday)', () => {
  // 2026-10-27 is a Tuesday -> Monday is 2026-10-26
  assert.equal(getMondayOfWeek('2026-10-27'), '2026-10-26');
  // 2026-11-01 is a Sunday -> Monday of that week is 2026-10-26
  assert.equal(getMondayOfWeek('2026-11-01'), '2026-10-26');
  // 2026-10-26 is already Monday
  assert.equal(getMondayOfWeek('2026-10-26'), '2026-10-26');
});

test('getWeekDays builds 7 days Mon-Sun and highlights today accurately', () => {
  const days = getWeekDays('2026-10-26', '2026-10-27');
  assert.equal(days.length, 7);
  assert.equal(days[0].date, '2026-10-26');
  assert.equal(days[0].dayNameShort, 'Пн');
  assert.equal(days[1].date, '2026-10-27');
  assert.equal(days[1].isToday, true);
  assert.equal(days[6].date, '2026-11-01');
  assert.equal(days[6].dayNameShort, 'Вс');
});

test('formatWeekRange formats cross-month and same-month ranges in Russian', () => {
  assert.equal(formatWeekRange('2026-10-26'), '26 окт – 1 ноя 2026');
  assert.equal(formatWeekRange('2026-10-19'), '19 – 25 окт 2026');
});

test('calculateWeeklyStats excludes cancelled lessons and sums paid/unpaid accurately', () => {
  const sampleLessons: Lesson[] = [
    {
      id: '1',
      studentId: 's1',
      date: '2026-10-26',
      startTime: '10:00',
      endTime: '11:00',
      subject: 'eng',
      status: 'completed',
      classwork: 'CW',
      homework: 'HW',
      hwChecked: true,
      price: 2500,
      isPaid: true,
      paymentNote: '',
    },
    {
      id: '2',
      studentId: 's2',
      date: '2026-10-27',
      startTime: '12:00',
      endTime: '13:00',
      subject: 'rus',
      status: 'planned',
      classwork: '',
      homework: '',
      hwChecked: false,
      price: 2000,
      isPaid: false,
      paymentNote: '',
    },
    {
      id: '3',
      studentId: 's1',
      date: '2026-10-28',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'cancelled',
      classwork: '',
      homework: '',
      hwChecked: false,
      price: 2500,
      isPaid: false,
      paymentNote: '',
    },
  ];

  const stats = calculateWeeklyStats(sampleLessons, '2026-10-26', 'all');
  assert.equal(stats.totalActiveLessons, 2);
  assert.equal(stats.engLessons, 1);
  assert.equal(stats.rusLessons, 1);
  assert.equal(stats.cancelledLessons, 1);
  assert.equal(stats.paidAmount, 2500);
  assert.equal(stats.unpaidAmount, 2000);
});

test('findPreviousStudentLesson finds the latest prior completed lesson for the student', () => {
  const lessons: Lesson[] = [
    {
      id: 'old1',
      studentId: 's1',
      date: '2026-10-15',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'completed',
      classwork: 'Old topic',
      homework: 'Old HW 1',
      hwChecked: true,
      price: 2000,
      isPaid: true,
      paymentNote: '',
    },
    {
      id: 'old2',
      studentId: 's1',
      date: '2026-10-22',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'completed',
      classwork: 'Recent topic',
      homework: 'Recent HW 2',
      hwChecked: false,
      price: 2000,
      isPaid: true,
      paymentNote: '',
    },
    {
      id: 'cancelled_later',
      studentId: 's1',
      date: '2026-10-25',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'cancelled',
      classwork: '',
      homework: 'Should be ignored',
      hwChecked: false,
      price: 2000,
      isPaid: false,
      paymentNote: '',
    },
  ];

  const prev = findPreviousStudentLesson(lessons, 's1', '2026-10-27');
  assert.ok(prev);
  assert.equal(prev.id, 'old2');
  assert.equal(prev.homework, 'Recent HW 2');
});

test('buildAutoTransferredLessons copies non-cancelled lessons, resets fields, and skips duplicates', () => {
  const sourceMonday = '2026-10-19';
  const targetMonday = addDaysISO(sourceMonday, 7); // 2026-10-26

  const lessons: Lesson[] = [
    {
      id: 'src1',
      studentId: 's1',
      date: '2026-10-19', // Monday
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'completed',
      classwork: 'Past CW',
      homework: 'Past HW',
      hwChecked: true,
      price: 2500,
      isPaid: true,
      paymentNote: 'Paid via card',
    },
    {
      id: 'src2_cancelled',
      studentId: 's2',
      date: '2026-10-20', // Tuesday
      startTime: '17:00',
      endTime: '18:00',
      subject: 'rus',
      status: 'cancelled',
      classwork: 'Cancelled',
      homework: 'None',
      hwChecked: false,
      price: 2000,
      isPaid: false,
      paymentNote: '',
    },
    {
      id: 'src3_dup',
      studentId: 's1',
      date: '2026-10-21', // Wednesday
      startTime: '14:00',
      endTime: '15:00',
      subject: 'eng',
      status: 'completed',
      classwork: 'CW',
      homework: 'HW',
      hwChecked: true,
      price: 2500,
      isPaid: true,
      paymentNote: '',
    },
    // Existing lesson on target Wednesday 2026-10-28 at 14:00
    {
      id: 'existing_target',
      studentId: 's2',
      date: '2026-10-28',
      startTime: '14:00',
      endTime: '15:00',
      subject: 'rus',
      status: 'planned',
      classwork: '',
      homework: '',
      hwChecked: false,
      price: 2200,
      isPaid: false,
      paymentNote: '',
    },
  ];

  const result = buildAutoTransferredLessons(lessons, sourceMonday, targetMonday);
  assert.equal(result.createdLessons.length, 1);
  assert.equal(result.skippedCancelled, 1);
  assert.equal(result.skippedDuplicates, 1);

  const copied = result.createdLessons[0];
  assert.equal(copied.date, '2026-10-26');
  assert.equal(copied.studentId, 's1');
  assert.equal(copied.startTime, '15:00');
  assert.equal(copied.endTime, '16:00');
  assert.equal(copied.subject, 'eng');
  assert.equal(copied.price, 2500);
  assert.equal(copied.status, 'planned');
  assert.equal(copied.classwork, '');
  assert.equal(copied.homework, '');
  assert.equal(copied.paymentNote, '');
  assert.equal(copied.hwChecked, false);
  assert.equal(copied.isPaid, false);
});

test('filterLessons filters by exactDate and subjectFilter', () => {
  const lessons: Lesson[] = [
    {
      id: 'l1',
      studentId: 's1',
      date: '2026-10-26',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'planned',
      classwork: '',
      homework: '',
      hwChecked: false,
      price: 2500,
      isPaid: false,
      paymentNote: '',
    },
    {
      id: 'l2',
      studentId: 's2',
      date: '2026-10-27',
      startTime: '16:00',
      endTime: '17:00',
      subject: 'rus',
      status: 'planned',
      classwork: '',
      homework: '',
      hwChecked: false,
      price: 2200,
      isPaid: false,
      paymentNote: '',
    },
  ];

  const onlyRus = filterLessons(lessons, { weekMondayISO: '2026-10-26', subjectFilter: 'rus' });
  assert.equal(onlyRus.length, 1);
  assert.equal(onlyRus[0].id, 'l2');

  const onlyOct26 = filterLessons(lessons, { exactDate: '2026-10-26', subjectFilter: 'all' });
  assert.equal(onlyOct26.length, 1);
  assert.equal(onlyOct26[0].id, 'l1');
});

test('serializeDatabaseBackup and parseDatabaseBackupJSON roundtrip cleanly', () => {
  const students: Student[] = [
    { id: 'stu_1', name: 'Иван Петров', defaultSubject: 'eng', defaultPrice: 2000, notes: 'B1' },
  ];
  const lessons: Lesson[] = [
    {
      id: 'les_1',
      studentId: 'stu_1',
      date: '2026-10-27',
      startTime: '15:00',
      endTime: '16:00',
      subject: 'eng',
      status: 'planned',
      classwork: 'Grammar',
      homework: 'Ex 1',
      hwChecked: false,
      price: 2000,
      isPaid: true,
      paymentNote: 'Paid',
    },
  ];

  const json = serializeDatabaseBackup(students, lessons);
  const parsed = parseDatabaseBackupJSON(json);
  assert.equal(parsed.students.length, 1);
  assert.equal(parsed.students[0].name, 'Иван Петров');
  assert.equal(parsed.lessons.length, 1);
  assert.equal(parsed.lessons[0].classwork, 'Grammar');
});
