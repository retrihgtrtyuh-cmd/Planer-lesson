import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  History,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { Lesson, LessonStatus, Student, Subject } from '../types';
import { findPreviousStudentLesson, formatRussianDate } from '../calendar';

interface LessonModalProps {
  isOpen: boolean;
  initialLesson: Lesson | null;
  defaultDate: string;
  students: Student[];
  allLessons: Lesson[];
  onClose: () => void;
  onSaveLesson: (lessonData: Omit<Lesson, 'id'> & { id?: string }) => void;
  onDeleteLesson: (lessonId: string) => void;
  onQuickCreateStudent: (studentData: Omit<Student, 'id'>) => Student;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  initialLesson,
  defaultDate,
  students,
  allLessons,
  onClose,
  onSaveLesson,
  onDeleteLesson,
  onQuickCreateStudent,
}) => {
  const [studentId, setStudentId] = useState<string>('');
  const [date, setDate] = useState<string>(defaultDate);
  const [startTime, setStartTime] = useState<string>('15:00');
  const [endTime, setEndTime] = useState<string>('16:00');
  const [subject, setSubject] = useState<Subject>('eng');
  const [status, setStatus] = useState<LessonStatus>('planned');
  const [classwork, setClasswork] = useState<string>('');
  const [homework, setHomework] = useState<string>('');
  const [hwChecked, setHwChecked] = useState<boolean>(false);
  const [price, setPrice] = useState<number>(2000);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  // Quick create student state
  const [isAddingStudent, setIsAddingStudent] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentSubject, setNewStudentSubject] = useState<Subject>('eng');
  const [newStudentPrice, setNewStudentPrice] = useState<number>(2200);
  const [newStudentNotes, setNewStudentNotes] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setConfirmDelete(false);
    setIsAddingStudent(false);

    if (initialLesson) {
      setStudentId(initialLesson.studentId);
      setDate(initialLesson.date);
      setStartTime(initialLesson.startTime);
      setEndTime(initialLesson.endTime);
      setSubject(initialLesson.subject);
      setStatus(initialLesson.status);
      setClasswork(initialLesson.classwork);
      setHomework(initialLesson.homework);
      setHwChecked(initialLesson.hwChecked);
      setPrice(initialLesson.price);
      setIsPaid(initialLesson.isPaid);
      setPaymentNote(initialLesson.paymentNote);
    } else {
      const firstStudent = students[0];
      setStudentId(firstStudent ? firstStudent.id : '');
      setDate(defaultDate);
      setStartTime('15:00');
      setEndTime('16:00');
      setSubject(firstStudent ? firstStudent.defaultSubject : 'eng');
      setStatus('planned');
      setClasswork('');
      setHomework('');
      setHwChecked(false);
      setPrice(firstStudent ? firstStudent.defaultPrice : 2000);
      setIsPaid(false);
      setPaymentNote('');
    }
  }, [isOpen, initialLesson, defaultDate, students]);

  if (!isOpen) return null;

  const handleStudentChange = (selectedId: string) => {
    setStudentId(selectedId);
    const found = students.find((s) => s.id === selectedId);
    if (found && !initialLesson) {
      setSubject(found.defaultSubject);
      setPrice(found.defaultPrice);
    } else if (found && initialLesson && selectedId !== initialLesson.studentId) {
      setSubject(found.defaultSubject);
      setPrice(found.defaultPrice);
    }
  };

  const handleCreateQuickStudent = () => {
    if (!newStudentName.trim()) {
      setFormError('Введите имя нового ученика.');
      return;
    }
    const created = onQuickCreateStudent({
      name: newStudentName.trim(),
      defaultSubject: newStudentSubject,
      defaultPrice: Number(newStudentPrice) || 0,
      notes: newStudentNotes.trim(),
    });
    setStudentId(created.id);
    setSubject(created.defaultSubject);
    setPrice(created.defaultPrice);
    setNewStudentName('');
    setNewStudentNotes('');
    setIsAddingStudent(false);
    setFormError('');
  };

  const previousLesson = findPreviousStudentLesson(
    allLessons,
    studentId,
    date,
    initialLesson?.id
  );

  const selectedStudent = students.find((s) => s.id === studentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setFormError('Пожалуйста, выберите или создайте ученика.');
      return;
    }
    if (!date) {
      setFormError('Укажите дату урока.');
      return;
    }
    if (!startTime || !endTime) {
      setFormError('Укажите время начала и окончания урока.');
      return;
    }

    onSaveLesson({
      id: initialLesson?.id,
      studentId,
      date,
      startTime,
      endTime,
      subject,
      status,
      classwork: classwork.trim(),
      homework: homework.trim(),
      hwChecked,
      price: Number(price) || 0,
      isPaid,
      paymentNote: paymentNote.trim(),
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="lesson-modal-title" className="text-lg font-bold text-slate-900">
              {initialLesson ? 'Редактирование урока' : 'Новое занятие'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {date ? formatRussianDate(date) : 'Выберите дату и параметры занятия'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            {/* Student Selector + Quick Add */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="lesson-student" className="text-xs font-semibold text-slate-700">
                  Ученик
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingStudent((prev) => !prev)}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingStudent ? 'Отменить создание' : '+ Быстро создать ученика'}</span>
                </button>
              </div>

              {!isAddingStudent ? (
                <div className="space-y-1">
                  <select
                    id="lesson-student"
                    value={studentId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {students.length === 0 && <option value="">Нет учеников в базе</option>}
                    {students.map((stu) => (
                      <option key={stu.id} value={stu.id}>
                        {stu.name} ({stu.defaultSubject === 'eng' ? 'Английский' : 'Русский'} ·{' '}
                        {stu.defaultPrice} ₽)
                      </option>
                    ))}
                  </select>
                  {selectedStudent?.notes && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      Заметка: {selectedStudent.notes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="text-xs font-semibold text-slate-800">
                    Новый ученик (сохранится в справочник)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-1">
                      <label htmlFor="quick-student-name" className="block text-[11px] text-slate-600 mb-1">
                        Имя ученика *
                      </label>
                      <input
                        id="quick-student-name"
                        type="text"
                        placeholder="Например, Мария Иванова"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="quick-student-subject" className="block text-[11px] text-slate-600 mb-1">
                        Предмет по умолчанию
                      </label>
                      <select
                        id="quick-student-subject"
                        value={newStudentSubject}
                        onChange={(e) => setNewStudentSubject(e.target.value as Subject)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      >
                        <option value="eng">🇬🇧 Английский (ENG)</option>
                        <option value="rus">🇷🇺 Русский (RUS)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="quick-student-price" className="block text-[11px] text-slate-600 mb-1">
                        Базовая ставка (₽)
                      </label>
                      <input
                        id="quick-student-price"
                        type="number"
                        min={0}
                        step={100}
                        value={newStudentPrice}
                        onChange={(e) => setNewStudentPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="quick-student-notes" className="block text-[11px] text-slate-600 mb-1">
                      Заметка (уровень, цели, учебник)
                    </label>
                    <input
                      id="quick-student-notes"
                      type="text"
                      placeholder="Например: B1, подготовка к ОГЭ, Outcomes"
                      value={newStudentNotes}
                      onChange={(e) => setNewStudentNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStudent(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateQuickStudent}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Добавить и выбрать</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Date, Start/End Time, Subject, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="lesson-date" className="block text-xs font-semibold text-slate-700 mb-1">
                  Дата урока
                </label>
                <input
                  id="lesson-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label htmlFor="lesson-start-time" className="block text-xs font-semibold text-slate-700 mb-1">
                  Время начала
                </label>
                <input
                  id="lesson-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label htmlFor="lesson-end-time" className="block text-xs font-semibold text-slate-700 mb-1">
                  Время окончания
                </label>
                <input
                  id="lesson-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="lesson-subject" className="block text-xs font-semibold text-slate-700 mb-1">
                  Предмет
                </label>
                <select
                  id="lesson-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="eng">🇬🇧 Английский язык (ENG)</option>
                  <option value="rus">🇷🇺 Русский язык (RUS)</option>
                </select>
              </div>

              <div>
                <label htmlFor="lesson-status" className="block text-xs font-semibold text-slate-700 mb-1">
                  Статус урока
                </label>
                <select
                  id="lesson-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LessonStatus)}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="planned">Запланирован</option>
                  <option value="completed">Проведен</option>
                  <option value="cancelled">Отменен</option>
                  <option value="rescheduled">Перенесен</option>
                </select>
              </div>
            </div>

            {/* Smart Hint: ДЗ с прошлого урока */}
            <div
              data-testid="smart-previous-hw-banner"
              className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                <span className="inline-flex items-center gap-1.5">
                  <History className="w-4 h-4 text-amber-700" />
                  <span>ДЗ с прошлого урока (умная подсказка)</span>
                </span>
                {previousLesson && (
                  <span className="font-mono-tabular text-amber-800">
                    Урок от {formatRussianDate(previousLesson.date, false)}
                  </span>
                )}
              </div>
              {previousLesson ? (
                <div className="text-xs text-amber-950 space-y-0.5">
                  {previousLesson.homework ? (
                    <p className="leading-relaxed">
                      <strong>Задано:</strong> {previousLesson.homework}
                    </p>
                  ) : (
                    <p className="text-amber-800 italic">
                      На прошлом уроке домашнее задание не было записано.
                    </p>
                  )}
                  {previousLesson.classwork && (
                    <p className="text-[11px] text-amber-800">
                      Прошлая тема: {previousLesson.classwork}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-800">
                  Предыдущих проведенных уроков у этого ученика до выбранной даты не найдено.
                </p>
              )}
            </div>

            {/* Classwork (CW) */}
            <div>
              <label
                htmlFor="lesson-classwork"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Классная работа (CW) / Тема урока</span>
              </label>
              <textarea
                id="lesson-classwork"
                rows={2}
                value={classwork}
                onChange={(e) => setClasswork(e.target.value)}
                placeholder="Что разбирали на занятии: темы, упражнения, результаты..."
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Homework (HW) + Checkbox */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="lesson-homework"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Домашнее задание (HW) на следующий раз</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hwChecked}
                    onChange={(e) => setHwChecked(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>ДЗ выполнено / проверено</span>
                </label>
              </div>
              <textarea
                id="lesson-homework"
                rows={2}
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="Укажите страницы учебника, упражнения или тему эссе..."
                className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Payment Block */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                  <span>Оплата занятия</span>
                </span>

                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  <span className={isPaid ? 'text-emerald-700' : 'text-rose-600'}>
                    {isPaid ? 'Оплачено' : 'Не оплачено'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="lesson-price" className="block text-[11px] text-slate-600 mb-1">
                    Стоимость урока (₽)
                  </label>
                  <input
                    id="lesson-price"
                    type="number"
                    min={0}
                    step={100}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label htmlFor="lesson-payment-note" className="block text-[11px] text-slate-600 mb-1">
                    Примечание к оплате
                  </label>
                  <input
                    id="lesson-payment-note"
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Например: Абонемент, перевод СБП..."
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Sticky Footer Actions */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              {initialLesson && (
                <>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Удалить урок</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <span className="text-xs text-rose-700 font-medium">Удалить запись?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteLesson(initialLesson.id);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer"
                      >
                        Да, удалить
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-2 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Сохранить</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
