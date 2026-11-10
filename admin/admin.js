/* ═══════════════════════════════════════════════════════════════════════════
   MyPFE Admin — admin.js
   All API calls go through api(), token stored in sessionStorage.
   textContent used everywhere for user data (never innerHTML with API data).
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ── Auth helpers ──────────────────────────────────────────────────────────────

const TOKEN_KEY = 'mypfe_token';
const ROLE_KEY  = 'mypfe_role';

function getToken()  { return sessionStorage.getItem(TOKEN_KEY); }
function getRole()   { return sessionStorage.getItem(ROLE_KEY); }
function isAdmin()   { return getRole() === 'admin'; }

function saveAuth(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    sessionStorage.setItem(ROLE_KEY, payload.role || 'editor');
  } catch(_) {}
}

function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}

function redirectLogin() {
  clearAuth();
  window.location.href = 'index.html';
}

// ── Generic fetch wrapper ─────────────────────────────────────────────────────

async function api(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  // Don't set Content-Type for FormData (let browser set boundary)
  if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (res.status === 401) { redirectLogin(); return null; }
  return res;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast ' + type;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 3500);
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function confirm(title, msg) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    modal.hidden = false;
    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');
    function cleanup(val) {
      modal.hidden = true;
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      resolve(val);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
  });
}

// ── Modal open/close ──────────────────────────────────────────────────────────

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.hidden = false;
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.hidden = true;
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-close]');
  if (btn) closeModal(btn.dataset.close);
  // Click backdrop
  if (e.target.classList.contains('modal')) closeModal(e.target.id);
});

// ── Tab switching ─────────────────────────────────────────────────────────────

function switchTab(name) {
  document.querySelectorAll('.tab-section').forEach(s => s.hidden = true);
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  const section = document.getElementById('tab-' + name);
  if (section) section.hidden = false;
  document.querySelector(`.nav-item[data-tab="${name}"]`)?.classList.add('active');
  if (name === 'schedule')      loadSchedule();
  if (name === 'workshops')     loadWorkshops();
  if (name === 'registrations') { loadStats(); loadRegistrations(); }
  if (name === 'users')         loadUsers();
}

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  // If already logged in, skip to dashboard
  if (getToken()) window.location.href = 'dashboard.html';

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');
    errEl.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    const res = await fetch(API_BASE + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginForm.email.value,
        password: loginForm.password.value,
      }),
    });

    btn.disabled = false;
    btn.textContent = 'Sign in';

    if (!res) { errEl.textContent = 'Network error.'; errEl.hidden = false; return; }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      errEl.textContent = data.detail || 'Invalid credentials.';
      errEl.hidden = false;
      return;
    }
    const data = await res.json();
    saveAuth(data.access_token);
    window.location.href = 'dashboard.html';
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD — bootstrap
// ══════════════════════════════════════════════════════════════════════════════

if (document.getElementById('sidebar')) {
  if (!getToken()) redirectLogin();

  // Show admin-only elements
  if (isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  }

  // Display logged-in email
  (async () => {
    const res = await api('/api/v1/auth/me');
    if (res && res.ok) {
      const me = await res.json();
      const el = document.getElementById('meEmail');
      if (el) el.textContent = me.email;
    }
  })();

  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      switchTab(a.dataset.tab);
    });
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    clearAuth();
    window.location.href = 'index.html';
  });

  // Default tab
  switchTab('schedule');
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCHEDULE
// ══════════════════════════════════════════════════════════════════════════════

let scheduleItems = [];

async function loadSchedule() {
  const res = await api('/api/v1/admin/schedule');
  if (!res || !res.ok) { toast('Failed to load schedule', 'error'); return; }
  scheduleItems = await res.json();
  renderScheduleList();
}

function renderScheduleList() {
  const container = document.getElementById('scheduleList');
  if (!container) return;
  container.innerHTML = '';
  if (!scheduleItems.length) {
    const p = document.createElement('p');
    p.style.color = 'var(--text-muted)';
    p.textContent = 'No schedule items yet.';
    container.appendChild(p);
    return;
  }
  scheduleItems.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'item-row' + (item.is_published ? '' : ' unpublished');
    row.dataset.id = item.id;

    const time = document.createElement('span');
    time.className = 'item-time';
    time.textContent = item.time || '';

    const title = document.createElement('span');
    title.className = 'item-title';
    title.textContent = item.title;

    const badges = document.createElement('span');
    if (item.featured) {
      const b = document.createElement('span');
      b.className = 'item-badge featured';
      b.textContent = 'Featured';
      badges.appendChild(b);
    }
    if (!item.is_published) {
      const b = document.createElement('span');
      b.className = 'item-badge unpub';
      b.textContent = 'Draft';
      badges.appendChild(b);
    }

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    // Up / Down
    const up = _iconBtn('fa-arrow-up', 'Move up');
    up.disabled = idx === 0;
    up.addEventListener('click', () => reorderSchedule(idx, idx - 1));

    const down = _iconBtn('fa-arrow-down', 'Move down');
    down.disabled = idx === scheduleItems.length - 1;
    down.addEventListener('click', () => reorderSchedule(idx, idx + 1));

    // Publish toggle
    const pub = _iconBtn(item.is_published ? 'fa-eye-slash' : 'fa-eye',
      item.is_published ? 'Unpublish' : 'Publish');
    pub.addEventListener('click', () => toggleSchedulePublish(item));

    // Edit
    const edit = _iconBtn('fa-pencil', 'Edit');
    edit.addEventListener('click', () => openScheduleForm(item));

    // Delete
    const del = _iconBtn('fa-trash', 'Delete');
    del.classList.add('danger');
    del.addEventListener('click', () => deleteScheduleItem(item));

    actions.append(up, down, pub, edit, del);
    row.append(time, title, badges, actions);
    container.appendChild(row);
  });
}

function _iconBtn(icon, title) {
  const btn = document.createElement('button');
  btn.className = 'btn-icon';
  btn.title = title;
  const i = document.createElement('i');
  i.className = 'fas ' + icon;
  btn.appendChild(i);
  return btn;
}

async function reorderSchedule(fromIdx, toIdx) {
  [scheduleItems[fromIdx], scheduleItems[toIdx]] = [scheduleItems[toIdx], scheduleItems[fromIdx]];
  const ids = scheduleItems.map(i => i.id);
  renderScheduleList();
  const res = await api('/api/v1/admin/schedule/reorder', {
    method: 'POST', body: { ids },
  });
  if (!res || !res.ok) { toast('Reorder failed', 'error'); loadSchedule(); }
}

async function toggleSchedulePublish(item) {
  const res = await api('/api/v1/admin/schedule/' + item.id, {
    method: 'PUT',
    body: { ...item, is_published: !item.is_published },
  });
  if (res && res.ok) { toast('Updated'); loadSchedule(); }
  else toast('Failed to update', 'error');
}

async function deleteScheduleItem(item) {
  const ok = await confirm('Delete item', `Delete "${item.title}"? This cannot be undone.`);
  if (!ok) return;
  const res = await api('/api/v1/admin/schedule/' + item.id, { method: 'DELETE' });
  if (res && res.status === 204) { toast('Deleted'); loadSchedule(); }
  else toast('Failed to delete', 'error');
}

// ── Schedule form ─────────────────────────────────────────────────────────────

let editingScheduleId = null;

document.getElementById('addScheduleBtn')?.addEventListener('click', () => openScheduleForm(null));

function openScheduleForm(item) {
  editingScheduleId = item ? item.id : null;
  const title = document.getElementById('scheduleModalTitle');
  if (title) title.textContent = item ? 'Edit Schedule Item' : 'Add Schedule Item';

  const form = document.getElementById('scheduleForm');
  form.reset();

  if (item) {
    form.elements.time.value = item.time || '';
    form.elements.title.value = item.title || '';
    form.elements.description.value = item.description || '';
    form.elements.location.value = item.location || '';
    form.elements.speaker_name.value = item.speaker_name || '';
    form.elements.speaker_company.value = item.speaker_company || '';
    form.elements.featured.checked = !!item.featured;
    form.elements.is_published.checked = item.is_published !== false;
    form.elements.position.value = item.position || 0;
    form.elements.chips_raw.value = (item.chips || []).join(', ');
    buildSectionsUI(item.sections || []);
  } else {
    buildSectionsUI([]);
  }

  updateSchedulePreview();
  openModal('scheduleModal');
}

document.getElementById('scheduleForm')?.addEventListener('input', updateSchedulePreview);

document.getElementById('scheduleForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const chips_raw = form.elements.chips_raw.value.trim();
  const chips = chips_raw ? chips_raw.split(',').map(c => c.trim()).filter(Boolean) : [];
  const sections = collectSections();

  const body = {
    time: form.elements.time.value.trim(),
    title: form.elements.title.value.trim(),
    description: form.elements.description.value.trim() || null,
    location: form.elements.location.value.trim() || null,
    featured: form.elements.featured.checked,
    is_published: form.elements.is_published.checked,
    position: parseInt(form.elements.position.value) || 0,
    speaker_name: form.elements.speaker_name.value.trim() || null,
    speaker_company: form.elements.speaker_company.value.trim() || null,
    chips: chips.length ? chips : null,
    sections: sections.length ? sections : null,
    edition: 15,
  };

  const method = editingScheduleId ? 'PUT' : 'POST';
  const path = editingScheduleId
    ? '/api/v1/admin/schedule/' + editingScheduleId
    : '/api/v1/admin/schedule';

  const res = await api(path, { method, body });
  if (res && (res.ok || res.status === 201)) {
    toast(editingScheduleId ? 'Updated' : 'Created');
    closeModal('scheduleModal');
    loadSchedule();
  } else {
    const err = await res?.json().catch(() => ({}));
    toast(err.detail || 'Save failed', 'error');
  }
});

// ── Sections repeater ─────────────────────────────────────────────────────────

function buildSectionsUI(sections) {
  const container = document.getElementById('sectionsContainer');
  container.innerHTML = '';
  sections.forEach(sec => addSectionBlock(sec));
}

document.getElementById('addSectionBtn')?.addEventListener('click', () => addSectionBlock({}));

function addSectionBlock(sec) {
  const container = document.getElementById('sectionsContainer');
  const block = document.createElement('div');
  block.className = 'section-block';

  const head = document.createElement('div');
  head.className = 'section-block-head';

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.placeholder = 'Section label (optional)';
  labelInput.className = 'section-label-input';
  labelInput.value = sec.label || '';
  labelInput.style.cssText = 'flex:1;border:1.5px solid var(--border);border-radius:6px;padding:.4rem .6rem;font-size:.8rem;';
  labelInput.addEventListener('input', updateSchedulePreview);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-icon danger';
  removeBtn.title = 'Remove section';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.addEventListener('click', () => { block.remove(); updateSchedulePreview(); });

  head.appendChild(labelInput);
  head.appendChild(removeBtn);

  const linesList = document.createElement('div');
  linesList.className = 'lines-list';

  (sec.lines || []).forEach(line => addLineRow(linesList, line));

  const addLineBtn = document.createElement('button');
  addLineBtn.type = 'button';
  addLineBtn.className = 'btn-ghost btn-sm';
  addLineBtn.style.cssText = 'color:var(--primary);margin-top:.25rem;font-size:.75rem;';
  addLineBtn.textContent = '+ Add line';
  addLineBtn.addEventListener('click', () => { addLineRow(linesList, {}); updateSchedulePreview(); });

  block.append(head, linesList, addLineBtn);
  container.appendChild(block);
  updateSchedulePreview();
}

function addLineRow(container, line) {
  const row = document.createElement('div');
  row.className = 'line-row';

  function inp(placeholder, value, cls) {
    const el = document.createElement('input');
    el.type = 'text'; el.placeholder = placeholder;
    el.value = value || '';
    el.className = cls || '';
    el.style.cssText = 'border:1.5px solid var(--border);border-radius:6px;padding:.35rem .5rem;font-size:.78rem;';
    el.addEventListener('input', updateSchedulePreview);
    return el;
  }

  const textI = inp('Text *', line.text, 'line-text');
  const subI  = inp('Sub', line.sub, 'line-sub');
  const metaI = inp('Meta', line.meta, 'line-meta');
  metaI.style.maxWidth = '80px';

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'btn-icon danger';
  del.title = 'Remove line';
  del.innerHTML = '<i class="fas fa-times"></i>';
  del.addEventListener('click', () => { row.remove(); updateSchedulePreview(); });

  row.append(textI, subI, metaI, del);
  container.appendChild(row);
}

function collectSections() {
  const blocks = document.querySelectorAll('#sectionsContainer .section-block');
  return Array.from(blocks).map(block => {
    const label = block.querySelector('.section-label-input')?.value.trim() || undefined;
    const lines = Array.from(block.querySelectorAll('.line-row')).map(row => {
      const text = row.querySelector('.line-text')?.value.trim();
      const sub  = row.querySelector('.line-sub')?.value.trim() || undefined;
      const meta = row.querySelector('.line-meta')?.value.trim() || undefined;
      return { text: text || '', ...(sub ? { sub } : {}), ...(meta ? { meta } : {}) };
    }).filter(l => l.text);
    return { ...(label ? { label } : {}), lines };
  }).filter(s => s.lines.length);
}

// ── Live preview ──────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replace(/[&<>"]/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

function updateSchedulePreview() {
  const form = document.getElementById('scheduleForm');
  if (!form) return;
  const preview = document.getElementById('schedulePreview');
  if (!preview) return;

  const time    = form.elements.time?.value || '';
  const title   = form.elements.title?.value || '';
  const desc    = form.elements.description?.value || '';
  const featured = form.elements.featured?.checked;
  const chips_raw = form.elements.chips_raw?.value || '';
  const chips = chips_raw.split(',').map(c => c.trim()).filter(Boolean);
  const sections = collectSections();

  // Use safe DOM construction for the item wrapper
  const item = document.createElement('div');
  item.className = 'tl-item' + (featured ? ' featured' : '');

  const timeEl = document.createElement('div');
  timeEl.className = 'tl-time';
  timeEl.textContent = time || 'TBA';
  item.appendChild(timeEl);

  const h4 = document.createElement('h4');
  h4.textContent = title || 'Title';
  item.appendChild(h4);

  if (desc) {
    const p = document.createElement('p');
    p.textContent = desc;
    item.appendChild(p);
  }

  sections.forEach(sec => {
    if (sec.label) {
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:.75rem;font-weight:600;color:var(--text-muted);margin:.35rem 0 .15rem;';
      lbl.textContent = sec.label;
      item.appendChild(lbl);
    }
    sec.lines.forEach(l => {
      const li = document.createElement('div');
      li.style.cssText = 'font-size:.78rem;color:var(--text);padding:.1rem 0;';
      li.textContent = l.text + (l.sub ? ' — ' + l.sub : '') + (l.meta ? ' (' + l.meta + ')' : '');
      item.appendChild(li);
    });
  });

  if (chips.length) {
    const chipWrap = document.createElement('div');
    chipWrap.className = 'tl-chips';
    chips.forEach(c => {
      const span = document.createElement('span');
      span.textContent = c;
      chipWrap.appendChild(span);
    });
    item.appendChild(chipWrap);
  }

  preview.innerHTML = '';
  preview.appendChild(item);
}

// ══════════════════════════════════════════════════════════════════════════════
//  WORKSHOPS
// ══════════════════════════════════════════════════════════════════════════════

let workshopItems = [];

async function loadWorkshops() {
  const res = await api('/api/v1/admin/workshops');
  if (!res || !res.ok) { toast('Failed to load workshops', 'error'); return; }
  workshopItems = await res.json();
  renderWorkshopList();
}

function renderWorkshopList() {
  const container = document.getElementById('workshopList');
  if (!container) return;
  container.innerHTML = '';
  if (!workshopItems.length) {
    const p = document.createElement('p');
    p.style.color = 'var(--text-muted)';
    p.textContent = 'No workshops yet.';
    container.appendChild(p);
    return;
  }
  workshopItems.forEach((w, idx) => {
    const row = document.createElement('div');
    row.className = 'item-row' + (w.is_published ? '' : ' unpublished');

    const icon = document.createElement('i');
    icon.className = w.icon + ' item-time';
    icon.style.width = '24px';

    const title = document.createElement('span');
    title.className = 'item-title';
    title.textContent = w.title;

    const time = document.createElement('span');
    time.className = 'item-time';
    time.textContent = w.time;

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const up = _iconBtn('fa-arrow-up', 'Move up');
    up.disabled = idx === 0;
    up.addEventListener('click', () => reorderWorkshops(idx, idx - 1));

    const down = _iconBtn('fa-arrow-down', 'Move down');
    down.disabled = idx === workshopItems.length - 1;
    down.addEventListener('click', () => reorderWorkshops(idx, idx + 1));

    const pub = _iconBtn(w.is_published ? 'fa-eye-slash' : 'fa-eye',
      w.is_published ? 'Unpublish' : 'Publish');
    pub.addEventListener('click', () => toggleWorkshopPublish(w));

    const edit = _iconBtn('fa-pencil', 'Edit');
    edit.addEventListener('click', () => openWorkshopForm(w));

    const del = _iconBtn('fa-trash', 'Delete');
    del.classList.add('danger');
    del.addEventListener('click', () => deleteWorkshop(w));

    actions.append(up, down, pub, edit, del);
    row.append(icon, title, time, actions);
    container.appendChild(row);
  });
}

async function reorderWorkshops(fromIdx, toIdx) {
  [workshopItems[fromIdx], workshopItems[toIdx]] = [workshopItems[toIdx], workshopItems[fromIdx]];
  renderWorkshopList();
  const res = await api('/api/v1/admin/workshops/reorder', {
    method: 'POST', body: { ids: workshopItems.map(w => w.id) },
  });
  if (!res || !res.ok) { toast('Reorder failed', 'error'); loadWorkshops(); }
}

async function toggleWorkshopPublish(w) {
  const res = await api('/api/v1/admin/workshops/' + w.id, {
    method: 'PUT', body: { ...w, is_published: !w.is_published },
  });
  if (res && res.ok) { toast('Updated'); loadWorkshops(); }
  else toast('Failed to update', 'error');
}

async function deleteWorkshop(w) {
  const ok = await confirm('Delete workshop', `Delete "${w.title}"?`);
  if (!ok) return;
  const res = await api('/api/v1/admin/workshops/' + w.id, { method: 'DELETE' });
  if (res && res.status === 204) { toast('Deleted'); loadWorkshops(); }
  else toast('Failed to delete', 'error');
}

let editingWorkshopId = null;

document.getElementById('addWorkshopBtn')?.addEventListener('click', () => openWorkshopForm(null));

function openWorkshopForm(w) {
  editingWorkshopId = w ? w.id : null;
  const titleEl = document.getElementById('workshopModalTitle');
  if (titleEl) titleEl.textContent = w ? 'Edit Workshop' : 'Add Workshop';
  const form = document.getElementById('workshopForm');
  form.reset();
  if (w) {
    form.elements.icon.value = w.icon || 'fas fa-clock';
    form.elements.title.value = w.title || '';
    form.elements.time.value = w.time || '';
    form.elements.description.value = w.description || '';
    form.elements.position.value = w.position || 0;
    form.elements.is_published.checked = w.is_published !== false;
    const features = (w.features || []).map(f => `${f.icon} | ${f.text}`).join('\n');
    form.elements.features_raw.value = features;
  }
  openModal('workshopModal');
}

document.getElementById('workshopForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const features = form.elements.features_raw.value.trim()
    .split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => {
      const [icon, ...rest] = l.split('|');
      return { icon: icon.trim(), text: rest.join('|').trim() };
    });

  const body = {
    icon: form.elements.icon.value.trim(),
    title: form.elements.title.value.trim(),
    time: form.elements.time.value.trim(),
    description: form.elements.description.value.trim(),
    position: parseInt(form.elements.position.value) || 0,
    is_published: form.elements.is_published.checked,
    features: features.length ? features : null,
  };

  const method = editingWorkshopId ? 'PUT' : 'POST';
  const path = editingWorkshopId
    ? '/api/v1/admin/workshops/' + editingWorkshopId
    : '/api/v1/admin/workshops';

  const res = await api(path, { method, body });
  if (res && (res.ok || res.status === 201)) {
    toast(editingWorkshopId ? 'Updated' : 'Created');
    closeModal('workshopModal');
    loadWorkshops();
  } else {
    const err = await res?.json().catch(() => ({}));
    toast(err.detail || 'Save failed', 'error');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  REGISTRATIONS
// ══════════════════════════════════════════════════════════════════════════════

let regPage = 1;
let regTotal = 0;
const REG_PAGE_SIZE = 20;

async function loadStats() {
  const res = await api('/api/v1/admin/registrations/stats');
  if (!res || !res.ok) return;
  const data = await res.json();

  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  setText('statTotal', data.total);
  setText('statStudents', data.by_type?.student || 0);
  setText('statCompanies', data.by_type?.company || 0);
  setText('statCvs', data.cv_count ?? '—');

  renderBarChart(data.per_day || []);
  renderLevelBreakdown(data.by_level || {});
  renderTopUniversities(data.top_universities || []);
}

function renderLevelBreakdown(byLevel) {
  const el = document.getElementById('levelBreakdown');
  if (!el) return;
  el.innerHTML = '';
  const entries = Object.entries(byLevel).sort((a, b) => b[1] - a[1]);
  if (!entries.length) { el.textContent = 'No data'; return; }
  const max = entries[0][1];
  entries.forEach(([level, count]) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;font-size:.8rem;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'width:90px;color:var(--text-muted);flex-shrink:0;';
    lbl.textContent = level;
    const bar = document.createElement('div');
    bar.style.cssText = `height:10px;border-radius:4px;background:var(--primary);width:${Math.round((count/max)*100)}%;min-width:4px;`;
    const cnt = document.createElement('span');
    cnt.style.cssText = 'font-weight:600;color:var(--text);';
    cnt.textContent = count;
    row.append(lbl, bar, cnt);
    el.appendChild(row);
  });
}

function renderTopUniversities(topUnis) {
  const el = document.getElementById('topUniversities');
  if (!el) return;
  el.innerHTML = '';
  if (!topUnis.length) { el.textContent = 'No data'; return; }
  const max = topUnis[0]?.count || 1;
  topUnis.slice(0, 8).forEach(({ university, count }) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;font-size:.8rem;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'flex:1;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    lbl.textContent = university;
    const cnt = document.createElement('span');
    cnt.style.cssText = 'font-weight:600;color:var(--primary);flex-shrink:0;';
    cnt.textContent = count;
    row.append(lbl, cnt);
    el.appendChild(row);
  });
}

function renderBarChart(perDay) {
  const svg = document.getElementById('barChart');
  if (!svg || !perDay.length) return;

  const W = 600, H = 80, pad = { top: 8, bottom: 24, left: 4, right: 4 };
  const max = Math.max(...perDay.map(d => d.count), 1);
  const barW = Math.max(4, (W - pad.left - pad.right) / perDay.length - 2);

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';

  perDay.forEach((d, i) => {
    const barH = ((d.count / max) * (H - pad.top - pad.bottom));
    const x = pad.left + i * ((W - pad.left - pad.right) / perDay.length);
    const y = H - pad.bottom - barH;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barW);
    rect.setAttribute('height', barH);
    rect.setAttribute('fill', '#168B7A');
    // Logo green
    rect.setAttribute('rx', '2');
    svg.appendChild(rect);

    // Label every few bars to avoid clutter
    if (i % Math.ceil(perDay.length / 8) === 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x + barW / 2);
      text.setAttribute('y', H - 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '9');
      text.setAttribute('fill', '#6b7280');
      text.textContent = d.date.slice(5); // MM-DD
      svg.appendChild(text);
    }
  });
}

async function loadRegistrations() {
  const search = document.getElementById('regSearch')?.value || '';
  const type = document.getElementById('regType')?.value || '';

  const params = new URLSearchParams({
    page: regPage,
    page_size: REG_PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(type ? { type } : {}),
  });

  const res = await api('/api/v1/admin/registrations?' + params);
  if (!res || !res.ok) { toast('Failed to load registrations', 'error'); return; }
  const data = await res.json();
  regTotal = data.total;
  renderRegTable(data.items);
  renderPagination();

  // CV count in stats box (count from current full load)
  const cvCount = data.items.filter(r => r.has_cv).length;
  const statCvs = document.getElementById('statCvs');
  if (statCvs) statCvs.textContent = `${cvCount}+`;
}

function renderRegTable(items) {
  const tbody = document.getElementById('regBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!items.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.textContent = 'No registrations found.';
    td.style.textAlign = 'center';
    td.style.color = 'var(--text-muted)';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  items.forEach(r => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.title = 'Click to expand details';

    function cell(text) {
      const td = document.createElement('td');
      td.textContent = text || '';
      tr.appendChild(td);
      return td;
    }

    cell(`${r.first_name} ${r.last_name}`);
    cell(r.email);
    cell(r.type);
    cell(r.university);
    cell(r.level);

    // CV cell
    const cvTd = document.createElement('td');
    if (r.has_cv) {
      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn-icon';
      dlBtn.title = 'Download CV';
      dlBtn.innerHTML = '<i class="fas fa-file-pdf"></i>';
      dlBtn.addEventListener('click', e => { e.stopPropagation(); downloadCv(r.id); });
      cvTd.appendChild(dlBtn);

      if (isAdmin()) {
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-icon danger';
        delBtn.title = 'Delete CV';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        delBtn.addEventListener('click', e => { e.stopPropagation(); deleteCv(r.id); });
        cvTd.appendChild(delBtn);
      }
    } else {
      cvTd.textContent = '—';
    }
    tr.appendChild(cvTd);

    cell(r.created_at ? r.created_at.slice(0, 10) : '');

    // Actions
    const actTd = document.createElement('td');
    if (isAdmin()) {
      const del = document.createElement('button');
      del.className = 'btn-icon danger';
      del.title = 'Delete registration';
      del.innerHTML = '<i class="fas fa-trash"></i>';
      del.addEventListener('click', e => { e.stopPropagation(); deleteRegistration(r); });
      actTd.appendChild(del);
    }
    tr.appendChild(actTd);

    // Expandable detail row
    const detailTr = document.createElement('tr');
    detailTr.hidden = true;
    detailTr.style.cssText = 'background:#f7fbfa;';
    const detailTd = document.createElement('td');
    detailTd.colSpan = 8;
    detailTd.style.cssText = 'padding:.75rem 1rem 1rem;font-size:.8rem;border-top:none;';

    const pairs = [
      ['Phone', r.phone],
      ['Field', r.field],
      ['Graduation', r.graduation],
      ['Experience', r.experience],
      ['Company', r.company_name],
      ['Workshops', (r.workshops || []).join(', ') || null],
      ['Interests', r.interests],
      ['CV Consent', r.cv_consent ? 'Yes' : 'No'],
    ];
    pairs.forEach(([label, value]) => {
      if (!value) return;
      const chip = document.createElement('span');
      chip.style.cssText = 'display:inline-block;margin:0 1rem .25rem 0;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'color:var(--text-muted);margin-right:.25rem;';
      lbl.textContent = label + ':';
      const val = document.createElement('span');
      val.style.fontWeight = '500';
      val.textContent = value;
      chip.append(lbl, val);
      detailTd.appendChild(chip);
    });

    detailTr.appendChild(detailTd);
    tr.addEventListener('click', () => { detailTr.hidden = !detailTr.hidden; });

    tbody.appendChild(tr);
    tbody.appendChild(detailTr);
  });
}

async function downloadCv(regId) {
  const res = await api('/api/v1/admin/registrations/' + regId + '/cv');
  if (!res || !res.ok) { toast('Could not download CV', 'error'); return; }
  const blobUrl = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'cv-' + regId + '.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

async function deleteCv(regId) {
  const ok = await confirm('Delete CV', 'Remove this CV file? The registration will be kept.');
  if (!ok) return;
  const res = await api('/api/v1/admin/registrations/' + regId + '/cv', { method: 'DELETE' });
  if (res && res.status === 204) { toast('CV deleted'); loadRegistrations(); }
  else toast('Failed to delete CV', 'error');
}

async function deleteRegistration(r) {
  const ok = await confirm('Delete registration', `Delete registration for ${r.first_name} ${r.last_name}? This also removes their CV.`);
  if (!ok) return;
  const res = await api('/api/v1/admin/registrations/' + r.id, { method: 'DELETE' });
  if (res && res.status === 204) { toast('Deleted'); loadRegistrations(); loadStats(); }
  else toast('Failed to delete', 'error');
}

function renderPagination() {
  const container = document.getElementById('regPagination');
  if (!container) return;
  container.innerHTML = '';
  const totalPages = Math.ceil(regTotal / REG_PAGE_SIZE);
  if (totalPages <= 1) return;
  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (p === regPage ? ' active' : '');
    btn.textContent = p;
    btn.addEventListener('click', () => { regPage = p; loadRegistrations(); });
    container.appendChild(btn);
  }
}

// Filters
let regSearchTimer;
document.getElementById('regSearch')?.addEventListener('input', () => {
  clearTimeout(regSearchTimer);
  regSearchTimer = setTimeout(() => { regPage = 1; loadRegistrations(); }, 350);
});
document.getElementById('regType')?.addEventListener('change', () => {
  regPage = 1; loadRegistrations();
});

// Export CSV
document.getElementById('exportCsvBtn')?.addEventListener('click', async () => {
  const token = getToken();
  const a = document.createElement('a');
  a.href = API_BASE + '/api/v1/admin/registrations/export.csv';
  // Pass token via query param as a one-off since we can't set headers on <a>
  // Better: fetch the blob and create an object URL
  try {
    const res = await api('/api/v1/admin/registrations/export.csv');
    if (!res || !res.ok) { toast('Export failed', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'registrations.csv';
    link.click();
    URL.revokeObjectURL(url);
  } catch(_) {
    toast('Export failed', 'error');
  }
});

// Show export button for admins
if (isAdmin()) {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
}

// ══════════════════════════════════════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════════════════════════════════════

async function loadUsers() {
  const res = await api('/api/v1/admin/users');
  if (!res || !res.ok) { toast('Failed to load users', 'error'); return; }
  const users = await res.json();
  renderUserTable(users);
}

function renderUserTable(users) {
  const tbody = document.getElementById('userBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    function cell(text) {
      const td = document.createElement('td');
      td.textContent = text || '';
      tr.appendChild(td);
    }
    cell(u.email);
    cell(u.role);
    cell(u.is_active ? 'Yes' : 'No');
    cell(u.created_at ? u.created_at.slice(0, 10) : '');

    const actTd = document.createElement('td');
    const toggle = document.createElement('button');
    toggle.className = 'btn-outline btn-sm';
    toggle.textContent = u.is_active ? 'Deactivate' : 'Activate';
    toggle.addEventListener('click', () => toggleUser(u));
    actTd.appendChild(toggle);

    const roleBtn = document.createElement('button');
    roleBtn.className = 'btn-outline btn-sm';
    roleBtn.style.marginLeft = '.4rem';
    roleBtn.textContent = u.role === 'admin' ? 'Make Editor' : 'Make Admin';
    roleBtn.addEventListener('click', () => changeUserRole(u));
    actTd.appendChild(roleBtn);

    tr.appendChild(actTd);
    tbody.appendChild(tr);
  });
}

async function toggleUser(u) {
  const ok = await confirm(
    u.is_active ? 'Deactivate user' : 'Activate user',
    `${u.is_active ? 'Deactivate' : 'Activate'} ${u.email}?`
  );
  if (!ok) return;
  const res = await api('/api/v1/admin/users/' + u.id, {
    method: 'PATCH',
    body: { is_active: !u.is_active },
  });
  if (res && res.ok) { toast('Updated'); loadUsers(); }
  else toast('Failed to update', 'error');
}

async function changeUserRole(u) {
  const newRole = u.role === 'admin' ? 'editor' : 'admin';
  const ok = await confirm(
    'Change role',
    `Change ${u.email} from ${u.role} to ${newRole}?`
  );
  if (!ok) return;
  const res = await api('/api/v1/admin/users/' + u.id, {
    method: 'PATCH',
    body: { role: newRole },
  });
  if (res && res.ok) { toast('Role updated'); loadUsers(); }
  else toast('Failed to update role', 'error');
}

document.getElementById('addUserBtn')?.addEventListener('click', () => openModal('userModal'));

document.getElementById('userForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const body = {
    email: form.elements.email.value.trim(),
    password: form.elements.password.value,
    role: form.elements.role.value,
  };
  const res = await api('/api/v1/admin/users', { method: 'POST', body });
  if (res && (res.ok || res.status === 201)) {
    toast('User created');
    closeModal('userModal');
    form.reset();
    loadUsers();
  } else {
    const err = await res?.json().catch(() => ({}));
    toast(err.detail || 'Failed to create user', 'error');
  }
});
