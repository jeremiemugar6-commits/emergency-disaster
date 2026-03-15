// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
  incidents:     [],
  wasteRequests: [],
  resolved:      0,
  currentRole:   null,
  currentUser:   null,
  currentUserId: null,
  mySubmissions: [],
  evacuationCenters: [],
  _evacNextId: 1,
  // Preparedness
  emergencySupplies: [],
  _supNextId: 1,
  brgyContacts: [],
  _contactNextId: 1,
  // Medical
  healthAlerts: [],
  _alertNextId: 1,
  diseaseCases: [],
  _diseaseNextId: 1,
  medSupplies: [],
  _medSupNextId: 1,
  medResolved: 0,
};

// ─── CREDENTIAL STORE ────────────────────────────────────────────────────────
// Seeded demo accounts — Admin can add/deactivate from the UI
const CREDENTIALS = {
  admin: [
    { id: 'admin', name: 'Administrator', pass: 'admin123', active: true }
  ],
  staff: [
    { id: 'BRG-2024-001', name: 'Punong Barangay Cruz',  pass: 'staff001', position: 'Punong Barangay',   active: true  },
    { id: 'BRG-2024-002', name: 'Kagawad Reyes',         pass: 'staff002', position: 'Kagawad',           active: true  },
    { id: 'BRG-2024-003', name: 'Secretary Dela Torre',  pass: 'staff003', position: 'Barangay Secretary', active: false },
  ],
  crew: [
    { id: 'WCC-2024-001', name: 'Juan Bautista',   pass: 'crew001', zone: 'Zone 1 – Purok A & B', active: true  },
    { id: 'WCC-2024-002', name: 'Pedro Gomez',     pass: 'crew002', zone: 'Zone 2 – Purok C & D', active: true  },
    { id: 'WCC-2024-003', name: 'Carlos Mendoza',  pass: 'crew003', zone: 'Zone 3 – Market Area', active: false },
  ],
};

let selectedRole = null; // tracks role chosen in step 1

// ─── TOAST ───────────────────────────────────────────────────────────────────
function toast(msg, type = 'success', duration = 3500) {
  const icons = { success: '✅', danger: '🚨', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideDown 0.3s ease both';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── TIME ────────────────────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('topbar-time');
  if (el) el.textContent = new Date().toLocaleString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
setInterval(updateClock, 60000);
updateClock();

// ─── BADGE ────────────────────────────────────────────────────────────────────
function updateBadge() {
  const pending = [...state.incidents, ...state.wasteRequests].filter(x => x.status === 'PENDING').length;
  document.getElementById('badge-count').textContent = pending;
  document.getElementById('badge-dot').style.display = pending > 0 ? 'block' : 'none';
}

// ─── AUTH STEP 1: ROLE SELECTION ─────────────────────────────────────────────
function selectRole(role) {
  selectedRole = role;
  document.getElementById('login-step-1').classList.add('hidden');
  document.getElementById('login-step-2').classList.remove('hidden');

  // Hide all field groups
  ['resident-fields','staff-fields','crew-fields','admin-fields'].forEach(id =>
    document.getElementById(id).classList.add('hidden'));

  // Show the right fields
  document.getElementById(role + '-fields').classList.remove('hidden');

  // Set badge label
  const labels = {
    resident: '🏠 Resident Access',
    staff:    '🛡️ Barangay Staff / Official',
    crew:     '🚛 Waste Collection Crew',
    admin:    '⚡ Administrator',
  };
  document.getElementById('login-role-badge').textContent = labels[role];

  // Focus first input
  const firstInput = document.querySelector(`#${role}-fields input`);
  if (firstInput) firstInput.focus();

  document.getElementById('login-err').textContent = '';
}

function goBackToRoles() {
  selectedRole = null;
  document.getElementById('login-step-2').classList.add('hidden');
  document.getElementById('login-step-1').classList.remove('hidden');
  document.getElementById('login-err').textContent = '';
}

// ─── AUTH STEP 2: SIGN IN ─────────────────────────────────────────────────────
function doLogin() {
  const err = document.getElementById('login-err');
  err.textContent = '';

  if (selectedRole === 'resident') {
    const name = document.getElementById('inp-resident-name').value.trim();
    if (name.length < 2) { err.textContent = 'Please enter your name (at least 2 characters).'; return; }
    launchDashboard('resident', name, null);
    return;
  }

  if (selectedRole === 'admin') {
    const u = document.getElementById('inp-admin-user').value.trim();
    const p = document.getElementById('inp-admin-pass').value;
    const account = CREDENTIALS.admin.find(a => a.id === u && a.pass === p && a.active);
    if (!account) { err.textContent = 'Invalid admin credentials.'; shakeCard(); return; }
    launchDashboard('admin', account.name, account.id);
    return;
  }

  if (selectedRole === 'staff') {
    const id   = document.getElementById('inp-staff-id').value.trim().toUpperCase();
    const pass = document.getElementById('inp-staff-pass').value;
    if (!id || !pass) { err.textContent = 'Please enter your Employee ID and password.'; return; }
    const account = CREDENTIALS.staff.find(a => a.id.toUpperCase() === id && a.pass === pass);
    if (!account) { err.textContent = 'Invalid Employee ID or password.'; shakeCard(); return; }
    if (!account.active) { err.textContent = '⛔ This account has been deactivated. Contact admin.'; return; }
    launchDashboard('staff', account.name, account.id);
    return;
  }

  if (selectedRole === 'crew') {
    const id   = document.getElementById('inp-crew-id').value.trim().toUpperCase();
    const pass = document.getElementById('inp-crew-pass').value;
    if (!id || !pass) { err.textContent = 'Please enter your Crew ID and password.'; return; }
    const account = CREDENTIALS.crew.find(a => a.id.toUpperCase() === id && a.pass === pass);
    if (!account) { err.textContent = 'Invalid Crew ID or password.'; shakeCard(); return; }
    if (!account.active) { err.textContent = '⛔ This account has been deactivated. Contact admin.'; return; }
    launchDashboard('crew', account.name, account.id);
    return;
  }
}

function shakeCard() {
  const card = document.querySelector('.login-card');
  card.style.animation = 'none';
  card.offsetHeight; // reflow
  card.style.animation = 'shake 0.4s ease';
}

function toggleVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else                          { inp.type = 'password'; btn.textContent = '👁'; }
}

function launchDashboard(role, username, userId) {
  state.currentRole = role;
  state.currentUser = username;
  state.currentUserId = userId;

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').classList.remove('hidden');

  document.getElementById('sb-avatar').textContent = username.charAt(0).toUpperCase();
  document.getElementById('sb-name').textContent   = username;
  document.getElementById('sb-role').textContent   = role === 'staff' ? 'BARANGAY STAFF' :
                                                      role === 'crew'  ? 'COLLECTION CREW' :
                                                      role.toUpperCase();

  buildSidebarNav(role);
  showView(role === 'admin' ? 'admin' : role);
  updateBadge();
}

function doLogout() {
  state.currentRole = null;
  state.currentUser = null;
  state.currentUserId = null;
  state.mySubmissions = [];
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-screen').style.display = 'flex';

  // Reset form
  ['inp-resident-name','inp-staff-id','inp-staff-pass','inp-crew-id','inp-crew-pass','inp-admin-user','inp-admin-pass']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('login-err').textContent = '';

  // Go back to step 1
  goBackToRoles();
  document.getElementById('login-step-1').classList.remove('hidden');
  document.getElementById('login-step-2').classList.add('hidden');
  selectedRole = null;
  closeSidebar();
}

// ─── CREDENTIAL MANAGEMENT (Admin) ────────────────────────────────────────────
function switchCredTab(type, btn) {
  document.querySelectorAll('.cred-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.cred-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('cred-' + type).classList.add('active');
}

function renderCredList(type) {
  const list = document.getElementById('cred-list-' + type);
  list.innerHTML = '';
  CREDENTIALS[type].forEach((acc, idx) => {
    const sub = type === 'staff'
      ? `<div class="cred-item-name">${acc.position || ''} &nbsp;·&nbsp; ID: ${acc.id}</div>`
      : `<div class="cred-item-name">Zone: ${acc.zone || ''} &nbsp;·&nbsp; ID: ${acc.id}</div>`;
    list.innerHTML += `
      <div class="cred-item">
        <span style="font-size:1.1rem">${type === 'staff' ? '🛡️' : '🚛'}</span>
        <div class="cred-item-info">
          <div class="cred-item-id">${acc.name}</div>
          ${sub}
        </div>
        <span class="cred-status-badge ${acc.active ? 'cred-status-active' : 'cred-status-inactive'}">
          ${acc.active ? 'Active' : 'Inactive'}
        </span>
        <button class="btn btn-sm ${acc.active ? 'btn-amber' : 'btn-success'}"
          onclick="toggleCredential('${type}', ${idx})"
          style="margin-left:0.4rem">
          ${acc.active ? 'Deactivate' : 'Activate'}
        </button>
        <button class="btn btn-danger btn-sm" onclick="removeCredential('${type}', ${idx})" style="margin-left:0.3rem">✕</button>
      </div>`;
  });
}

function toggleCredential(type, idx) {
  CREDENTIALS[type][idx].active = !CREDENTIALS[type][idx].active;
  const acc = CREDENTIALS[type][idx];
  toast(`Account ${acc.name} ${acc.active ? 'activated' : 'deactivated'}.`, acc.active ? 'success' : 'warning');
  renderCredList(type);
}

function removeCredential(type, idx) {
  const acc = CREDENTIALS[type][idx];
  CREDENTIALS[type].splice(idx, 1);
  toast(`Account ${acc.name} removed.`, 'danger');
  renderCredList(type);
}

function addCredential(type) {
  if (type === 'staff') {
    const id   = document.getElementById('new-staff-id').value.trim();
    const name = document.getElementById('new-staff-name').value.trim();
    const pass = document.getElementById('new-staff-pass').value;
    const pos  = document.getElementById('new-staff-pos').value.trim();
    if (!id || !name || !pass) { toast('Employee ID, name, and password are required.', 'warning'); return; }
    if (CREDENTIALS.staff.find(a => a.id.toLowerCase() === id.toLowerCase()))
      { toast('Employee ID already exists.', 'danger'); return; }
    CREDENTIALS.staff.push({ id, name, pass, position: pos, active: true });
    ['new-staff-id','new-staff-name','new-staff-pass','new-staff-pos'].forEach(x => document.getElementById(x).value = '');
    toast(`Staff account ${name} (${id}) created.`, 'success');
    renderCredList('staff');
    return;
  }
  if (type === 'crew') {
    const id   = document.getElementById('new-crew-id').value.trim();
    const name = document.getElementById('new-crew-name').value.trim();
    const pass = document.getElementById('new-crew-pass').value;
    const zone = document.getElementById('new-crew-zone').value.trim();
    if (!id || !name || !pass) { toast('Crew ID, name, and password are required.', 'warning'); return; }
    if (CREDENTIALS.crew.find(a => a.id.toLowerCase() === id.toLowerCase()))
      { toast('Crew ID already exists.', 'danger'); return; }
    CREDENTIALS.crew.push({ id, name, pass, zone, active: true });
    ['new-crew-id','new-crew-name','new-crew-pass','new-crew-zone'].forEach(x => document.getElementById(x).value = '');
    toast(`Crew account ${name} (${id}) created.`, 'success');
    renderCredList('crew');
  }
}

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────────────
const navMap = {
  admin:    [
    { icon: '📊', label: 'Command Center',        view: 'admin' },
    { icon: '🔐', label: 'Credential Management', view: 'credentials' },
  ],
  resident: [
    { icon: '🏠', label: 'My Portal',             view: 'resident' },
    { icon: '🔔', label: 'Notifications',          view: 'notifications', badge: true },
    { icon: '🧰', label: 'Preparedness',           view: 'preparedness' },
  ],
  staff:    [
    { icon: '🛡️', label: 'Operations',            view: 'staff' },
    { icon: '🏚️', label: 'Evacuation Centers',    view: 'evacuation' },
    { icon: '🏥', label: 'Medical & Health',       view: 'medical' },
  ],
  crew:     [{ icon: '🚛', label: 'Collection',      view: 'crew' }],
};

function buildSidebarNav(role) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';
  const items = navMap[role] || [];
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'nav-link' + (i === 0 ? ' active' : '');
    el.id = item.badge ? 'nav-notifications' : '';
    const unread = item.badge ? countUnreadAlerts() : 0;
    el.innerHTML = `<span class="nav-icon">${item.icon}</span> ${item.label}`
      + (item.badge && unread > 0 ? ` <span class="nav-badge">${unread}</span>` : '');
    el.onclick = () => {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      el.classList.add('active');
      showView(item.view);
    };
    nav.appendChild(el);
  });
}

