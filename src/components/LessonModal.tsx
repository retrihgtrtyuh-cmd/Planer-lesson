import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
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
      className="modal-backdrop"
    >
      <div className="modal-window">
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 id="lesson-modal-title" className="modal-title">
              {initialLesson ? 'Редактирование урока' : 'Новое занятие'}
            </h2>
            <p className="modal-subtitle">
              {date ? formatRussianDate(date) : 'Выберите дату и параметры занятия'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="modal-close-btn"
          >
            <X className="icon-svg" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            {formError && <div className="error-alert-box">{formError}</div>}

            {/* Student Selector + Quick Add */}
            <div>
              <div className="modal-row-between">
                <label htmlFor="lesson-student" className="field-label">
                  Ученик
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingStudent((prev) => !prev)}
                  className="btn-link-primary"
                >
                  <UserPlus className="icon-sm" />
                  <span>{isAddingStudent ? 'Отменить создание' : '+ Быстро создать ученика'}</span>
                </button>
              </div>

              {!isAddingStudent ? (
                <div>
                  <select
                    id="lesson-student"
                    value={studentId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    className="field-select"
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
                    <p className="student-notes">Заметка: {selectedStudent.notes}</p>
                  )}
                </div>
              ) : (
                <div className="subpanel-box">
                  <div className="field-label">Новый ученик (сохранится в справочник)</div>
                  <div className="form-row-3">
                    <div>
                      <label htmlFor="quick-student-name" className="field-label">
                        Имя ученика *
                      </label>
                      <input
                        id="quick-student-name"
                        type="text"
                        placeholder="Например, Мария Иванова"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="field-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="quick-student-subject" className="field-label">
                        Предмет по умолчанию
                      </label>
                      <select
                        id="quick-student-subject"
                        value={newStudentSubject}
                        onChange={(e) => setNewStudentSubject(e.target.value as Subject)}
                        className="field-select"
                      >
                        <option value="eng">🇬🇧 Английский (ENG)</option>
                        <option value="rus">🇷🇺 Русский (RUS)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="quick-student-price" className="field-label">
                        Базовая ставка (₽)
                      </label>
                      <input
                        id="quick-student-price"
                        type="number"
                        min={0}
                        step={100}
                        value={newStudentPrice}
                        onChange={(e) => setNewStudentPrice(Number(e.target.value))}
                        className="field-input font-mono-tabular"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="quick-student-notes" className="field-label">
                      Заметка (уровень, цели, учебник)
                    </label>
                    <input
                      id="quick-student-notes"
                      type="text"
                      placeholder="Например: B1, подготовка к ОГЭ, Outcomes"
                      value={newStudentNotes}
                      onChange={(e) => setNewStudentNotes(e.target.value)}
                      className="field-input"
                    />
                  </div>
                  <div className="modal-actions-group">
                    <button
                      type="button"
                      onClick={() => setIsAddingStudent(false)}
                      className="btn-secondary"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateQuickStudent}
                      className="btn-primary"
                    >
                      <Plus className="icon-sm" />
                      <span>Добавить и выбрать</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Date, Start/End Time */}
            <div className="form-row-3">
              <div>
                <label htmlFor="lesson-date" className="field-label">
                  Дата урока
                </label>
                <input
                  id="lesson-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="field-input font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="lesson-start-time" className="field-label">
                  Время начала
                </label>
                <input
                  id="lesson-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="field-input font-mono-tabular"
                />
              </div>

              <div>
                <label htmlFor="lesson-end-time" className="field-label">
                  Время окончания
                </label>
                <input
                  id="lesson-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="field-input font-mono-tabular"
                />
              </div>
            </div>

            <div className="form-row-2">
              <div>
                <label htmlFor="lesson-subject" className="field-label">
                  Предмет
                </label>
                <select
                  id="lesson-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  className="field-select"
                >
                  <option value="eng">🇬🇧 Английский язык (ENG)</option>
                  <option value="rus">🇷🇺 Русский язык (RUS)</option>
                </select>
              </div>

              <div>
                <label htmlFor="lesson-status" className="field-label">
                  Статус урока
                </label>
                <select
                  id="lesson-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LessonStatus)}
                  className="field-select"
                >
                  <option value="planned">Запланирован</option>
                  <option value="completed">Проведен</option>
                  <option value="cancelled">Отменен</option>
                  <option value="rescheduled">Перенесен</option>
                </select>
              </div>
            </div>

            {/* Smart Hint: ДЗ с прошлого урока */}
            <div data-testid="smart-previous-hw-banner" className="smart-hw-box">
              <div className="smart-hw-header">
                <span>ДЗ с прошлого урока (умная подсказка)</span>
                {previousLesson && (
                  <span className="font-mono-tabular">
                    Урок от {formatRussianDate(previousLesson.date, false)}
                  </span>
                )}
              </div>
              {previousLesson ? (
                <div>
                  {previousLesson.homework ? (
                    <p>
                      <strong>Задано:</strong> {previousLesson.homework}
                    </p>
                  ) : (
                    <p>На прошлом уроке домашнее задание не было записано.</p>
                  )}
                  {previousLesson.classwork && <p>Прошлая тема: {previousLesson.classwork}</p>}
                </div>
              ) : (
                <p>Предыдущих проведенных уроков у этого ученика до выбранной даты не найдено.</p>
              )}
            </div>

            {/* Classwork (CW) */}
            <div>
              <label htmlFor="lesson-classwork" className="field-label">
                Классная работа (CW) / Тема урока
              </label>
              <textarea
                id="lesson-classwork"
                rows={2}
                value={classwork}
                onChange={(e) => setClasswork(e.target.value)}
                placeholder="Что разбирали на занятии: темы, упражнения, результаты..."
                className="field-textarea"
              />
            </div>

            {/* Homework (HW) + Checkbox */}
            <div>
              <div className="modal-row-between">
                <label htmlFor="lesson-homework" className="field-label">
                  Домашнее задание (HW) на следующий раз
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={hwChecked}
                    onChange={(e) => setHwChecked(e.target.checked)}
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
                className="field-textarea"
              />
            </div>

            {/* Payment Block */}
            <div className="payment-box">
              <div className="modal-row-between">
                <strong className="field-label">Оплата занятия</strong>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                  />
                  <span className={isPaid ? 'text-paid' : 'text-unpaid'}>
                    {isPaid ? 'Оплачено' : 'Не оплачено'}
                  </span>
                </label>
              </div>

              <div className="form-row-2">
                <div>
                  <label htmlFor="lesson-price" className="field-label">
                    Стоимость урока (₽)
                  </label>
                  <input
                    id="lesson-price"
                    type="number"
                    min={0}
                    step={100}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="field-input font-mono-tabular"
                  />
                </div>

                <div>
                  <label htmlFor="lesson-payment-note" className="field-label">
                    Примечание к оплате
                  </label>
                  <input
                    id="lesson-payment-note"
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Например: Абонемент, перевод СБП..."
                    className="field-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Sticky Footer Actions */}
          <div className="modal-footer">
            <div>
              {initialLesson && (
                <>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="btn-danger-ghost"
                    >
                      <Trash2 className="icon-sm" />
                      <span>Удалить урок</span>
                    </button>
                  ) : (
                    <div className="delete-confirm-inline">
                      <span className="text-unpaid">Удалить запись?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteLesson(initialLesson.id);
                          onClose();
                        }}
                        className="btn-danger-solid"
                      >
                        Да, удалить
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="btn-link-muted"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-actions-group">
              <button type="button" onClick={onClose} className="btn-secondary">
                Отмена
              </button>
              <button type="submit" className="btn-primary">
                <CheckCircle2 className="icon-sm" />
                <span>Сохранить</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
