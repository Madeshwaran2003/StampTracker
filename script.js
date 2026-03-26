// ── STATE ──
var orders = JSON.parse(localStorage.getItem('sc_v3') || '[]');
var nextId = parseInt(localStorage.getItem('sc_nid3') || '1');
var currentFilter = 'all';
var pendingDeleteId = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', function () {

  // Set default order time
  document.getElementById('f-order').value = nowDT();

  // Render table on load
  render();

  // ── HEADER: Add Customer button ──
  document.getElementById('btn-add-customer').addEventListener('click', function () {
    openModal();
  });

  // ── MODAL: Close button ──
  document.getElementById('modal-close-btn').addEventListener('click', function () {
    closeModal();
  });

  // ── MODAL: Cancel button ──
  document.getElementById('modal-cancel-btn').addEventListener('click', function () {
    closeModal();
  });

  // ── MODAL: Save button ──
  document.getElementById('modal-save-btn').addEventListener('click', function () {
    saveOrder();
  });

  // ── MODAL: Click outside to close ──
  document.getElementById('overlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  // ── IMAGE UPLOAD ──
  document.getElementById('f-img').addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var preview = document.getElementById('img-preview');
      preview.src = e.target.result;
      preview.style.display = 'block';
      document.getElementById('up-ph').style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  // ── FILTER BUTTONS ──
  document.getElementById('fb-all').addEventListener('click', function () {
    setFilter('all');
  });
  document.getElementById('fb-pending').addEventListener('click', function () {
    setFilter('pending');
  });
  document.getElementById('fb-completed').addEventListener('click', function () {
    setFilter('completed');
  });

  // ── SEARCH ──
  document.getElementById('search').addEventListener('input', function () {
    render();
  });

  // ── TABLE: Done / Delete / Thumbnail click (event delegation) ──
  document.getElementById('tbody').addEventListener('click', function (e) {
    var doneBtn = e.target.closest('.btn-done');
    var delBtn  = e.target.closest('.btn-del');
    var thumb   = e.target.closest('.thumb-clickable');

    if (doneBtn) {
      var id = parseInt(doneBtn.getAttribute('data-id'));
      toggleStatus(id);
    }
    if (delBtn) {
      var id = parseInt(delBtn.getAttribute('data-id'));
      openDeleteModal(id);
    }
    if (thumb) {
      var id = parseInt(thumb.getAttribute('data-id'));
      openLightbox(id);
    }
  });

  // ── DELETE MODAL: Cancel ──
  document.getElementById('del-no-btn').addEventListener('click', function () {
    closeDeleteModal();
  });

  // ── DELETE MODAL: Confirm ──
  document.getElementById('del-yes-btn').addEventListener('click', function () {
    confirmDelete();
  });

  // ── KEYBOARD: Escape closes modals ──
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeModal();
      closeDeleteModal();
      closeLightbox();
    }
  });

  // ── LIGHTBOX: Close button ──
  document.getElementById('lightbox-close-btn').addEventListener('click', function () {
    closeLightbox();
  });

  // ── LIGHTBOX: Click backdrop to close ──
  document.getElementById('lightbox-backdrop').addEventListener('click', function () {
    closeLightbox();
  });

});

// ── MODAL OPEN / CLOSE ──
function openModal() {
  document.getElementById('f-order').value = nowDT();
  document.getElementById('overlay').classList.add('open');
  setTimeout(function () {
    document.getElementById('f-name').focus();
  }, 220);
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  resetForm();
}

// ── SAVE ORDER ──
function saveOrder() {
  var name = document.getElementById('f-name').value.trim();
  var stamp = document.getElementById('f-stamp').value.trim();
  var orderTime = document.getElementById('f-order').value;
  var deliveryTime = document.getElementById('f-delivery').value;
  var preview = document.getElementById('img-preview');
  var image = (preview.style.display !== 'none' && preview.src) ? preview.src : '';

  if (!name) {
    showToast('Customer name is required.');
    document.getElementById('f-name').focus();
    return;
  }
  if (!stamp) {
    showToast('Stamp type is required.');
    document.getElementById('f-stamp').focus();
    return;
  }
  if (!orderTime) {
    showToast('Order time is required.');
    return;
  }

  orders.unshift({
    id: nextId++,
    name: name,
    stampType: stamp,
    orderTime: orderTime,
    deliveryTime: deliveryTime,
    image: image,
    status: 'Pending',
    ts: Date.now()
  });

  persist();
  resetForm();
  closeModal();
  render();
  showToast('Order added for ' + name + ' ✓');
}