// ─── VIEW SWITCHING ───────────────────────────────────────────────────────────
function showView(role) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  const titles = {
    admin:         'Command Center',
    resident:      'Resident Portal',
    staff:         'Operations Control',
    crew:          'Collection Dashboard',
    credentials:   'Credential Management',
    evacuation:    'Evacuation Centers',
    preparedness:  'Emergency & Waste Preparedness',
    medical:       'Medical & Health Safety',
    notifications: 'Health Notifications',
  };

  const viewEl = document.getElementById(`view-${role}`);
  if (viewEl) viewEl.classList.add('active');
  document.getElementById('topbar-title').textContent = titles[role] || role;

  if (role === 'admin')         refreshAdmin('ALL');
  if (role === 'staff')         refreshStaff();
  if (role === 'crew')          refreshCrew();
  if (role === 'resident')      refreshResident();
  if (role === 'credentials')   { renderCredList('staff'); renderCredList('crew'); }
  if (role === 'evacuation')    refreshEvacuation();
  if (role === 'preparedness')  refreshPreparedness();
  if (role === 'medical')       refreshMedical();
  if (role === 'notifications') refreshNotifications();
  closeSidebar();
}

// ─── SIDEBAR MOBILE ──────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('open');
}

// ─── RESIDENT ────────────────────────────────────────────────────────────────
function submitIncident() {
  const desc = document.getElementById('inp-emergency').value.trim();
  if (!desc) { toast('Please describe the emergency.', 'warning'); return; }

  const entry = {
    id: Date.now(),
    type: 'INCIDENT',
    detail: desc,
    address: '',
    status: 'PENDING',
    timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
  };

  state.incidents.push(entry);
  state.mySubmissions.push(entry);
  document.getElementById('inp-emergency').value = '';
  toast('🚨 Emergency alert submitted. Staff has been notified.', 'danger');
  refreshResident();
  updateBadge();
}

function submitWaste() {
  const type = document.getElementById('inp-waste-type').value;
  const addr = document.getElementById('inp-waste-addr').value.trim();
  if (!addr) { toast('Please provide your address.', 'warning'); return; }

  const entry = {
    id: Date.now(),
    type: 'WASTE',
    detail: `${type} Pickup`,
    address: addr,
    status: 'PENDING',
    timestamp: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
  };

  state.wasteRequests.push(entry);
  state.mySubmissions.push(entry);
  document.getElementById('inp-waste-addr').value = '';
  toast('♻️ Waste pickup request submitted!', 'success');
  refreshResident();
  updateBadge();
}

