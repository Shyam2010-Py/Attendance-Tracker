/* ============================================
   Attendance Tracker — LocalStorage Wrapper
   Namespace: attendanceTracker.v1
   ============================================ */

const STORAGE_KEY = 'attendanceTracker.v1';

const DEFAULT_STATE = {
  students: [],
  attendance: {},   // { "YYYY-MM": { phase1:{}, phase2:{} } }
  meta: {
    workingDays: {},   // { "YYYY-MM": { phase1:0, phase2:0 } }
    attendedDays: {}   // { "YYYY-MM": { "stu_id": { phase1:0, phase2:0 } } }
  },
  createdAt: new Date().toISOString()
};

const AT = {
  storage: {
    /** Load entire state (creates default if missing) */
    get() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
          return JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
        const parsed = JSON.parse(raw);
        // shallow merge to keep new keys safe across versions
        return {
          ...DEFAULT_STATE,
          ...parsed,
          meta: { ...DEFAULT_STATE.meta, ...(parsed.meta || {}) }
        };
      } catch (err) {
        console.error('Storage read failed:', err);
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
    },

    /** Save entire state */
    set(state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },

    /** Update specific top-level key (shallow merge) */
    update(key, patch) {
      const state = this.get();
      state[key] = { ...state[key], ...patch };
      this.set(state);
      return state;
    },

    /** Wipe everything (irreversible) */
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      return this.get();
    },

    /** Export as JSON file */
    exportJSON(filename = 'attendance-backup.json') {
      const data = JSON.stringify(this.get(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
};