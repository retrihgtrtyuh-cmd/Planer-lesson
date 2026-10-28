(function (root) {
  'use strict';

  var Store = root.TutorPlanner.Store;
  var Calendar = root.TutorPlanner.Calendar;
  var UI = root.TutorPlanner.UI;

  var initialData = Store.loadPlannerState();
  var todayISO = Calendar.getTodayISO();

  var state = {
    todayISO: todayISO,
    currentMondayISO: Calendar.getMondayOfWeek(todayISO),
    students: initialData.students,
    lessons: initialData.lessons,
    subjectFilter: 'all',
    exactDateFilter: '',
    weekLayoutMode: 'board', // 'board' (2 columns) | 'rows' (vertical list of days)
    editingLessonId: null,
    historyStudentId: null,
    isStudentFormOpen: false,
    editingStudent: null,
    transferDirection: 'prev-to-current',
    pendingSeriesAction: null,
  };

  function enableScreenAutoRotation() {
    try {
      if (
        typeof window !== 'undefined' &&
        window.screen &&
        window.screen.orientation &&
        typeof window.screen.orientation.unlock === 'function'
      ) {
        window.screen.orientation.unlock();
      }
    } catch (e) {
      // Orientation unlock is optional on desktop browsers
    }
  }

  function persistAndRender() {
    if (Calendar && typeof Calendar.autoCompletePastLessons === 'function') {
      var autoRes = Calendar.autoCompletePastLessons(state.lessons);
      if (autoRes.updatedCount > 0) {
        state.lessons = autoRes.lessons;
      }
    }
    Store.savePlannerState(state.students, state.lessons);
    UI.renderHeaderControls(state);
    UI.renderDashboard(state);
    UI.renderWeekGrid(state);
  }

  function showNotice(text, isError) {
    var wrap = document.getElementById('notice-container');
    var textEl = document.getElementById('notice-text');
    var banner = document.getElementById('notice-banner');
    if (!wrap || !textEl || !banner) return;

    textEl.textContent = text;
    banner.className = 'notice-banner' + (isError ? ' error' : '');
    wrap.style.display = 'block';

    if (state._noticeTimer) {
      clearTimeout(state._noticeTimer);
    }
    state._noticeTimer = setTimeout(function () {
      wrap.style.display = 'none';
    }, 5000);
  }

  /**
   * Rule B: Checks if today is the last day of the month or if a new month has started
   * without rollover yet, and automatically populates the next month's schedule.
   */
  function checkAndRolloverMonth(options) {
    var opts = options || {};
    var res = Store.runAutoMonthRolloverIfNeeded(
      state.students,
      state.lessons,
      state.todayISO,
      opts
    );
    if (res && res.triggered && res.createdLessons.length > 0) {
      state.lessons = res.lessons;
      persistAndRender();
      if (!opts.silent) {
        showNotice(
          '🔄 Автоперенос на ' +
            res.targetMonthKey +
            ': автоматически создано уроков — ' +
            res.createdLessons.length +
            '.',
          false
        );
      }
    }
    return res;
  }

  function handleColorPresetClick(e) {
    var presetBtn = e.target.closest('[data-action="pick-student-color"]');
    if (!presetBtn) return;
    var colorHex = presetBtn.getAttribute('data-color');
    var targetInputId = presetBtn.getAttribute('data-target-input');
    if (targetInputId && colorHex) {
      var inputEl = document.getElementById(targetInputId);
      if (inputEl) {
        inputEl.value = colorHex;
      }
    }
    var container = presetBtn.parentElement;
    if (container) {
      var siblings = container.querySelectorAll('.color-preset-btn');
      for (var i = 0; i < siblings.length; i++) {
        siblings[i].classList.remove('active');
      }
    }
    presetBtn.classList.add('active');
  }

  // Lesson Modal Management
  function populateLessonStudentSelect(selectedStudentId) {
    var selectEl = document.getElementById('lesson-student');
    var noteEl = document.getElementById('lesson-student-note');
    if (!selectEl) return;

    var html = '';
    for (var i = 0; i < state.students.length; i++) {
      var s = state.students[i];
      var isSelected = s.id === selectedStudentId;
      var sPrice =
        typeof s.defaultPrice === 'number' && !isNaN(s.defaultPrice)
          ? s.defaultPrice
          : 1500;
      html +=
        '<option value="' +
        UI.escapeHtml(s.id) +
        '"' +
        (isSelected ? ' selected' : '') +
        '>' +
        UI.escapeHtml(s.name) +
        ' (' +
        (s.defaultSubject === 'rus' ? 'Русский' : 'Английский') +
        ' · ' +
        Calendar.formatCurrency(sPrice) +
        ')</option>';
    }
    selectEl.innerHTML = html;

    var stu = state.students.find(function (item) {
      return item.id === selectedStudentId;
    });
    if (noteEl) {
      noteEl.textContent = stu && stu.notes ? 'Профиль ученика: ' + stu.notes : '';
    }
  }

  function syncTeacherNoteFieldsForStudent(studentId, lessonDate, lessonOrNull) {
    var resolved = Calendar.resolveActiveTeacherNote(
      state.students,
      state.lessons,
      studentId,
      lessonDate
    );
    var noteField = document.getElementById('lesson-teacher-note');
    var activeCheck = document.getElementById('lesson-teacher-note-active');
    var disableBtn = document.getElementById('disable-teacher-note-btn');

    var textVal = '';
    var isActive = false;

    if (resolved.active && resolved.text) {
      textVal = resolved.text;
      isActive = true;
    } else if (lessonOrNull && lessonOrNull.teacherNote) {
      textVal = lessonOrNull.teacherNote;
      isActive = Boolean(lessonOrNull.teacherNoteActive);
    }

    if (noteField) noteField.value = textVal;
    if (activeCheck) activeCheck.checked = isActive;
    if (disableBtn) {
      disableBtn.style.display = isActive || textVal ? 'inline-flex' : 'none';
    }
  }

  function syncDurationSelector(startTime, endTime) {
    var durationSelect = document.getElementById('lesson-duration-preset');
    if (!durationSelect) return;
    var mins = Calendar.getDurationMinutes(startTime, endTime);
    if (mins === 45 || mins === 60 || mins === 90 || mins === 120) {
      durationSelect.value = String(mins);
    } else {
      durationSelect.value = 'custom';
    }
  }

  function updateRepeatHint(dateVal, isRepeatChecked) {
    var hintEl = document.getElementById('lesson-repeat-hint');
    if (!hintEl) return;
    if (!isRepeatChecked) {
      hintEl.textContent = 'Разовый урок (без повтора)';
      return;
    }
    var remaining = Calendar.getRemainingSameWeekdayDatesInMonth(dateVal);
    if (remaining.length > 0) {
      hintEl.textContent = '+' + remaining.length + ' авто-повтора до конца месяца';
    } else if (Calendar.isLastDayOfMonth(dateVal)) {
      hintEl.textContent = 'Последний день месяца · автопродление на след. месяц';
    } else {
      hintEl.textContent = 'Последняя неделя этого месяца';
    }
  }

  function hideSeriesConfirmBox() {
    state.pendingSeriesAction = null;
    var box = document.getElementById('series-confirm-box');
    if (box) box.style.display = 'none';
  }

  function openLessonModal(lessonOrNull, defaultDateISO) {
    var modal = document.getElementById('lesson-modal');
    if (!modal) return;

    var isEdit = Boolean(lessonOrNull);
    state.editingLessonId = isEdit ? lessonOrNull.id : null;
    hideSeriesConfirmBox();

    var titleEl = document.getElementById('lesson-modal-title');
    var subtitleEl = document.getElementById('lesson-modal-subtitle');
    var deleteBtn = document.getElementById('delete-lesson-btn');
    var quickBox = document.getElementById('quick-student-box');

    if (quickBox) quickBox.style.display = 'none';

    var quickPresetsEl = document.getElementById('quick-stu-color-presets');
    var quickColorInput = document.getElementById('quick-stu-color');
    var nextColor =
      Store.STUDENT_COLORS[state.students.length % Store.STUDENT_COLORS.length] ||
      '#3b82f6';
    if (quickColorInput) quickColorInput.value = nextColor;
    if (quickPresetsEl && UI.renderColorPresetsHtml) {
      quickPresetsEl.innerHTML = UI.renderColorPresetsHtml(
        nextColor,
        'quick-stu-color'
      );
    }

    var firstStu = state.students[0] || null;
    var studentId = isEdit ? lessonOrNull.studentId : firstStu ? firstStu.id : '';
    var selectedStu =
      state.students.find(function (s) {
        return s.id === studentId;
      }) || firstStu;

    var dateVal = isEdit ? lessonOrNull.date : defaultDateISO || state.todayISO;
    var startVal = isEdit ? lessonOrNull.startTime : '15:00';
    // Default duration is 1 hour (60 minutes)
    var endVal = isEdit
      ? lessonOrNull.endTime
      : Calendar.addMinutesToTime(startVal, 60);
    var subjVal = isEdit
      ? lessonOrNull.subject
      : selectedStu
      ? selectedStu.defaultSubject
      : 'eng';
    var statusVal = isEdit ? lessonOrNull.status : 'planned';
    var priceVal =
      isEdit && typeof lessonOrNull.price === 'number' && !isNaN(lessonOrNull.price)
        ? lessonOrNull.price
        : selectedStu && typeof selectedStu.defaultPrice === 'number'
        ? selectedStu.defaultPrice
        : 1500;
    var cwVal = isEdit ? lessonOrNull.classwork : '';
    var hwVal = isEdit ? lessonOrNull.homework : '';
    var hwCheckedVal = isEdit ? Boolean(lessonOrNull.hwChecked) : false;
    var isPaidVal = isEdit ? Boolean(lessonOrNull.isPaid) : false;
    var payNoteVal = isEdit ? lessonOrNull.paymentNote : '';
    var repeatWeeklyVal = isEdit ? lessonOrNull.repeatWeekly !== false : true;

    if (titleEl) {
      titleEl.textContent = isEdit ? 'Редактирование урока' : 'Новое занятие';
    }
    if (subtitleEl) {
      subtitleEl.textContent = Calendar.formatRussianDate(dateVal);
    }
    if (deleteBtn) {
      deleteBtn.style.display = isEdit ? 'inline-flex' : 'none';
    }

    populateLessonStudentSelect(studentId);

    document.getElementById('lesson-date').value = dateVal;
    document.getElementById('lesson-start-time').value = startVal;
    document.getElementById('lesson-end-time').value = endVal;
    syncDurationSelector(startVal, endVal);

    document.getElementById('lesson-subject').value = subjVal;
    document.getElementById('lesson-status').value = statusVal;
    var priceInput = document.getElementById('lesson-price');
    if (priceInput) priceInput.value = String(priceVal);
    document.getElementById('lesson-classwork').value = cwVal;
    document.getElementById('lesson-homework').value = hwVal;
    document.getElementById('lesson-hw-checked').checked = hwCheckedVal;
    document.getElementById('lesson-is-paid').checked = isPaidVal;
    document.getElementById('lesson-payment-note').value = payNoteVal;

    var repeatCheck = document.getElementById('lesson-repeat-weekly');
    if (repeatCheck) {
      repeatCheck.checked = repeatWeeklyVal;
    }
    updateRepeatHint(dateVal, repeatWeeklyVal);

    updatePaidLabelText(isPaidVal);
    UI.updateSmartHomeworkBox(state, studentId, dateVal, state.editingLessonId);
    syncTeacherNoteFieldsForStudent(studentId, dateVal, lessonOrNull);

    modal.classList.remove('hidden');
  }

  function updatePaidLabelText(isPaid) {
    var labelSpan = document.getElementById('lesson-paid-status-text');
    if (!labelSpan) return;
    labelSpan.textContent = isPaid ? 'Оплачено за этот урок' : 'Не оплачено';
    labelSpan.className = isPaid ? 'text-paid' : 'text-unpaid';
  }

  function closeAllModals() {
    hideSeriesConfirmBox();
    var ids = ['lesson-modal', 'students-modal', 'autotransfer-modal'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) el.classList.add('hidden');
    }
  }

  function propagateTeacherNoteToStudentAndSubsequentLessons(
    studentId,
    fromDate,
    noteText,
    isActive
  ) {
    var cleanText = (noteText || '').trim();
    var finalActive = Boolean(isActive && cleanText);

    state.students = state.students.map(function (s) {
      if (s.id !== studentId) return s;
      return Object.assign({}, s, {
        teacherNote: finalActive ? cleanText : '',
        teacherNoteActive: finalActive,
      });
    });

    state.lessons = state.lessons.map(function (l) {
      if (l.studentId !== studentId) return l;
      if (l.date >= fromDate) {
        return Object.assign({}, l, {
          teacherNote: finalActive ? cleanText : '',
          teacherNoteActive: finalActive,
        });
      }
      return l;
    });
  }

  function initEventListeners() {
    // Top bar & week navigation
    document.getElementById('brand-home-link').addEventListener('click', function (e) {
      e.preventDefault();
      state.exactDateFilter = '';
      state.currentMondayISO = Calendar.getMondayOfWeek(state.todayISO);
      persistAndRender();
    });

    document.getElementById('btn-prev-week').addEventListener('click', function () {
      state.exactDateFilter = '';
      state.currentMondayISO = Calendar.addDaysISO(state.currentMondayISO, -7);
      checkAndRolloverMonth({ silent: true });
      persistAndRender();
    });

    document.getElementById('btn-today-week').addEventListener('click', function () {
      state.exactDateFilter = '';
      state.currentMondayISO = Calendar.getMondayOfWeek(state.todayISO);
      checkAndRolloverMonth({ silent: true });
      persistAndRender();
    });

    document.getElementById('btn-next-week').addEventListener('click', function () {
      state.exactDateFilter = '';
      state.currentMondayISO = Calendar.addDaysISO(state.currentMondayISO, 7);
      checkAndRolloverMonth({ silent: true });
      persistAndRender();
    });

    // Subject Filters
    document.getElementById('filter-subj-all').addEventListener('click', function () {
      state.subjectFilter = 'all';
      persistAndRender();
    });
    document.getElementById('filter-subj-eng').addEventListener('click', function () {
      state.subjectFilter = 'eng';
      persistAndRender();
    });
    document.getElementById('filter-subj-rus').addEventListener('click', function () {
      state.subjectFilter = 'rus';
      persistAndRender();
    });

    // Week Layout Mode Toggle
    var layoutBoardBtn = document.getElementById('layout-mode-board');
    var layoutRowsBtn = document.getElementById('layout-mode-rows');
    if (layoutBoardBtn) {
      layoutBoardBtn.addEventListener('click', function () {
        state.weekLayoutMode = 'board';
        persistAndRender();
      });
    }
    if (layoutRowsBtn) {
      layoutRowsBtn.addEventListener('click', function () {
        state.weekLayoutMode = 'rows';
        persistAndRender();
      });
    }

    // Week Day Strip Quick Tabs
    var dayTabsContainer = document.getElementById('week-day-tabs-container');
    if (dayTabsContainer) {
      dayTabsContainer.addEventListener('click', function (e) {
        var tabBtn = e.target.closest('[data-action="select-day-tab"]');
        if (!tabBtn) return;
        var clickedDate = tabBtn.getAttribute('data-date');
        if (state.exactDateFilter === clickedDate) {
          state.exactDateFilter = '';
        } else {
          state.exactDateFilter = clickedDate;
        }
        persistAndRender();
      });
    }

    // Exact Date Filter
    document.getElementById('exact-date-filter').addEventListener('change', function (e) {
      var val = e.target.value || '';
      state.exactDateFilter = val;
      if (val) {
        state.currentMondayISO = Calendar.getMondayOfWeek(val);
      }
      persistAndRender();
    });

    document.getElementById('clear-date-filter-btn').addEventListener('click', function () {
      state.exactDateFilter = '';
      persistAndRender();
    });

    document.getElementById('dashboard-clear-filters').addEventListener('click', function () {
      state.subjectFilter = 'all';
      state.exactDateFilter = '';
      persistAndRender();
    });

    // Open New Lesson Modal from Header
    document.getElementById('header-add-lesson-btn').addEventListener('click', function () {
      openLessonModal(null, state.exactDateFilter || state.todayISO);
    });

    // Open Students Modal (Desktop & Mobile) — remove hidden class immediately for instant UI response
    function handleOpenStudents() {
      state.historyStudentId = null;
      state.isStudentFormOpen = false;
      state.editingStudent = null;
      var modalEl = document.getElementById('students-modal');
      if (modalEl) modalEl.classList.remove('hidden');
      UI.renderStudentsModalContent(state);
    }
    document.getElementById('open-students-btn').addEventListener('click', handleOpenStudents);
    document
      .getElementById('open-students-btn-mobile')
      .addEventListener('click', handleOpenStudents);

    // Header search & settings drawer toggles + brand sub-links + bottom tab bar
    var settingsDrawer = document.getElementById('toolbar-settings-drawer');
    var searchToggleBtn = document.getElementById('header-search-toggle-btn');
    var menuToggleBtn = document.getElementById('header-menu-toggle-btn');

    function toggleSettingsDrawer(forceOpen) {
      if (!settingsDrawer) return;
      var willOpen =
        typeof forceOpen === 'boolean'
          ? forceOpen
          : !settingsDrawer.classList.contains('is-open');
      if (willOpen) {
        settingsDrawer.classList.add('is-open');
      } else {
        settingsDrawer.classList.remove('is-open');
      }
    }

    if (searchToggleBtn) {
      searchToggleBtn.addEventListener('click', function () {
        toggleSettingsDrawer();
        var dateFilterEl = document.getElementById('exact-date-filter');
        if (
          settingsDrawer &&
          settingsDrawer.classList.contains('is-open') &&
          dateFilterEl
        ) {
          dateFilterEl.focus();
        }
      });
    }

    if (menuToggleBtn) {
      menuToggleBtn.addEventListener('click', function () {
        toggleSettingsDrawer();
      });
    }

    function setActiveBottomTab(tabKey) {
      var tabs = document.querySelectorAll('.bottom-tab-item[data-bottom-nav]');
      for (var t = 0; t < tabs.length; t++) {
        var isMatch = tabs[t].getAttribute('data-bottom-nav') === tabKey;
        if (isMatch) {
          tabs[t].classList.add('active');
        } else {
          tabs[t].classList.remove('active');
        }
      }
    }

    function handleSectionNavigation(targetKey) {
      if (targetKey === 'students') {
        setActiveBottomTab('students');
        handleOpenStudents();
        return;
      }
      if (targetKey === 'stats') {
        setActiveBottomTab('stats');
        var statsSec = document.getElementById('stats-dashboard-section');
        if (statsSec && typeof statsSec.scrollIntoView === 'function') {
          statsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      if (targetKey === 'settings') {
        setActiveBottomTab('settings');
        toggleSettingsDrawer(true);
        if (settingsDrawer && typeof settingsDrawer.scrollIntoView === 'function') {
          settingsDrawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
      // Default: planner
      setActiveBottomTab('planner');
      var schedEl = document.getElementById('schedule');
      if (schedEl && typeof schedEl.scrollIntoView === 'function') {
        schedEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    var brandSubBtns = document.querySelectorAll('[data-nav-action]');
    for (var b = 0; b < brandSubBtns.length; b++) {
      brandSubBtns[b].addEventListener('click', function (e) {
        var target = e.currentTarget.getAttribute('data-nav-action');
        handleSectionNavigation(target);
      });
    }

    var bottomNavBtns = document.querySelectorAll('.bottom-tab-item[data-bottom-nav]');
    for (var n = 0; n < bottomNavBtns.length; n++) {
      bottomNavBtns[n].addEventListener('click', function (e) {
        var target = e.currentTarget.getAttribute('data-bottom-nav');
        handleSectionNavigation(target);
      });
    }

    // Open AutoTransfer Modal if legacy trigger exists
    var openAutoBtn = document.getElementById('open-autotransfer-btn');
    var openAutoMobileBtn = document.getElementById('open-autotransfer-btn-mobile');
    function handleOpenAutoTransfer() {
      state.transferDirection = 'prev-to-current';
      UI.renderAutoTransferModalContent(state);
      document.getElementById('autotransfer-modal').classList.remove('hidden');
    }
    if (openAutoBtn) {
      openAutoBtn.addEventListener('click', handleOpenAutoTransfer);
    }
    if (openAutoMobileBtn) {
      openAutoMobileBtn.addEventListener('click', handleOpenAutoTransfer);
    }

    // Export JSON (Desktop & Mobile)
    function handleExportJSON() {
      var json = Store.serializeDatabaseBackup(state.students, state.lessons);
      var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'tutor-planner-backup-' + state.todayISO + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotice('Резервная копия базы (JSON) сохранена.', false);
    }
    document.getElementById('export-json-btn').addEventListener('click', handleExportJSON);
    document.getElementById('export-json-btn-mobile').addEventListener('click', handleExportJSON);

    // Import JSON (Desktop & Mobile)
    var importInput = document.getElementById('import-json-input');
    document.getElementById('import-json-btn').addEventListener('click', function () {
      importInput.click();
    });
    document.getElementById('import-json-btn-mobile').addEventListener('click', function () {
      importInput.click();
    });
    importInput.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var content = String((ev.target && ev.target.result) || '');
          var parsed = Store.parseDatabaseBackupJSON(content);
          state.students = parsed.students;
          state.lessons = parsed.lessons;
          persistAndRender();
          showNotice(
            'База успешно импортирована: учеников — ' +
              parsed.students.length +
              ', уроков — ' +
              parsed.lessons.length +
              '.',
            false
          );
        } catch (err) {
          showNotice(err.message || 'Ошибка чтения JSON файла.', true);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Notice close
    document.getElementById('notice-close-btn').addEventListener('click', function () {
      document.getElementById('notice-container').style.display = 'none';
    });

    // Week Grid delegated clicks
    document.getElementById('week-grid-container').addEventListener('click', function (e) {
      var addBtn = e.target.closest('[data-action="add-lesson-on-date"]');
      if (addBtn) {
        openLessonModal(null, addBtn.getAttribute('data-date'));
        return;
      }

      var paidBtn = e.target.closest('[data-action="toggle-paid"]');
      if (paidBtn) {
        e.stopPropagation();
        var lesId = paidBtn.getAttribute('data-lesson-id');
        state.lessons = state.lessons.map(function (l) {
          return l.id === lesId
            ? Object.assign({}, l, { isPaid: !l.isPaid })
            : l;
        });
        persistAndRender();
        return;
      }

      var openBtn = e.target.closest('[data-action="open-lesson"]');
      if (openBtn) {
        var id = openBtn.getAttribute('data-lesson-id');
        var found = state.lessons.find(function (l) {
          return l.id === id;
        });
        if (found) openLessonModal(found, found.date);
      }
    });

    // Lesson Modal Controls: Student change, 1-hour duration & startTime auto-calculation
    document.getElementById('lesson-student').addEventListener('change', function (e) {
      var selectedId = e.target.value;
      var stu = state.students.find(function (s) {
        return s.id === selectedId;
      });
      if (stu) {
        document.getElementById('lesson-subject').value = stu.defaultSubject;
        var priceEl = document.getElementById('lesson-price');
        if (priceEl) {
          priceEl.value = String(
            typeof stu.defaultPrice === 'number' ? stu.defaultPrice : 1500
          );
        }
        var noteEl = document.getElementById('lesson-student-note');
        if (noteEl) noteEl.textContent = stu.notes ? 'Профиль ученика: ' + stu.notes : '';
      }
      var currentDateVal = document.getElementById('lesson-date').value;
      UI.updateSmartHomeworkBox(
        state,
        selectedId,
        currentDateVal,
        state.editingLessonId
      );
      syncTeacherNoteFieldsForStudent(selectedId, currentDateVal, null);
    });

    document.getElementById('lesson-start-time').addEventListener('change', function (e) {
      var newStart = e.target.value;
      var presetVal = document.getElementById('lesson-duration-preset').value;
      var mins = presetVal === 'custom' ? 60 : Number(presetVal) || 60;
      document.getElementById('lesson-end-time').value = Calendar.addMinutesToTime(
        newStart,
        mins
      );
    });

    document.getElementById('lesson-duration-preset').addEventListener('change', function (e) {
      var val = e.target.value;
      if (val !== 'custom') {
        var startVal = document.getElementById('lesson-start-time').value || '15:00';
        document.getElementById('lesson-end-time').value = Calendar.addMinutesToTime(
          startVal,
          Number(val) || 60
        );
      }
    });

    document.getElementById('lesson-end-time').addEventListener('change', function () {
      var sVal = document.getElementById('lesson-start-time').value;
      var eVal = document.getElementById('lesson-end-time').value;
      syncDurationSelector(sVal, eVal);
    });

    document.getElementById('lesson-date').addEventListener('change', function (e) {
      var dVal = e.target.value;
      var subtitleEl = document.getElementById('lesson-modal-subtitle');
      if (subtitleEl && dVal) {
        subtitleEl.textContent = Calendar.formatRussianDate(dVal);
      }
      var selectedStudentId = document.getElementById('lesson-student').value;
      UI.updateSmartHomeworkBox(
        state,
        selectedStudentId,
        dVal,
        state.editingLessonId
      );
      var repeatCheck = document.getElementById('lesson-repeat-weekly');
      updateRepeatHint(dVal, repeatCheck ? repeatCheck.checked : true);
    });

    var repeatWeeklyCheckbox = document.getElementById('lesson-repeat-weekly');
    if (repeatWeeklyCheckbox) {
      repeatWeeklyCheckbox.addEventListener('change', function (e) {
        var dVal = document.getElementById('lesson-date').value;
        updateRepeatHint(dVal, e.target.checked);
      });
    }

    // Teacher Note Controls inside Lesson Modal
    var teacherNoteInput = document.getElementById('lesson-teacher-note');
    var teacherNoteActiveCheck = document.getElementById('lesson-teacher-note-active');
    var disableTeacherNoteBtn = document.getElementById('disable-teacher-note-btn');

    if (teacherNoteInput) {
      teacherNoteInput.addEventListener('input', function (e) {
        var hasText = Boolean(e.target.value.trim());
        if (hasText && teacherNoteActiveCheck && !teacherNoteActiveCheck.checked) {
          teacherNoteActiveCheck.checked = true;
        }
        if (disableTeacherNoteBtn) {
          disableTeacherNoteBtn.style.display = hasText ? 'inline-flex' : 'none';
        }
      });
    }

    if (disableTeacherNoteBtn) {
      disableTeacherNoteBtn.addEventListener('click', function () {
        if (teacherNoteActiveCheck) teacherNoteActiveCheck.checked = false;
        if (teacherNoteInput) teacherNoteInput.value = '';
        disableTeacherNoteBtn.style.display = 'none';
      });
    }

    document.getElementById('lesson-is-paid').addEventListener('change', function (e) {
      updatePaidLabelText(e.target.checked);
    });

    document.getElementById('toggle-quick-student-btn').addEventListener('click', function () {
      var box = document.getElementById('quick-student-box');
      if (box) {
        box.style.display = box.style.display === 'none' ? 'flex' : 'none';
      }
    });

    var quickStudentBox = document.getElementById('quick-student-box');
    if (quickStudentBox) {
      quickStudentBox.addEventListener('click', handleColorPresetClick);
    }

    document.getElementById('save-quick-student-btn').addEventListener('click', function () {
      var nameInput = document.getElementById('quick-stu-name');
      var subjInput = document.getElementById('quick-stu-subject');
      var priceInput = document.getElementById('quick-stu-price');
      var colorInput = document.getElementById('quick-stu-color');
      var notesInput = document.getElementById('quick-stu-notes');

      var nameVal = (nameInput.value || '').trim();
      if (!nameVal) {
        showNotice('Введите имя нового ученика.', true);
        return;
      }

      var rawPrice = priceInput ? Number(priceInput.value) : 1500;
      var defaultPrice = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 1500;
      var colorVal =
        colorInput && colorInput.value ? colorInput.value : '#3b82f6';

      var newStu = {
        id: Store.createId('stu'),
        name: nameVal,
        defaultSubject: subjInput.value === 'rus' ? 'rus' : 'eng',
        defaultPrice: defaultPrice,
        color: colorVal,
        notes: (notesInput.value || '').trim(),
        teacherNote: '',
        teacherNoteActive: false,
      };
      state.students.push(newStu);
      populateLessonStudentSelect(newStu.id);
      document.getElementById('lesson-subject').value = newStu.defaultSubject;
      var lessonPriceEl = document.getElementById('lesson-price');
      if (lessonPriceEl) lessonPriceEl.value = String(newStu.defaultPrice);

      nameInput.value = '';
      notesInput.value = '';
      document.getElementById('quick-student-box').style.display = 'none';
      var currentDateVal = document.getElementById('lesson-date').value;
      UI.updateSmartHomeworkBox(
        state,
        newStu.id,
        currentDateVal,
        state.editingLessonId
      );
      syncTeacherNoteFieldsForStudent(newStu.id, currentDateVal, null);
      persistAndRender();
    });

    function executeSaveLesson(payload, applyToSeries) {
      var isEdit = Boolean(payload.id);
      propagateTeacherNoteToStudentAndSubsequentLessons(
        payload.studentId,
        payload.date,
        payload._rawTeacherNoteText,
        payload.teacherNoteActive
      );

      var syncRes = Store.saveLessonWithAutoSync(
        state.students,
        state.lessons,
        payload,
        { applyToSeries: Boolean(applyToSeries) }
      );
      state.lessons = syncRes.lessons;

      // If today is the last day of the month or the saved lesson is on the last day of the month,
      // also synchronize next month's schedule immediately.
      if (
        Calendar.isLastDayOfMonth(state.todayISO) ||
        Calendar.isLastDayOfMonth(payload.date)
      ) {
        var rolloverRes = Store.runAutoMonthRolloverIfNeeded(
          state.students,
          state.lessons,
          Calendar.isLastDayOfMonth(payload.date) ? payload.date : state.todayISO,
          { forceSyncOnLastDay: true }
        );
        if (rolloverRes && rolloverRes.triggered) {
          state.lessons = rolloverRes.lessons;
        }
      }

      if (!isEdit) {
        state.currentMondayISO = Calendar.getMondayOfWeek(payload.date);
      }

      closeAllModals();
      persistAndRender();

      var clonesCount = syncRes.createdClones ? syncRes.createdClones.length : 0;
      if (isEdit) {
        if (applyToSeries && syncRes.updatedSeriesCount > 0) {
          showNotice(
            'Урок и будущие занятия серии в этом месяце (' +
              syncRes.updatedSeriesCount +
              ') обновлены.',
            false
          );
        } else if (clonesCount > 0) {
          showNotice(
            'Урок сохранен + автоматически создано повторов до конца месяца: ' +
              clonesCount +
              '.',
            false
          );
        } else {
          showNotice('Изменения урока сохранены.', false);
        }
      } else {
        if (clonesCount > 0) {
          showNotice(
            'Урок добавлен + автоматически повторен до конца месяца (еще ' +
              clonesCount +
              ' ур.).',
            false
          );
        } else {
          showNotice('Новый урок добавлен в расписание.', false);
        }
      }
    }

    function executeDeleteLesson(lessonId, applyToSeries) {
      var delRes = Store.deleteLessonWithAutoSync(
        state.students,
        state.lessons,
        lessonId,
        Boolean(applyToSeries)
      );
      state.lessons = delRes.lessons;
      closeAllModals();
      persistAndRender();
      if (applyToSeries && delRes.deletedCount > 1) {
        showNotice(
          'Удалено уроков серии до конца месяца: ' + delRes.deletedCount + '.',
          false
        );
      } else {
        showNotice('Урок удален из расписания.', false);
      }
    }

    function promptSeriesConfirmation(actionType, futureCount, payloadOrId) {
      var box = document.getElementById('series-confirm-box');
      var msgEl = document.getElementById('series-confirm-message');
      var allBtn = document.getElementById('series-confirm-all-btn');
      var singleBtn = document.getElementById('series-confirm-single-btn');
      if (!box || !msgEl || !allBtn || !singleBtn) return;

      state.pendingSeriesAction = {
        type: actionType,
        data: payloadOrId,
      };

      if (actionType === 'delete') {
        msgEl.textContent =
          'В этом месяце найдено еще ' +
          futureCount +
          ' будущих запланированных (неоплаченных) уроков этой серии. Как выполнить удаление?';
        allBtn.textContent =
          'Удалить этот и будущие в месяце (' + (futureCount + 1) + ')';
        singleBtn.textContent = 'Удалить только этот урок';
      } else {
        msgEl.textContent =
          'В этом месяце найдено еще ' +
          futureCount +
          ' будущих запланированных уроков этой серии. Применить изменения ко всем будущим урокам в месяце?';
        allBtn.textContent =
          'Ко всем будущим в месяце (' + futureCount + ')';
        singleBtn.textContent = 'Только к этому уроку';
      }

      box.style.display = 'flex';
      if (typeof box.scrollIntoView === 'function') {
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    document.getElementById('series-confirm-all-btn').addEventListener('click', function () {
      if (!state.pendingSeriesAction) return;
      var action = state.pendingSeriesAction;
      hideSeriesConfirmBox();
      if (action.type === 'delete') {
        executeDeleteLesson(action.data, true);
      } else if (action.type === 'save') {
        executeSaveLesson(action.data, true);
      }
    });

    document.getElementById('series-confirm-single-btn').addEventListener('click', function () {
      if (!state.pendingSeriesAction) return;
      var action = state.pendingSeriesAction;
      hideSeriesConfirmBox();
      if (action.type === 'delete') {
        executeDeleteLesson(action.data, false);
      } else if (action.type === 'save') {
        executeSaveLesson(action.data, false);
      }
    });

    document.getElementById('series-confirm-cancel-btn').addEventListener('click', function () {
      hideSeriesConfirmBox();
    });

    document.getElementById('lesson-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var studentId = document.getElementById('lesson-student').value;
      var date = document.getElementById('lesson-date').value;
      var startTime = document.getElementById('lesson-start-time').value;
      var endTime = document.getElementById('lesson-end-time').value;
      var subject = document.getElementById('lesson-subject').value;
      var status = document.getElementById('lesson-status').value;
      var priceEl = document.getElementById('lesson-price');
      var rawPrice = priceEl ? Number(priceEl.value) : 1500;
      var price = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 1500;
      var classwork = document.getElementById('lesson-classwork').value.trim();
      var homework = document.getElementById('lesson-homework').value.trim();
      var hwChecked = document.getElementById('lesson-hw-checked').checked;
      var isPaid = document.getElementById('lesson-is-paid').checked;
      var paymentNote = document.getElementById('lesson-payment-note').value.trim();
      var teacherNoteText = document.getElementById('lesson-teacher-note').value.trim();
      var teacherNoteActive =
        document.getElementById('lesson-teacher-note-active').checked &&
        Boolean(teacherNoteText);
      var repeatCheckEl = document.getElementById('lesson-repeat-weekly');
      var repeatWeekly = repeatCheckEl ? repeatCheckEl.checked : true;

      if (!studentId || !date) return;

      var existingLesson = state.editingLessonId
        ? state.lessons.find(function (l) {
            return l.id === state.editingLessonId;
          })
        : null;

      var payload = {
        id: state.editingLessonId || '',
        studentId: studentId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        subject: subject,
        status: status,
        price: price,
        classwork: classwork,
        homework: homework,
        hwChecked: hwChecked,
        isPaid: isPaid,
        paymentNote: paymentNote,
        teacherNote: teacherNoteActive ? teacherNoteText : '',
        teacherNoteActive: teacherNoteActive,
        _rawTeacherNoteText: teacherNoteText,
        repeatWeekly: repeatWeekly,
        seriesId: existingLesson ? existingLesson.seriesId || '' : '',
      };

      if (existingLesson && existingLesson.status === 'planned') {
        var futureSeries = Calendar.findFutureMonthSeriesLessons(
          state.lessons,
          existingLesson
        );
        var scheduleChanged =
          existingLesson.studentId !== studentId ||
          existingLesson.date !== date ||
          existingLesson.startTime !== startTime ||
          existingLesson.endTime !== endTime ||
          existingLesson.subject !== subject ||
          existingLesson.price !== price ||
          (existingLesson.repeatWeekly !== false) !== repeatWeekly;

        if (futureSeries.length > 0 && scheduleChanged) {
          promptSeriesConfirmation('save', futureSeries.length, payload);
          return;
        }
      }

      executeSaveLesson(payload, false);
    });

    document.getElementById('delete-lesson-btn').addEventListener('click', function () {
      if (!state.editingLessonId) return;
      var existingLesson = state.lessons.find(function (l) {
        return l.id === state.editingLessonId;
      });
      if (existingLesson && existingLesson.status === 'planned') {
        var futureSeries = Calendar.findFutureMonthSeriesLessons(
          state.lessons,
          existingLesson
        );
        if (futureSeries.length > 0) {
          promptSeriesConfirmation(
            'delete',
            futureSeries.length,
            state.editingLessonId
          );
          return;
        }
      }
      executeDeleteLesson(state.editingLessonId, false);
    });

    // Students Modal delegated actions
    document.getElementById('students-back-btn').addEventListener('click', function () {
      state.historyStudentId = null;
      UI.renderStudentsModalContent(state);
    });

    document.getElementById('students-open-add-btn').addEventListener('click', function () {
      state.editingStudent = null;
      state.isStudentFormOpen = true;
      UI.renderStudentsModalContent(state);
    });

    document.getElementById('students-modal-body').addEventListener('click', function (e) {
      if (e.target.closest('[data-action="pick-student-color"]')) {
        handleColorPresetClick(e);
        return;
      }

      var closeFormBtn = e.target.closest('[data-action="close-student-form"]');
      if (closeFormBtn) {
        state.isStudentFormOpen = false;
        state.editingStudent = null;
        UI.renderStudentsModalContent(state);
        return;
      }

      var histBtn = e.target.closest('[data-action="open-student-history"]');
      if (histBtn) {
        state.historyStudentId = histBtn.getAttribute('data-student-id');
        UI.renderStudentsModalContent(state);
        return;
      }

      var editStuBtn = e.target.closest('[data-action="edit-student"]');
      if (editStuBtn) {
        var sId = editStuBtn.getAttribute('data-student-id');
        state.editingStudent =
          state.students.find(function (s) {
            return s.id === sId;
          }) || null;
        state.isStudentFormOpen = true;
        UI.renderStudentsModalContent(state);
        return;
      }

      var delStuBtn = e.target.closest('[data-action="delete-student"]');
      if (delStuBtn) {
        var delId = delStuBtn.getAttribute('data-student-id');
        state.students = state.students.filter(function (s) {
          return s.id !== delId;
        });
        state.lessons = state.lessons.filter(function (l) {
          return l.studentId !== delId;
        });
        persistAndRender();
        UI.renderStudentsModalContent(state);
        showNotice('Ученик и связанные уроки удалены.', false);
        return;
      }

      var histRow = e.target.closest('[data-action="edit-lesson-from-history"]');
      if (histRow) {
        var lesId = histRow.getAttribute('data-lesson-id');
        var foundLes = state.lessons.find(function (l) {
          return l.id === lesId;
        });
        if (foundLes) {
          closeAllModals();
          state.currentMondayISO = Calendar.getMondayOfWeek(foundLes.date);
          persistAndRender();
          openLessonModal(foundLes, foundLes.date);
        }
      }
    });

    document.getElementById('students-modal-body').addEventListener('submit', function (e) {
      if (e.target && e.target.id === 'student-directory-form') {
        e.preventDefault();
        var nameVal = document.getElementById('stu-form-name').value.trim();
        var subjVal = document.getElementById('stu-form-subject').value;
        var priceEl = document.getElementById('stu-form-price');
        var colorEl = document.getElementById('stu-form-color');
        var notesVal = document.getElementById('stu-form-notes').value.trim();
        if (!nameVal) return;

        var rawPrice = priceEl ? Number(priceEl.value) : 1500;
        var defaultPrice = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 1500;
        var colorVal = colorEl && colorEl.value ? colorEl.value : '#3b82f6';

        if (state.editingStudent) {
          var editId = state.editingStudent.id;
          var oldPrice = state.editingStudent.defaultPrice;
          state.students = state.students.map(function (s) {
            return s.id === editId
              ? Object.assign({}, s, {
                  name: nameVal,
                  defaultSubject: subjVal,
                  defaultPrice: defaultPrice,
                  color: colorVal,
                  notes: notesVal,
                })
              : s;
          });
          // Update future planned unpaid lessons of this student if they used the old default price
          state.lessons = state.lessons.map(function (l) {
            if (
              l.studentId === editId &&
              l.status === 'planned' &&
              !l.isPaid &&
              l.price === oldPrice
            ) {
              return Object.assign({}, l, { price: defaultPrice });
            }
            return l;
          });
          showNotice('Профиль ученика обновлен.', false);
        } else {
          state.students.push({
            id: Store.createId('stu'),
            name: nameVal,
            defaultSubject: subjVal,
            defaultPrice: defaultPrice,
            color: colorVal,
            notes: notesVal,
            teacherNote: '',
            teacherNoteActive: false,
          });
          showNotice('Ученик добавлен в справочник.', false);
        }

        state.isStudentFormOpen = false;
        state.editingStudent = null;
        persistAndRender();
        UI.renderStudentsModalContent(state);
      }
    });

    // AutoTransfer Modal Controls
    document.getElementById('transfer-radio-prev').addEventListener('change', function () {
      state.transferDirection = 'prev-to-current';
      UI.renderAutoTransferModalContent(state);
    });
    document.getElementById('transfer-radio-next').addEventListener('change', function () {
      state.transferDirection = 'current-to-next';
      UI.renderAutoTransferModalContent(state);
    });

    document.getElementById('confirm-autotransfer-btn').addEventListener('click', function () {
      var sourceMonday =
        state.transferDirection === 'prev-to-current'
          ? Calendar.addDaysISO(state.currentMondayISO, -7)
          : state.currentMondayISO;
      var targetMonday =
        state.transferDirection === 'prev-to-current'
          ? state.currentMondayISO
          : Calendar.addDaysISO(state.currentMondayISO, 7);

      var res = Calendar.buildAutoTransferredLessons(
        state.lessons,
        sourceMonday,
        targetMonday
      );
      if (res.createdLessons.length > 0) {
        state.lessons = state.lessons.concat(res.createdLessons);
        state.currentMondayISO = targetMonday;
        state.exactDateFilter = '';
        persistAndRender();
        showNotice('Успешно перенесено уроков: ' + res.createdLessons.length + '.', false);
      }
      closeAllModals();
    });

    // Modal close buttons & Escape key
    var closeBtns = document.querySelectorAll('[data-action="close-modal"]');
    for (var c = 0; c < closeBtns.length; c++) {
      closeBtns[c].addEventListener('click', closeAllModals);
    }

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    });
  }

  function startDateSyncWatcher() {
    setInterval(function () {
      var nowISO = Calendar.getTodayISO();
      var autoRes = Calendar.autoCompletePastLessons(state.lessons);
      if (nowISO !== state.todayISO || autoRes.updatedCount > 0) {
        state.todayISO = nowISO;
        state.lessons = autoRes.lessons;
        checkAndRolloverMonth();
        persistAndRender();
      } else {
        checkAndRolloverMonth({ silent: true });
      }
    }, 60 * 1000);
  }

  function startApp() {
    enableScreenAutoRotation();
    persistAndRender();
    checkAndRolloverMonth();
    initEventListeners();
    startDateSyncWatcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
})(typeof window !== 'undefined' ? window : globalThis);