// ── RESET FORM ──
function resetForm() {
  document.getElementById('f-name').value = '';
  document.getElementById('f-stamp').value = '';
  document.getElementById('f-delivery').value = '';
  document.getElementById('f-order').value = nowDT();
  document.getElementById('f-img').value = '';
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('img-preview').src = '';
  document.getElementById('up-ph').style.display = 'block';
}

// ── TOGGLE STATUS ──
function toggleStatus(id) {
  var order = orders.find(function (o) { return o.id === id; });
  if (!order) return;
  order.status = order.status === 'Completed' ? 'Pending' : 'Completed';
  persist();
  render();
  showToast('Status updated.');
}

// ── DELETE MODAL ──
function openDeleteModal(id) {
  var order = orders.find(function (o) { return o.id === id; });
  if (!order) return;
  pendingDeleteId = id;
  document.getElementById('del-desc').textContent =
    'Remove order for "' + order.name + '"? This cannot be undone.';
  document.getElementById('del-overlay').classList.add('open');
}

function closeDeleteModal() {
  document.getElementById('del-overlay').classList.remove('open');
  pendingDeleteId = null;
}

function confirmDelete() {
  if (pendingDeleteId === null) return;
  var order = orders.find(function (o) { return o.id === pendingDeleteId; });
  orders = orders.filter(function (o) { return o.id !== pendingDeleteId; });
  persist();
  render();
  closeDeleteModal();
  showToast((order ? order.name : 'Order') + ' deleted.');
}

// ── FILTER ──
function setFilter(f) {
  currentFilter = f;
  document.getElementById('fb-all').classList.toggle('on', f === 'all');
  document.getElementById('fb-pending').classList.toggle('on', f === 'pending');
  document.getElementById('fb-completed').classList.toggle('on', f === 'completed');
  render();
}

// ── RENDER TABLE ──
function render() {
  var q = document.getElementById('search').value.toLowerCase();

  var filtered = orders.filter(function (o) {
    if (currentFilter === 'pending' && o.status !== 'Pending') return false;
    if (currentFilter === 'completed' && o.status !== 'Completed') return false;
    if (q && !o.name.toLowerCase().includes(q) && !o.stampType.toLowerCase().includes(q)) return false;
    return true;
  });

  // Update stats
  document.getElementById('s-total').textContent = orders.length;
  document.getElementById('s-pending').textContent = orders.filter(function (o) { return o.status === 'Pending'; }).length;
  document.getElementById('s-done').textContent = orders.filter(function (o) { return o.status === 'Completed'; }).length;

  var tbody = document.getElementById('tbody');
  var empty = document.getElementById('empty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = filtered.map(function (o, i) {
    var num = String(filtered.length - i).padStart(3, '0');
    var thumb = o.image
      ? '<img class="thumb thumb-clickable" src="' + o.image + '" alt="design" data-id="' + o.id + '" title="Click to preview">'
      : '<div class="no-thumb">🖋️</div>';
    var badgeClass = o.status === 'Completed' ? 'badge-d' : 'badge-p';
    var doneLabel = o.status === 'Completed' ? '↩ Undo' : '✓ Done';

    return '<tr class="row">'
      + '<td class="td-num">' + num + '</td>'
      + '<td class="td-name">' + escHtml(o.name) + '</td>'
      + '<td>' + escHtml(o.stampType) + '</td>'
      + '<td class="td-mono">' + formatDate(o.orderTime) + '</td>'
      + '<td class="td-mono">' + formatDate(o.deliveryTime) + '</td>'
      + '<td>' + thumb + '</td>'
      + '<td><span class="badge ' + badgeClass + '">' + o.status + '</span></td>'
      + '<td><div class="actions">'
      + '<button class="btn-done" data-id="' + o.id + '">' + doneLabel + '</button>'
      + '<button class="btn-del" data-id="' + o.id + '">Delete</button>'
      + '</div></td>'
      + '</tr>';
  }).join('');
}

// ── HELPERS ──
function nowDT() {
  var d = new Date();
  // Format: YYYY-MM-DDTHH:MM
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function formatDate(s) {
  if (!s) return '—';
  var d = new Date(s);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function persist() {
  localStorage.setItem('sc_v3', JSON.stringify(orders));
  localStorage.setItem('sc_nid3', String(nextId));
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function () {
    t.classList.remove('show');
  }, 2600);
}

// ── IMAGE LIGHTBOX ──
function openLightbox(id) {
  var order = orders.find(function (o) { return o.id === id; });
  if (!order || !order.image) return;
  document.getElementById('lightbox-img').src = order.image;
  document.getElementById('lightbox-title').textContent = order.name + ' — Stamp Design';
  document.getElementById('img-lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('img-lightbox').classList.remove('open');
  setTimeout(function () {
    document.getElementById('lightbox-img').src = '';
  }, 250);
}