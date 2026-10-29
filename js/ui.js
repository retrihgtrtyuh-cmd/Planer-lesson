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

  function formatLessonsPlural(count) {
    var n = Math.abs(Number(count) || 0) % 100;
    var n1 = n % 10;
    if (n > 10 && n < 20) return count + ' уроков';
    if (n1 > 1 && n1 < 5) return count + ' урока';
    if (n1 === 1) return count + ' урок';
    return count + ' уроков';
  }

  function formatSixDigitCode(code) {
    var digits = String(code || '').replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 3) return digits;
    return digits.slice(0, 3) + '-' + digits.slice(3, 6);
  }

  var ICONS = {
    clock:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    book:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5" stroke-linecap="round"/></svg>',
    checkSquare:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 12a9 9 0 1 1-2.64-6.36" stroke-linecap="round"/><polyline points="21 3 21 9 15 9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    card:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    alert:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5" stroke-linecap="round"/><circle cx="12" cy="16" r="0.8" fill="currentColor"/></svg>',
    plus:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round"/></svg>',
    edit:
      '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    trash:
      '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    history:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
    refresh:
      '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><polyline points="17 2 21 6 17 10" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11V9a4 4 0 0 1 4-4h14" stroke-linecap="round"/><polyline points="7 22 3 18 7 14" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v2a4 4 0 0 1-4 4H3" stroke-linecap="round"/></svg>',
    calendarEmpty:
      '<svg class="empty-cal-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="17" rx="3"/><line x1="16" y1="2.5" x2="16" y2="6" stroke-linecap="round"/><line x1="8" y1="2.5" x2="8" y2="6" stroke-linecap="round"/><line x1="3" y1="9.5" x2="21" y2="9.5"/></svg>',
    pin:
      '<svg class="pin-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3a1 1 0 0 1 .7.29l4 4a1 1 0 0 1-.26 1.62l-3.2 1.28-2.66 2.66 1.13 4.52a1 1 0 0 1-1.68.95L10.3 14.6l-4.6 4.6a1 1 0 0 1-1.4-1.4l4.6-4.6-3.71-3.73a1 1 0 0 1 .95-1.68l4.52 1.13 2.66-2.66 1.28-3.2A1 1 0 0 1 16 3z"/></svg>',
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
    var completedCountEl = document.getElementById('dashboard-completed-count');
    var plannedCountEl = document.getElementById('dashboard-planned-count');
    var unpaidCountEl = document.getElementById('dashboard-unpaid-count');
    var completedEl = document.getElementById('dashboard-completed-text');
    var paidEl = document.getElementById('dashboard-paid-amount');
    var unpaidEl = document.getElementById('dashboard-unpaid-amount');
    var activeFilterWrap = document.getElementById('dashboard-active-filter');
    var activeFilterLabel = document.getElementById('dashboard-filter-text');

    if (totalEl) totalEl.textContent = String(stats.totalActiveLessons);
    if (engEl) engEl.textContent = String(stats.engLessons);
    if (rusEl) rusEl.textContent = String(stats.rusLessons);
    if (completedCountEl) completedCountEl.textContent = String(stats.completedLessons);
    if (plannedCountEl) {
      var plannedVal =
        typeof stats.plannedLessons === 'number'
          ? stats.plannedLessons
          : Math.max(0, stats.totalActiveLessons - stats.completedLessons);
      plannedCountEl.textContent = String(plannedVal);
    }
    if (unpaidCountEl) unpaidCountEl.textContent = String(stats.unpaidLessonsCount);

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
        'Оплачено: ' +
        stats.paidLessonsCount +
        ' (' +
        Calendar.formatCurrency(stats.paidAmount) +
        ')';
    }
    if (unpaidEl) {
      unpaidEl.textContent =
        stats.unpaidAmount > 0
          ? Calendar.formatCurrency(stats.unpaidAmount)
          : '0 ₽';
    }

    var hasFilter = state.subjectFilter !== 'all' || Boolean(state.exactDateFilter);
    if (activeFilterWrap && activeFilterLabel) {
      if (hasFilter) {
        activeFilterWrap.style.display = 'flex';
        var subjName =
          state.subjectFilter === 'eng'
            ? 'ENG'
            : state.subjectFilter === 'rus'
            ? 'RUS'
            : 'Все';
        var dateSuffix = state.exactDateFilter
          ? ', ' + Calendar.formatRussianDate(state.exactDateFilter, false)
          : '';
        activeFilterLabel.textContent = subjName + dateSuffix;
      } else {
        activeFilterWrap.style.display = 'none';
      }
    }
  }

  function renderHeaderControls(state) {
    var Calendar = root.TutorPlanner.Calendar;
    var Store = root.TutorPlanner.Store;
    var rangeLabel = document.getElementById('week-range-label');
    if (rangeLabel) {
      rangeLabel.textContent = Calendar.formatWeekRange(state.currentMondayISO);
    }

    var countSpan = document.getElementById('students-count-badge');
    var countMobileSpan = document.getElementById('students-count-badge-mobile');
    if (countSpan) countSpan.textContent = String(state.students.length);
    if (countMobileSpan) countMobileSpan.textContent = String(state.students.length);

    var pairedCode =
      Store && typeof Store.getPairedDeviceCode === 'function'
        ? Store.getPairedDeviceCode()
        : '';
    var quickHeaderSyncBtn = document.getElementById('quick-oneclick-sync-header-btn');
    if (quickHeaderSyncBtn) {
      if (pairedCode) {
        quickHeaderSyncBtn.style.display = 'inline-flex';
        quickHeaderSyncBtn.title =
          'Обновить расписание со связанным устройством (код ' +
          formatSixDigitCode(pairedCode) +
          ') в 1 нажатие';
      } else {
        quickHeaderSyncBtn.style.display = 'none';
      }
    }

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

    var rolloverKey =
      Store && Store.getLastMonthRollover ? Store.getLastMonthRollover() : '';
    var autoSyncTextEl = document.getElementById('autosync-status-text');
    var autoSyncMobileEl = document.getElementById('autosync-status-text-mobile');
    var statusLabel = 'Автозаполнение до конца месяца';
    if (autoSyncTextEl) {
      autoSyncTextEl.textContent = statusLabel;
      autoSyncTextEl.title = rolloverKey
        ? 'Автозаполнение активно (продлено на ' + rolloverKey + ')'
        : 'Автозаполнение до конца месяца активно';
    }
    if (autoSyncMobileEl) {
      autoSyncMobileEl.textContent = statusLabel;
    }
  }

  function renderWeekDayStrip(state) {
    var Calendar = root.TutorPlanner.Calendar;
    var stripEl = document.getElementById('week-day-tabs-container');
    if (!stripEl) return;

    var weekDays = Calendar.getWeekDays(state.currentMondayISO, state.todayISO);
    var html = '';

    var hasTodayInWeek = weekDays.some(function (d) {
      return d.isToday;
    });

    for (var i = 0; i < weekDays.length; i++) {
      var day = weekDays[i];
      var isSelected = state.exactDateFilter === day.date;
      var isVisualActive =
        isSelected ||
        (!state.exactDateFilter && (day.isToday || (!hasTodayInWeek && i === 0)));

      html +=
        '<button type="button" class="day-tab-btn day-pill' +
        (day.isToday ? ' is-today' : '') +
        (isSelected ? ' is-selected' : '') +
        (isVisualActive ? ' is-active-pill' : '') +
        '" data-action="select-day-tab" data-date="' +
        day.date +
        '">' +
        '<span class="day-tab-name">' +
        escapeHtml(day.dayNameShort) +
        '</span>' +
        '<span class="day-tab-sub font-mono-tabular">' +
        day.dayNumber +
        ' ' +
        escapeHtml(day.monthShort) +
        '</span>' +
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
      var slotIndex = Calendar.getWeekdayIndexMondayZero(day.date);
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
      var lessonsCountLabel = formatLessonsPlural(workload.count);

      html +=
        '<div class="day-column day-slot-' +
        slotIndex +
        (day.isToday ? ' is-today' : '') +
        '" data-testid="day-column-' +
        day.date +
        '">' +
        '<div class="day-header day-theme-' +
        slotIndex +
        '">' +
        '<div class="day-header-left">' +
        '<span class="day-name">' +
        escapeHtml(day.dayNameFull) +
        '</span>' +
        '<span class="day-meta font-mono-tabular">' +
        day.dayNumber +
        ' ' +
        escapeHtml(day.monthShort) +
        ' &nbsp;•&nbsp; ' +
        escapeHtml(lessonsCountLabel) +
        '</span>' +
        '</div>' +
        '<button type="button" class="day-add-btn-inline" data-action="add-lesson-on-date" data-date="' +
        day.date +
        '" aria-label="Добавить урок на ' +
        day.dayNumber +
        ' ' +
        escapeHtml(day.monthShort) +
        '">' +
        '+ Добавить' +
        '</button>' +
        '</div>' +
        '<div class="day-lessons-list">';

      if (dayLessons.length === 0) {
        html +=
          '<div class="empty-day">' +
          ICONS.calendarEmpty +
          '<div class="empty-day-texts">' +
          '<strong class="empty-day-title">Свободный день</strong>' +
          '<span class="empty-day-sub">Уроков не запланировано</span>' +
          '</div>' +
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
              : 0;

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
          } else {
            cardStateClass = ' is-planned-card';
          }

          var durationMins = Calendar.getDurationMinutes(
            lesson.startTime,
            lesson.endTime
          );
          var hasCW = Boolean(lesson.classwork && lesson.classwork.trim());

          var payBtnClass = lesson.isPaid ? 'paid' : 'unpaid';
          var payBtnText = lesson.isPaid ? 'Оплачено' : 'Не оплачено';
          var payTitle =
            (lesson.isPaid ? 'Оплачено: ' : 'Не оплачено: ') +
            Calendar.formatCurrency(lessonPrice);

          html +=
            '<div class="lesson-card' +
            cardStateClass +
            '" data-testid="lesson-card-' +
            escapeHtml(lesson.id) +
            '">' +
            '<span class="lesson-left-strip" aria-hidden="true"></span>' +
            '<div class="lesson-card-body">' +
            '<button type="button" class="lesson-card-main" data-action="open-lesson" data-lesson-id="' +
            escapeHtml(lesson.id) +
            '">' +
            '<div class="lesson-top-row">' +
            '<span class="lesson-time font-mono-tabular">' +
            ICONS.clock +
            '<span>' +
            escapeHtml(lesson.startTime) +
            ' – ' +
            escapeHtml(lesson.endTime) +
            ' (' +
            formatDurationLabel(durationMins) +
            ')</span>' +
            '</span>' +
            '<span class="subject-code font-mono-tabular ' +
            (lesson.subject === 'rus' ? 'rus' : 'eng') +
            '">' +
            (lesson.subject === 'rus' ? 'RUS' : 'ENG') +
            '</span>' +
            '</div>' +
            '<div class="lesson-student-row">' +
            '<span class="student-color-dot" style="background-color:' +
            escapeHtml(studentColor) +
            ';" title="Цвет ученика"></span>' +
            '<span class="lesson-student">' +
            escapeHtml(studentName) +
            '</span>' +
            '</div>' +
            (hasCW
              ? '<p class="lesson-topic">' +
                escapeHtml(lesson.classwork) +
                '</p>'
              : '') +
            '</button>' +
            '<div class="lesson-footer">' +
            '<div class="lesson-indicators">' +
            '<span class="indicator-item' +
            (hasCW ? ' active' : '') +
            '" title="Классная работа">' +
            ICONS.book +
            '</span>' +
            '<span class="indicator-item' +
            (lesson.hwChecked ? ' checked' : '') +
            '" title="Домашнее задание">' +
            ICONS.checkSquare +
            '</span>' +
            '<span class="indicator-item' +
            (!isCancelled && lesson.repeatWeekly !== false ? ' active' : '') +
            '" title="Автоповтор каждую неделю до конца месяца">' +
            ICONS.refresh +
            '</span>' +
            '</div>';

          if (!isCancelled) {
            html +=
              '<button type="button" class="payment-toggle-btn ' +
              payBtnClass +
              '" data-action="toggle-paid" data-lesson-id="' +
              escapeHtml(lesson.id) +
              '" aria-label="' +
              escapeHtml(payTitle) +
              '" title="' +
              escapeHtml(payTitle) +
              '">' +
              (lesson.isPaid ? ICONS.card : ICONS.alert) +
              '<span>' +
              escapeHtml(payBtnText) +
              '</span>' +
              '</button>';
          } else {
            html += '<span class="cancelled-badge">Отменен</span>';
          }

          html += '</div></div></div>';
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
          Calendar.formatCurrency(historyStudent.defaultPrice || 0);
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
              : historyStudent.defaultPrice || 0;
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

    // Directory view rendered via DocumentFragment
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
          ? String(editingStu.defaultPrice)
          : '';

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
        '" placeholder="Введите имя ученика" /></div>' +
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
        '<input id="stu-form-price" class="field-input font-mono-tabular" type="number" min="0" step="50" value="' +
        escapeHtml(defaultPriceVal) +
        '" placeholder="Укажите сумму" /></div>' +
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

    if (state.students.length === 0 && !state.isStudentFormOpen) {
      var emptyWrap = document.createElement('div');
      emptyWrap.className = 'subpanel-box';
      emptyWrap.style.textAlign = 'center';
      emptyWrap.style.padding = '28px 16px';
      emptyWrap.innerHTML =
        '<strong style="font-size:15px;">Список учеников пока пуст</strong>' +
        '<p style="margin:4px 0 12px 0;font-size:12.5px;color:#64748b;">Добавьте своего первого ученика или синхронизируйте данные со второго устройства в 2 клика.</p>' +
        '<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">' +
        '<button type="button" class="btn-primary" data-action="empty-open-add-student">+ Добавить ученика</button>' +
        '<button type="button" class="btn-secondary" data-action="empty-open-sync">🔄 Синхронизировать со второго устройства</button>' +
        '</div>';
      fragment.appendChild(emptyWrap);
    } else {
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
            : 0;

        var cardEl = document.createElement('div');
        cardEl.className = 'student-card';
        cardEl.setAttribute('data-testid', 'student-row-' + stu.id);

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
    }

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

  function renderSyncModalContent(state) {
    var Store = root.TutorPlanner.Store;
    var activeTab = state.syncActiveTab || 'send';
    var tabSendBtn = document.getElementById('sync-tab-btn-send');
    var tabReceiveBtn = document.getElementById('sync-tab-btn-receive');
    var panelSend = document.getElementById('sync-panel-send');
    var panelReceive = document.getElementById('sync-panel-receive');
    var codeEl = document.getElementById('sync-generated-code');

    if (tabSendBtn) {
      tabSendBtn.className = 'sync-tab-btn' + (activeTab === 'send' ? ' active' : '');
      tabSendBtn.setAttribute('aria-selected', activeTab === 'send' ? 'true' : 'false');
    }
    if (tabReceiveBtn) {
      tabReceiveBtn.className = 'sync-tab-btn' + (activeTab === 'receive' ? ' active' : '');
      tabReceiveBtn.setAttribute('aria-selected', activeTab === 'receive' ? 'true' : 'false');
    }

    if (panelSend) {
      panelSend.style.display = activeTab === 'send' ? 'flex' : 'none';
    }
    if (panelReceive) {
      panelReceive.style.display = activeTab === 'receive' ? 'flex' : 'none';
    }

    if (codeEl && state.syncHostCode) {
      codeEl.textContent = formatSixDigitCode(state.syncHostCode);
    }

    var pairedCode =
      Store && typeof Store.getPairedDeviceCode === 'function'
        ? Store.getPairedDeviceCode()
        : '';
    var rememberedBanner = document.getElementById('sync-remembered-banner');
    var rememberedCodeLabel = document.getElementById('sync-remembered-code-label');
    if (rememberedBanner) {
      if (pairedCode) {
        rememberedBanner.style.display = 'flex';
        if (rememberedCodeLabel) {
          rememberedCodeLabel.textContent = formatSixDigitCode(pairedCode);
        }
      } else {
        rememberedBanner.style.display = 'none';
      }
    }
  }

  var UI = {
    escapeHtml: escapeHtml,
    formatSixDigitCode: formatSixDigitCode,
    renderColorPresetsHtml: renderColorPresetsHtml,
    renderHeaderControls: renderHeaderControls,
    renderDashboard: renderDashboard,
    renderWeekGrid: renderWeekGrid,
    updateSmartHomeworkBox: updateSmartHomeworkBox,
    renderStudentsModalContent: renderStudentsModalContent,
    renderAutoTransferModalContent: renderAutoTransferModalContent,
    renderSyncModalContent: renderSyncModalContent,
  };

  root.TutorPlanner = root.TutorPlanner || {};
  root.TutorPlanner.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