function refreshResident() {
  const tbody = document.getElementById('resident-tbody');
  const empty = document.getElementById('resident-empty');
  tbody.innerHTML = '';

  if (state.mySubmissions.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  state.mySubmissions.slice().reverse().forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td><span class="type-badge badge-${item.type.toLowerCase()}">${item.type}</span></td>
        <td>${item.detail}${item.address ? ` — <em>${item.address}</em>` : ''}</td>
        <td>${item.timestamp}</td>
        <td>${statusPill(item.status)}</td>
      </tr>`;
  });
}

// ─── STAFF ───────────────────────────────────────────────────────────────────
function refreshStaff() {
  const tbody = document.getElementById('staff-tbody');
  const empty = document.getElementById('staff-empty');
  tbody.innerHTML = '';

  const all = [...state.incidents, ...state.wasteRequests];
  document.getElementById('staff-inc-cnt').textContent   = state.incidents.length;
  document.getElementById('staff-waste-cnt').textContent  = state.wasteRequests.length;

  if (all.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  all.slice().reverse().forEach(item => {
    const done = ['ACKNOWLEDGED','COLLECTED'].includes(item.status);
    const rowCls = item.status === 'ACKNOWLEDGED' ? 'row-ack' : item.status === 'COLLECTED' ? 'row-done' : '';
    tbody.innerHTML += `
      <tr class="${rowCls}">
        <td><span class="type-badge badge-${item.type.toLowerCase()}">${item.type}</span></td>
        <td>${item.detail}${item.address ? ` — ${item.address}` : ''}</td>
        <td>${item.timestamp}</td>
        <td>${statusPill(item.status)}</td>
        <td>
          <button class="btn btn-success btn-sm" ${done ? 'disabled' : ''}
            onclick="acknowledgeTask(${item.id},'${item.type}')">
            ${done ? '✔ Acknowledged' : 'Acknowledge'}
          </button>
        </td>
      </tr>`;
  });
  updateBadge();
}

function acknowledgeTask(id, type) {
  const arr   = type === 'INCIDENT' ? state.incidents : state.wasteRequests;
  const target = arr.find(x => x.id === id);
  if (target) {
    target.status = 'ACKNOWLEDGED';
    toast(`🔔 Staff is now responding to ${type.toLowerCase()} #${id}.`, 'info');
    refreshStaff();
  }
}

