// URL of your n8n webhook that returns service list
const SERVICE_LIST_URL = "https://farshidfar.app.n8n.cloud/webhook/vara_global_services";

const N8N_WEBHOOK = "https://example.com/webhook"; // your order webhook
const cart = [];

// Commission fee (set in n8n if needed)
window.serviceFeePct = 5;
window.currentRate = 0;

// Formatters
const fmtUSD = n => `$${(n || 0).toFixed(2)}`;
const fmtIRR = n => new Intl.NumberFormat('fa-IR').format(Math.round(n || 0));

// Load live services from webhook
async function loadServices() {
  try {
    const res = await fetch(SERVICE_LIST_URL);
    return await res.json();
  } catch (err) {
    console.error("Error loading services:", err);
    return [];
  }
}

// Render a single service card based on dynamic type
function serviceCard(service) {
  const card = document.createElement('div');
  card.className = 'card';

  const title = document.createElement('h3');
  title.textContent = service.name;

  const note = document.createElement('div');
  note.className = 'price-note';
  note.textContent = service.subtitle || '';

  const controls = document.createElement('div');
  controls.className = 'controls';

  let months = service.duration || 3; // default for subscription
  let amount = service.min || 0;     // default for API custom

  if (service.type === "subscription") {
    // Subscription: fixed price, fixed duration
    const val = document.createElement('span');
    val.textContent = `${months} ماه`;

    const stepper = document.createElement('div');
    stepper.className = 'stepper';

    const dec = document.createElement('button');
    const inc = document.createElement('button');
    dec.textContent = '−';
    inc.textContent = '+';

    dec.onclick = () => {
      months = Math.max(service.duration, months - service.duration);
      val.textContent = `${months} ماه`;
    };
    inc.onclick = () => {
      months += service.duration;
      val.textContent = `${months} ماه`;
    };

    stepper.append(dec, val, inc);

    const add = document.createElement('button');
    add.className = 'btn add-btn';
    add.textContent = 'افزودن به سفارش';

    add.onclick = () => {
      const blocks = months / service.duration;
      const subtotalUSD = service.price * blocks;
      cart.push({ name: service.name, months, subtotalUSD });
      renderCart();
    };

    controls.append(stepper, add);
  }

  if (service.type === "api") {
    // API: free input amount
    const input = document.createElement('input');
    input.type = "number";
    input.placeholder = `حداقل ${service.min} دلار`;
    input.style.width = "130px";
    input.style.padding = "8px";
    input.style.borderRadius = "10px";

    input.oninput = () => {
      const val = Number(input.value);
      if (!isNaN(val) && val >= service.min && val <= service.max) {
        amount = val;
      }
    };

    const add = document.createElement('button');
    add.className = 'btn add-btn';
    add.textContent = 'افزودن به سفارش';

    add.onclick = () => {
      if (amount < service.min || amount > service.max) {
        alert(`لطفاً بین ${service.min} تا ${service.max} دلار وارد کنید`);
        return;
      }
      cart.push({ name: service.name, months: 0, subtotalUSD: amount });
      renderCart();
    };

    controls.append(input, add);
  }

  card.append(title, note, controls);
  return card;
}

// Render all services
async function renderServices() {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '';

  const services = await loadServices();
  services.forEach(s => grid.appendChild(serviceCard(s)));
}

// Cart + totals
function calcTotals() {
  const rate = window.currentRate || 0;
  const feePct = window.serviceFeePct || 0;

  const serviceUSD = cart.reduce((sum, it) => sum + it.subtotalUSD, 0);
  const feeUSD = serviceUSD * (feePct / 100);
  const grandIRR = (serviceUSD + feeUSD) * rate;

  document.getElementById('serviceUSD').textContent = fmtUSD(serviceUSD);
  document.getElementById('feeShow').textContent = fmtUSD(feeUSD);
  document.getElementById('rateShow').textContent = rate ? fmtIRR(rate) + ' ریال / $1' : '—';
  document.getElementById('grandIRR').textContent = fmtIRR(grandIRR) + ' ریال';
}

