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

// Initialize totals with default rate
calcTotals();

// ---- Fetch currency rate from Navasan API ----
async function updateExchangeRate() {
  const rateInput = document.getElementById('exchangeRate');
  const rateShow = document.getElementById('rateShow');

  if (!rateInput || !rateShow) {
    console.error('Rate input or display element not found');
    return;
  }

  const apiKey = 'freeKIh2IIVFjEvyt4eGu3l62IeIsyNa';
  
  // Try methods in order: Netlify function (if available), HTTPS API, HTTP API
  const apiUrls = [
    '/.netlify/functions/fetch-rate', // Netlify serverless function proxy
    `https://api.navasan.tech/latest/?api_key=${apiKey}`,
    `http://api.navasan.tech/latest/?api_key=${apiKey}`
  ];

  let lastError = null;

  for (const apiUrl of apiUrls) {
    try {
      console.log('Attempting to fetch from:', apiUrl);
      
      // Try with credentials and proper CORS handling
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit' // Don't send credentials for CORS
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('API Response:', data);

      // Extract usd_sell from response
      // Navasan API typically returns: { usd_sell: { value: ..., ... }, ... }
      let rate = 0;
      if (data?.usd_sell?.value) {
        rate = parseFloat(data.usd_sell.value);
      } else if (data?.usd_sell) {
        // If usd_sell is directly a number or string
        rate = typeof data.usd_sell === 'number' ? data.usd_sell : parseFloat(data.usd_sell);
      } else if (data?.usd_sell?.price) {
        rate = parseFloat(data.usd_sell.price);
      }

      if (rate > 0 && !isNaN(rate)) {
        const roundedRate = Math.round(rate);
        rateInput.value = roundedRate;
        // calcTotals() will update rateShow automatically
        calcTotals();
        console.log('Exchange rate updated to:', roundedRate);
        return; // Success, exit function
      } else {
        console.warn('Rate not found in API response. Structure:', data);
        lastError = new Error('Rate not found in API response');
      }
    } catch (err) {
      console.error('Error fetching from', apiUrl, ':', err);
      lastError = err;
      
      // Check for specific error types
      if (err.message && err.message.includes('Mixed Content')) {
        console.error('Mixed Content Error: Site is HTTPS but API is HTTP. API must support HTTPS or use a server-side proxy.');
      } else if (err.message && err.message.includes('CORS')) {
        console.error('CORS Error: API does not allow requests from this domain. Need server-side proxy.');
      } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        console.error('Network Error: Could be CORS, mixed content, or network issue.');
      }
      
      // Continue to next URL
      continue;
    }
  }

  // If we get here, all attempts failed
  console.error('All API attempts failed. Last error:', lastError);
  console.warn('If site is HTTPS, HTTP API calls are blocked by browsers.');
  console.warn('Solution: Use HTTPS API, server-side proxy, or serverless function.');
  // Keep default rate visible - don't change the display
  // The default rate from HTML input (60000) will remain visible
}

// Fetch rate after a short delay to ensure DOM is ready
setTimeout(updateExchangeRate, 100);



document.getElementById('submitBtn').addEventListener('click', submitOrder);
document.getElementById('exchangeRate').addEventListener('input', calcTotals);
document.getElementById('serviceFee').addEventListener('input', calcTotals);