// ─── CREW ────────────────────────────────────────────────────────────────────
function refreshCrew() {
  const tbody = document.getElementById('crew-tbody');
  const empty = document.getElementById('crew-empty');
  tbody.innerHTML = '';

  const pending   = state.wasteRequests.filter(x => x.status !== 'COLLECTED').length;
  const collected = state.wasteRequests.filter(x => x.status === 'COLLECTED').length;

  document.getElementById('crew-pending-cnt').textContent = pending;
  document.getElementById('crew-done-cnt').textContent    = collected;

  if (state.wasteRequests.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  state.wasteRequests.slice().reverse().forEach(item => {
    const done = item.status === 'COLLECTED';
    const ack  = item.status === 'ACKNOWLEDGED';
    const rowCls = done ? 'row-done' : ack ? 'row-ack' : '';
    tbody.innerHTML += `
      <tr class="${rowCls}">
        <td><span class="type-badge badge-waste">WASTE</span></td>
        <td>${item.detail}</td>
        <td>${item.address || '—'}</td>
        <td>${item.timestamp}</td>
        <td>${statusPill(item.status)}</td>
        <td>
          <button class="btn btn-success btn-sm" ${done ? 'disabled' : ''}
            onclick="completeCollection(${item.id})">
            ${done ? '✔ Collected' : 'Mark Collected'}
          </button>
        </td>
      </tr>`;
  });
  updateBadge();
}

function completeCollection(id) {
  const task = state.wasteRequests.find(x => x.id === id);
  if (task) {
    task.status = 'COLLECTED';
    toast(`♻️ Collection complete for: ${task.detail} at ${task.address || 'location'}.`, 'success');
    refreshCrew();
  }
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────
let adminFilter = 'ALL';

function filterAdmin(type, el) {
  adminFilter = type;
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  refreshAdmin(type);
}

function refreshAdmin(filterType) {
  adminFilter = filterType || adminFilter;
  const tbody  = document.getElementById('admin-tbody');
  const empty  = document.getElementById('admin-empty');
  const titles = { ALL: 'All Activity', INCIDENT: 'Emergency Incidents', WASTE: 'Waste Requests' };

  document.getElementById('admin-tbl-title').textContent = titles[adminFilter] || 'All Activity';
  document.getElementById('cnt-inc').textContent     = state.incidents.length;
  document.getElementById('cnt-waste').textContent   = state.wasteRequests.length;
  document.getElementById('cnt-pending').textContent = [...state.incidents,...state.wasteRequests].filter(x=>x.status==='PENDING').length;
  document.getElementById('cnt-resolved').textContent = state.resolved;

  let data = [...state.incidents, ...state.wasteRequests];
  if (adminFilter !== 'ALL') data = data.filter(x => x.type === adminFilter);
  data.reverse();

  tbody.innerHTML = '';
  if (data.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  data.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td><span class="type-badge badge-${item.type.toLowerCase()}">${item.type}</span></td>
        <td>${item.detail}${item.address ? ` — <em>${item.address}</em>` : ''}</td>
        <td>${item.timestamp}</td>
        <td>${statusPill(item.status)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="resolveRecord(${item.id},'${item.type}')">
            Archive
          </button>
        </td>
      </tr>`;
  });
  updateBadge();
}

function resolveRecord(id, type) {
  if (type === 'INCIDENT') state.incidents     = state.incidents.filter(x => x.id !== id);
  else                     state.wasteRequests = state.wasteRequests.filter(x => x.id !== id);
  state.resolved++;
  toast('Record archived and resolved.', 'info');
  refreshAdmin(adminFilter);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function statusPill(status) {
  const map = {
    PENDING:      'pill-pending',
    ACKNOWLEDGED: 'pill-acknowledged',
    COLLECTED:    'pill-collected',
    RESOLVED:     'pill-resolved',
  };
  return `<span class="status-pill ${map[status]||'pill-pending'}">${status}</span>`;
}

// ─── EVACUATION CENTERS ──────────────────────────────────────────────────────

// Seed some demo centers
state.evacuationCenters = [
  { id: 1, name: 'Barangay Hall', location: 'Purok 1, Main St.', capacity: 120, status: 'OPEN',
    focal: 'Kgd. Santos', notes: 'Food packs, water, cots available.',
    evacuees: [{ name: 'Dela Cruz Family', count: 5, time: '08:30' }, { name: 'Reyes Family', count: 3, time: '09:15' }] },
  { id: 2, name: 'Covered Court',  location: 'Purok 3, Maharlika Ave.', capacity: 200, status: 'STANDBY',
    focal: 'Kgd. Bautista', notes: 'Ready for deployment. Water supply available.',
    evacuees: [] },
  { id: 3, name: 'Elementary School Gym', location: 'Purok 5, School Rd.', capacity: 80, status: 'OPEN',
    focal: 'Kgd. Gomez', notes: 'First-aid station, blankets.',
    evacuees: [{ name: 'Mendoza Family', count: 7, time: '10:00' }] },
];
state._evacNextId = 4;

function getEvacueeCount(center) {
  return center.evacuees.reduce((s, e) => s + Number(e.count), 0);
}

function refreshEvacuation() {
  const grid   = document.getElementById('evac-grid');
  const empty  = document.getElementById('evac-empty');
  const centers = state.evacuationCenters;

  // Stats
  const totalEvacuees   = centers.reduce((s, c) => s + getEvacueeCount(c), 0);
  const totalCapacity   = centers.reduce((s, c) => s + Number(c.capacity), 0);
  const openCount       = centers.filter(c => c.status === 'OPEN').length;

  document.getElementById('evac-cnt-centers').textContent   = centers.length;
  document.getElementById('evac-cnt-open').textContent      = openCount;
  document.getElementById('evac-cnt-evacuees').textContent  = totalEvacuees;
  document.getElementById('evac-cnt-available').textContent = Math.max(0, totalCapacity - totalEvacuees);

  grid.innerHTML = '';
  if (centers.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  centers.forEach(c => {
    const count    = getEvacueeCount(c);
    const pct      = c.capacity > 0 ? Math.min(100, Math.round((count / c.capacity) * 100)) : 0;
    const fillCls  = pct >= 85 ? 'fill-high' : pct >= 50 ? 'fill-medium' : 'fill-low';
    const statusCls= { OPEN:'evac-open', FULL:'evac-full', CLOSED:'evac-closed', STANDBY:'evac-standby' }[c.status] || 'evac-standby';

    // Auto-set FULL if over capacity
    if (count >= c.capacity && c.status === 'OPEN') c.status = 'FULL';

    grid.innerHTML += `
      <div class="evac-card">
        <div class="evac-card-header">
          <h4>🏚️ ${c.name}</h4>
          <span class="evac-status-badge ${statusCls}">${c.status}</span>
        </div>
        <div class="evac-card-body">
          <div class="evac-meta">
            <div class="evac-meta-item">
              <div class="evac-meta-label">📍 Location</div>
              <div class="evac-meta-value">${c.location || '—'}</div>
            </div>
            <div class="evac-meta-item">
              <div class="evac-meta-label">👤 Focal Person</div>
              <div class="evac-meta-value">${c.focal || '—'}</div>
            </div>
            <div class="evac-meta-item">
              <div class="evac-meta-label">👥 Evacuees</div>
              <div class="evac-meta-value" style="color:${pct>=85?'var(--red)':pct>=50?'var(--amber)':'var(--jade)'}">
                ${count} / ${c.capacity}
              </div>
            </div>
            <div class="evac-meta-item">
              <div class="evac-meta-label">🛏️ Available</div>
              <div class="evac-meta-value">${Math.max(0, c.capacity - count)} slots</div>
            </div>
          </div>
          <div class="evac-capacity-bar">
            <div class="evac-capacity-fill ${fillCls}" style="width:${pct}%"></div>
          </div>
          <div style="font-size:0.72rem;color:var(--muted);margin-bottom:0.5rem;">${pct}% capacity used</div>
          ${c.notes ? `<div style="font-size:0.76rem;color:var(--muted);border-top:1px solid var(--border);padding-top:0.5rem;">📋 ${c.notes}</div>` : ''}
        </div>
        <div class="evac-card-footer">
          <button class="btn btn-success btn-sm" onclick="openEvacueesModal(${c.id})">👥 Evacuees</button>
          <button class="btn btn-ghost btn-sm" onclick="openEditCenterModal(${c.id})">✏️ Edit</button>
          <button class="btn btn-amber btn-sm" onclick="cycleStatus(${c.id})">🔄 Status</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCenter(${c.id})">✕</button>
        </div>
      </div>`;
  });
}

function cycleStatus(id) {
  const c = state.evacuationCenters.find(x => x.id === id);
  if (!c) return;
  const cycle = ['OPEN','STANDBY','FULL','CLOSED'];
  const idx = cycle.indexOf(c.status);
  c.status = cycle[(idx + 1) % cycle.length];
  toast(`${c.name} status → ${c.status}`, 'info');
  refreshEvacuation();
}

function deleteCenter(id) {
  const c = state.evacuationCenters.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Remove "${c.name}" from the list?`)) return;
  state.evacuationCenters = state.evacuationCenters.filter(x => x.id !== id);
  toast(`${c.name} removed.`, 'danger');
  refreshEvacuation();
}

// ─── ADD / EDIT CENTER MODAL ──────────────────────────────────────────────────
function openAddCenterModal() {
  document.getElementById('modal-center-title').textContent = '🏚️ Add Evacuation Center';
  document.getElementById('modal-center-id').value = '';
  ['mc-name','mc-location','mc-capacity','mc-focal','mc-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('mc-status').value = 'OPEN';
  openModal('modal-center');
}

function openEditCenterModal(id) {
  const c = state.evacuationCenters.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modal-center-title').textContent = '✏️ Edit Evacuation Center';
  document.getElementById('modal-center-id').value  = id;
  document.getElementById('mc-name').value          = c.name;
  document.getElementById('mc-location').value      = c.location;
  document.getElementById('mc-capacity').value      = c.capacity;
  document.getElementById('mc-status').value        = c.status;
  document.getElementById('mc-focal').value         = c.focal;
  document.getElementById('mc-notes').value         = c.notes;
  openModal('modal-center');
}

function saveCenter() {
  const name     = document.getElementById('mc-name').value.trim();
  const location = document.getElementById('mc-location').value.trim();
  const capacity = parseInt(document.getElementById('mc-capacity').value) || 0;
  const status   = document.getElementById('mc-status').value;
  const focal    = document.getElementById('mc-focal').value.trim();
  const notes    = document.getElementById('mc-notes').value.trim();
  const editId   = document.getElementById('modal-center-id').value;

  if (!name)     { toast('Center name is required.', 'warning'); return; }
  if (capacity < 1) { toast('Capacity must be at least 1.', 'warning'); return; }

  if (editId) {
    const c = state.evacuationCenters.find(x => x.id === parseInt(editId));
    if (c) { Object.assign(c, { name, location, capacity, status, focal, notes }); }
    toast(`${name} updated.`, 'success');
  } else {
    state.evacuationCenters.push({
      id: state._evacNextId++, name, location, capacity, status, focal, notes, evacuees: []
    });
    toast(`${name} added as evacuation center.`, 'success');
  }
  closeModal('modal-center');
  refreshEvacuation();
}

// ─── EVACUEES MODAL ───────────────────────────────────────────────────────────
function openEvacueesModal(centerId) {
  const c = state.evacuationCenters.find(x => x.id === centerId);
  if (!c) return;
  document.getElementById('modal-evac-title').textContent    = `👥 Evacuees — ${c.name}`;
  document.getElementById('modal-evac-center-id').value      = centerId;
  document.getElementById('evac-inp-name').value             = '';
  document.getElementById('evac-inp-count').value            = '1';
  renderEvacueeLog(c);
  openModal('modal-evacuees');
}

function renderEvacueeLog(c) {
  const log   = document.getElementById('evacuee-log');
  const total = getEvacueeCount(c);
  document.getElementById('modal-evac-capacity-info').innerHTML =
    `<strong>${total}</strong> evacuees logged &nbsp;·&nbsp; Capacity: <strong>${c.capacity}</strong> &nbsp;·&nbsp; Available: <strong>${Math.max(0, c.capacity - total)}</strong>`;
  document.getElementById('modal-evac-total').textContent = `Total persons: ${total}`;

  if (c.evacuees.length === 0) {
    log.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.82rem;">No evacuees logged yet.</div>';
    return;
  }
  log.innerHTML = c.evacuees.map((e, i) => `
    <div class="evacuee-row">
      <span class="evacuee-name">${e.name}</span>
      <span class="evacuee-count">👥 ${e.count} person${e.count != 1 ? 's' : ''}</span>
      <span class="evacuee-count" style="margin-left:0.3rem">🕐 ${e.time}</span>
      <button class="btn btn-danger btn-sm" style="padding:0.2rem 0.55rem;font-size:0.7rem;margin-left:0.4rem"
        onclick="removeEvacuee(${i})">✕</button>
    </div>`).join('');
}

function addEvacuee() {
  const centerId = parseInt(document.getElementById('modal-evac-center-id').value);
  const c = state.evacuationCenters.find(x => x.id === centerId);
  if (!c) return;

  const name  = document.getElementById('evac-inp-name').value.trim();
  const count = parseInt(document.getElementById('evac-inp-count').value) || 1;
  if (!name) { toast('Enter evacuee name or family.', 'warning'); return; }

  const current = getEvacueeCount(c);
  if (current + count > c.capacity) {
    toast(`⚠️ Adding ${count} would exceed capacity (${c.capacity}).`, 'warning'); return;
  }

  const time = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  c.evacuees.push({ name, count, time });
  if (current + count >= c.capacity) c.status = 'FULL';

  document.getElementById('evac-inp-name').value  = '';
  document.getElementById('evac-inp-count').value = '1';
  toast(`${name} (${count} pax) logged.`, 'success');
  renderEvacueeLog(c);
  refreshEvacuation();
}

function removeEvacuee(idx) {
  const centerId = parseInt(document.getElementById('modal-evac-center-id').value);
  const c = state.evacuationCenters.find(x => x.id === centerId);
  if (!c) return;
  const removed = c.evacuees.splice(idx, 1)[0];
  if (c.status === 'FULL' && getEvacueeCount(c) < c.capacity) c.status = 'OPEN';
  toast(`${removed.name} removed from log.`, 'info');
  renderEvacueeLog(c);
  refreshEvacuation();
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open');    }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modals on backdrop click
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });
});

