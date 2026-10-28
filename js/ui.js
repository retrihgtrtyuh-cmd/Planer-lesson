(function (root) {
  'use strict';

  var STATUS_LABELS = {
    planned: 'Запланирован',
    completed: 'Проведен',
    cancelled: 'Отменен',
    rescheduled: 'Перенесен',
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDurationLabel(minutes) {
    if (minutes === 60) return '1 ч';
    if (minutes === 90) return '1.5 ч';
    if (minutes === 120) return '2 ч';
    return minutes + ' мин';
  }

  var ICONS = {
    clock:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    book:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    checkSquare:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    card:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    alert:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    plus:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit:
      '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    trash:
      '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    history:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
    refresh:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  };

  function renderColorPresetsHtml(selectedColor, targetInputId) {
    var Store = root.TutorPlanner.Store;
    var palette =
      Store && Array.isArray(Store.STUDENT_COLORS)
        ? Store.STUDENT_COLORS
        : ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f97316'];
    var activeHex = String(selectedColor || palette[0]).toLowerCase();
    var html = '';
    for (var i = 0; i < palette.length; i++) {
      var c = palette[i];
      var isAct = c.toLowerCase() === activeHex;
      html +=
        '<button type="button" class="color-preset-btn' +
        (isAct ? ' active' : '') +
        '" data-action="pick-student-color" data-color="' +
        escapeHtml(c) +
        '" data-target-input="' +
        escapeHtml(targetInputId) +
        '" style="background-color:' +
        escapeHtml(c) +
        ';" aria-label="Цвет ' +
        escapeHtml(c) +
        '"></button>';
    }
    return html;
  }

  function renderDashboard(state) {
    var Calendar = root.TutorPlanner.Calendar;
    var stats = Calendar.calculateWeeklyStats(
      state.lessons,
      state.currentMondayISO,
      state.subjectFilter
    );

    var totalEl = document.getElementById('dashboard-total-lessons');
    var engEl = document.getElementById('dashboard-eng-lessons');
    var rusEl = document.getElementById('dashboard-rus-lessons');
    var completedEl = document.getElementById('dashboard-completed-text');
    var paidEl = document.getElementById('dashboard-paid-amount');
    var unpaidEl = document.getElementById('dashboard-unpaid-amount');
    var activeFilterWrap = document.getElementById('dashboard-active-filter');
    var activeFilterLabel = document.getElementById('dashboard-filter-text');

    if (totalEl) totalEl.textContent = String(stats.totalActiveLessons);
    if (engEl) engEl.textContent = String(stats.engLessons);
    if (rusEl) rusEl.textContent = String(stats.rusLessons);

    if (completedEl) {
      var statusText =
        'Проведено: ' + stats.completedLessons + ' из ' + stats.totalActiveLessons;
      if (stats.cancelledLessons > 0) {
        statusText += ' · Отменено: ' + stats.cancelledLessons;
      }
      completedEl.textContent = statusText;
    }

    if (paidEl) {
      paidEl.textContent =
        'Оплачено уроков: ' +
        stats.paidLessonsCount +
        ' (' +
        Calendar.formatCurrency(stats.paidAmount) +
        ')';
    }
    if (unpaidEl) {
      unpaidEl.textContent =
        'Не оплачено уроков: ' +
        stats.unpaidLessonsCount +
        ' (' +
        Calendar.formatCurrency(stats.unpaidAmount) +
        ')';
    }

    var hasFilter = state.subjectFilter !== 'all' || Boolean(state.exactDateFilter);
    if (activeFilterWrap && activeFilterLabel) {
      if (hasFilter) {
        activeFilterWrap.style.display = 'flex';
        var subjName =
          state.subjectFilter === 'eng'
            ? 'Английский'
            : state.subjectFilter === 'rus'
            ? 'Русский'
            : 'Все предметы';
        var dateSuffix = state.exactDateFilter
          ? ', ' + Calendar.formatRussianDate(state.exactDateFilter)
          : '';
        activeFilterLabel.textContent = subjName + dateSuffix;
      } else {
        activeFilterWrap.style.display = 'none';
      }
    }
  }

  function renderHeaderControls(state) {
    var Calendar = root.TutorPlanner.Calendar;
    var rangeLabel = document.getElementById('week-range-label');
    if (rangeLabel) {
      rangeLabel.textContent = Calendar.formatWeekRange(state.currentMondayISO);
    }

    var countSpan = document.getElementById('students-count-badge');
    var countMobileSpan = document.getElementById('students-count-badge-mobile');
    if (countSpan) countSpan.textContent = String(state.students.length);
    if (countMobileSpan) countMobileSpan.textContent = String(state.students.length);

    var btnAll = document.getElementById('filter-subj-all');
    var btnEng = document.getElementById('filter-subj-eng');
    var btnRus = document.getElementById('filter-subj-rus');

    if (btnAll) {
      btnAll.className =
        'segmented-btn' + (state.subjectFilter === 'all' ? ' active' : '');
    }
    if (btnEng) {
      btnEng.className =
        'segmented-btn' + (state.subjectFilter === 'eng' ? ' active-eng' : '');
    }
    if (btnRus) {
      btnRus.className =
        'segmented-btn' + (state.subjectFilter === 'rus' ? ' active-rus' : '');
    }

    var layoutBoardBtn = document.getElementById('layout-mode-board');
    var layoutRowsBtn = document.getElementById('layout-mode-rows');
    if (layoutBoardBtn) {
      layoutBoardBtn.className =
        'segmented-btn' + (state.weekLayoutMode !== 'rows' ? ' active' : '');
    }
    if (layoutRowsBtn) {
      layoutRowsBtn.className =
        'segmented-btn' + (state.weekLayoutMode === 'rows' ? ' active' : '');
    }

    var dateInput = document.getElementById('exact-date-filter');
    var clearDateBtn = document.getElementById('clear-date-filter-btn');
    if (dateInput && dateInput.value !== state.exactDateFilter) {
      dateInput.value = state.exactDateFilter || '';
    }
    if (clearDateBtn) {
      clearDateBtn.style.display = state.exactDateFilter ? 'inline-flex' : 'none';
    }

    var Store = root.TutorPlanner.Store;
    var rolloverKey = Store && Store.getLastMonthRollover ? Store.getLastMonthRollover() : '';
    var autoSyncTextEl = document.getElementById('autosync-status-text');
    var autoSyncMobileEl = document.getElementById('autosync-status-text-mobile');
    var statusLabel = rolloverKey
      ? 'Автозаполнение: активно (продлено на ' + rolloverKey + ')'
      : 'Автозаполнение до конца месяца: активно';
    if (autoSyncTextEl) {
      autoSyncTextEl.textContent = statusLabel;
    }
    if (autoSyncMobileEl) {
      autoSyncMobileEl.textContent = rolloverKey
        ? 'Автозаполнение: ' + rolloverKey
        : 'Автозаполнение: активно';
    }
  }

  function renderWeekDayStrip(state) {
    var Calendar = root.TutorPlanner.Calendar;
    var stripEl = document.getElementById('week-day-tabs-container');
    if (!stripEl) return;

    var weekDays = Calendar.getWeekDays(state.currentMondayISO, state.todayISO);
    var html = '';

    for (var i = 0; i < weekDays.length; i++) {
      var day = weekDays[i];
      var count = state.lessons.filter(function (l) {
        if (l.date !== day.date || l.status === 'cancelled') return false;
        if (state.subjectFilter !== 'all' && l.subject !== state.subjectFilter) {
          return false;
        }
        return true;
      }).length;

      var isSelected = state.exactDateFilter === day.date;

      html +=
        '<button type="button" class="day-tab-btn day-pill' +
        (day.isToday ? ' is-today' : '') +
        (isSelected ? ' is-selected' : '') +
        '" data-action="select-day-tab" data-date="' +
        day.date +
        '">' +
        '<div>' +
        '<span class="day-tab-name">' +
        escapeHtml(day.dayNameShort) +
        '</span>' +
        '<span class="day-tab-sub font-mono-tabular">' +
        day.dayNumber +
        ' ' +
        escapeHtml(day.monthShort) +
        '</span>' +
        '</div>' +
        '<span class="day-tab-badge font-mono-tabular">' +
        count +
        ' ур.</span>' +
        '</button>';
    }

    stripEl.innerHTML = html;
  }

  function renderWeekGrid(state) {
    var Calendar = root.TutorPlanner.Calendar;
    renderWeekDayStrip(state);

    var gridEl = document.getElementById('week-grid-container');
    if (!gridEl) return;

    var weekDays = Calendar.getWeekDays(state.currentMondayISO, state.todayISO);
    var visibleDays = state.exactDateFilter
      ? weekDays.filter(function (d) {
          return d.date === state.exactDateFilter;
        })
      : weekDays;

    if (visibleDays.length === 1) {
      gridEl.className = 'week-grid single-day';
    } else if (state.weekLayoutMode === 'rows') {
      gridEl.className = 'week-grid layout-rows';
    } else {
      gridEl.className = 'week-grid layout-board';
    }

    var studentsMap = {};
    for (var i = 0; i < state.students.length; i++) {
      studentsMap[state.students[i].id] = state.students[i];
    }

    var html = '';
    for (var dIdx = 0; dIdx < visibleDays.length; dIdx++) {
      var day = visibleDays[dIdx];
      var dayLessons = Calendar.sortLessonsChronologically(
        state.lessons.filter(function (l) {
          if (l.date !== day.date) return false;
          if (state.subjectFilter !== 'all' && l.subject !== state.subjectFilter) {
            return false;
          }
          return true;
        })
      );

      var workload = Calendar.calculateDayWorkload(dayLessons);
      var timeRangeLabel =
        workload.count > 0
          ? workload.firstStart +
            '–' +
            workload.lastEnd +
            ' (' +
            workload.durationLabel +
            ')'
          : 'Свободно';

      html +=
        '<div class="day-column day-slot-' +
        dIdx +
        (day.isToday ? ' is-today' : '') +
        '" data-testid="day-column-' +
        day.date +
        '">' +
        '<div class="day-header">' +
        '<div class="day-header-cols">' +
        '<div class="day-header-col">' +
        '<span class="dh-top" title="' +
        escapeHtml(day.dayNameFull) +
        '">' +
        escapeHtml(day.dayNameShort) +
        (day.isToday ? ' <span class="today-label">Сегодня</span>' : '') +
        '</span>' +
        '<span class="dh-sub font-mono-tabular">' +
        day.dayNumber +
        ' ' +
        escapeHtml(day.monthShort) +
        '</span>' +
        '</div>' +
        '<div class="day-header-col">' +
        '<span class="dh-top">Уроков</span>' +
        '<span class="dh-sub font-mono-tabular">' +
        workload.count +
        ' ур.</span>' +
        '</div>' +
        '<div class="day-header-col">' +
        '<span class="dh-top">Время</span>' +
        '<span class="dh-sub font-mono-tabular">' +
        escapeHtml(timeRangeLabel) +
        '</span>' +
        '</div>' +
        '</div>' +
        '<button type="button" class="day-add-btn-inline" data-action="add-lesson-on-date" data-date="' +
        day.date +
        '" aria-label="Добавить урок на ' +
        day.dayNumber +
        ' ' +
        escapeHtml(day.monthShort) +
        '">' +
        ICONS.plus +
        '<span>Урок</span>' +
        '</button>' +
        '</div>' +
        '<div class="day-lessons-list">';

      if (dayLessons.length === 0) {
        html +=
          '<div class="empty-day">' +
          '<span>Свободный день — уроков нет</span>' +
          '</div>';
      } else {
        for (var lIdx = 0; lIdx < dayLessons.length; lIdx++) {
          var lesson = dayLessons[lIdx];
          var student = studentsMap[lesson.studentId];
          var studentName = student ? student.name : 'Ученик не указан';
          var studentColor =
            student && student.color ? student.color : '#3b82f6';
          var lessonPrice =
            typeof lesson.price === 'number' && !isNaN(lesson.price)
              ? lesson.price
              : student && typeof student.defaultPrice === 'number'
              ? student.defaultPrice
              : 1500;

          var isCancelled = lesson.status === 'cancelled';
          var isPastOrDone =
            !isCancelled &&
            (lesson.status === 'completed' ||
              Calendar.isLessonInPast(lesson.date, lesson.endTime));

          var cardStateClass = '';
          if (isCancelled) {
            cardStateClass = ' is-cancelled';
          } else if (lesson.isPaid) {
            cardStateClass = ' is-paid-card';
          } else if (isPastOrDone) {
            cardStateClass = ' is-unpaid-past-card';
          }

          var hasCW = Boolean(lesson.classwork && lesson.classwork.trim());
          var hasHW = Boolean(lesson.homework && lesson.homework.trim());

          var resolvedTeacherNote = Calendar.resolveActiveTeacherNote(
            state.students,
            state.lessons,
            lesson.studentId,
            lesson.date
          );

          var secondaryParts = [];
          if (hasCW) {
            secondaryParts.push(lesson.classwork.trim());
          }
          if (hasHW) {
            secondaryParts.push('ДЗ: ' + lesson.homework.trim());
          }
          if (
            resolvedTeacherNote.active &&
            resolvedTeacherNote.text &&
            !isCancelled
          ) {
            secondaryParts.push('📌 ' + resolvedTeacherNote.text.trim());
          }
          var secondaryLine =
            secondaryParts.length > 0
              ? secondaryParts.join(' · ')
              : STATUS_LABELS[lesson.status] || 'Запланирован';

          var payBtnClass = lesson.isPaid
            ? 'paid'
            : isPastOrDone
            ? 'unpaid-past'
            : 'unpaid';
          var payBtnLabel = lesson.isPaid
            ? '✓ ' + Calendar.formatCurrency(lessonPrice)
            : isPastOrDone
            ? '! ' + Calendar.formatCurrency(lessonPrice)
            : Calendar.formatCurrency(lessonPrice);
          var payAriaLabel = lesson.isPaid
            ? 'Оплачено ' + Calendar.formatCurrency(lessonPrice)
            : 'Не оплачено ' + Calendar.formatCurrency(lessonPrice);

          html +=
            '<div class="lesson-card' +
            cardStateClass +
            '" data-testid="lesson-card-' +
            escapeHtml(lesson.id) +
            '">' +
            '<div class="lesson-row-1">' +
            '<button type="button" class="lesson-row-1-main lesson-card-main" data-action="open-lesson" data-lesson-id="' +
            escapeHtml(lesson.id) +
            '">' +
            '<span class="lesson-time font-mono-tabular">' +
            escapeHtml(lesson.startTime) +
            '–' +
            escapeHtml(lesson.endTime) +
            '</span>' +
            '<span class="subject-code font-mono-tabular ' +
            (lesson.subject === 'rus' ? 'rus' : 'eng') +
            '">' +
            (lesson.subject === 'rus' ? 'RUS' : 'ENG') +
            '</span>' +
            '<span class="student-color-dot" style="background-color:' +
            escapeHtml(studentColor) +
            ';" title="Цвет ученика"></span>' +
            '<span class="lesson-student">' +
            escapeHtml(studentName) +
            '</span>' +
            '</button>';

          if (!isCancelled) {
            html +=
              '<button type="button" class="payment-toggle-btn font-mono-tabular ' +
              payBtnClass +
              '" data-action="toggle-paid" data-lesson-id="' +
              escapeHtml(lesson.id) +
              '" aria-label="' +
              escapeHtml(payAriaLabel) +
              '" title="' +
              escapeHtml(
                lesson.isPaid
                  ? 'Оплачено (нажмите для отмены)'
                  : 'Отметить как оплаченный'
              ) +
              '">' +
              '<span>' +
              escapeHtml(payBtnLabel) +
              '</span>' +
              '</button>';
          }

          html +=
            '</div>' +
            '<button type="button" class="lesson-row-2" data-action="open-lesson" data-lesson-id="' +
            escapeHtml(lesson.id) +
            '">' +
            '<span class="lesson-row-2-text" title="' +
            escapeHtml(secondaryLine) +
            '">' +
            escapeHtml(secondaryLine) +
            '</span>' +
            '<span class="lesson-indicators">';

          if (hasHW) {
            html +=
              '<span class="indicator-item' +
              (lesson.hwChecked ? ' checked' : '') +
              '" title="Домашнее задание">' +
              (lesson.hwChecked ? '✓ДЗ' : 'ДЗ') +
              '</span>';
          }
          if (
            resolvedTeacherNote.active &&
            resolvedTeacherNote.text &&
            !isCancelled
          ) {
            html +=
              '<span class="indicator-item" title="' +
              escapeHtml('Заметка для учителя: ' + resolvedTeacherNote.text) +
              '">📌</span>';
          }
          if (!isCancelled && lesson.repeatWeekly !== false) {
            html +=
              '<span class="indicator-item" title="Автоматический повтор каждую неделю до конца месяца">' +
              ICONS.refresh +
              '</span>';
          }

          html += '</span></button></div>';
        }
      }

      html += '</div></div>';
    }

    gridEl.innerHTML = html;
  }

  function updateSmartHomeworkBox(state, studentId, lessonDate, currentLessonId) {
    var Calendar = root.TutorPlanner.Calendar;
    var prev = Calendar.findPreviousStudentLesson(
      state.lessons,
      studentId,
      lessonDate,
      currentLessonId
    );
    var dateBadge = document.getElementById('smart-hw-date');
    var bodyEl = document.getElementById('smart-hw-content');
    if (!bodyEl) return;

    if (prev) {
      if (dateBadge) {
        dateBadge.textContent =
          'Урок от ' + Calendar.formatRussianDate(prev.date, false);
      }
      var inner = '';
      if (prev.homework && prev.homework.trim()) {
        inner +=
          '<p style="margin:0 0 3px 0;"><strong>Задано:</strong> ' +
          escapeHtml(prev.homework) +
          '</p>';
      } else {
        inner +=
          '<p style="margin:0 0 3px 0;font-style:italic;">На прошлом уроке домашнее задание не было записано.</p>';
      }
      if (prev.classwork && prev.classwork.trim()) {
        inner +=
          '<p style="margin:0;font-size:11px;opacity:0.88;">Прошлая тема: ' +
          escapeHtml(prev.classwork) +
          '</p>';
      }
      bodyEl.innerHTML = inner;
    } else {
      if (dateBadge) dateBadge.textContent = '';
      bodyEl.innerHTML =
        '<p style="margin:0;">Предыдущих проведенных уроков у этого ученика до выбранной даты не найдено.</p>';
    }
  }

  function renderStudentsModalContent(state) {
    var Calendar = root.TutorPlanner.Calendar;
    var container = document.getElementById('students-modal-body');
    var titleEl = document.getElementById('students-modal-title');
    var subtitleEl = document.getElementById('students-modal-subtitle');
    var backBtn = document.getElementById('students-back-btn');
    var openAddBtn = document.getElementById('students-open-add-btn');

    if (!container) return;

    // Single-pass O(N) aggregation of stats across all lessons
    var statsMap = Calendar.buildStudentStatsMap(state.lessons);

    var historyStudent = null;
    if (state.historyStudentId) {
      for (var i = 0; i < state.students.length; i++) {
        if (state.students[i].id === state.historyStudentId) {
          historyStudent = state.students[i];
          break;
        }
      }
    }

    if (historyStudent) {
      if (titleEl) {
        titleEl.textContent = 'История занятий: ' + historyStudent.name;
      }
      if (subtitleEl) {
        subtitleEl.textContent =
          'Базовый предмет: ' +
          (historyStudent.defaultSubject === 'eng'
            ? 'Английский (ENG)'
            : 'Русский (RUS)') +
          ' · Стоимость: ' +
          Calendar.formatCurrency(historyStudent.defaultPrice || 1500);
      }
      if (backBtn) backBtn.style.display = 'inline-flex';
      if (openAddBtn) openAddBtn.style.display = 'none';

      var stuStats = statsMap[historyStudent.id] || {
        totalCount: 0,
        activeCount: 0,
        completedCount: 0,
        paidCount: 0,
        paidAmount: 0,
        unpaidPastCount: 0,
        unpaidPastAmount: 0,
        lessons: [],
      };

      var stuLessons = Calendar.sortLessonsChronologically(stuStats.lessons).reverse();

      var histHtml = '';
      if (historyStudent.notes) {
        histHtml +=
          '<div class="subpanel-box" style="font-size:12px;">' +
          '<div><strong>Профиль и цели ученика:</strong> ' +
          escapeHtml(historyStudent.notes) +
          '</div></div>';
      }
      if (historyStudent.teacherNoteActive && historyStudent.teacherNote) {
        histHtml +=
          '<div class="teacher-note-box" style="font-size:12px;">' +
          '<div><strong>📌 Активная заметка для учителя:</strong> ' +
          escapeHtml(historyStudent.teacherNote) +
          '</div></div>';
      }

      histHtml +=
        '<div class="stats-grid-4">' +
        '<div class="stat-mini-box"><span class="metric-label">Всего записей</span><strong class="font-mono-tabular" style="font-size:15px;">' +
        stuStats.totalCount +
        '</strong></div>' +
        '<div class="stat-mini-box"><span class="metric-label">Проведено уроков</span><strong class="font-mono-tabular" style="font-size:15px;">' +
        stuStats.completedCount +
        '</strong></div>' +
        '<div class="stat-mini-box"><span class="metric-label">Оплачено уроков</span><strong class="font-mono-tabular text-paid" style="font-size:15px;">' +
        stuStats.paidCount +
        ' (' +
        Calendar.formatCurrency(stuStats.paidAmount) +
        ')</strong></div>' +
        '<div class="stat-mini-box"><span class="metric-label">Не оплачено (прошедшие)</span><strong class="font-mono-tabular text-unpaid" style="font-size:15px;">' +
        stuStats.unpaidPastCount +
        ' (' +
        Calendar.formatCurrency(stuStats.unpaidPastAmount) +
        ')</strong></div>' +
        '</div>';

      if (stuLessons.length === 0) {
        histHtml +=
          '<div class="subpanel-box" style="text-align:center;padding:28px;">У этого ученика пока нет запланированных или проведенных уроков.</div>';
      } else {
        histHtml +=
          '<div class="table-wrap"><table class="history-table">' +
          '<thead><tr>' +
          '<th>Дата</th><th>Время</th><th>Предмет</th><th>Статус</th>' +
          '<th>Классная работа (CW)</th><th>Домашнее задание (HW)</th><th style="text-align:right;">Оплата и сумма</th>' +
          '</tr></thead><tbody>';

        for (var j = 0; j < stuLessons.length; j++) {
          var les = stuLessons[j];
          var lesPrice =
            typeof les.price === 'number' && !isNaN(les.price)
              ? les.price
              : historyStudent.defaultPrice || 1500;
          var isPastOrDone =
            les.status === 'completed' ||
            Calendar.isLessonInPast(les.date, les.endTime);

          var paymentCellHtml = '';
          if (les.status === 'cancelled') {
            paymentCellHtml = '<span style="color:#94a3b8;">Отменен</span>';
          } else if (les.isPaid) {
            paymentCellHtml =
              '<span class="text-paid">Оплачено · ' +
              Calendar.formatCurrency(lesPrice) +
              '</span>';
          } else if (isPastOrDone) {
            paymentCellHtml =
              '<span class="text-unpaid">Не оплачено · ' +
              Calendar.formatCurrency(lesPrice) +
              '</span>';
          } else {
            paymentCellHtml =
              '<span style="color:#64748b;">Будущий · ' +
              Calendar.formatCurrency(lesPrice) +
              '</span>';
          }

          histHtml +=
            '<tr data-action="edit-lesson-from-history" data-lesson-id="' +
            escapeHtml(les.id) +
            '">' +
            '<td class="font-mono-tabular" style="white-space:nowrap;font-weight:600;">' +
            escapeHtml(Calendar.formatRussianDate(les.date)) +
            '</td>' +
            '<td class="font-mono-tabular" style="white-space:nowrap;color:#475569;">' +
            escapeHtml(les.startTime) +
            ' – ' +
            escapeHtml(les.endTime) +
            '</td>' +
            '<td class="font-mono-tabular"><span class="subject-code ' +
            (les.subject === 'rus' ? 'rus' : 'eng') +
            '">' +
            (les.subject === 'rus' ? 'RUS' : 'ENG') +
            '</span></td>' +
            '<td>' +
            escapeHtml(STATUS_LABELS[les.status] || les.status) +
            '</td>' +
            '<td>' +
            (les.classwork ? escapeHtml(les.classwork) : '<span style="color:#94a3b8;">—</span>') +
            '</td>' +
            '<td>' +
            (les.homework
              ? escapeHtml(les.homework) +
                (les.hwChecked
                  ? '<div style="color:#047857;font-weight:600;font-size:11px;">✓ Проверено</div>'
                  : '')
              : '<span style="color:#94a3b8;">—</span>') +
            '</td>' +
            '<td class="font-mono-tabular" style="text-align:right;white-space:nowrap;">' +
            paymentCellHtml +
            (les.paymentNote
              ? '<div style="font-size:11px;color:#64748b;">' +
                escapeHtml(les.paymentNote) +
                '</div>'
              : '') +
            '</td></tr>';
        }
        histHtml += '</tbody></table></div>';
      }

      container.innerHTML = histHtml;
      return;
    }

    // Directory view rendered via DocumentFragment for zero-lag modal opening
    if (titleEl) titleEl.textContent = 'База учеников и История';
    if (subtitleEl) {
      subtitleEl.textContent = 'Всего учеников в справочнике: ' + state.students.length;
    }
    if (backBtn) backBtn.style.display = 'none';
    if (openAddBtn) {
      openAddBtn.style.display = state.isStudentFormOpen ? 'none' : 'inline-flex';
    }

    var fragment = document.createDocumentFragment();

    if (state.isStudentFormOpen) {
      var editingStu = state.editingStudent;
      var defaultColor = editingStu && editingStu.color ? editingStu.color : '#3b82f6';
      var defaultPriceVal =
        editingStu && typeof editingStu.defaultPrice === 'number'
          ? editingStu.defaultPrice
          : 1500;

      var formEl = document.createElement('form');
      formEl.id = 'student-directory-form';
      formEl.className = 'subpanel-box';
      formEl.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
        '<strong style="font-size:14px;">' +
        (editingStu ? 'Редактировать профиль ученика' : 'Новый ученик') +
        '</strong>' +
        '<button type="button" data-action="close-student-form" style="font-size:12px;color:#64748b;">Скрыть форму</button>' +
        '</div>' +
        '<div class="form-row-3">' +
        '<div><label class="field-label" for="stu-form-name">Имя и фамилия *</label>' +
        '<input id="stu-form-name" class="field-input" type="text" required value="' +
        escapeHtml(editingStu ? editingStu.name : '') +
        '" placeholder="Например, Дмитрий Смирнов" /></div>' +
        '<div><label class="field-label" for="stu-form-subject">Предмет по умолчанию</label>' +
        '<select id="stu-form-subject" class="field-select">' +
        '<option value="eng"' +
        (!editingStu || editingStu.defaultSubject === 'eng' ? ' selected' : '') +
        '>🇬🇧 Английский язык (ENG)</option>' +
        '<option value="rus"' +
        (editingStu && editingStu.defaultSubject === 'rus' ? ' selected' : '') +
        '>🇷🇺 Русский язык (RUS)</option>' +
        '</select></div>' +
        '<div><label class="field-label" for="stu-form-price">Стоимость урока (₽)</label>' +
        '<input id="stu-form-price" class="field-input font-mono-tabular" type="number" min="0" step="50" required value="' +
        escapeHtml(String(defaultPriceVal)) +
        '" /></div>' +
        '</div>' +
        '<div class="form-row-2">' +
        '<div><label class="field-label" for="stu-form-notes">Заметка об ученике (уровень, цели, учебник)</label>' +
        '<textarea id="stu-form-notes" class="field-textarea" rows="2" placeholder="Уровень знаний, экзамен, учебные пособия...">' +
        escapeHtml(editingStu ? editingStu.notes : '') +
        '</textarea></div>' +
        '<div><label class="field-label" for="stu-form-color">Индивидуальный цвет ученика</label>' +
        '<div class="color-picker-row">' +
        '<div class="color-presets-list">' +
        renderColorPresetsHtml(defaultColor, 'stu-form-color') +
        '</div>' +
        '<input id="stu-form-color" type="color" class="color-input-native" value="' +
        escapeHtml(defaultColor) +
        '" title="Выбрать произвольный цвет" />' +
        '</div></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
        '<button type="button" class="btn-secondary" data-action="close-student-form">Отмена</button>' +
        '<button type="submit" class="btn-primary">' +
        (editingStu ? 'Сохранить изменения' : 'Создать ученика') +
        '</button>' +
        '</div>';
      fragment.appendChild(formEl);
    }

    var gridWrap = document.createElement('div');
    gridWrap.className = 'students-grid';

    for (var sIdx = 0; sIdx < state.students.length; sIdx++) {
      var stu = state.students[sIdx];
      var sStats = statsMap[stu.id] || {
        totalCount: 0,
        activeCount: 0,
        completedCount: 0,
        paidCount: 0,
        paidAmount: 0,
        unpaidPastCount: 0,
        unpaidPastAmount: 0,
      };
      var stuColor = stu.color || '#3b82f6';
      var stuPrice =
        typeof stu.defaultPrice === 'number' && !isNaN(stu.defaultPrice)
          ? stu.defaultPrice
          : 1500;

      var cardEl = document.createElement('div');
      cardEl.className = 'student-card';
      cardEl.setAttribute('data-testid', 'student-row-' + stu.id);
      cardEl.style.borderLeft = '4px solid ' + stuColor;

      cardEl.innerHTML =
        '<div>' +
        '<div class="student-card-header">' +
        '<div>' +
        '<h3 class="student-name" style="display:flex;align-items:center;gap:7px;">' +
        '<span class="student-color-dot" style="width:12px;height:12px;background-color:' +
        escapeHtml(stuColor) +
        ';"></span>' +
        '<span>' +
        escapeHtml(stu.name) +
        '</span>' +
        '</h3>' +
        '<div class="student-meta font-mono-tabular">' +
        '<span class="' +
        (stu.defaultSubject === 'rus' ? 'text-rus' : 'text-eng') +
        '" style="font-weight:600;">' +
        (stu.defaultSubject === 'rus'
          ? '🇷🇺 Русский (RUS)'
          : '🇬🇧 Английский (ENG)') +
        '</span>' +
        ' · <strong style="color:#0f172a;">' +
        Calendar.formatCurrency(stuPrice) +
        '/ур.</strong>' +
        '</div>' +
        '</div>' +
        '<div style="display:flex;gap:4px;">' +
        '<button type="button" class="modal-close-btn" data-action="edit-student" data-student-id="' +
        escapeHtml(stu.id) +
        '" aria-label="Редактировать ' +
        escapeHtml(stu.name) +
        '">' +
        ICONS.edit +
        '</button>' +
        '<button type="button" class="modal-close-btn" data-action="delete-student" data-student-id="' +
        escapeHtml(stu.id) +
        '" aria-label="Удалить ' +
        escapeHtml(stu.name) +
        '">' +
        ICONS.trash +
        '</button>' +
        '</div></div>' +
        (stu.notes ? '<p class="student-notes">' + escapeHtml(stu.notes) + '</p>' : '') +
        (stu.teacherNoteActive && stu.teacherNote
          ? '<div class="lesson-teacher-note-chip" style="margin-top:8px;">📌 Заметка для учителя: ' +
            escapeHtml(stu.teacherNote) +
            '</div>'
          : '') +
        '</div>' +
        '<div class="student-card-footer">' +
        '<div class="font-mono-tabular" style="font-size:11.5px;color:#64748b;">' +
        'Проведено: <strong style="color:#0f172a;">' +
        sStats.completedCount +
        '</strong>' +
        ' · <span class="text-paid">Опл: ' +
        sStats.paidCount +
        ' (' +
        Calendar.formatCurrency(sStats.paidAmount) +
        ')</span>' +
        (sStats.unpaidPastCount > 0
          ? ' · <span class="text-unpaid">Долг: ' +
            sStats.unpaidPastCount +
            ' (' +
            Calendar.formatCurrency(sStats.unpaidPastAmount) +
            ')</span>'
          : '') +
        '</div>' +
        '<button type="button" class="btn-secondary" style="padding:6px 12px;font-size:12px;" data-action="open-student-history" data-student-id="' +
        escapeHtml(stu.id) +
        '">' +
        ICONS.history +
        '<span>История занятий</span>' +
        '</button>' +
        '</div>';

      gridWrap.appendChild(cardEl);
    }

    fragment.appendChild(gridWrap);
    container.textContent = '';
    container.appendChild(fragment);
  }

  function renderAutoTransferModalContent(state) {
    var Calendar = root.TutorPlanner.Calendar;
    var direction = state.transferDirection || 'prev-to-current';
    var prevSource = Calendar.addDaysISO(state.currentMondayISO, -7);
    var prevTarget = state.currentMondayISO;
    var nextSource = state.currentMondayISO;
    var nextTarget = Calendar.addDaysISO(state.currentMondayISO, 7);

    var sourceMonday = direction === 'prev-to-current' ? prevSource : nextSource;
    var targetMonday = direction === 'prev-to-current' ? prevTarget : nextTarget;

    var preview = Calendar.buildAutoTransferredLessons(
      state.lessons,
      sourceMonday,
      targetMonday
    );

    var rangePrevEl = document.getElementById('transfer-range-prev');
    var rangeNextEl = document.getElementById('transfer-range-next');
    if (rangePrevEl) {
      rangePrevEl.textContent =
        Calendar.formatWeekRange(prevSource) + ' → ' + Calendar.formatWeekRange(prevTarget);
    }
    if (rangeNextEl) {
      rangeNextEl.textContent =
        Calendar.formatWeekRange(nextSource) + ' → ' + Calendar.formatWeekRange(nextTarget);
    }

    var cardPrev = document.getElementById('transfer-card-prev');
    var cardNext = document.getElementById('transfer-card-next');
    if (cardPrev) {
      cardPrev.className = 'radio-card' + (direction === 'prev-to-current' ? ' active' : '');
    }
    if (cardNext) {
      cardNext.className = 'radio-card' + (direction === 'current-to-next' ? ' active' : '');
    }

    var countEl = document.getElementById('autotransfer-preview-count');
    var skippedEl = document.getElementById('autotransfer-skipped-info');
    var listEl = document.getElementById('autotransfer-preview-list');
    var confirmBtn = document.getElementById('confirm-autotransfer-btn');

    if (countEl) countEl.textContent = preview.createdLessons.length + ' ур.';
    if (skippedEl) {
      skippedEl.textContent =
        'Пропущено отмененных: ' +
        preview.skippedCancelled +
        ' · Пропущено дублей по времени: ' +
        preview.skippedDuplicates;
    }

    var studentsMap = {};
    for (var i = 0; i < state.students.length; i++) {
      studentsMap[state.students[i].id] = state.students[i];
    }

    if (listEl) {
      if (preview.createdLessons.length === 0) {
        listEl.innerHTML =
          '<p style="margin:4px 0 0 0;font-size:12px;color:#78350f;">На выбранной исходной неделе нет доступных уроков для копирования (либо все слоты уже заняты).</p>';
      } else {
        var itemsHtml = '';
        for (var k = 0; k < preview.createdLessons.length; k++) {
          var item = preview.createdLessons[k];
          var stu = studentsMap[item.studentId];
          itemsHtml +=
            '<div class="font-mono-tabular" style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">' +
            '<span>' +
            escapeHtml(Calendar.formatRussianDate(item.date)) +
            ' · ' +
            escapeHtml(item.startTime) +
            '–' +
            escapeHtml(item.endTime) +
            '</span>' +
            '<strong style="font-family:var(--font-sans);">' +
            escapeHtml(stu ? stu.name : 'Ученик') +
            ' (' +
            item.subject.toUpperCase() +
            ')</strong></div>';
        }
        listEl.innerHTML = itemsHtml;
      }
    }

    if (confirmBtn) {
      confirmBtn.disabled = preview.createdLessons.length === 0;
      confirmBtn.textContent = 'Перенести уроки (' + preview.createdLessons.length + ')';
    }
  }

  var UI = {
    escapeHtml: escapeHtml,
    renderColorPresetsHtml: renderColorPresetsHtml,
    renderHeaderControls: renderHeaderControls,
    renderDashboard: renderDashboard,
    renderWeekGrid: renderWeekGrid,
    updateSmartHomeworkBox: updateSmartHomeworkBox,
    renderStudentsModalContent: renderStudentsModalContent,
    renderAutoTransferModalContent: renderAutoTransferModalContent,
  };

  root.TutorPlanner = root.TutorPlanner || {};
  root.TutorPlanner.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
