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
    deletedIds: initialData.deletedIds || [],
    subjectFilter: 'all',
    exactDateFilter: '',
    weekLayoutMode: 'board', // 'board' (2 columns) | 'rows' (vertical list of days)
    editingLessonId: null,
    historyStudentId: null,
    isStudentFormOpen: false,
    editingStudent: null,
    transferDirection: 'prev-to-current',
    pendingSeriesAction: null,
    syncActiveTab: 'send',
    syncHostCode: '',
  };

  // Active P2P / WebRTC state
  var activePeer = null;
  var activeBroadcastChannel = null;
  var peerJsLoadPromise = null;

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
    Store.savePlannerState(state.students, state.lessons, state.deletedIds);
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
    }, 6000);
  }

  function generateSixDigitCode() {
    var paired = Store.getPairedDeviceCode();
    if (paired && paired.length === 6) {
      return paired;
    }
    var num = Math.floor(100000 + Math.random() * 900000);
    return String(num);
  }

  function buildCurrentSyncPayloadObject() {
    return {
      version: 4,
      exportedAt: new Date().toISOString(),
      students: state.students,
      lessons: state.lessons,
      deletedIds: state.deletedIds || Store.loadDeletedIds(),
    };
  }

  function applyIncomingSyncMerge(incomingData, codeUsed, shouldRemember) {
    var mergeResult = Store.mergeSyncData(
      {
        students: state.students,
        lessons: state.lessons,
        deletedIds: state.deletedIds,
      },
      incomingData
    );

    state.students = mergeResult.students;
    state.lessons = mergeResult.lessons;
    state.deletedIds = mergeResult.deletedIds;

    if (shouldRemember && codeUsed) {
      Store.setPairedDeviceCode(codeUsed);
    }

    persistAndRender();
    UI.renderSyncModalContent(state);

    var successBox = document.getElementById('sync-success-report');
    var successDetails = document.getElementById('sync-success-details');
    if (successBox && successDetails) {
      successDetails.textContent = mergeResult.reportText;
      successBox.style.display = 'flex';
    }

    showNotice(
      '✅ Устройства успешно синхронизированы! ' + mergeResult.reportText,
      false
    );

    return mergeResult;
  }

  function setHostStatusText(text) {
    var el = document.getElementById('sync-host-status-text');
    if (el) el.textContent = text;
  }

  function setJoinStatusText(text, visible) {
    var box = document.getElementById('sync-join-status');
    var el = document.getElementById('sync-join-status-text');
    if (box) box.style.display = visible === false ? 'none' : 'inline-flex';
    if (el && text) el.textContent = text;
  }

  /**
   * Safely loads lightweight PeerJS WebRTC client when online for cross-device 6-digit P2P sync,
   * validating response content first so HTML proxy/error pages never cause SyntaxError: Unexpected token '<'.
   */
  function loadPeerJsClientIfAvailable() {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (window.Peer) return Promise.resolve(window.Peer);
    if (
      (window.location && window.location.protocol === 'file:') ||
      (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      typeof fetch !== 'function'
    ) {
      return Promise.resolve(null);
    }
    if (peerJsLoadPromise) return peerJsLoadPromise;

    peerJsLoadPromise = new Promise(function (resolve) {
      var done = false;
      var controller =
        typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (!done) {
          done = true;
          if (controller) {
            try {
              controller.abort();
            } catch (e) {
              // Ignore abort error
            }
          }
          resolve(window.Peer || null);
        }
      }, 3500);

      try {
        fetch('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', {
          method: 'GET',
          signal: controller ? controller.signal : undefined,
        })
          .then(function (res) {
            if (!res || !res.ok) return '';
            var contentType = (res.headers && res.headers.get('content-type')) || '';
            if (contentType.indexOf('text/html') !== -1) return '';
            return res.text();
          })
          .then(function (codeText) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            var trimmed = String(codeText || '').trim();
            if (!trimmed || trimmed.charAt(0) === '<') {
              resolve(null);
              return;
            }
            try {
              var runner = new Function(trimmed);
              runner.call(window);
            } catch (evalErr) {
              // Ignore evaluation errors in restricted environments
            }
            resolve(window.Peer || null);
          })
          .catch(function () {
            if (!done) {
              done = true;
              clearTimeout(timer);
              resolve(null);
            }
          });
      } catch (e) {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(null);
        }
      }
    });

    return peerJsLoadPromise;
  }

  function cleanupActiveP2PSession() {
    if (activeBroadcastChannel) {
      try {
        activeBroadcastChannel.close();
      } catch (e) {
        // Ignore close error
      }
      activeBroadcastChannel = null;
    }
    if (activePeer) {
      try {
        activePeer.destroy();
      } catch (e) {
        // Ignore destroy error
      }
      activePeer = null;
    }
  }

  /**
   * Starts listening as Host for the 6-digit code over both:
   * 1) Local P2P BroadcastChannel / WebRTC DataChannel
   * 2) Cross-device WebRTC PeerJS DataChannel ('tutor-planner-p2p-' + code6)
   */
  function startHostSyncListener(code6) {
    var cleanCode = String(code6 || '').replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) return;

    cleanupActiveP2PSession();
    setHostStatusText(
      'Ожидание подключения второго устройства по коду ' +
        UI.formatSixDigitCode(cleanCode) +
        '...'
    );

    // 1. Local BroadcastChannel P2P listener (instant across local tabs/windows)
    if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
      try {
        activeBroadcastChannel = new window.BroadcastChannel(
          'tutor_planner_p2p_' + cleanCode
        );
        activeBroadcastChannel.onmessage = function (ev) {
          var data = ev.data;
          if (!data || data.type !== 'SYNC_REQUEST') return;
          var rememberHostEl = document.getElementById('sync-remember-host-check');
          var shouldRemember = rememberHostEl ? rememberHostEl.checked : true;
          applyIncomingSyncMerge(data.payload, cleanCode, shouldRemember);
          setHostStatusText('✅ Синхронизация успешно завершена!');
          activeBroadcastChannel.postMessage({
            type: 'SYNC_RESPONSE',
            payload: buildCurrentSyncPayloadObject(),
          });
        };
      } catch (e) {
        // BroadcastChannel optional
      }
    }

    // 2. WebRTC P2P listener for cross-device connection (phone <-> tablet <-> PC)
    loadPeerJsClientIfAvailable().then(function (PeerConstructor) {
      if (!PeerConstructor || state.syncHostCode !== cleanCode) return;
      try {
        var peerId = 'tutor-planner-p2p-' + cleanCode;
        var peer = new PeerConstructor(peerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });
        activePeer = peer;

        peer.on('open', function () {
          setHostStatusText(
            'Готово к связыванию по коду ' +
              UI.formatSixDigitCode(cleanCode) +
              '. Введите этот код на втором устройстве.'
          );
        });

        peer.on('connection', function (conn) {
          setHostStatusText('Устройство подключено, выполняем умное слияние...');
          conn.on('data', function (msg) {
            if (msg && msg.type === 'SYNC_REQUEST' && msg.payload) {
              var rememberHostEl = document.getElementById('sync-remember-host-check');
              var shouldRemember = rememberHostEl ? rememberHostEl.checked : true;
              applyIncomingSyncMerge(msg.payload, cleanCode, shouldRemember);
              conn.send({
                type: 'SYNC_RESPONSE',
                payload: buildCurrentSyncPayloadObject(),
              });
              setHostStatusText('✅ Устройства успешно синхронизированы!');
            }
          });
        });

        peer.on('error', function () {
          setHostStatusText(
            'Код ' +
              UI.formatSixDigitCode(cleanCode) +
              ' активен (при работе без интернета используйте кнопку Bluetooth / Quick Share ниже).'
          );
        });
      } catch (e) {
        // Fallback if WebRTC blocked
      }
    });
  }

  /**
   * Connects to another device by its 6-digit code, exchanges databases in both directions,
   * and executes Smart Merge on both screens.
   */
  function connectAndSyncBySixDigitCode(rawCode, shouldRemember) {
    var cleanCode = String(rawCode || '').replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      showNotice('Введите 6 цифр кода со второго устройства.', true);
      return;
    }

    setJoinStatusText(
      'Поиск устройства по коду ' + UI.formatSixDigitCode(cleanCode) + '...',
      true
    );

    var resolved = false;
    var localPayload = buildCurrentSyncPayloadObject();

    // 1. Try instant local BroadcastChannel / storage bridge first
    if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
      try {
        var joinChannel = new window.BroadcastChannel(
          'tutor_planner_p2p_' + cleanCode
        );
        joinChannel.onmessage = function (ev) {
          var data = ev.data;
          if (!data || data.type !== 'SYNC_RESPONSE' || resolved) return;
          resolved = true;
          applyIncomingSyncMerge(data.payload, cleanCode, shouldRemember);
          setJoinStatusText('✅ Устройства успешно синхронизированы!', true);
          try {
            joinChannel.close();
          } catch (e) {
            // Ignore
          }
        };
        joinChannel.postMessage({
          type: 'SYNC_REQUEST',
          payload: localPayload,
        });
      } catch (e) {
        // Ignore BroadcastChannel error
      }
    }

    // 2. Connect over WebRTC P2P DataChannel to 'tutor-planner-p2p-' + cleanCode
    loadPeerJsClientIfAvailable().then(function (PeerConstructor) {
      if (resolved) return;
      if (!PeerConstructor) {
        setTimeout(function () {
          if (!resolved) {
            setJoinStatusText(
              'Прямое соединение недоступно без сети. Нажмите «📲 Передать через Bluetooth / Quick Share» ниже.',
              true
            );
          }
        }, 1200);
        return;
      }

      try {
        var clientPeer = new PeerConstructor({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        var timeoutId = setTimeout(function () {
          if (!resolved) {
            setJoinStatusText(
              'Второе устройство не найдено по коду ' +
                UI.formatSixDigitCode(cleanCode) +
                '. Проверьте, открыто ли окно с этим кодом на втором устройстве.',
              true
            );
            try {
              clientPeer.destroy();
            } catch (e) {
              // Ignore
            }
          }
        }, 8000);

        clientPeer.on('open', function () {
          var conn = clientPeer.connect('tutor-planner-p2p-' + cleanCode, {
            reliable: true,
          });

          conn.on('open', function () {
            setJoinStatusText('Соединение установлено, объединяем расписание...', true);
            conn.send({
              type: 'SYNC_REQUEST',
              payload: localPayload,
            });
          });

          conn.on('data', function (msg) {
            if (msg && msg.type === 'SYNC_RESPONSE' && msg.payload && !resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              applyIncomingSyncMerge(msg.payload, cleanCode, shouldRemember);
              setJoinStatusText('✅ Устройства успешно синхронизированы!', true);
              setTimeout(function () {
                try {
                  clientPeer.destroy();
                } catch (e) {
                  // Ignore
                }
              }, 1000);
            }
          });

          conn.on('error', function () {
            if (!resolved) {
              clearTimeout(timeoutId);
              setJoinStatusText(
                'Не удалось связаться по коду. Используйте кнопку Bluetooth / Quick Share ниже.',
                true
              );
            }
          });
        });

        clientPeer.on('error', function () {
          if (!resolved) {
            clearTimeout(timeoutId);
            setJoinStatusText(
              'Второе устройство с кодом ' +
                UI.formatSixDigitCode(cleanCode) +
                ' сейчас не в сети. Проверьте код или передайте через Bluetooth / Quick Share.',
              true
            );
          }
        });
      } catch (e) {
        if (!resolved) {
          setJoinStatusText(
            'Для передачи без интернета нажмите «📲 Передать через Bluetooth / Quick Share».',
            true
          );
        }
      }
    });
  }

  /**
   * Method 2: Offline 1-tap share via Android native Share Sheet (Bluetooth / Quick Share / Messengers)
   * using Web Share API Level 2 (navigator.share with File), with automatic file download fallback.
   */
  function handleAndroidNativeShare() {
    var json = Store.serializeDatabaseBackup(
      state.students,
      state.lessons,
      state.deletedIds
    );
    var fileName = 'raspisanie-sinhronizaciya-' + state.todayISO + '.json';

    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof File === 'function'
      ) {
        var syncFile = new File([json], fileName, {
          type: 'application/json',
        });
        var shareData = {
          title: 'Планер репетитора — Синхронизация расписания',
          text: 'Откройте этот файл во втором устройстве через кнопку «Принять файл синхронизации»',
          files: [syncFile],
        };

        if (!navigator.canShare || navigator.canShare({ files: [syncFile] })) {
          navigator
            .share(shareData)
            .then(function () {
              showNotice(
                'Файл синхронизации отправлен! На втором устройстве нажмите «Принять файл синхронизации».',
                false
              );
            })
            .catch(function (err) {
              if (err && err.name === 'AbortError') return;
              triggerFallbackDownload(json, fileName);
            });
          return;
        }
      }
    } catch (e) {
      // Fallback to direct file download
    }

    triggerFallbackDownload(json, fileName);
  }

  function triggerFallbackDownload(jsonContent, fileName) {
    var blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'raspisanie-sinhronizaciya-' + state.todayISO + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice(
      'Файл синхронизации сохранен. Передайте его на второе устройство через Bluetooth или Quick Share.',
      false
    );
  }

  function openSyncModal(initialTab) {
    var modal = document.getElementById('sync-modal');
    if (!modal) return;

    state.syncActiveTab = initialTab || 'send';
    if (!state.syncHostCode) {
      state.syncHostCode = generateSixDigitCode();
    }

    var successBox = document.getElementById('sync-success-report');
    if (successBox) successBox.style.display = 'none';
    setJoinStatusText('', false);

    UI.renderSyncModalContent(state);
    modal.classList.remove('hidden');

    if (state.syncActiveTab === 'send') {
      startHostSyncListener(state.syncHostCode);
    }
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

    if (state.students.length === 0) {
      selectEl.innerHTML =
        '<option value="">— Сначала создайте ученика ниже —</option>';
      if (noteEl) noteEl.textContent = '';
      return;
    }

    var html = '';
    for (var i = 0; i < state.students.length; i++) {
      var s = state.students[i];
      var isSelected = s.id === selectedStudentId;
      var sPrice =
        typeof s.defaultPrice === 'number' && !isNaN(s.defaultPrice)
          ? s.defaultPrice
          : 0;
      html +=
        '<option value="' +
        UI.escapeHtml(s.id) +
        '"' +
        (isSelected ? ' selected' : '') +
        '>' +
        UI.escapeHtml(s.name) +
        ' (' +
        (s.defaultSubject === 'rus' ? 'Русский' : 'Английский') +
        (sPrice > 0 ? ' · ' + Calendar.formatCurrency(sPrice) : '') +
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

    if (quickBox) {
      quickBox.style.display = state.students.length === 0 ? 'flex' : 'none';
    }

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
        ? String(lessonOrNull.price)
        : selectedStu &&
          typeof selectedStu.defaultPrice === 'number' &&
          selectedStu.defaultPrice > 0
        ? String(selectedStu.defaultPrice)
        : '';
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
    if (priceInput) priceInput.value = priceVal;
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
    cleanupActiveP2PSession();
    var ids = ['lesson-modal', 'students-modal', 'autotransfer-modal', 'sync-modal'];
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
    var nowTs = Date.now();
    var cleanText = (noteText || '').trim();
    var finalActive = Boolean(isActive && cleanText);

    state.students = state.students.map(function (s) {
      if (s.id !== studentId) return s;
      return Object.assign({}, s, {
        teacherNote: finalActive ? cleanText : '',
        teacherNoteActive: finalActive,
        updatedAt: nowTs,
      });
    });

    state.lessons = state.lessons.map(function (l) {
      if (l.studentId !== studentId) return l;
      if (l.date >= fromDate) {
        return Object.assign({}, l, {
          teacherNote: finalActive ? cleanText : '',
          teacherNoteActive: finalActive,
          updatedAt: nowTs,
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

    // Open Students Modal (Desktop & Mobile)
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

    // Open Sync Modal (Desktop & Mobile)
    var openSyncBtn = document.getElementById('open-sync-modal-btn');
    var openSyncMobileBtn = document.getElementById('open-sync-modal-btn-mobile');
    if (openSyncBtn) {
      openSyncBtn.addEventListener('click', function () {
        openSyncModal('send');
      });
    }
    if (openSyncMobileBtn) {
      openSyncMobileBtn.addEventListener('click', function () {
        openSyncModal('send');
      });
    }

    // 1-Click Quick Sync with Remembered Device
    var quickHeaderSyncBtn = document.getElementById('quick-oneclick-sync-header-btn');
    if (quickHeaderSyncBtn) {
      quickHeaderSyncBtn.addEventListener('click', function () {
        var paired = Store.getPairedDeviceCode();
        if (paired) {
          openSyncModal('receive');
          var inp = document.getElementById('sync-input-code');
          if (inp) inp.value = UI.formatSixDigitCode(paired);
          connectAndSyncBySixDigitCode(paired, true);
        } else {
          openSyncModal('send');
        }
      });
    }

    // Sync Modal Internal Controls
    var tabSendBtn = document.getElementById('sync-tab-btn-send');
    var tabReceiveBtn = document.getElementById('sync-tab-btn-receive');
    if (tabSendBtn) {
      tabSendBtn.addEventListener('click', function () {
        state.syncActiveTab = 'send';
        if (!state.syncHostCode) {
          state.syncHostCode = generateSixDigitCode();
        }
        UI.renderSyncModalContent(state);
        startHostSyncListener(state.syncHostCode);
      });
    }
    if (tabReceiveBtn) {
      tabReceiveBtn.addEventListener('click', function () {
        state.syncActiveTab = 'receive';
        UI.renderSyncModalContent(state);
        var inp = document.getElementById('sync-input-code');
        if (inp) inp.focus();
      });
    }

    var copyCodeBtn = document.getElementById('sync-copy-code-btn');
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener('click', function () {
        var formatted = UI.formatSixDigitCode(state.syncHostCode);
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(formatted).then(function () {
            showNotice('Код ' + formatted + ' скопирован.', false);
          });
        } else {
          showNotice('Ваш код синхронизации: ' + formatted, false);
        }
      });
    }

    var regenCodeBtn = document.getElementById('sync-regenerate-code-btn');
    if (regenCodeBtn) {
      regenCodeBtn.addEventListener('click', function () {
        var random6 = String(Math.floor(100000 + Math.random() * 900000));
        state.syncHostCode = random6;
        UI.renderSyncModalContent(state);
        startHostSyncListener(random6);
      });
    }

    var syncCodeInput = document.getElementById('sync-input-code');
    if (syncCodeInput) {
      syncCodeInput.addEventListener('input', function (e) {
        var digits = String(e.target.value || '').replace(/\D/g, '').slice(0, 6);
        e.target.value = UI.formatSixDigitCode(digits);
      });
    }

    var syncConnectBtn = document.getElementById('sync-connect-code-btn');
    if (syncConnectBtn) {
      syncConnectBtn.addEventListener('click', function () {
        var inp = document.getElementById('sync-input-code');
        var remCheck = document.getElementById('sync-remember-device-check');
        var rawVal = inp ? inp.value : '';
        var remember = remCheck ? remCheck.checked : true;
        connectAndSyncBySixDigitCode(rawVal, remember);
      });
    }

    var syncOneClickNowBtn = document.getElementById('sync-oneclick-now-btn');
    if (syncOneClickNowBtn) {
      syncOneClickNowBtn.addEventListener('click', function () {
        var paired = Store.getPairedDeviceCode();
        if (!paired) return;
        state.syncActiveTab = 'receive';
        UI.renderSyncModalContent(state);
        var inp = document.getElementById('sync-input-code');
        if (inp) inp.value = UI.formatSixDigitCode(paired);
        connectAndSyncBySixDigitCode(paired, true);
      });
    }

    var syncForgetBtn = document.getElementById('sync-forget-device-btn');
    if (syncForgetBtn) {
      syncForgetBtn.addEventListener('click', function () {
        Store.setPairedDeviceCode('');
        UI.renderHeaderControls(state);
        UI.renderSyncModalContent(state);
        showNotice('Связанное устройство удалено из памяти.', false);
      });
    }

    var androidShareBtn = document.getElementById('sync-android-share-btn');
    if (androidShareBtn) {
      androidShareBtn.addEventListener('click', handleAndroidNativeShare);
    }

    var acceptFileBtn = document.getElementById('sync-accept-file-btn');
    var importInput = document.getElementById('import-json-input');
    if (acceptFileBtn && importInput) {
      acceptFileBtn.addEventListener('click', function () {
        importInput.click();
      });
    }

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
      if (targetKey === 'sync') {
        setActiveBottomTab('sync');
        openSyncModal('send');
        return;
      }
      if (targetKey === 'stats') {
        setActiveBottomTab('planner');
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

    // Save local backup file (from Sync modal footer)
    var exportBtn = document.getElementById('export-json-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        var json = Store.serializeDatabaseBackup(
          state.students,
          state.lessons,
          state.deletedIds
        );
        triggerFallbackDownload(
          json,
          'raspisanie-rezervnaya-kopiya-' + state.todayISO + '.json'
        );
      });
    }

    // Accept & Smart-Merge Sync File (Desktop, Mobile, and Sync Modal)
    var importBtn = document.getElementById('import-json-btn');
    var importMobileBtn = document.getElementById('import-json-btn-mobile');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', function () {
        importInput.click();
      });
    }
    if (importMobileBtn && importInput) {
      importMobileBtn.addEventListener('click', function () {
        importInput.click();
      });
    }
    if (importInput) {
      importInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          try {
            var content = String((ev.target && ev.target.result) || '');
            applyIncomingSyncMerge(content, '', false);
          } catch (err) {
            showNotice(
              err.message || 'Не удалось прочитать файл синхронизации.',
              true
            );
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      });
    }

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
        var nowTs = Date.now();
        state.lessons = state.lessons.map(function (l) {
          return l.id === lesId
            ? Object.assign({}, l, { isPaid: !l.isPaid, updatedAt: nowTs })
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

    // Lesson Modal Controls
    document.getElementById('lesson-student').addEventListener('change', function (e) {
      var selectedId = e.target.value;
      var stu = state.students.find(function (s) {
        return s.id === selectedId;
      });
      if (stu) {
        document.getElementById('lesson-subject').value = stu.defaultSubject;
        var priceEl = document.getElementById('lesson-price');
        if (priceEl) {
          priceEl.value =
            typeof stu.defaultPrice === 'number' && stu.defaultPrice > 0
              ? String(stu.defaultPrice)
              : '';
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

      var rawPrice =
        priceInput && priceInput.value !== '' ? Number(priceInput.value) : 0;
      var defaultPrice = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
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
        updatedAt: Date.now(),
      };
      state.students.push(newStu);
      populateLessonStudentSelect(newStu.id);
      document.getElementById('lesson-subject').value = newStu.defaultSubject;
      var lessonPriceEl = document.getElementById('lesson-price');
      if (lessonPriceEl) {
        lessonPriceEl.value = newStu.defaultPrice > 0 ? String(newStu.defaultPrice) : '';
      }

      nameInput.value = '';
      if (priceInput) priceInput.value = '';
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
      if (syncRes.deletedIds) {
        state.deletedIds = syncRes.deletedIds;
      }

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
      if (delRes.deletedIds) {
        state.deletedIds = delRes.deletedIds;
      }
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
      var rawPrice =
        priceEl && priceEl.value !== '' ? Number(priceEl.value) : 0;
      var price = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
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

      if (!studentId) {
        showNotice('Пожалуйста, сначала создайте или выберите ученика.', true);
        return;
      }
      if (!date) return;

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
        updatedAt: Date.now(),
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

      if (e.target.closest('[data-action="empty-open-add-student"]')) {
        state.editingStudent = null;
        state.isStudentFormOpen = true;
        UI.renderStudentsModalContent(state);
        return;
      }

      if (e.target.closest('[data-action="empty-open-sync"]')) {
        closeAllModals();
        openSyncModal('send');
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
        var delStuRes = Store.deleteStudentWithAutoSync(
          state.students,
          state.lessons,
          delId
        );
        state.students = delStuRes.students;
        state.lessons = delStuRes.lessons;
        state.deletedIds = delStuRes.deletedIds;
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

        var rawPrice =
          priceEl && priceEl.value !== '' ? Number(priceEl.value) : 0;
        var defaultPrice = !isNaN(rawPrice) && rawPrice >= 0 ? rawPrice : 0;
        var colorVal = colorEl && colorEl.value ? colorEl.value : '#3b82f6';
        var nowTs = Date.now();

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
                  updatedAt: nowTs,
                })
              : s;
          });
          state.lessons = state.lessons.map(function (l) {
            if (
              l.studentId === editId &&
              l.status === 'planned' &&
              !l.isPaid &&
              l.price === oldPrice
            ) {
              return Object.assign({}, l, {
                price: defaultPrice,
                updatedAt: nowTs,
              });
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
            updatedAt: nowTs,
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
        var nowTs = Date.now();
        var stamped = res.createdLessons.map(function (l) {
          return Object.assign({}, l, { updatedAt: nowTs });
        });
        state.lessons = state.lessons.concat(stamped);
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
