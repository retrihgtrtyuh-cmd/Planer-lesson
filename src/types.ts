export type Subject = 'eng' | 'rus';

export type LessonStatus = 'planned' | 'completed' | 'cancelled' | 'rescheduled';

export type SubjectFilter = 'all' | 'eng' | 'rus';

export interface Student {
  id: string;
  name: string;
  defaultSubject: Subject;
  defaultPrice: number;
  notes: string;
}

export interface Lesson {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  subject: Subject;
  status: LessonStatus;
  classwork: string;
  homework: string;
  hwChecked: boolean;
  price: number;
  isPaid: boolean;
  paymentNote: string;
}

export interface WeekDayInfo {
  date: string; // YYYY-MM-DD
  dayNameShort: string; // Пн, Вт...
  dayNameFull: string; // Понедельник...
  dayNumber: number; // 1..31
  monthShort: string; // янв, фев...
  isToday: boolean;
}

export interface WeeklyDashboardStats {
  totalActiveLessons: number;
  engLessons: number;
  rusLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  paidAmount: number;
  unpaidAmount: number;
  totalExpectedAmount: number;
}

export interface AutoTransferResult {
  createdLessons: Lesson[];
  skippedCancelled: number;
  skippedDuplicates: number;
  sourceWeekRange: string;
  targetWeekRange: string;
}

export interface PlannerDatabaseBackup {
  version: number;
  exportedAt: string;
  students: Student[];
  lessons: Lesson[];
}
