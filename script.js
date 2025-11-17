const SERVICE_LIST_URL = "https://farshidfar.app.n8n.cloud/webhook/vara_global_services";
const N8N_WEBHOOK = "https://example.com/webhook";

window.serviceFeePct = 5;
window.currentRate = 0;
const cart = [];

const fmtUSD = n => `$${(n || 0).toFixed(2)}`;
const fmtIRR = n => new Intl.NumberFormat("fa-IR").format(Math.round(n || 0));


/* ----------- SKELETON LOADER (NO LAG) ----------- */
function showSkeleton() {
  const grid = document.getElementById("servicesGrid");
  grid.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    const sk = document.createElement("div");
    sk.className = "card skeleton";
    sk.innerHTML = `
      <div class="skeleton-line title"></div>
      <div class="skeleton-line subtitle"></div>
      <div class="controls">
        <div class="skeleton-stepper"></div>
        <div class="skeleton-btn"></div>
      </div>`;
    grid.appendChild(sk);
  }
}


/* ----------- LOAD SERVICES ----------- */
async function loadServices() {// 1) Check local cache (super fast)
  const cached = localStorage.getItem("servicesCache");
  const cachedTime = localStorage.getItem("servicesCacheTime");

  if (cached && cachedTime && Date.now() - cachedTime < 24*60*60*1000) {
    return JSON.parse(cached);
  }

  // 2) Fetch slow webhook
  const res = await fetch(SERVICE_LIST_URL);
  const data = await res.json();

  // 3) Save to cache for next time
  localStorage.setItem("servicesCache", JSON.stringify(data));
  localStorage.setItem("servicesCacheTime", Date.now());

  return data;
}


/* ----------- BUILD EACH CARD ----------- */
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

  if (service.type === "subscription") {
    const val = document.createElement("span");
    val.textContent = `${months} ماه`;

    const stepper = document.createElement("div");
    stepper.className = "stepper";

    const dec = document.createElement("button");
    const inc = document.createElement("button");
    dec.textContent = "−";
    inc.textContent = "+";

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
      const blocks = months / service.duration;
      cart.push({ name: service.name, months, subtotalUSD: service.price * blocks });
      renderCart();
    };

    controls.append(stepper, add);
  }

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
    add.textContent = "افزودن به سفارش";
    add.className = "btn add-btn";

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


/* ----------- RENDER SERVICES ----------- */
async function renderServices() {
  showSkeleton(); // instant no-lag UI

  const list = await loadServices();
  const grid = document.getElementById("servicesGrid");

  grid.innerHTML = ""; // remove skeletons

  list.forEach(s => grid.appendChild(serviceCard(s)));
}


/* ----------- CART / TOTALS ----------- */
function calcTotals() {
  const rate = window.currentRate;
  const fee = window.serviceFeePct;

  const serviceUSD = cart.reduce((s, it) => s + it.subtotalUSD, 0);
  const feeUSD = serviceUSD * (fee / 100);
  const grandIRR = (serviceUSD + feeUSD) * rate;

  document.getElementById("serviceUSD").textContent = fmtUSD(serviceUSD);
  document.getElementById("feeShow").textContent = fmtUSD(feeUSD);
  document.getElementById("rateShow").textContent = rate ? `${fmtIRR(rate)} ریال / $1` : "—";
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


/* ----------- LIVE RATE ----------- */
async function updateExchangeRate() {
  const box = document.getElementById("exchangeRateDisplay");

  try {
    const res = await fetch("https://api-gateway.sahmeto.com/api/v2/core/assets/8033/price");
    const data = await res.json();
    const rate = data?.price?.USD || 0;

    if (rate > 0) {
      window.currentRate = Math.round(rate);
      box.textContent = fmtIRR(window.currentRate) + " ریال / $1";
      calcTotals();
    } else {
      box.textContent = "نامشخص";
    }
  } catch {
    box.textContent = "خطا در دریافت نرخ";
  }
}


/* ----------- SUBMIT ----------- */
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

  const payload = {
    phone,
    items: cart,
    totals: {
      serviceUSD: cart.reduce((s, it) => s + it.subtotalUSD, 0),
      exchangeRate: window.currentRate,
      serviceFeePercent: window.serviceFeePct
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
