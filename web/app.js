let selectedTrain = null;
const $ = (id) => document.getElementById(id);

// escape text before inserting in HTML (prevents XSS)
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, isErr) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  setTimeout(() => t.classList.add('hidden'), 3500);
}

async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// ---- tabs ----
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('hidden', p.id !== b.dataset.tab));
}));

// default date = today, min = today
const d = new Date();
const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
$('date').value = today;
$('date').min = today;

// ---- search ----
$('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = new URLSearchParams({ from: $('from').value, to: $('to').value, date: $('date').value });
  try {
    const trains = await api('/api/trains?' + q);
    renderTrains(trains);
  } catch (err) { toast(err.message, true); }
});

function renderTrains(trains) {
  const box = $('results');
  if (!trains.length) { box.innerHTML = '<div class="card muted">No trains found for this route.</div>'; return; }
  box.innerHTML = trains.map((t) => {
    const cls = t.available === 0 ? 'none' : t.available < 15 ? 'low' : 'ok';
    const label = t.available === 0 ? 'Sold out' : t.available + ' seats';
    return `<div class="card train">
      <div>
        <h3>${esc(t.name)} <span class="muted">(${esc(t.trainNo)})</span></h3>
        <div class="times">${esc(t.source)} ${esc(t.departure.slice(0, 5))} → ${esc(t.destination)} ${esc(t.arrival.slice(0, 5))}</div>
      </div>
      <div><span class="badge ${cls}">${label}</span><div class="muted">₹${t.fare} / seat</div></div>
      <button class="btn" ${t.available === 0 ? 'disabled' : ''} data-id="${t.trainId}">Book Now</button>
    </div>`;
  }).join('');
  box.querySelectorAll('button[data-id]').forEach((btn) => btn.addEventListener('click', () => {
    selectedTrain = trains.find((t) => t.trainId == btn.dataset.id);
    openModal();
  }));
}

// ---- booking modal ----
function openModal() {
  $('trainInfo').textContent = `${selectedTrain.name} (${selectedTrain.trainNo}) | ${$('date').value} | ₹${selectedTrain.fare}/seat`;
  $('bookForm').reset();
  $('pseats').max = Math.min(6, selectedTrain.available);
  $('pseats').value = 1;
  updateFare();
  $('modal').classList.remove('hidden');
}
const closeModal = () => $('modal').classList.add('hidden');
$('closeModal').addEventListener('click', closeModal);
$('pseats').addEventListener('input', updateFare);
function updateFare() { $('totalFare').textContent = '₹' + (selectedTrain ? selectedTrain.fare * ($('pseats').value || 0) : 0); }

$('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = new URLSearchParams({
    trainId: selectedTrain.trainId, date: $('date').value, name: $('pname').value.trim(),
    age: $('page').value, gender: $('pgender').value, seats: $('pseats').value,
  });
  try {
    const r = await api('/api/book', { method: 'POST', body });
    closeModal();
    toast('Booking confirmed! PNR: ' + r.pnr);
    $('searchForm').requestSubmit();          // refresh seat availability
    $('pnrInput').value = r.pnr;
    document.querySelector('[data-tab="pnr"]').click();
    $('pnrForm').requestSubmit();
  } catch (err) { toast(err.message, true); }
});

// ---- PNR status / cancel ----
$('pnrForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const b = await api('/api/booking?pnr=' + encodeURIComponent($('pnrInput').value.trim()));
    renderTicket(b);
  } catch (err) { $('pnrResult').innerHTML = ''; toast(err.message, true); }
});

function renderTicket(b) {
  $('pnrResult').innerHTML = `<div class="card ticket">
    <h2>PNR ${esc(b.pnr)} <span class="badge ${esc(b.status)}">${esc(b.status)}</span></h2>
    <table>
      <tr><td>Train</td><td>${esc(b.trainName)} (${esc(b.trainNo)})</td></tr>
      <tr><td>Route</td><td>${esc(b.source)} → ${esc(b.destination)}</td></tr>
      <tr><td>Date</td><td>${esc(b.date)}</td></tr>
      <tr><td>Departure / Arrival</td><td>${esc(b.departure.slice(0, 5))} / ${esc(b.arrival.slice(0, 5))}</td></tr>
      <tr><td>Passenger</td><td>${esc(b.passenger)} (${esc(b.age)}, ${esc(b.gender)})</td></tr>
      <tr><td>Seats</td><td>${esc(b.seats)}</td></tr>
      <tr><td>Total Fare</td><td>₹${esc(b.totalFare)}</td></tr>
    </table><br>
    ${b.status === 'CONFIRMED' ? '<button class="btn danger" id="cancelBtn">Cancel Ticket</button>' : ''}
  </div>`;
  const c = $('cancelBtn');
  if (c) c.addEventListener('click', async () => {
    if (!confirm('Cancel this ticket?')) return;
    try {
      const r = await api('/api/cancel', { method: 'POST', body: new URLSearchParams({ pnr: b.pnr }) });
      toast(r.message);
      $('pnrForm').requestSubmit();
    } catch (err) { toast(err.message, true); }
  });
}
