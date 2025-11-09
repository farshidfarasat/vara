const SERVICES = [
  "OpenAI API","ChatGPT for Business","Gemini API","Google AI Studio API",
  "Gemini Ultra","Super Grok","Super Grok for Business","Cursor",
  "Cursor for Business","Claude Pro","Claude Max","Claude Team",
  "Midjourney Standard","Midjourney Pro","Midjourney Mega","Deepseek"
];

const PRICE_PER_3M = 30;
const N8N_WEBHOOK = "https://example.com/webhook";
const cart = [];

const fmtUSD = n => `$${(n || 0).toFixed(2)}`;
const fmtIRR = n => new Intl.NumberFormat('fa-IR').format(Math.round(n || 0));

function calcTotals() {
  const rate = Number(document.getElementById('exchangeRate').value) || 0;
  const feePct = Number(document.getElementById('serviceFee').value) || 0;
  const serviceUSD = cart.reduce((s, it) => s + it.subtotalUSD, 0);
  const feeUSD = serviceUSD * (feePct / 100);
  const grandIRR = (serviceUSD + feeUSD) * rate;

  document.getElementById('serviceUSD').textContent = fmtUSD(serviceUSD);
  document.getElementById('rateShow').textContent = rate ? fmtIRR(rate) + ' ریال / $1' : '—';
  document.getElementById('feeShow').textContent = fmtUSD(feeUSD);
  document.getElementById('grandIRR').textContent = fmtIRR(grandIRR) + ' ریال';
}

function renderCart() {
  const wrap = document.getElementById('items');
  wrap.innerHTML = '';
  if (cart.length === 0) {
    wrap.innerHTML = '<div class="muted">هیچ آیتمی اضافه نشده است.</div>';
  } else {
    cart.forEach((it, idx) => {
      const line = document.createElement('div');
      line.className = 'line';
      line.innerHTML = `
        <div>
          <div class="name">${it.name}</div>
          <div class="small">مدت: ${it.months} ماه — ${fmtUSD(it.subtotalUSD)}</div>
        </div>
        <button class="remove" data-idx="${idx}">حذف</button>
      `;
      wrap.appendChild(line);
    });
    wrap.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', e => {
        const i = Number(e.currentTarget.getAttribute('data-idx'));
        cart.splice(i, 1);
        renderCart();
        calcTotals();
      });
    });
  }
  calcTotals();
}

function serviceCard(name) {
  const card = document.createElement('div');
  card.className = 'card';
  let months = 3;

  const title = document.createElement('h3');
  title.textContent = name;

  const note = document.createElement('div');
  note.className = 'price-note';
  note.textContent = `نمونه قیمت: ${fmtUSD(PRICE_PER_3M)} هر ۳ ماه`;

  const controls = document.createElement('div');
  controls.className = 'controls';

  const stepper = document.createElement('div');
  stepper.className = 'stepper';
  const dec = document.createElement('button'); dec.textContent = '−';
  const val = document.createElement('span'); val.textContent = `${months} ماه`;
  const inc = document.createElement('button'); inc.textContent = '+';

  dec.addEventListener('click', () => {
    months = Math.max(3, months - 3);
    val.textContent = `${months} ماه`;
  });
  inc.addEventListener('click', () => {
    months = months + 3;
    val.textContent = `${months} ماه`;
  });

  stepper.append(dec, val, inc);

  const add = document.createElement('button');
  add.className = 'btn add-btn';
  add.textContent = 'افزودن به سفارش';
  add.addEventListener('click', () => {
    const blocks = months / 3;
    const subtotalUSD = PRICE_PER_3M * blocks;
    cart.push({ name, months, subtotalUSD });
    renderCart();
  });

  controls.append(stepper, add);
  card.append(title, note, controls);
  return card;
}

function renderServices() {
  const grid = document.getElementById('servicesGrid');
  SERVICES.forEach(name => grid.appendChild(serviceCard(name)));
}

async function submitOrder() {
  const email = document.getElementById('email').value.trim();
  const rate = Number(document.getElementById('exchangeRate').value) || 0;
  const feePct = Number(document.getElementById('serviceFee').value) || 0;
  const msg = document.getElementById('message');

  msg.style.display = 'none';
  msg.textContent = '';

  if (!email) {
    msg.style.display = 'block';
    msg.style.background = '#fef2f2';
    msg.style.borderColor = '#fecaca';
    msg.style.color = '#991b1b';
    msg.textContent = 'لطفاً ایمیل را وارد کنید.';
    return;
  }
  if (cart.length === 0) {
    msg.style.display = 'block';
    msg.style.background = '#fef2f2';
    msg.style.borderColor = '#fecaca';
    msg.style.color = '#991b1b';
    msg.textContent = 'هیچ آیتمی در سفارش نیست.';
    return;
  }

  const serviceUSD = cart.reduce((s, it) => s + it.subtotalUSD, 0);
  const feeUSD = serviceUSD * (feePct / 100);
  const grandIRR = Math.round((serviceUSD + feeUSD) * rate);

  const payload = {
    email,
    items: cart.map(({ name, months, subtotalUSD }) => ({ name, months, subtotalUSD })),
    totals: { serviceUSD, exchangeRate: rate, serviceFeePercent: feePct, serviceFeeUSD: feeUSD, grandTotalIRR: grandIRR },
    sheet: "Vara_orders"
  };

  try {
    await fetch(N8N_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    msg.style.display = 'block';
    msg.style.background = '#f0fdf4';
    msg.style.borderColor = '#bbf7d0';
    msg.style.color = '#166534';
    msg.textContent = 'ممنون از سفارش شما، به زودی با شما تماس می‌گیریم';
    cart.splice(0, cart.length);
    renderCart();
  } catch {
    msg.style.display = 'block';
    msg.style.background = '#fef2f2';
    msg.style.borderColor = '#fecaca';
    msg.style.color = '#991b1b';
    msg.textContent = 'خطا در ارسال سفارش. لطفاً بعداً تلاش کنید.';
  }
}

renderServices();
renderCart();
document.getElementById('submitBtn').addEventListener('click', submitOrder);
document.getElementById('exchangeRate').addEventListener('input', calcTotals);
document.getElementById('serviceFee').addEventListener('input', calcTotals);