// Enter key on evacuee name input
document.addEventListener('DOMContentLoaded', () => {
  const ei = document.getElementById('evac-inp-name');
  if (ei) ei.addEventListener('keydown', e => { if (e.key === 'Enter') addEvacuee(); });
});


// Enter key on any login input
// ─── NOTIFICATIONS (Resident view of Health Alerts) ──────────────────────────

let notifFilter = 'ALL';
// Track which alert IDs the resident has read
const readAlertIds = new Set();

function countUnreadAlerts() {
  return state.healthAlerts.filter(a => !a.resolved && !readAlertIds.has(a.id)).length;
}

function updateNotifNavBadge() {
  const el = document.getElementById('nav-notifications');
  if (!el) return;
  const unread = countUnreadAlerts();
  const existing = el.querySelector('.nav-badge');
  if (existing) existing.remove();
  if (unread > 0) {
    const badge = document.createElement('span');
    badge.className = 'nav-badge';
    badge.textContent = unread;
    el.appendChild(badge);
  }
}

function refreshNotifications() {
  const listEl   = document.getElementById('notif-list');
  const emptyEl  = document.getElementById('notif-empty');
  const stripEl  = document.getElementById('notif-summary-strip');
  if (!listEl) return;

  // Filter
  let alerts = state.healthAlerts.filter(a => !a.resolved);
  if (notifFilter === 'UNREAD')   alerts = alerts.filter(a => !readAlertIds.has(a.id));
  if (['critical','warning','info','ok'].includes(notifFilter))
    alerts = alerts.filter(a => a.level === notifFilter);

  // Summary strip
  const totalUnread = countUnreadAlerts();
  if (totalUnread > 0) {
    stripEl.innerHTML = `
      <div class="alert-strip danger">
        <span>🚨</span>
        <div><strong>${totalUnread} unread health alert${totalUnread > 1 ? 's' : ''}</strong> from Barangay Staff. Please read and follow the advisories below.
        <button class="btn btn-ghost btn-sm" style="margin-left:0.8rem;" onclick="markAllRead()">✅ Mark all as read</button></div>
      </div>`;
  } else {
    stripEl.innerHTML = `
      <div class="alert-strip success">
        <span>✅</span>
        <div>You're all caught up! No unread health alerts.</div>
      </div>`;
  }

  if (alerts.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    updateNotifNavBadge();
    return;
  }
  emptyEl.classList.add('hidden');

  const levelIcon  = { critical:'🚨', warning:'⚠️', info:'ℹ️', ok:'✅' };
  const levelLabel = { critical:'Critical Alert', warning:'Warning', info:'Advisory', ok:'All Clear' };

  listEl.innerHTML = alerts.map(a => {
    const isUnread  = !readAlertIds.has(a.id);
    const colorCls  = isUnread ? `unread unread-${a.level}` : '';
    return `
      <div class="notif-card ${colorCls}" id="notif-card-${a.id}">
        <div class="notif-card-head">
          <span class="notif-icon">${levelIcon[a.level] || 'ℹ️'}</span>
          <div class="notif-meta">
            <div class="notif-title">
              ${isUnread ? '<span class="unread-dot"></span>' : ''}
              ${a.title}
            </div>
            <div class="notif-sub">
              <span>🏷️ ${levelLabel[a.level] || a.level}</span>
              <span>📍 ${a.area}</span>
              <span>📅 ${a.date}</span>
              ${isUnread ? '<span style="color:var(--red);font-weight:700;">● NEW</span>' : '<span style="color:var(--muted);">● Read</span>'}
            </div>
          </div>
        </div>
        <div class="notif-body">${a.detail}</div>
        <div class="notif-actions">
          ${isUnread
            ? `<button class="btn btn-success btn-sm" onclick="markRead(${a.id})">✅ Mark as Read</button>`
            : `<span style="font-size:0.73rem;color:var(--muted);">✔ Read</span>`}
          <span style="margin-left:auto;font-size:0.72rem;color:var(--muted);">Issued by Barangay Staff</span>
        </div>
      </div>`;
  }).join('');

  updateNotifNavBadge();
}

