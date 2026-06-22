/* ============================================
   Attendance Tracker — Student Management
   Day 2 — Add / Edit / Delete / Search
   ============================================ */

(function () {
  'use strict';

  const MAX_STUDENTS = 66;

  // Cached elements
  const form = document.getElementById('studentForm');
  const pinInput = document.getElementById('pinInput');
  const nameInput = document.getElementById('nameInput');
  const editIdInput = document.getElementById('editId');
  const submitBtn = document.getElementById('submitBtn');
  const formTitle = document.getElementById('formTitle');
  const cancelBtn = document.getElementById('cancelBtn');
  const messageEl = document.getElementById('formMessage');

  const searchInput = document.getElementById('searchInput');
  const countEl = document.getElementById('studentCount');
  const tableBody = document.getElementById('studentTableBody');
  const mobileList = document.getElementById('mobileList');
  const emptyState = document.getElementById('emptyState');

  const editModal = document.getElementById('editModal');
  const deleteModal = document.getElementById('deleteModal');
  const modalCancelBtns = document.querySelectorAll('[data-close-modal]');

  let pendingDeleteId = null;

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

  function generateId() {
    return 'stu_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function getStudents() {
    return AT.storage.get().students;
  }

  function findByPin(pin, exceptId = null) {
    return getStudents().find(s => s.pin.toLowerCase() === pin.toLowerCase() && s.id !== exceptId);
  }

  function resetForm() {
    form.reset();
    editIdInput.value = '';
    formTitle.textContent = 'Add Student';
    submitBtn.textContent = 'Add Student';
    cancelBtn.style.display = 'none';
    setMessage('', '');
  }

  /* ---------- Render list (table + mobile cards) ---------- */
  function render(filter = '') {
    const all = getStudents();
    const q = filter.trim().toLowerCase();
    const list = q
      ? all.filter(s => s.name.toLowerCase().includes(q) || s.pin.toLowerCase().includes(q))
      : all;

    countEl.textContent = `${list.length} of ${all.length} / ${MAX_STUDENTS}`;

    if (all.length === 0) {
      emptyState.textContent = 'No students yet. Add your first student above to get started.';
      emptyState.style.display = 'block';
      tableBody.innerHTML = '';
      mobileList.innerHTML = '';
      return;
    }
    if (list.length === 0) {
      emptyState.textContent = 'No students match your search.';
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }

    // Table rows
    tableBody.innerHTML = list.map(s => `
      <tr>
        <td><span class="pin-badge">${escapeHTML(s.pin)}</span></td>
        <td>${escapeHTML(s.name)}</td>
        <td>
          <div class="row-actions">
            <button class="btn secondary" data-action="edit" data-id="${escapeHTML(s.id)}">Edit</button>
            <button class="btn danger" data-action="delete" data-id="${escapeHTML(s.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Mobile cards
    mobileList.innerHTML = list.map(s => `
      <div class="stu-card">
        <div class="top">
          <span class="name">${escapeHTML(s.name)}</span>
          <span class="pin-badge">${escapeHTML(s.pin)}</span>
        </div>
        <div class="actions">
          <button class="btn secondary" data-action="edit" data-id="${escapeHTML(s.id)}">Edit</button>
          <button class="btn danger" data-action="delete" data-id="${escapeHTML(s.id)}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- CRUD ---------- */
  function addStudent(pin, name) {
    const state = AT.storage.get();
    if (state.students.length >= MAX_STUDENTS) {
      setMessage(`Limit reached — maximum ${MAX_STUDENTS} students allowed.`, 'error');
      return false;
    }
    state.students.push({ id: generateId(), pin: pin.trim(), name: name.trim() });
    AT.storage.set(state);
    setMessage(`✅ Added "${name.trim()}"`, 'success');
    notifyDataChange({ source: 'students', action: 'add' });
    return true;
  }

  function updateStudent(id, pin, name) {
    const state = AT.storage.get();
    const stu = state.students.find(s => s.id === id);
    if (!stu) { setMessage('Student not found.', 'error'); return false; }
    stu.pin = pin.trim();
    stu.name = name.trim();
    AT.storage.set(state);
    setMessage(`✅ Updated "${name.trim()}"`, 'success');
    notifyDataChange({ source: 'students', action: 'update', id });
    return true;
  }

  function deleteStudent(id) {
    const state = AT.storage.get();
    const stu = state.students.find(s => s.id === id);
    state.students = state.students.filter(s => s.id !== id);
    // Also clean up attendance & meta records for this student
    Object.keys(state.attendance).forEach(ym => {
      if (state.attendance[ym]?.phase1) delete state.attendance[ym].phase1[id];
      if (state.attendance[ym]?.phase2) delete state.attendance[ym].phase2[id];
    });
    Object.keys(state.meta.attendedDays).forEach(ym => {
      if (state.meta.attendedDays[ym]) delete state.meta.attendedDays[ym][id];
    });
    AT.storage.set(state);
    showToast(`Deleted "${stu?.name || 'student'}"`, 'success');
    notifyDataChange({ source: 'students', action: 'delete', id });
  }

  /* ---------- Form submit ---------- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const pin = pinInput.value.trim();
    const name = nameInput.value.trim();
    const editingId = editIdInput.value;

    // Validation
    if (!pin) { setMessage('PIN Number is required.', 'error'); pinInput.focus(); return; }
    if (!name) { setMessage('Student Name is required.', 'error'); nameInput.focus(); return; }
    if (findByPin(pin, editingId || null)) {
      setMessage(`PIN "${pin}" already exists. PINs must be unique.`, 'error');
      pinInput.focus();
      return;
    }

    let ok;
    if (editingId) {
      ok = updateStudent(editingId, pin, name);
    } else {
      ok = addStudent(pin, name);
    }

    if (ok) {
      resetForm();
      render(searchInput.value);
    }
  });

  cancelBtn.addEventListener('click', resetForm);

  /* ---------- Search (live) ---------- */
  searchInput.addEventListener('input', () => render(searchInput.value));

  /* ---------- Table / card click delegation ---------- */
  function handleActionClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const stu = getStudents().find(s => s.id === id);
    if (!stu) return;

    if (action === 'edit') {
      // Inline edit (populate form)
      editIdInput.value = stu.id;
      pinInput.value = stu.pin;
      nameInput.value = stu.name;
      formTitle.textContent = 'Edit Student';
      submitBtn.textContent = 'Save Changes';
      cancelBtn.style.display = 'inline-block';
      setMessage(`Editing "${stu.name}" — change fields and save.`, 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      pinInput.focus();
    }

    if (action === 'delete') {
      pendingDeleteId = id;
      document.getElementById('deleteStudentName').textContent =
        `${stu.name} (PIN: ${stu.pin})`;
      openModal(deleteModal);
    }
  }

  tableBody.addEventListener('click', handleActionClick);
  mobileList.addEventListener('click', handleActionClick);

  /* ---------- Modal handling ---------- */
  function openModal(modal) { modal.classList.add('show'); }
  function closeModal(modal) { modal.classList.remove('show'); }

  modalCancelBtns.forEach(b => b.addEventListener('click', () => {
    closeModal(editModal);
    closeModal(deleteModal);
    pendingDeleteId = null;
  }));

  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (pendingDeleteId) {
      deleteStudent(pendingDeleteId);
      closeModal(deleteModal);
      pendingDeleteId = null;
      render(searchInput.value);
      // If we were editing the deleted student, reset the form
      if (editIdInput.value && !getStudents().find(s => s.id === editIdInput.value)) {
        resetForm();
      }
    }
  });

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    cancelBtn.style.display = 'none';
    render('');
  });
})();