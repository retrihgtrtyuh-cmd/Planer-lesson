import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  History,
  Plus,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { Lesson, Student, Subject } from '../types';
import { formatRussianDate, sortLessonsChronologically } from '../calendar';
import { formatCurrencyRUB } from './DashboardStrip';

interface StudentsModalProps {
  isOpen: boolean;
  students: Student[];
  lessons: Lesson[];
  onClose: () => void;
  onSaveStudent: (student: Omit<Student, 'id'> & { id?: string }) => void;
  onDeleteStudent: (studentId: string) => void;
  onEditLessonFromHistory: (lesson: Lesson) => void;
}

const STATUS_NAMES: Record<Lesson['status'], string> = {
  planned: 'Запланирован',
  completed: 'Проведен',
  cancelled: 'Отменен',
  rescheduled: 'Перенесен',
};

export const StudentsModal: React.FC<StudentsModalProps> = ({
  isOpen,
  students,
  lessons,
  onClose,
  onSaveStudent,
  onDeleteStudent,
  onEditLessonFromHistory,
}) => {
  const [selectedHistoryStudentId, setSelectedHistoryStudentId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Student form fields
  const [name, setName] = useState<string>('');
  const [defaultSubject, setDefaultSubject] = useState<Subject>('eng');
  const [defaultPrice, setDefaultPrice] = useState<number>(2200);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const openAddForm = () => {
    setEditingStudent(null);
    setName('');
    setDefaultSubject('eng');
    setDefaultPrice(2200);
    setNotes('');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const openEditForm = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setDefaultSubject(student.defaultSubject);
    setDefaultPrice(student.defaultPrice);
    setNotes(student.notes);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Пожалуйста, укажите имя ученика.');
      return;
    }
    onSaveStudent({
      id: editingStudent?.id,
      name: name.trim(),
      defaultSubject,
      defaultPrice: Number(defaultPrice) || 0,
      notes: notes.trim(),
    });
    setIsFormOpen(false);
    setEditingStudent(null);
  };

  const historyStudent = students.find((s) => s.id === selectedHistoryStudentId) || null;
  const studentLessons = historyStudent
    ? sortLessonsChronologically(lessons.filter((l) => l.studentId === historyStudent.id)).reverse()
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="students-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {historyStudent && (
              <button
                type="button"
                onClick={() => setSelectedHistoryStudentId(null)}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                aria-label="Назад к списку учеников"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 id="students-modal-title" className="text-lg font-bold text-slate-900">
                {historyStudent
                  ? `История занятий: ${historyStudent.name}`
                  : 'База учеников и История'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {historyStudent
                  ? `Базовый предмет: ${
                      historyStudent.defaultSubject === 'eng' ? 'Английский (ENG)' : 'Русский (RUS)'
                    } · Ставка: ${historyStudent.defaultPrice} ₽`
                  : `Всего учеников в справочнике: ${students.length}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!historyStudent && !isFormOpen && (
              <button
                type="button"
                onClick={openAddForm}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить ученика</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть базу учеников"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* VIEW 1: Student Chronological Lesson History */}
          {historyStudent ? (
            <div className="space-y-4">
              {historyStudent.notes && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <strong>Профиль и цели ученика:</strong> {historyStudent.notes}
                </div>
              )}

              {/* Summary metrics for this student */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Всего записей</span>
                  <span className="text-base font-bold font-mono-tabular text-slate-900">
                    {studentLessons.length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Проведено уроков</span>
                  <span className="text-base font-bold font-mono-tabular text-slate-900">
                    {studentLessons.filter((l) => l.status === 'completed').length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Оплачено всего</span>
                  <span className="text-base font-bold font-mono-tabular text-emerald-700">
                    {formatCurrencyRUB(
                      studentLessons
                        .filter((l) => l.status !== 'cancelled' && l.isPaid)
                        .reduce((acc, l) => acc + (Number(l.price) || 0), 0)
                    )}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Ожидает оплаты</span>
                  <span className="text-base font-bold font-mono-tabular text-rose-600">
                    {formatCurrencyRUB(
                      studentLessons
                        .filter((l) => l.status !== 'cancelled' && !l.isPaid)
                        .reduce((acc, l) => acc + (Number(l.price) || 0), 0)
                    )}
                  </span>
                </div>
              </div>

              {studentLessons.length === 0 ? (
                <div className="p-8 text-center border border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-500">
                    У этого ученика пока нет запланированных или проведенных уроков.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Дата</th>
                        <th className="py-2.5 px-3">Время</th>
                        <th className="py-2.5 px-3">Предмет</th>
                        <th className="py-2.5 px-3">Статус</th>
                        <th className="py-2.5 px-3">Классная работа (CW)</th>
                        <th className="py-2.5 px-3">Домашнее задание (HW)</th>
                        <th className="py-2.5 px-3 text-right">Оплата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {studentLessons.map((lesson) => (
                        <tr
                          key={lesson.id}
                          onClick={() => {
                            onClose();
                            onEditLessonFromHistory(lesson);
                          }}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-3 font-mono-tabular whitespace-nowrap font-medium text-slate-900">
                            {formatRussianDate(lesson.date)}
                          </td>
                          <td className="py-3 px-3 font-mono-tabular whitespace-nowrap text-slate-600">
                            {lesson.startTime} – {lesson.endTime}
                          </td>
                          <td className="py-3 px-3 font-mono-tabular font-semibold">
                            <span
                              className={
                                lesson.subject === 'eng' ? 'text-blue-700' : 'text-emerald-700'
                              }
                            >
                              {lesson.subject === 'eng' ? 'ENG' : 'RUS'}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={
                                lesson.status === 'completed'
                                  ? 'text-emerald-700 font-medium'
                                  : lesson.status === 'cancelled'
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-700'
                              }
                            >
                              {STATUS_NAMES[lesson.status]}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 max-w-xs">
                            {lesson.classwork || <span className="text-slate-400">—</span>}
                          </td>
                          <td className="py-3 px-3 text-slate-700 max-w-xs">
                            {lesson.homework ? (
                              <div>
                                <span>{lesson.homework}</span>
                                {lesson.hwChecked && (
                                  <span className="block text-[11px] text-emerald-700 font-medium mt-0.5">
                                    ✓ Проверено
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular whitespace-nowrap">
                            {lesson.status === 'cancelled' ? (
                              <span className="text-slate-400">Отменен</span>
                            ) : (
                              <div>
                                <span
                                  className={`font-semibold ${
                                    lesson.isPaid ? 'text-emerald-700' : 'text-rose-600'
                                  }`}
                                >
                                  {lesson.price} ₽ · {lesson.isPaid ? 'Оплачено' : 'Не оплачено'}
                                </span>
                                {lesson.paymentNote && (
                                  <span className="block text-[11px] text-slate-500">
                                    {lesson.paymentNote}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: Directory of Students + Add/Edit Form */
            <div className="space-y-5">
              {isFormOpen && (
                <form
                  onSubmit={handleStudentSubmit}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingStudent ? 'Редактировать профиль ученика' : 'Новый ученик'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Скрыть форму
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="student-form-name" className="block text-xs font-semibold text-slate-700 mb-1">
                        Имя и фамилия *
                      </label>
                      <input
                        id="student-form-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Например, Дмитрий Смирнов"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="student-form-subject" className="block text-xs font-semibold text-slate-700 mb-1">
                        Предмет по умолчанию
                      </label>
                      <select
                        id="student-form-subject"
                        value={defaultSubject}
                        onChange={(e) => setDefaultSubject(e.target.value as Subject)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="eng">🇬🇧 Английский язык (ENG)</option>
                        <option value="rus">🇷🇺 Русский язык (RUS)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="student-form-price" className="block text-xs font-semibold text-slate-700 mb-1">
                        Базовая стоимость урока (₽)
                      </label>
                      <input
                        id="student-form-price"
                        type="number"
                        min={0}
                        step={100}
                        value={defaultPrice}
                        onChange={(e) => setDefaultPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="student-form-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                      Заметка об ученике (уровень, цели, учебник)
                    </label>
                    <textarea
                      id="student-form-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Уровень знаний, экзамен, используемые пособия, пожелания..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{editingStudent ? 'Сохранить изменения' : 'Создать ученика'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Students Cards / Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {students.map((stu) => {
                  const stuLessons = lessons.filter(
                    (l) => l.studentId === stu.id && l.status !== 'cancelled'
                  );
                  const unpaidCount = stuLessons.filter((l) => !l.isPaid).length;

                  return (
                    <div
                      key={stu.id}
                      data-testid={`student-row-${stu.id}`}
                      className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{stu.name}</h3>
                            <div className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                              <span
                                className={`font-semibold ${
                                  stu.defaultSubject === 'eng'
                                    ? 'text-blue-700'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {stu.defaultSubject === 'eng'
                                  ? '🇬🇧 Английский (ENG)'
                                  : '🇷🇺 Русский (RUS)'}
                              </span>
                              <span aria-hidden="true" className="mx-1.5">
                                ·
                              </span>
                              <span>Базовая ставка: {stu.defaultPrice} ₽</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditForm(stu)}
                              aria-label={`Редактировать ${stu.name}`}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {confirmDeleteId === stu.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteStudent(stu.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer"
                                >
                                  Удалить
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[11px] text-slate-500 cursor-pointer"
                                >
                                  Отмена
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(stu.id)}
                                aria-label={`Удалить ${stu.name}`}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {stu.notes && (
                          <p className="text-xs text-slate-600 leading-relaxed">{stu.notes}</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-500 font-mono-tabular">
                          Уроков: <strong className="text-slate-800">{stuLessons.length}</strong>
                          {unpaidCount > 0 && (
                            <>
                              <span aria-hidden="true" className="mx-1.5">
                                ·
                              </span>
                              <span className="text-rose-600 font-medium">
                                Не оплачено: {unpaidCount}
                              </span>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedHistoryStudentId(stu.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>История занятий</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
