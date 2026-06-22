/* ============================================
   Attendance Tracker — Attendance Entry
   Day 3 — Selections, two-phase form, validation
   Day 4 — Live percentage engine + persistence
   Day 4.1 — Professional summary UI restructure
   ============================================ */

(function () {
  'use strict';

  const MONTHS = [
    { v: '01', n: 'January'   }, { v: '02', n: 'February' },
    { v: '03', n: 'March'     }, { v: '04', n: 'April'    },
    { v: '05', n: 'May'       }, { v: '06', n: 'June'     },
    { v: '07', n: 'July'      }, { v: '08', n: 'August'   },
    { v: '09', n: 'September' }, { v: '10', n: 'October'  },
    { v: '11', n: 'November'  }, { v: '12', n: 'December' }
  ];

  // Color thresholds (Day 4)
  const TH_GOOD = 85;   // ≥ green
  const TH_WARN = 75;   // ≥ amber, < 85
  // < 75 = red

  // Cached elements
  const studentSelect = document.getElementById('studentSelect');
  const monthSelect   = document.getElementById('monthSelect');
  const emptyStudents = document.getElementById('emptyStudents');

  const p1Working  = document.getElementById('p1Working');
  const p1Attended = document.getElementById('p1Attended');
  const p2Working  = document.getElementById('p2Working');
  const p2Attended = document.getElementById('p2Attended');

  const form        = document.getElementById('attendanceForm');
  const messageEl   = document.getElementById('formMessage');
  const saveBtn     = document.getElementById('saveBtn');
  const clearBtn    = document.getElementById('clearBtn');
  const summaryBox  = document.getElementById('summaryBox');
  const lastSaved   = document.getElementById('lastSaved');

  // Day 4.1 — New dashboard UI targets
  const infoName  = document.getElementById('infoName');
  const infoPin   = document.getElementById('infoPin');
  const infoMonth = document.getElementById('infoMonth');

  const p1StatCard = document.getElementById('p1StatCard');
  const p2StatCard = document.getElementById('p2StatCard');
  const monthlyHighlight = document.getElementById('monthlyHighlight');
  const p1StatusPill = document.getElementById('p1StatusPill');
  const p2StatusPill = document.getElementById('p2StatusPill');
  const monthlyStatusPill = document.getElementById('monthlyStatusPill');
  const p1Ratio = document.getElementById('p1Ratio');
  const p2Ratio = document.getElementById('p2Ratio');
  const p1StatPct = document.getElementById('p1StatPct');
  const p2StatPct = document.getElementById('p2StatPct');
  const mhPct = document.getElementById('mhPct');
  const mhRatio = document.getElementById('mhRatio');
  const mhSub = document.getElementById('mhSub');

  // Day 5 — Overall Attendance + Monthly Breakdown targets
  const overallHighlight = document.getElementById('overallHighlight');
  const overallPct = document.getElementById('overallPct');
  const overallRatio = document.getElementById('overallRatio');
  const overallSub = document.getElementById('overallSub');
  const overallStatusPill = document.getElementById('overallStatusPill');
  const breakdownList = document.getElementById('breakdownList');
  const breakdownEmpty = document.getElementById('breakdownEmpty');
  const breakdownHint = document.getElementById('breakdownHint');

  /* ---------- Helpers ---------- */
  function setMessage(text, type) {
    messageEl.textContent = text || '';
    messageEl.className = type === 'error' ? 'error-msg' : 'success-msg';
    if (text) {
      clearTimeout(setMessage._t);
      setMessage._t = setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = '';
      }, 3500);
    }
  }

  function currentYear() { return new Date().getFullYear(); }
  function currentMonth() {
    return String(new Date().getMonth() + 1).padStart(2, '0');
  }

  function monthKey(year, mm) { return `${year}-${mm}`; }
  function monthLabel(ym) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  function getStudents() { return AT.storage.get().students; }

  function toNonNegInt(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  }

  /* ---------- Day 4: Percentage engine ---------- */
  function calcPhasePct(attended, working) {
    if (!Number.isFinite(working) || working <= 0) return 0;
    if (!Number.isFinite(attended) || attended < 0) return 0;
    const raw = (attended / working) * 100;
    return Math.round(raw * 100) / 100; // 2 decimals
  }

  function calcMonthlyPct(a1, w1, a2, w2) {
    const totalW = (Number(w1) || 0) + (Number(w2) || 0);
    if (totalW <= 0) return 0;
    const totalA = (Number(a1) || 0) + (Number(a2) || 0);
    const raw = (totalA / totalW) * 100;
    return Math.round(raw * 100) / 100;
  }

  function pctClass(pct) {
    if (!Number.isFinite(pct) || pct <= 0) return 'none';
    if (pct >= TH_GOOD) return 'good';
    if (pct >= TH_WARN)  return 'warn';
    return 'bad';
  }

  function statusLabel(cls) {
    switch (cls) {
      case 'good': return 'Good';
      case 'warn': return 'Warning';
      case 'bad':  return 'Below 75';
      default:     return 'No Data';
    }
  }

  function applyPctClass(el, pct) {
    el.classList.remove('good', 'warn', 'bad', 'none');
    el.classList.add(pctClass(pct));
  }

  function fmtPct(pct) {
    return (Math.round((pct || 0) * 100) / 100).toFixed(2) + '%';
  }

  /** Read current input values, compute all 3 pcts, update DOM */
  function updateAllPct() {
    const w1 = toNonNegInt(p1Working.value);
    const a1 = toNonNegInt(p1Attended.value);
    const w2 = toNonNegInt(p2Working.value);
    const a2 = toNonNegInt(p2Attended.value);

    const p1Pct = calcPhasePct(a1 == null ? 0 : a1, w1 == null ? 0 : w1);
    const p2Pct = calcPhasePct(a2 == null ? 0 : a2, w2 == null ? 0 : w2);
    const mPct  = calcMonthlyPct(
      a1 == null ? 0 : a1, w1 == null ? 0 : w1,
      a2 == null ? 0 : a2, w2 == null ? 0 : w2
    );

    // Day 4.1 — Update redesigned phase + highlight cards
    updatePhaseCards(w1 || 0, a1 || 0, w2 || 0, a2 || 0, p1Pct, p2Pct, mPct);

    return { p1Pct, p2Pct, mPct };
  }

  /* ---------- Day 4.1: Student Information card ---------- */
  function updateStudentInfo() {
    const stuId = studentSelect.value;
    const mm = monthSelect.value;
    const state = AT.storage.get();
    const stu = stuId ? state.students.find(s => s.id === stuId) : null;

    infoName.textContent  = stu ? stu.name : '—';
    infoPin.textContent   = stu ? stu.pin  : '—';
    infoMonth.textContent = mm ? monthLabel(monthKey(currentYear(), mm)) : '—';
  }

  /* ---------- Day 4.1: Phase + Highlight cards ---------- */
  function updatePhaseCards(w1, a1, w2, a2, p1Pct, p2Pct, mPct) {
    // Phase 1
    p1Ratio.textContent = `${a1} / ${w1}`;
    p1StatPct.textContent = fmtPct(p1Pct);
    const c1 = pctClass(p1Pct);
    applyPctClass(p1StatCard, p1Pct);
    p1StatusPill.classList.remove('good', 'warn', 'bad', 'none');
    p1StatusPill.classList.add(c1);
    p1StatusPill.textContent = statusLabel(c1);

    // Phase 2
    p2Ratio.textContent = `${a2} / ${w2}`;
    p2StatPct.textContent = fmtPct(p2Pct);
    const c2 = pctClass(p2Pct);
    applyPctClass(p2StatCard, p2Pct);
    p2StatusPill.classList.remove('good', 'warn', 'bad', 'none');
    p2StatusPill.classList.add(c2);
    p2StatusPill.textContent = statusLabel(c2);

    // Monthly highlight
    mhPct.textContent = fmtPct(mPct);
    mhRatio.textContent = `${a1 + a2} / ${w1 + w2}`;
    mhSub.textContent = `${monthLabel(monthKey(currentYear(), monthSelect.value))} · Phase 1 + Phase 2 combined`;
    const cm = pctClass(mPct);
    monthlyHighlight.classList.remove('good', 'warn', 'bad', 'none');
    monthlyHighlight.classList.add(cm);
    monthlyStatusPill.classList.remove('good', 'warn', 'bad', 'none');
    monthlyStatusPill.classList.add(cm);
    monthlyStatusPill.textContent = statusLabel(cm);
  }

  /* ---------- Day 5: Overall Attendance engine ---------- */
  // Status thresholds for OVERALL (per spec): ≥90 Excellent, 75-89.99 Safe, <75 Warning
  const TH_OVERALL_EXCELLENT = 90;
  const TH_OVERALL_SAFE = 75;
  // < 75 = Warning

  function overallClass(pct) {
    if (!Number.isFinite(pct) || pct <= 0) return 'none';
    if (pct >= TH_OVERALL_EXCELLENT) return 'good';   // green
    if (pct >= TH_OVERALL_SAFE)      return 'warn';   // amber
    return 'bad';                                     // red
  }

  function overallLabel(cls) {
    switch (cls) {
      case 'good': return 'Excellent';
      case 'warn': return 'Safe';
      case 'bad':  return 'Warning';
      default:     return 'No Data';
    }
  }

  /**
   * Compute overall attendance for a student across all saved months.
   * Formula: (sum of attended / sum of working) × 100
   * Returns { overall, totalW, totalA, months: [{ym, label, pct, w, a}] }
   */
  function calcOverallPct(stuId) {
    const state = AT.storage.get();
    const wd = state.meta.workingDays || {};
    const ad = state.meta.attendedDays || {};

    let totalW = 0;
    let totalA = 0;
    const months = [];

    Object.keys(wd).sort().forEach(ym => {
      const w = wd[ym];
      const studentAttended = ad[ym]?.[stuId];
      if (!w || studentAttended == null) return; // skip incomplete months

      const wSum = (Number(w.phase1) || 0) + (Number(w.phase2) || 0);
      const aSum = (Number(studentAttended.phase1) || 0) +
                   (Number(studentAttended.phase2) || 0);

      // Skip zero-working months to avoid skewing the average
      if (wSum <= 0) return;

      totalW += wSum;
      totalA += aSum;

      months.push({
        ym,
        label: monthLabel(ym),
        pct: calcPhasePct(aSum, wSum),
        w: wSum,
        a: aSum
      });
    });

    const overall = totalW > 0
      ? Math.round(((totalA / totalW) * 100) * 100) / 100
      : 0;

    return { overall, totalW, totalA, months };
  }

  function updateOverallCard(stuId, result) {
    const stu = AT.storage.get().students.find(s => s.id === stuId);

    if (!stu || result.months.length === 0) {
      overallPct.textContent = '0.00%';
      overallRatio.textContent = '0 / 0';
      overallSub.textContent = stu
        ? 'No monthly records saved for this student yet.'
        : 'Select a student to see overall attendance';
      overallHighlight.classList.remove('good', 'warn', 'bad', 'none');
      overallHighlight.classList.add('none');
      overallStatusPill.classList.remove('good', 'warn', 'bad', 'none');
      overallStatusPill.classList.add('none');
      overallStatusPill.textContent = 'No Data';
      return;
    }

    overallPct.textContent = fmtPct(result.overall);
    overallRatio.textContent = `${result.totalA} / ${result.totalW}`;
    overallSub.textContent =
      `${stu.name} (${stu.pin}) · ${result.months.length} saved month${result.months.length === 1 ? '' : 's'}`;

    const cls = overallClass(result.overall);
    overallHighlight.classList.remove('good', 'warn', 'bad', 'none');
    overallHighlight.classList.add(cls);
    overallStatusPill.classList.remove('good', 'warn', 'bad', 'none');
    overallStatusPill.classList.add(cls);
    overallStatusPill.textContent = overallLabel(cls);
  }

  function updateMonthlyBreakdown(stuId, months) {
    if (!stuId || months.length === 0) {
      breakdownList.innerHTML = '';
      breakdownEmpty.style.display = stuId ? 'block' : 'none';
      breakdownHint.style.display = stuId ? 'none' : 'block';
      return;
    }
    breakdownEmpty.style.display = 'none';
    breakdownHint.style.display = 'none';

    // Sort newest first
    const sorted = months.slice().sort((a, b) => b.ym.localeCompare(a.ym));

    breakdownList.innerHTML = sorted.map(m => {
      const cls = overallClass(m.pct);
      const label = overallLabel(cls);
      return `
        <div class="breakdown-row ${cls}">
          <div class="bd-left">
            <span class="bd-month">${m.label}</span>
            <span class="bd-ratio">${m.a} / ${m.w} attended</span>
          </div>
          <div class="bd-right">
            <span class="bd-pct">${fmtPct(m.pct)}</span>
            <span class="status-pill ${cls}">${label}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /** Refresh overall card + breakdown for the selected student */
  function refreshOverall() {
    const stuId = studentSelect.value;
    if (!stuId) {
      updateOverallCard(null, { months: [] });
      updateMonthlyBreakdown(null, []);
      return;
    }
    const result = calcOverallPct(stuId);
    updateOverallCard(stuId, result);
    updateMonthlyBreakdown(stuId, result.months);

    // Persist overall % for future Reports / Dashboard use
    const state = AT.storage.get();
    state.meta.overall = state.meta.overall || {};
    state.meta.overall[stuId] = {
      overall: result.overall,
      totalAttended: result.totalA,
      totalWorking: result.totalW,
      monthsCount: result.months.length,
      updatedAt: new Date().toISOString()
    };
    AT.storage.set(state);
  }

  /* ---------- Populate dropdowns ---------- */
  function populateStudents() {
    const students = getStudents().slice().sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    studentSelect.innerHTML = '<option value="">-- Select Student --</option>';

    if (students.length === 0) {
      emptyStudents.style.display = 'block';
      studentSelect.disabled = true;
      saveBtn.disabled = true;
      clearBtn.disabled = true;
      return;
    }

    emptyStudents.style.display = 'none';
    studentSelect.disabled = false;

    students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name}  (${s.pin})`;
      opt.dataset.pin = s.pin;
      studentSelect.appendChild(opt);
    });
  }

  function populateMonths() {
    MONTHS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.v;
      opt.textContent = m.n;
      monthSelect.appendChild(opt);
    });
    monthSelect.value = currentMonth();
  }

  /* ---------- Load existing record ---------- */
  function loadExisting() {
    const stuId = studentSelect.value;
    const mm = monthSelect.value;
    updateStudentInfo();
    refreshOverall();

    if (!stuId || !mm) {
      [p1Working, p1Attended, p2Working, p2Attended].forEach(i => (i.value = ''));
      summaryBox.style.display = 'none';
      lastSaved.style.display = 'none';
      const noSummary = document.getElementById('noSummary');
      if (noSummary) noSummary.style.display = 'block';
      updateAllPct();
      return;
    }

    const ym = monthKey(currentYear(), mm);
    const state = AT.storage.get();
    const wd = state.meta.workingDays[ym] || {};
    const ad = state.meta.attendedDays[ym]?.[stuId] || {};

    p1Working.value  = wd.phase1  != null ? wd.phase1  : '';
    p1Attended.value = ad.phase1  != null ? ad.phase1  : '';
    p2Working.value  = wd.phase2  != null ? wd.phase2  : '';
    p2Attended.value = ad.phase2  != null ? ad.phase2  : '';

    const anySaved =
      wd.phase1 != null || wd.phase2 != null ||
      ad.phase1 != null || ad.phase2 != null;

    if (anySaved) {
      showSummary(ym, stuId);
      lastSaved.textContent = `📌 Existing record loaded for ${monthLabel(ym)}. You can edit and save again.`;
      lastSaved.style.display = 'block';
    } else {
      summaryBox.style.display = 'none';
      lastSaved.style.display = 'none';
    }
    updateAllPct();
  }

  /* ---------- Summary preview ---------- */
  function showSummary(ym, stuId) {
    const state = AT.storage.get();
    const stu = state.students.find(s => s.id === stuId);
    const wd = state.meta.workingDays[ym] || {};
    const ad = state.meta.attendedDays[ym]?.[stuId] || {};
    const w1 = Number(wd.phase1 || 0), a1 = Number(ad.phase1 || 0);
    const w2 = Number(wd.phase2 || 0), a2 = Number(ad.phase2 || 0);

    document.getElementById('sumStudent').textContent =
      stu ? `${stu.name} (${stu.pin})` : '—';
    document.getElementById('sumMonth').textContent = monthLabel(ym);
    document.getElementById('sumP1').textContent = `${a1} / ${w1}`;
    document.getElementById('sumP2').textContent = `${a2} / ${w2}`;
    document.getElementById('sumTotal').textContent = `${a1 + a2} / ${w1 + w2}`;

    summaryBox.style.display = 'block';
    const noSummary = document.getElementById('noSummary');
    if (noSummary) noSummary.style.display = 'none';
  }

  /* ---------- Save ---------- */
  function saveAttendance(e) {
    e.preventDefault();

    const stuId = studentSelect.value;
    const mm = monthSelect.value;
    if (!stuId) { setMessage('Please select a student.', 'error'); return; }
    if (!mm)   { setMessage('Please select a month.', 'error'); return; }

    const v1w = p1Working.value.trim();
    const v1a = p1Attended.value.trim();
    const v2w = p2Working.value.trim();
    const v2a = p2Attended.value.trim();

    if (!v1w || !v1a || !v2w || !v2a) {
      setMessage('All Working Days / Attended Days fields are required.', 'error');
      return;
    }

    const w1 = Number(v1w), a1 = Number(v1a);
    const w2 = Number(v2w), a2 = Number(v2a);

    if ([w1, a1, w2, a2].some(n => !Number.isInteger(n) || n < 0)) {
      setMessage('Values must be non-negative integers.', 'error');
      return;
    }
    if (w1 > 15 || w2 > 16) {
      setMessage('Phase 1 max 15 working days, Phase 2 max 16 working days.', 'error');
      return;
    }
    if (a1 > w1) {
      setMessage(`Phase 1: Attended Days (${a1}) cannot exceed Working Days (${w1}).`, 'error');
      p1Attended.focus();
      return;
    }
    if (a2 > w2) {
      setMessage(`Phase 2: Attended Days (${a2}) cannot exceed Working Days (${w2}).`, 'error');
      p2Attended.focus();
      return;
    }

    const ym = monthKey(currentYear(), mm);
    const state = AT.storage.get();

    // Save per-month working days
    state.meta.workingDays[ym] = state.meta.workingDays[ym] || {};
    state.meta.workingDays[ym].phase1 = w1;
    state.meta.workingDays[ym].phase2 = w2;

    // Save per-student per-month attended days
    state.meta.attendedDays[ym] = state.meta.attendedDays[ym] || {};
    state.meta.attendedDays[ym][stuId] = state.meta.attendedDays[ym][stuId] || {};
    state.meta.attendedDays[ym][stuId].phase1 = a1;
    state.meta.attendedDays[ym][stuId].phase2 = a2;

    // Day 4: compute and persist percentages
    const p1Pct = calcPhasePct(a1, w1);
    const p2Pct = calcPhasePct(a2, w2);
    const mPct  = calcMonthlyPct(a1, w1, a2, w2);
    state.meta.percentages = state.meta.percentages || {};
    state.meta.percentages[ym] = state.meta.percentages[ym] || {};
    state.meta.percentages[ym][stuId] = {
      phase1: p1Pct,
      phase2: p2Pct,
      monthly: mPct,
      savedAt: new Date().toISOString()
    };

    AT.storage.set(state);
    notifyDataChange({ source: 'attendance', action: 'save', stuId, ym });

    const stu = state.students.find(s => s.id === stuId);
    setMessage(`✅ Saved attendance for ${stu?.name || 'student'} — ${monthLabel(ym)} (${fmtPct(mPct)}).`, 'success');
    showToast('Attendance saved', 'success');
    showSummary(ym, stuId);
    updateAllPct();
    refreshOverall();
  }

  /* ---------- Clear form ---------- */
  function clearForm() {
    [p1Working, p1Attended, p2Working, p2Attended].forEach(i => (i.value = ''));
    setMessage('', '');
    summaryBox.style.display = 'none';
    lastSaved.style.display = 'none';
    const noSummary = document.getElementById('noSummary');
    if (noSummary) noSummary.style.display = 'block';
    updateAllPct();
  }

  /* ---------- Events ---------- */
  form.addEventListener('submit', saveAttendance);
  studentSelect.addEventListener('change', loadExisting);
  monthSelect.addEventListener('change', loadExisting);
  clearBtn.addEventListener('click', clearForm);

  // Day 4: live recalculation on every input change
  [p1Working, p1Attended, p2Working, p2Attended].forEach(input => {
    input.addEventListener('input', updateAllPct);
  });

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    populateStudents();
    populateMonths();
    loadExisting();
    updateStudentInfo();
    updateAllPct();
  });
})();