function filterNotif(type, btn) {
  notifFilter = type;
  document.querySelectorAll('#notif-filter-tabs .ftab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  refreshNotifications();
}

function markRead(id) {
  readAlertIds.add(id);
  refreshNotifications();
  updateNotifNavBadge();
}

function markAllRead() {
  state.healthAlerts.forEach(a => readAlertIds.add(a.id));
  refreshNotifications();
  updateNotifNavBadge();
}


document.querySelectorAll('#login-step-2 input').forEach(inp => {
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
});

// ─── PREPAREDNESS & MEDICAL: SEED DATA ──────────────────────────────────────
state.emergencySupplies = [
  { id:1, name:'Bottled Water (500ml)',    qty:120, unit:'pcs',   cat:'Food & Water' },
  { id:2, name:'Canned Goods (assorted)',  qty:80,  unit:'pcs',   cat:'Food & Water' },
  { id:3, name:'Rice (sack)',              qty:15,  unit:'sacks', cat:'Food & Water' },
  { id:4, name:'Sleeping Mats',            qty:40,  unit:'pcs',   cat:'Equipment'    },
  { id:5, name:'Life Vests',               qty:5,   unit:'pcs',   cat:'Equipment'    },
  { id:6, name:'Flashlights',             qty:3,   unit:'pcs',   cat:'Equipment'    },
  { id:7, name:'Sandbags',                qty:200, unit:'pcs',   cat:'Equipment'    },
  { id:8, name:'Hygiene Kits',            qty:25,  unit:'kits',  cat:'Hygiene'      },
];
state._supNextId = 9;

state.brgyContacts = [
  { id:1, name:'Punong Barangay Cruz',     num:'0917-111-2233', role:'BDRRMC Chair'  },
  { id:2, name:'BHW Dela Cruz',            num:'0918-222-3344', role:'Barangay Health Worker' },
  { id:3, name:'BDRRMC Secretary Reyes',   num:'0919-333-4455', role:'BDRRMC Secretary' },
];
state._contactNextId = 4;

state.healthAlerts = [
  { id:1, title:'Dengue Surge Alert', level:'critical', area:'Purok 3 & 4', detail:'Spike in dengue cases reported. Eliminate standing water immediately.', date:'Mar 5', resolved:false },
  { id:2, title:'Flood Water Advisory', level:'warning', area:'Purok 1', detail:'Floodwaters may be contaminated. Boil water before drinking. Wear boots in flooded areas.', date:'Mar 6', resolved:false },
];
state._alertNextId = 3;

state.diseaseCases = [
  { id:1, disease:'Dengue',        cases:4, area:'Purok 3', date:'Mar 4', notes:'Referred to RHU. BHW monitoring.', status:'ACTIVE' },
  { id:2, disease:'Leptospirosis', cases:1, area:'Purok 1', date:'Mar 6', notes:'Post-flood exposure. Hospitalized.', status:'ACTIVE' },
];
state._diseaseNextId = 3;

state.medSupplies = [
  { id:1, name:'Paracetamol 500mg',      qty:200, unit:'tabs',   cat:'Medicines'  },
  { id:2, name:'ORS Sachets',            qty:50,  unit:'sachets',cat:'Medicines'  },
  { id:3, name:'Amoxicillin 500mg',      qty:30,  unit:'caps',   cat:'Medicines'  },
  { id:4, name:'Betadine Solution',      qty:4,   unit:'bottles',cat:'First Aid'  },
  { id:5, name:'Sterile Gauze Pads',     qty:60,  unit:'pcs',    cat:'First Aid'  },
  { id:6, name:'Surgical Gloves',        qty:3,   unit:'boxes',  cat:'First Aid'  },
  { id:7, name:'Blood Pressure Monitor', qty:2,   unit:'units',  cat:'Equipment'  },
  { id:8, name:'Stretcher',              qty:1,   unit:'unit',   cat:'Equipment'  },
];
state._medSupNextId = 9;

// ─── SUB-TAB SWITCHER ────────────────────────────────────────────────────────
function switchVTab(group, tab, btn) {
  const prefix = group + '-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(el => {
    if (el.classList.contains('vtab-panel')) el.classList.remove('active');
  });
  const activeView = document.querySelector('.view.active');
  if (activeView) activeView.querySelectorAll('.vtab').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById(prefix + tab);
  if (panel) panel.classList.add('active');
  if (btn)  btn.classList.add('active');
  if (tab === 'supplies')    renderSupplyList('emergencySupplies', 'supply-list');
  if (tab === 'contacts')    { renderContactGrid(); renderBrgyContacts(); }
  if (tab === 'medsupplies') renderSupplyList('medSupplies', 'med-supply-list');
  if (tab === 'disease')     renderDiseaseCases();
  if (tab === 'alerts')      renderHealthAlerts();
}

// ─── CHECKLIST ───────────────────────────────────────────────────────────────
function toggleCheck(cb) {
  cb.closest('li').classList.toggle('checked', cb.checked);
}

// ─── PREPAREDNESS ────────────────────────────────────────────────────────────
function refreshPreparedness() {
  renderSupplyList('emergencySupplies', 'supply-list');
  renderContactGrid();
  renderBrgyContacts();
}

// ─── SUPPLY LIST (shared) ────────────────────────────────────────────────────
function renderSupplyList(storeKey, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = state[storeKey];
  if (items.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);font-size:0.82rem;">No items yet. Click ＋ Add Item.</div>';
    return;
  }
  container.innerHTML = items.map((item, idx) => {
    const dotCls = item.qty === 0 ? 'dot-empty' : item.qty <= 5 ? 'dot-low' : 'dot-ok';
    const statusLabel = item.qty === 0
      ? '<span style="color:var(--red);font-size:0.72rem;font-weight:700;">Empty</span>'
      : item.qty <= 5
        ? '<span style="color:var(--amber);font-size:0.72rem;font-weight:700;">Low</span>'
        : '<span style="color:var(--jade);font-size:0.72rem;font-weight:700;">OK</span>';
    return `<div class="supply-item">
      <span class="supply-status-dot ${dotCls}"></span>
      <span class="supply-name">${item.name}</span>
      <div class="qty-ctrl supply-qty">
        <button class="qty-btn" onclick="adjustQty('${storeKey}',${idx},-1)">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="adjustQty('${storeKey}',${idx},+1)">+</button>
      </div>
      <span class="supply-unit">${item.unit}</span>
      <span class="supply-unit" style="min-width:90px;">${item.cat}</span>
      <span style="min-width:60px;">${statusLabel}</span>
      <button class="btn btn-danger btn-sm" style="min-width:36px;" onclick="removeSupplyItem('${storeKey}',${idx},'${containerId}')">✕</button>
    </div>`;
  }).join('');
}

function adjustQty(storeKey, idx, delta) {
  state[storeKey][idx].qty = Math.max(0, state[storeKey][idx].qty + delta);
  renderSupplyList(storeKey, storeKey === 'emergencySupplies' ? 'supply-list' : 'med-supply-list');
  updateMedStats();
}

function removeSupplyItem(storeKey, idx, containerId) {
  state[storeKey].splice(idx, 1);
  renderSupplyList(storeKey, containerId);
  updateMedStats();
}

function openAddSupplyModal(storeKey) {
  document.getElementById('modal-supply-store').value = storeKey || 'emergencySupplies';
  document.getElementById('modal-supply-title').textContent = storeKey === 'medSupplies' ? '💊 Add Medical Supply' : '📦 Add Supply Item';
  ['supply-inp-name','supply-inp-unit','supply-inp-cat'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('supply-inp-qty').value = '10';
  openModal('modal-supply');
}
function openAddMedSupplyModal() { openAddSupplyModal('medSupplies'); }

function saveSupply() {
  const storeKey = document.getElementById('modal-supply-store').value || 'emergencySupplies';
  const name = document.getElementById('supply-inp-name').value.trim();
  const qty  = parseInt(document.getElementById('supply-inp-qty').value) || 0;
  const unit = document.getElementById('supply-inp-unit').value.trim() || 'pcs';
  const cat  = document.getElementById('supply-inp-cat').value.trim() || 'General';
  if (!name) { toast('Item name is required.', 'warning'); return; }
  const nextKey = storeKey === 'medSupplies' ? '_medSupNextId' : '_supNextId';
  state[storeKey].push({ id: state[nextKey]++, name, qty, unit, cat });
  const containerId = storeKey === 'medSupplies' ? 'med-supply-list' : 'supply-list';
  toast(`${name} added.`, 'success');
  closeModal('modal-supply');
  renderSupplyList(storeKey, containerId);
  updateMedStats();
}

// ─── CONTACTS ────────────────────────────────────────────────────────────────
const STATIC_CONTACTS = [
  { icon:'🚒', name:'Bureau of Fire Protection',  num:'160',           sub:'BFP Hotline (nationwide)'       },
  { icon:'🚔', name:'Philippine National Police',  num:'117',           sub:'PNP Emergency Hotline'          },
  { icon:'🏥', name:'Emergency / Ambulance',       num:'911',           sub:'National Emergency Hotline'     },
  { icon:'🌊', name:'NDRRMC',                      num:'(02) 8911-5061',sub:"Nat'l Disaster Risk Reduction"  },
  { icon:'⛈️', name:'PAGASA',                     num:'(02) 8284-0800',sub:'Weather Bureau'                 },
  { icon:'🩺', name:'DOH Hotline',                num:'1555',           sub:'Department of Health'           },
  { icon:'🐕', name:'Anti-Rabies (DOH)',           num:'8651-7800',      sub:'Rabies exposure referral'       },
  { icon:'🧪', name:'Red Cross Philippines',       num:'143',            sub:'Blood & disaster response'     },
];

function renderContactGrid() {
  const grid = document.getElementById('contact-grid');
  if (!grid) return;
  grid.innerHTML = STATIC_CONTACTS.map(c => `
    <div class="contact-card">
      <div class="contact-card-icon">${c.icon}</div>
      <h5>${c.name}</h5>
      <div class="contact-num">${c.num}</div>
      <div class="contact-sub">${c.sub}</div>
    </div>`).join('');
}

function renderBrgyContacts() {
  const grid = document.getElementById('brgy-contact-grid');
  if (!grid) return;
  if (state.brgyContacts.length === 0) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:0.82rem;padding:1rem;">No barangay contacts added yet.</div>';
    return;
  }
  grid.innerHTML = state.brgyContacts.map((c, idx) => `
    <div class="contact-card">
      <div class="contact-card-icon">👤</div>
      <h5>${c.name}</h5>
      <div class="contact-num">${c.num}</div>
      <div class="contact-sub">${c.role}</div>
      <button class="btn btn-danger btn-sm" style="margin-top:0.5rem;" onclick="removeBrgyContact(${idx})">✕ Remove</button>
    </div>`).join('');
}

