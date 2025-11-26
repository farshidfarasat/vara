/* -----------------------------------------
   VARA GLOBAL – FINAL WORKING VERSION
----------------------------------------- */

const SERVICE_LIST_URL = "https://farshidfar.app.n8n.cloud/webhook/vara_global_services";
const N8N_WEBHOOK = "https://farshidfar.app.n8n.cloud/webhook/vara_global_orders";

window.serviceFeePct = 5;
window.currentRate = 0;
const cart = [];

const fmtUSD = n => `$${(n || 0).toFixed(2)}`;
const fmtIRR = n => new Intl.NumberFormat("fa-IR").format(Math.round(n || 0));

/* ----------- SKELETON LOADER ----------- */
function showSkeleton() {
  const grid = document.getElementById("servicesGrid");
  grid.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    grid.innerHTML += `
      <div class="card skeleton">
        <div class="skeleton-line title"></div>
        <div class="skeleton-line subtitle"></div>
        <div class="controls">
          <div class="skeleton-stepper"></div>
          <div class="skeleton-btn"></div>
        </div>
      </div>`;
  }
}

/* ----------- LOAD SERVICES (with cache) ----------- */
async function loadServices() {
  const cached = localStorage.getItem("servicesCache");
  const cachedTime = localStorage.getItem("servicesCacheTime");

  if (cached && cachedTime && Date.now() - cachedTime < 24 * 60 * 60 * 1000) {
    return JSON.parse(cached);
  }

  const res = await fetch(SERVICE_LIST_URL);
  const data = await res.json();

  localStorage.setItem("servicesCache", JSON.stringify(data));
  localStorage.setItem("servicesCacheTime", Date.now());

  return data;
}

/* ----------- SERVICE CARD BUILDER ----------- */
function serviceCard(service) {
  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("h3");
  title.textContent = service.name;

  const note = document.createElement("div");
  note.className = "price-note";
  note.textContent = service.subtitle || "";

  const controls = document.createElement("div");
  controls.className = "controls";

  let months = service.duration || 3;
  let amount = service.min || 0;

  /* ----- Subscription type ----- */
  if (service.type === "subscription") {
    const val = document.createElement("span");
    val.textContent = `${months} ماه`;

    const stepper = document.createElement("div");
    stepper.className = "stepper";

    const dec = document.createElement("button"); dec.textContent = "−";
    const inc = document.createElement("button"); inc.textContent = "+";

    dec.onclick = () => {
      months = Math.max(service.duration, months - service.duration);
      val.textContent = `${months} ماه`;
    };
    inc.onclick = () => {
      months += service.duration;
      val.textContent = `${months} ماه`;
    };

    stepper.append(dec, val, inc);

    const add = document.createElement("button");
    add.className = "btn add-btn";
    add.textContent = "افزودن به سفارش";

    add.onclick = () => {
      const subtotalUSD = (months / service.duration) * service.price;
      cart.push({ name: service.name, months, subtotalUSD });
      renderCart();
    };

    controls.append(stepper, add);
  }

  /* ----- API (custom USD amount) ----- */
  if (service.type === "api") {
    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = `حداقل ${service.min} دلار`;
    input.style.width = "130px";

    input.oninput = () => {
      const val = Number(input.value);
      if (val >= service.min && val <= service.max) amount = val;
    };

    const add = document.createElement("button");
    add.className = "btn add-btn";
    add.textContent = "افزودن به سفارش";

    add.onclick = () => {
      if (amount < service.min || amount > service.max) {
        alert(`مقدار باید بین ${service.min} تا ${service.max} دلار باشد`);
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

/* ----------- RENDER SERVICE LIST ----------- */
async function renderServices() {
  showSkeleton();

  const list = await loadServices();
  const grid = document.getElementById("servicesGrid");

  grid.innerHTML = "";
  list.forEach(s => grid.appendChild(serviceCard(s)));
}

/* ----------- CART + TOTALS ----------- */
function calcTotals() {
  const rate = window.currentRate;
  const fee = window.serviceFeePct;

  const serviceUSD = cart.reduce((s, it) => s + it.subtotalUSD, 0);
  const feeUSD = serviceUSD * (fee / 100);
  const grandIRR = (serviceUSD + feeUSD) * rate;

  document.getElementById("serviceUSD").textContent = fmtUSD(serviceUSD);
  document.getElementById("feeShow").textContent = fmtUSD(feeUSD);
  document.getElementById("rateShow").textContent = rate ? `${fmtIRR(rate)} ریال` : "—";
  document.getElementById("grandIRR").textContent = fmtIRR(grandIRR) + " ریال";
}

function renderCart() {
  const wrap = document.getElementById("items");

  wrap.innerHTML = cart.length === 0
    ? `<div class="muted">هیچ آیتمی اضافه نشده است.</div>`
    : "";

  cart.forEach((it, idx) => {
    const line = document.createElement("div");
    line.className = "line";
    line.innerHTML = `
      <div>
        <div class="name">${it.name}</div>
        <div class="small">${it.months ? it.months + " ماه" : fmtUSD(it.subtotalUSD)}</div>
      </div>
      <button class="remove">حذف</button>
    `;
    line.querySelector(".remove").onclick = () => {
      cart.splice(idx, 1);
      renderCart();
    };
    wrap.appendChild(line);
  });

  calcTotals();
}

/* ----------- LIVE EXCHANGE RATE ----------- */
async function updateExchangeRate() {
  try {
    const res = await fetch("https://farshidfar.app.n8n.cloud/webhook/vara_rate");
    const data = await res.json();

    // Your webhook returns: { "row_number": 3, "Rate": 1125000, "Date": "..." }
    const rate = Number(data.Rate) || 0;

    if (rate > 0) {
      window.currentRate = Math.round(rate);
      calcTotals();
    }
  } catch (err) {
    console.error("Error fetching rate from webhook", err);
  }
}

/* ----------- SUBMIT ORDER TO N8N ----------- */
async function submitOrder() {
  const phone = document.getElementById("phone").value.trim();
  const msg = document.getElementById("message");

  msg.style.display = "none";

  if (!phone) {
    msg.style.display = "block";
    msg.textContent = "شماره تماس را وارد کنید.";
    msg.style.background = "#fee2e2";
    return;
  }

  if (cart.length === 0) {
    msg.style.display = "block";
    msg.textContent = "هیچ آیتمی انتخاب نشده است.";
    msg.style.background = "#fee2e2";
    return;
  }

  const serviceUSD = cart.reduce((s, it) => s + it.subtotalUSD, 0);
  const feeUSD = serviceUSD * (window.serviceFeePct / 100);
  const grandIRR = (serviceUSD + feeUSD) * window.currentRate;

  const payload = {
    order_id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    Phone: phone,
    telegram_sent: "FALSE",
    order_datetime: new Date().toISOString(),
    status: "Pending",
    items: cart.map(item => ({
      service_name: item.name,
      duration_months: item.months || 0,
      subtotal_usd: item.subtotalUSD
    })),
    totals: {
      service_total_usd: serviceUSD,
      service_fee_usd: feeUSD,
      exchange_rate_irr: window.currentRate,
      grand_total_irr: grandIRR
    },
    sheet: "Vara_orders"
  };

  await fetch(N8N_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  msg.style.display = "block";
  msg.textContent = "سفارش ثبت شد.";
  msg.style.background = "#f0fdf4";

  cart.length = 0;
  renderCart();
}

/* ----------- INIT ----------- */
showSkeleton();
renderServices();
renderCart();
updateExchangeRate();


document.getElementById("submitBtn").onclick = submitOrder;

