const STORAGE_KEY = 'eloading-sales-v2';
let dailySalesChart;
let paymentChart;
let deferredPrompt;

const saleForm = document.getElementById('saleForm');
const promoNameInput = document.getElementById('promoName');
const priceInput = document.getElementById('price');
const paymentStatusInput = document.getElementById('paymentStatus');
const customerNameInput = document.getElementById('customerName');
const notesInput = document.getElementById('notes');
const salesTableBody = document.getElementById('salesTableBody');
const mobileRecords = document.getElementById('mobileRecords');
const totalSalesCount = document.getElementById('totalSalesCount');
const totalAmount = document.getElementById('totalAmount');
const paidAmount = document.getElementById('paidAmount');
const unpaidAmount = document.getElementById('unpaidAmount');
const todayAmount = document.getElementById('todayAmount');
const todayBadge = document.getElementById('todayBadge');
const recordCountBadge = document.getElementById('recordCountBadge');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const clearAllBtn = document.getElementById('clearAllBtn');
const installBtn = document.getElementById('installBtn');
const paymentToggle = document.getElementById('paymentToggle');
const quickPromos = document.getElementById('quickPromos');
const toast = document.getElementById('toast');

function getSales() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSales(sales) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

function peso(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(value || 0);
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatShortDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric'
  });
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

function vibrate() {
  if ('vibrate' in navigator) navigator.vibrate(18);
}

