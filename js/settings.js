/* ============================================
   Attendance Tracker — Settings (Backup & Restore)
   Day 8
   ============================================ */

(function () {
  'use strict';

  const BACKUP_META_KEY = 'attendanceTracker.v1.lastBackup';

  // Cached elements
  const exportBtn     = document.getElementById('exportBtn');
  const importInput   = document.getElementById('importInput');
  const resetBtn      = document.getElementById('resetBtn');
  const messageEl     = document.getElementById('settingsMessage');

  const confirmImportModal = document.getElementById('confirmImportModal');
  const confirmResetModal  = document.getElementById('confirmResetModal');
  const confirmImportBtn   = document.getElementById('confirmImportBtn');
  const confirmResetBtn    = document.getElementById('confirmResetBtn');
  const importPreview      = document.getElementById('importPreview');
  const modalCloseBtns     = document.querySelectorAll('[data-close-modal]');

  let pendingImport = null; // parsed JSON waiting for confirmation

  /* ---------- Helpers ---------- */
  function setMessage(text, type) {
    messageEl.textContent = text || '';
    messageEl.className = type === 'error' ? 'error-msg' : 'success-msg';
    if (text) {
      clearTimeout(setMessage._t);
      setMessage._t = setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = '';
      }, 4000);
    }
  }

  function openModal(m)  { m.classList.add('show'); }
  function closeModal(m) { m.classList.remove('show'); }

  function fmtBytes(n) {
    if (!Number.isFinite(n) || n < 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(2) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function fmtDate(iso) {
    if (!iso) return 'Never';
    try {
      return new Date(iso).toLocaleString('default', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return '—'; }
  }

  function countRecords(state) {
    const wd = state.meta?.workingDays || {};
    const ad = state.meta?.attendedDays || {};
    let count = 0;
    Object.keys(ad).forEach(ym => {
      count += Object.keys(ad[ym] || {}).length;
    });
    Object.keys(wd).forEach(ym => {
      if (!(ym in ad)) count += 1;
    });
    return count;
  }

  /* ---------- Validate backup structure ---------- */
  function validateBackup(data) {
    if (!data || typeof data !== 'object') return 'File is not a valid JSON object.';
    if (!Array.isArray(data.students))      return 'Missing or invalid "students" array.';
    if (!data.meta || typeof data.meta !== 'object') return 'Missing or invalid "meta" object.';

    const m = data.meta;
    if (typeof m.workingDays !== 'object' || m.workingDays === null) return 'Missing "meta.workingDays".';
    if (typeof m.attendedDays !== 'object' || m.attendedDays === null) return 'Missing "meta.attendedDays".';

    if (m.percentages && typeof m.percentages !== 'object') return '"meta.percentages" must be an object.';
    if (m.overall     && typeof m.overall     !== 'object') return '"meta.overall" must be an object.';

    return null;
  }

  /* ---------- Info panel ---------- */
  function renderInfo() {
    const state = AT.storage.get();
    const lastBackup = localStorage.getItem(BACKUP_META_KEY);

    const students = (state.students || []);
    const totalStudents = students.length;
    const months = new Set();
    let totalRecords = 0;
    let studentsWithData = 0;

    const wd = state.meta?.workingDays || {};
    const ad = state.meta?.attendedDays || {};
    const studentIdsWithData = new Set();

    Object.keys(wd).forEach(ym => { months.add(ym); });
    Object.keys(ad).forEach(ym => {
      months.add(ym);
      const stuMap = ad[ym] || {};
      Object.keys(stuMap).forEach(stuId => {
        totalRecords += 1;
        studentIdsWithData.add(stuId);
      });
    });
    studentsWithData = studentIdsWithData.size;

    // Project statistics
    document.getElementById('statTotalStudents').textContent = totalStudents;
    document.getElementById('statTotalRecords').textContent  = totalRecords;
    document.getElementById('statMonths').textContent        = months.size;
    document.getElementById('statWithData').textContent      = studentsWithData;

    // Storage section
    let sizeBytes = 0;
    try {
      const raw = localStorage.getItem('attendanceTracker.v1') || '';
      sizeBytes = new Blob([raw]).size;
    } catch { /* ignore */ }
    document.getElementById('infoSize').textContent     = fmtBytes(sizeBytes);
    document.getElementById('infoLastBackup').textContent = fmtDate(lastBackup);
    document.getElementById('infoBackupAvail').textContent = lastBackup ? 'Yes' : 'No';

    // Health check
    renderHealth(totalStudents, totalRecords, months.size);
  }

  function renderHealth(totalStudents, totalRecords, monthsCount) {
    const dot   = document.getElementById('healthDot');
    const title = document.getElementById('healthTitle');
    const sub   = document.getElementById('healthSub');

    dot.classList.remove('good', 'warn', 'bad');

    if (totalStudents === 0) {
      dot.classList.add('bad');
      title.textContent = 'No Students Added';
      sub.textContent = 'Add students on the Students page to get started.';
    } else if (totalRecords === 0 || monthsCount === 0) {
      dot.classList.add('warn');
      title.textContent = 'No Attendance Records';
      sub.textContent = 'Your class has students but no attendance has been saved yet.';
    } else {
      dot.classList.add('good');
      title.textContent = 'Healthy';
      sub.textContent = `All systems operational · ${totalStudents} student(s) · ${totalRecords} record(s)`;
    }
  }

  /* ---------- Export ---------- */
  function doExport() {
    try {
      const state = AT.storage.get();
      const payload = {
        app: 'Attendance Tracker',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        students: state.students || [],
        attendance: state.attendance || {},
        meta: state.meta || {}
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem(BACKUP_META_KEY, new Date().toISOString());
      renderInfo();
      setMessage('✅ Backup exported successfully.', 'success');
      showToast('Backup exported', 'success');
    } catch (err) {
      console.error(err);
      setMessage('❌ Export failed: ' + (err.message || 'unknown error'), 'error');
    }
  }

  /* ---------- Import flow ---------- */
  function handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const err = validateBackup(parsed);
        if (err) {
          setMessage('❌ Invalid backup file: ' + err, 'error');
          showToast('Invalid backup', 'error');
          return;
        }
        pendingImport = parsed;
        importPreview.textContent =
          `Backup from ${fmtDate(parsed.exportedAt)} · ` +
          `${(parsed.students || []).length} student(s) · ` +
          `${Object.keys(parsed.meta?.workingDays || {}).length} month(s) of data`;
        openModal(confirmImportModal);
      } catch (parseErr) {
        setMessage('❌ Invalid JSON: ' + parseErr.message, 'error');
        showToast('Invalid JSON', 'error');
      } finally {
        // Reset input so the same file can be re-selected
        importInput.value = '';
      }
    };
    reader.onerror = () => {
      setMessage('❌ Could not read file.', 'error');
    };
    reader.readAsText(file);
  }

  function doImport() {
    if (!pendingImport) return;
    try {
      const data = pendingImport;
      const newState = {
        students:   data.students   || [],
        attendance: data.attendance || {},
        meta: {
          workingDays:  data.meta?.workingDays  || {},
          attendedDays: data.meta?.attendedDays || {},
          percentages:  data.meta?.percentages  || {},
          overall:      data.meta?.overall      || {}
        },
        createdAt: data.createdAt || new Date().toISOString(),
        restoredAt: new Date().toISOString()
      };
      AT.storage.set(newState);
      pendingImport = null;
      closeModal(confirmImportModal);
      renderInfo();
      setMessage('✅ Backup restored successfully.', 'success');
      showToast('Backup restored', 'success');
      notifyDataChange({ source: 'settings', action: 'import' });
    } catch (err) {
      console.error(err);
      setMessage('❌ Import failed: ' + (err.message || 'unknown error'), 'error');
    }
  }

  /* ---------- Reset ---------- */
  function doReset() {
    try {
      AT.storage.reset();
      localStorage.removeItem(BACKUP_META_KEY);
      closeModal(confirmResetModal);
      renderInfo();
      setMessage('✅ All data has been reset.', 'success');
      showToast('Data reset', 'success');
      notifyDataChange({ source: 'settings', action: 'reset' });
    } catch (err) {
      console.error(err);
      setMessage('❌ Reset failed: ' + (err.message || 'unknown error'), 'error');
    }
  }

  /* ---------- Events ---------- */
  exportBtn.addEventListener('click', doExport);
  importInput.addEventListener('change', handleFileSelect);
  resetBtn.addEventListener('click', () => openModal(confirmResetModal));

  confirmImportBtn.addEventListener('click', doImport);
  confirmResetBtn.addEventListener('click', doReset);

  modalCloseBtns.forEach(b => b.addEventListener('click', () => {
    closeModal(confirmImportModal);
    closeModal(confirmResetModal);
    pendingImport = null;
  }));

  // Live updates
  window.addEventListener('storage', e => {
    if (e.key === 'attendanceTracker.v1') renderInfo();
  });
  window.addEventListener('at:data-changed', () => renderInfo());
  window.addEventListener('pageshow', e => { if (e.persisted) renderInfo(); });

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', renderInfo);
})();