function openAddContactModal() { openModal('modal-contact'); }

function saveContact() {
  const name = document.getElementById('contact-inp-name').value.trim();
  const num  = document.getElementById('contact-inp-num').value.trim();
  const role = document.getElementById('contact-inp-role').value.trim();
  if (!name || !num) { toast('Name and number are required.', 'warning'); return; }
  state.brgyContacts.push({ id: state._contactNextId++, name, num, role });
  ['contact-inp-name','contact-inp-num','contact-inp-role'].forEach(id => document.getElementById(id).value = '');
  toast(`${name} added.`, 'success');
  closeModal('modal-contact');
  renderBrgyContacts();
}

function removeBrgyContact(idx) {
  const c = state.brgyContacts.splice(idx, 1)[0];
  toast(`${c.name} removed.`, 'info');
  renderBrgyContacts();
}

// ─── MEDICAL ─────────────────────────────────────────────────────────────────
function refreshMedical() {
  renderHealthAlerts();
  renderSupplyList('medSupplies', 'med-supply-list');
  renderDiseaseCases();
  updateMedStats();
}

function updateMedStats() {
  const critCount = state.healthAlerts.filter(a => a.level === 'critical' && !a.resolved).length;
  const caseCount = state.diseaseCases.filter(d => d.status === 'ACTIVE').reduce((s,d) => s + d.cases, 0);
  const lowMed    = state.medSupplies.filter(m => m.qty <= 5).length;
  const critEl = document.getElementById('med-cnt-critical');
  const caseEl = document.getElementById('med-cnt-cases');
  const lowEl  = document.getElementById('med-cnt-med-low');
  const resEl  = document.getElementById('med-cnt-resolved');
  if (critEl) critEl.textContent = critCount;
  if (caseEl) caseEl.textContent = caseCount;
  if (lowEl)  lowEl.textContent  = lowMed;
  if (resEl)  resEl.textContent  = state.medResolved;
}

// ─── HEALTH ALERTS ───────────────────────────────────────────────────────────
function renderHealthAlerts() {
  const container = document.getElementById('health-alerts-list');
  if (!container) return;
  if (state.healthAlerts.length === 0) {
    container.innerHTML = '<div class="health-alert ok"><span class="health-alert-icon">✅</span><div><strong>All Clear</strong> — No active health alerts.</div></div>';
    updateMedStats(); return;
  }
  const active   = state.healthAlerts.filter(a => !a.resolved);
  const resolved = state.healthAlerts.filter(a => a.resolved);
  container.innerHTML = [...active, ...resolved].map(alert => `
    <div class="health-alert ${alert.resolved ? 'ok' : alert.level}" style="${alert.resolved ? 'opacity:0.65' : ''}">
      <span class="health-alert-icon">${{critical:'🚨',warning:'⚠️',info:'ℹ️',ok:'✅'}[alert.level]||'ℹ️'}</span>
      <div style="flex:1">
        <strong>${alert.title}</strong>
        <div style="font-size:0.73rem;color:var(--muted);margin:0.1rem 0;">📍 ${alert.area} &nbsp;·&nbsp; 📅 ${alert.date}</div>
        <div style="margin-top:0.3rem;font-size:0.82rem;">${alert.detail}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.3rem;flex-shrink:0;align-items:flex-end;">
        ${!alert.resolved
          ? `<button class="btn btn-success btn-sm" onclick="resolveAlert(${alert.id})">✅ Resolve</button>`
          : '<span style="font-size:0.7rem;color:var(--jade);font-weight:700;padding:0.2rem 0;">RESOLVED</span>'}
        <button class="btn btn-danger btn-sm" onclick="deleteAlert(${alert.id})">✕</button>
      </div>
    </div>`).join('');
  updateMedStats();
}

function openAddAlertModal() { openModal('modal-alert'); }

function saveHealthAlert() {
  const title  = document.getElementById('alert-inp-title').value.trim();
  const level  = document.getElementById('alert-inp-level').value;
  const area   = document.getElementById('alert-inp-area').value.trim() || 'Whole Barangay';
  const detail = document.getElementById('alert-inp-detail').value.trim();
  if (!title || !detail) { toast('Title and details are required.', 'warning'); return; }
  const date = new Date().toLocaleDateString('en-PH',{month:'short',day:'numeric'});
  state.healthAlerts.unshift({ id: state._alertNextId++, title, level, area, detail, date, resolved:false });
  ['alert-inp-title','alert-inp-area','alert-inp-detail'].forEach(id => document.getElementById(id).value='');
  toast(`Alert issued: ${title}`, 'danger');
  closeModal('modal-alert');
  renderHealthAlerts();
  updateNotifNavBadge();
}

function resolveAlert(id) {
  const a = state.healthAlerts.find(x => x.id === id);
  if (a) { a.resolved = true; state.medResolved++; toast(`Resolved: ${a.title}`, 'success'); renderHealthAlerts(); }
}

function deleteAlert(id) {
  state.healthAlerts = state.healthAlerts.filter(x => x.id !== id);
  toast('Alert removed.', 'info');
  renderHealthAlerts();
}