function createSale(data) {
  return {
    id: crypto.randomUUID(),
    promoName: data.promoName.trim(),
    price: Number(data.price),
    paymentStatus: data.paymentStatus,
    customerName: data.customerName.trim(),
    notes: data.notes.trim(),
    createdAt: new Date().toISOString()
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function filteredSales() {
  const search = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;
  return getSales()
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter((sale) => {
      const matchesStatus = status === 'All' || sale.paymentStatus === status;
      const haystack = [sale.promoName, sale.customerName, sale.notes].join(' ').toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesStatus && matchesSearch;
    });
}

function groupSalesByDay(sales) {
  const grouped = {};
  sales.forEach((sale) => {
    const date = new Date(sale.createdAt).toLocaleDateString('en-CA');
    grouped[date] = (grouped[date] || 0) + Number(sale.price);
  });
  const labels = Object.keys(grouped).sort();
  return {
    labels: labels.map(label => formatShortDate(label)),
    values: labels.map(label => grouped[label])
  };
}

function paymentBreakdown(sales) {
  const paid = sales.filter(s => s.paymentStatus === 'Paid').reduce((sum, sale) => sum + Number(sale.price), 0);
  const unpaid = sales.filter(s => s.paymentStatus === 'Unpaid').reduce((sum, sale) => sum + Number(sale.price), 0);
  return [paid, unpaid];
}

function renderStats(sales) {
  const total = sales.reduce((sum, sale) => sum + Number(sale.price), 0);
  const paid = sales.filter(s => s.paymentStatus === 'Paid').reduce((sum, sale) => sum + Number(sale.price), 0);
  const unpaid = sales.filter(s => s.paymentStatus === 'Unpaid').reduce((sum, sale) => sum + Number(sale.price), 0);
  const today = sales
    .filter((sale) => new Date(sale.createdAt).toLocaleDateString('en-CA') === todayKey())
    .reduce((sum, sale) => sum + Number(sale.price), 0);

  totalSalesCount.textContent = sales.length;
  totalAmount.textContent = peso(total);
  paidAmount.textContent = peso(paid);
  unpaidAmount.textContent = peso(unpaid);
  todayAmount.textContent = peso(today);
  todayBadge.textContent = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  recordCountBadge.textContent = `${sales.length} record${sales.length === 1 ? '' : 's'}`;
}

function renderTable(sales) {
  if (!sales.length) {
    salesTableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No matching sales records.</td></tr>';
    return;
  }

  salesTableBody.innerHTML = sales.map((sale) => `
    <tr>
      <td>${formatDateTime(sale.createdAt)}</td>
      <td>${escapeHtml(sale.promoName)}</td>
      <td>${escapeHtml(sale.customerName || '-')}</td>
      <td>${peso(sale.price)}</td>
      <td>
        <span class="status-badge ${sale.paymentStatus === 'Paid' ? 'status-paid' : 'status-unpaid'}">
          ${sale.paymentStatus}
        </span>
      </td>
      <td>${escapeHtml(sale.notes || '-')}</td>
      <td>
        <div class="row-actions">
          <button data-action="toggle" data-id="${sale.id}" class="secondary">${sale.paymentStatus === 'Paid' ? 'Set Unpaid' : 'Set Paid'}</button>
          <button data-action="delete" data-id="${sale.id}" class="danger">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderMobileRecords(sales) {
  if (!sales.length) {
    mobileRecords.innerHTML = '<div class="empty-card">No matching sales records.</div>';
    return;
  }

  mobileRecords.innerHTML = sales.map((sale) => `
    <article class="record-card">
      <div class="record-top">
        <div>
          <h3>${escapeHtml(sale.promoName)}</h3>
          <p>${escapeHtml(sale.customerName || 'No customer name')}</p>
        </div>
        <strong>${peso(sale.price)}</strong>
      </div>
      <div class="record-meta">
        <span>${formatDateTime(sale.createdAt)}</span>
        <span class="status-badge ${sale.paymentStatus === 'Paid' ? 'status-paid' : 'status-unpaid'}">${sale.paymentStatus}</span>
      </div>
      ${sale.notes ? `<p class="record-notes">${escapeHtml(sale.notes)}</p>` : ''}
      <div class="row-actions mobile-actions">
        <button data-action="toggle" data-id="${sale.id}" class="secondary">${sale.paymentStatus === 'Paid' ? 'Mark Unpaid' : 'Mark Paid'}</button>
        <button data-action="delete" data-id="${sale.id}" class="danger">Delete</button>
      </div>
    </article>
  `).join('');
}

function renderCharts(sales) {
  const daily = groupSalesByDay(sales);
  const paymentData = paymentBreakdown(sales);

  if (dailySalesChart) dailySalesChart.destroy();
  if (paymentChart) paymentChart.destroy();

  dailySalesChart = new Chart(document.getElementById('dailySalesChart'), {
    type: 'bar',
    data: {
      labels: daily.labels,
      datasets: [{
        label: 'Daily Sales',
        data: daily.values,
        borderWidth: 1,
        borderRadius: 10
      }]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true },
        x: { ticks: { maxRotation: 0, minRotation: 0 } }
      }
    }
  });

  paymentChart = new Chart(document.getElementById('paymentChart'), {
    type: 'doughnut',
    data: {
      labels: ['Paid', 'Unpaid'],
      datasets: [{
        data: paymentData,
        borderWidth: 1
      }]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function renderAll() {
  const allSales = getSales();
  renderStats(allSales);
  const currentSales = filteredSales();
  renderTable(currentSales);
  renderMobileRecords(currentSales);
  renderCharts(allSales);
}

function handleRecordAction(target) {
  const button = target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const sales = getSales();
  const index = sales.findIndex(sale => sale.id === id);
  if (index === -1) return;

  if (action === 'toggle') {
    sales[index].paymentStatus = sales[index].paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    showToast(`Marked ${sales[index].paymentStatus}`);
    vibrate();
  }

  if (action === 'delete') {
    sales.splice(index, 1);
    showToast('Record deleted');
    vibrate();
  }

  saveSales(sales);
  renderAll();
}

function syncStatusButtons() {
  const status = paymentStatusInput.value;
  paymentToggle.querySelectorAll('.toggle-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.status === status);
  });
}

saleForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const sale = createSale({
    promoName: promoNameInput.value,
    price: priceInput.value,
    paymentStatus: paymentStatusInput.value,
    customerName: customerNameInput.value,
    notes: notesInput.value
  });

  const sales = getSales();
  sales.push(sale);
  saveSales(sales);
  saleForm.reset();
  paymentStatusInput.value = 'Paid';
  syncStatusButtons();
  renderAll();
  showToast('Sale saved');
  vibrate();
  promoNameInput.focus();
});

saleForm.addEventListener('reset', () => {
  window.setTimeout(() => {
    paymentStatusInput.value = 'Paid';
    syncStatusButtons();
    promoNameInput.focus();
  }, 0);
});

paymentToggle.addEventListener('click', (event) => {
  const button = event.target.closest('.toggle-btn');
  if (!button) return;
  paymentStatusInput.value = button.dataset.status;
  syncStatusButtons();
});

quickPromos.addEventListener('click', (event) => {
  const button = event.target.closest('[data-promo]');
  if (!button) return;
  promoNameInput.value = button.dataset.promo;
  priceInput.value = button.dataset.price;
  customerNameInput.focus();
});

salesTableBody.addEventListener('click', (event) => handleRecordAction(event.target));
mobileRecords.addEventListener('click', (event) => handleRecordAction(event.target));
searchInput.addEventListener('input', renderAll);
filterStatus.addEventListener('change', renderAll);

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(getSales(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'eloading-sales-backup.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exported');
});

importFile.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Invalid backup format.');
    saveSales(data);
    renderAll();
    showToast('Backup imported');
  } catch (error) {
    alert(error.message || 'Failed to import file.');
  } finally {
    event.target.value = '';
  }
});

clearAllBtn.addEventListener('click', () => {
  const confirmed = window.confirm('Delete all sales records? This cannot be undone unless you exported a backup.');
  if (!confirmed) return;
  saveSales([]);
  renderAll();
  showToast('All records cleared');
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  installBtn.classList.add('hidden');
  showToast('App installed');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}

syncStatusButtons();
renderAll();
promoNameInput.focus();
