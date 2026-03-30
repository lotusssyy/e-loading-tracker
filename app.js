const STORAGE_KEY = 'eloading-sales-v1';
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
const totalSalesCount = document.getElementById('totalSalesCount');
const totalAmount = document.getElementById('totalAmount');
const paidAmount = document.getElementById('paidAmount');
const unpaidAmount = document.getElementById('unpaidAmount');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const clearAllBtn = document.getElementById('clearAllBtn');
const installBtn = document.getElementById('installBtn');

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

function renderStats(sales) {
  const total = sales.reduce((sum, sale) => sum + Number(sale.price), 0);
  const paid = sales.filter(s => s.paymentStatus === 'Paid').reduce((sum, sale) => sum + Number(sale.price), 0);
  const unpaid = sales.filter(s => s.paymentStatus === 'Unpaid').reduce((sum, sale) => sum + Number(sale.price), 0);

  totalSalesCount.textContent = sales.length;
  totalAmount.textContent = peso(total);
  paidAmount.textContent = peso(paid);
  unpaidAmount.textContent = peso(unpaid);
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
          <button data-action="toggle" data-id="${sale.id}" class="secondary">
            Mark ${sale.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid'}
          </button>
          <button data-action="delete" data-id="${sale.id}" class="danger">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function groupSalesByDay(sales) {
  const grouped = {};
  sales.forEach((sale) => {
    const date = new Date(sale.createdAt).toLocaleDateString('en-CA');
    grouped[date] = (grouped[date] || 0) + Number(sale.price);
  });
  const labels = Object.keys(grouped).sort();
  return {
    labels,
    values: labels.map(label => grouped[label])
  };
}

function paymentBreakdown(sales) {
  const paid = sales.filter(s => s.paymentStatus === 'Paid').reduce((sum, sale) => sum + Number(sale.price), 0);
  const unpaid = sales.filter(s => s.paymentStatus === 'Unpaid').reduce((sum, sale) => sum + Number(sale.price), 0);
  return [paid, unpaid];
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
        label: 'Daily Sales Amount',
        data: daily.values,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: { beginAtZero: true }
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
      responsive: true,
      plugins: {
        legend: { display: true }
      }
    }
  });
}

function renderAll() {
  const allSales = getSales();
  renderStats(allSales);
  renderTable(filteredSales());
  renderCharts(allSales);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  renderAll();
});

salesTableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const sales = getSales();
  const index = sales.findIndex(sale => sale.id === id);
  if (index === -1) return;

  if (action === 'toggle') {
    sales[index].paymentStatus = sales[index].paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
  }

  if (action === 'delete') {
    sales.splice(index, 1);
  }

  saveSales(sales);
  renderAll();
});

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
    alert('Sales imported successfully.');
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}

renderAll();