// ─── DISEASE SURVEILLANCE ────────────────────────────────────────────────────
function renderDiseaseCases() {
  const tbody = document.getElementById('disease-tbody');
  const empty = document.getElementById('disease-empty');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (state.diseaseCases.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  state.diseaseCases.slice().reverse().forEach(d => {
    const pillCls = d.status === 'ACTIVE' ? 'pill-pending' : 'pill-resolved';
    tbody.innerHTML += `<tr>
      <td><strong>${d.disease}</strong></td>
      <td style="font-weight:700;color:var(--red)">${d.cases}</td>
      <td>${d.area}</td>
      <td>${d.date}</td>
      <td><span class="status-pill ${pillCls}">${d.status}</span></td>
      <td>
        <div style="display:flex;gap:0.3rem;">
          ${d.status==='ACTIVE' ? `<button class="btn btn-success btn-sm" onclick="resolveDiseaseCase(${d.id})">✅</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteDiseaseCase(${d.id})">✕</button>
        </div>
      </td></tr>`;
  });
  updateMedStats();
}

function openAddCaseModal() { openModal('modal-disease'); }

function saveDiseaseCase() {
  const disease = document.getElementById('disease-inp-name').value;
  const cases   = parseInt(document.getElementById('disease-inp-cases').value) || 1;
  const area    = document.getElementById('disease-inp-area').value.trim();
  const notes   = document.getElementById('disease-inp-notes').value.trim();
  if (!area) { toast('Please specify the area / purok.', 'warning'); return; }
  const date = new Date().toLocaleDateString('en-PH',{month:'short',day:'numeric'});
  state.diseaseCases.push({ id: state._diseaseNextId++, disease, cases, area, date, notes, status:'ACTIVE' });
  ['disease-inp-area','disease-inp-notes'].forEach(id => document.getElementById(id).value='');
  document.getElementById('disease-inp-cases').value = '1';
  toast(`${cases} ${disease} case(s) logged.`, 'warning');
  closeModal('modal-disease');
  renderDiseaseCases();
}

function resolveDiseaseCase(id) {
  const d = state.diseaseCases.find(x => x.id === id);
  if (d) { d.status = 'RESOLVED'; state.medResolved++; toast(`${d.disease} cases resolved.`, 'success'); renderDiseaseCases(); }
}

function deleteDiseaseCase(id) {
  state.diseaseCases = state.diseaseCases.filter(x => x.id !== id);
  toast('Case record removed.', 'info');
  renderDiseaseCases();
}


// ─── REFERRAL SENDER SYSTEM ──────────────────────────────────────────────────
window.receivers = [];
window.seenAcks  = new Set();
window.logItems  = [];
let selectedTriage = 'Urgent';

function selectTriage(level, el) {
  document.querySelectorAll('.triage-opt').forEach(o => { o.className = 'triage-opt'; });
  const cls = {
    'Critical':'selected-critical','Urgent':'selected-urgent',
    'Semi-Urgent':'selected-semi','Non-Urgent':'selected-non'
  };
  el.className = 'triage-opt ' + (cls[level]||'');
  selectedTriage = level;
  updatePreview();
}

function updatePreview() {
  const name = document.getElementById('f-name')?.value.trim();
  const comp = document.getElementById('f-complaint')?.value.trim();
  const card = document.getElementById('previewCard');
  if (!card) return;
  if (!name && !comp) { card.style.display='none'; return; }
  card.style.display='block';
  document.getElementById('pv-name').textContent      = name || '—';
  document.getElementById('pv-complaint').textContent = comp || '—';
  const sel = document.getElementById('receiverSelect');
  document.getElementById('pv-dest').textContent = sel?.options[sel.selectedIndex]?.text.split('(')[0].trim() || 'Maharlika';
  const tb = document.getElementById('pv-triage');
  tb.innerHTML = `<span class="ref-triage-badge-sm ${selectedTriage}">${selectedTriage}</span>`;
}

async function handleSend() {
  const name      = document.getElementById('f-name')?.value.trim();
  const complaint = document.getElementById('f-complaint')?.value.trim();
  const physician = document.getElementById('f-physician')?.value.trim();
  const notes     = document.getElementById('f-notes')?.value.trim();
  const toFacility= document.getElementById('receiverSelect')?.value;

  if (!name)      { shakeField('f-name');      toast('Patient name is required.','warning'); return; }
  if (!complaint) { shakeField('f-complaint'); toast('Chief complaint is required.','warning'); return; }
  if (!physician) { shakeField('f-physician'); toast('Referring physician is required.','warning'); return; }
  if (!notes)     { shakeField('f-notes');     toast('Clinical notes are required.','warning'); return; }

  if (!window.sendReferral) { toast('Firebase not connected. Click "Firebase Config" to set it up.','warning'); return; }

  const btn = document.getElementById('sendBtn');
  btn.classList.add('loading');
  btn.innerHTML='<div style="width:18px;height:18px;border:2.5px solid #555;border-top-color:white;border-radius:50%;animation:refSpin 0.7s linear infinite"></div> Sending…';

  const payload = {
    toFacility,
    patientName:  name,
    caseId:       document.getElementById('f-ptid')?.value.trim() || ('PT-' + Date.now()),
    triage:       selectedTriage,
    complaint,
    reason:       document.getElementById('f-reason')?.value,
    priority:     document.getElementById('f-priority')?.value,
    physician,
    contact:      document.getElementById('f-contact')?.value.trim(),
    transferTime: document.getElementById('f-transfer')?.value,
    notes,
    bp:   document.getElementById('f-bp')?.value.trim(),
    hr:   document.getElementById('f-hr')?.value.trim(),
    temp: document.getElementById('f-temp')?.value.trim(),
    spo2: document.getElementById('f-spo2')?.value.trim(),
  };

  try {
    await window.sendReferral(payload);
    const sel = document.getElementById('receiverSelect');
    const destName = sel?.options[sel.selectedIndex]?.text.split('(')[0].trim();
    addLog({ type:'sent', text:`Referral sent for ${name} (${selectedTriage}) → ${destName}`, time:Date.now() });
    document.getElementById('successMsg').textContent =
      `Referral for ${name} has been delivered to ${destName} via Firebase.`;
    document.getElementById('successFlash').classList.add('show');
    clearReferralForm();
  } catch(err) {
    toast('Failed: ' + err.message, 'danger');
    addLog({ type:'err', text:'Failed: ' + err.message, time:Date.now() });
  }

  btn.classList.remove('loading');
  btn.innerHTML='<svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Send Referral to Maharlika';
}

function shakeField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor='#c0392b';
  el.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:300});
  setTimeout(()=>el.style.borderColor='',2000);
}

function clearReferralForm() {
  ['f-name','f-ptid','f-age','f-address','f-complaint','f-bp','f-hr','f-temp','f-spo2','f-physician','f-contact','f-notes']
    .forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const card = document.getElementById('previewCard');
  if (card) card.style.display='none';
  selectTriage('Urgent', document.querySelectorAll('.triage-opt')[1]);
}

function addLog(item) {
  window.logItems.unshift(item);
  renderLog();
}

function renderLog() {
  const feed = document.getElementById('logFeed');
  if (!feed) return;
  if (!window.logItems.length) {
    feed.innerHTML='<div class="ref-log-empty">No activity yet.<br><small>Sent referrals and acknowledgements will appear here.</small></div>';
    return;
  }
  feed.innerHTML = window.logItems.map(l => {
    const t = new Date(l.time).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    return `<div class="ref-log-item">
      <div class="ref-log-dot ${l.type}"></div>
      <div style="flex:1">
        <div class="ref-log-text">${l.text}</div>
        <div class="ref-log-time">${t}</div>
      </div>
    </div>`;
  }).join('');
}

function clearLog(){ window.logItems=[]; renderLog(); }

// Init referral system on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('receiverSelect');
  if (sel) sel.addEventListener('change', updatePreview);
  const tf = document.getElementById('f-transfer');
  if (tf) tf.value = new Date(Date.now()+3600000).toISOString().slice(0,16);
  const firstUrgent = document.querySelectorAll('.triage-opt')[1];
  if (firstUrgent) selectTriage('Urgent', firstUrgent);
  renderLog();
});

// Expose functions needed by inline onclick handlers
window.selectTriage      = selectTriage;
window.updatePreview     = updatePreview;
window.handleSend        = handleSend;
window.clearLog          = clearLog;