function renderCart() {
  const wrap = document.getElementById('items');
  wrap.innerHTML = cart.length === 0
    ? '<div class="muted">هیچ آیتمی اضافه نشده است.</div>'
    : '';

  cart.forEach((it, idx) => {
    const line = document.createElement('div');
    line.className = 'line';
    line.innerHTML = `
      <div>
        <div class="name">${it.name}</div>
        <div class="small">مقدار: ${it.months ? it.months + ' ماه' : fmtUSD(it.subtotalUSD)}</div>
      </div>
      <button class="remove" data-idx="${idx}">حذف</button>
    `;
    wrap.appendChild(line);
  });

  wrap.querySelectorAll('.remove').forEach(btn => {
    btn.onclick = e => {
      cart.splice(Number(btn.dataset.idx), 1);
      renderCart();
    };
  });

  calcTotals();
}

// Submit order to n8n
async function submitOrder() {
  const phone = document.getElementById('phone').value.trim();
  const msg = document.getElementById('message');

  msg.style.display = 'none';

  if (!phone) {
    msg.style.display = 'block';
    msg.textContent = 'لطفاً شماره تماس خود را وارد کنید.';
    msg.style.background = '#fee2e2';
    msg.style.borderColor = '#fecaca';
    msg.style.color = '#991b1b';
    return;
  }

  if (cart.length === 0) {
    msg.style.display = 'block';
    msg.textContent = 'هیچ آیتمی در سفارش نیست.';
    msg.style.background = '#fee2e2';
    msg.style.borderColor = '#fecaca';
    msg.style.color = '#991b1b';
    return;
  }

  const rate = window.currentRate;
  const feePct = window.serviceFeePct;

  const serviceUSD = cart.reduce((s, it) => s + it.subtotalUSD, 0);
  const feeUSD = serviceUSD * (feePct / 100);
  const grandIRR = Math.round((serviceUSD + feeUSD) * rate);

  const payload = {
    phone,
    items: cart.map(it => ({
      name: it.name,
      months: it.months,
      subtotalUSD: it.subtotalUSD
    })),
    totals: {
      serviceUSD,
      exchangeRate: rate,
      serviceFeePercent: feePct,
      serviceFeeUSD: feeUSD,
      grandTotalIRR: grandIRR
    },
    sheet: "Vara_orders"
  };

  try {
    await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    msg.textContent = "سفارش ثبت شد، به زودی با شما تماس می‌گیریم.";
    msg.style.display = 'block';
    msg.style.background = '#f0fdf4';
    msg.style.borderColor = '#bbf7d0';
    msg.style.color = '#166534';

    cart.length = 0;
    renderCart();
  } catch (err) {
    msg.textContent = "خطایی رخ داد. لطفاً دوباره امتحان کنید.";
    msg.style.display = 'block';
    msg.style.background = '#fee2e2';
    msg.style.borderColor = '#fecaca';
    msg.style.color = '#991b1b';
  }
}

// Get live IRR exchange rate
async function updateExchangeRate() {
  const display = document.getElementById('exchangeRateDisplay');

  try {
    const res = await fetch("https://api-gateway.sahmeto.com/api/v2/core/assets/8033/price");
    const data = await res.json();
    const rate = data?.price?.USD || 0;

    if (rate > 0) {
      window.currentRate = Math.round(rate);
      display.textContent = fmtIRR(rate) + " ریال / $1";
      calcTotals();
    } else {
      display.textContent = "نامشخص";
    }
  } catch (err) {
    display.textContent = "خطا در دریافت نرخ";
  }
}

// Init
renderServices();
renderCart();
updateExchangeRate();

// Submit button
document.getElementById("submitBtn").onclick = submitOrder;
