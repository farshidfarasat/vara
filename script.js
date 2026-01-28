/* -----------------------------------------
   VARA GLOBAL – FINAL STABLE VERSION
----------------------------------------- */

const SERVICE_LIST_URL = "https://n8n-5lcpbbfq.darkube.app/webhook/vara_global_services";
const N8N_WEBHOOK = "https://n8n-5lcpbbfq.darkube.app/webhook/vara_global_orders";

window.serviceFeePct = 5;
window.currentRate = 0;
const cart = [];

const fmtUSD = n => `$${(Number(n) || 0).toFixed(2)}`;
const fmtIRR = n => new Intl.NumberFormat("fa-IR").format(Math.round(Number(n) || 0));

/* ---------------------------------------------------
   LOAD SERVICES
--------------------------------------------------- */
async function renderServices(forceRefresh = false) {
  try {
    const res = await fetch(SERVICE_LIST_URL + "?v=" + Date.now(), { cache: "no-store" });
    const services = await res.json();

    const grid = document.getElementById("servicesGrid");
    grid.innerHTML = "";

    services.forEach(service => {
      grid.appendChild(serviceCard(service));
    });
  } catch (err) {
    console.error(err);
    document.getElementById("servicesGrid").innerHTML =
      `<div class="error">خطا در دریافت سرویس‌ها</div>`;
  }
}

/* ---------------------------------------------------
   SERVICE CARD
--------------------------------------------------- */
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

  /* ---------- SUBSCRIPTION ---------- */
  if (service.type === "subscription") {
    let months = Number(service.duration) || 1;

    const val = document.createElement("span");
    val.textContent = `${months} ماه`;

    const stepper = document.createElement("div");
    stepper.className = "stepper";

    const dec = document.createElement("button");
    dec.textContent = "−";

    const inc = document.createElement("button");
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

    const add = makeAddButton(() => {
      const subtotalUSD = (months / service.duration) * service.price;
      cart.push({
        name: service.name,
        months,
        subtotalUSD,
        meta: { type: "subscription" }
      });
      renderCart();
      showButtonMessage(add.querySelector(".add-btn"), "✓ به لیست سفارش اضافه شد");
    }, () => (months / service.duration) * service.price);

    controls.append(stepper, add);
  }

  /* ---------- API ---------- */
  if (service.type === "api") {
    let amount = 0;

    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = `حداقل ${service.min} دلار`;
    input.style.width = "130px";

    input.oninput = () => {
      amount = Number(input.value) || 0;
    };

    const add = makeAddButton(() => {
      if (amount < service.min || amount > service.max) {
        alert(`مقدار باید بین ${service.min} تا ${service.max} دلار باشد`);
        return;
      }
      cart.push({
        name: service.name,
        months: 0,
        subtotalUSD: amount,
        meta: { type: "api" }
      });
      renderCart();
      showButtonMessage(add.querySelector(".add-btn"), "✓ به لیست سفارش اضافه شد");
    }, () => amount);

    controls.append(input, add);
  }

  /* ---------- GIFT CARD ---------- */
  if (service.type === "giftcard") {
    const opts = service.options || {};

    let cardName = "";
    let region = "";
    let amount = 0;

    const selCard = makeSelect("گیفت‌کارت", opts.cards, v => cardName = v);
    const selAmount = makeSelect("مبلغ (USD)", opts.amounts, v => amount = Number(v) || 0);
    const selRegion = makeSelect("ریجن", opts.regions, v => region = v);

    const add = makeAddButton(() => {
      if (!cardName || !region || !amount) {
        alert("لطفاً نوع کارت، مبلغ و ریجن را انتخاب کنید");
        return;
      }

      cart.push({
        name: service.name,
        months: 0,
        subtotalUSD: amount,
        meta: {
          type: "giftcard",
          card: cardName,
          region,
          amount_usd: amount
        }
      });
      renderCart();
      showButtonMessage(add.querySelector(".add-btn"), "✓ به لیست سفارش اضافه شد");
    }, () => amount);

    controls.append(selCard, selAmount, selRegion, add);
  }

  /* ---------- TELEGRAM PREMIUM ---------- */
  if (service.type === "telegram_premium") {
    const durations = service.durations || [];

    const select = document.createElement("select");
    select.style.width = "130px";
    select.innerHTML =
      `<option value="">مدت اشتراک</option>` +
      durations.map(d => `<option value="${d.months}|${d.price}">${d.months} ماه</option>`).join("");

    // price box next to select (same height/feel as inputs)
    const priceBox = document.createElement("div");
    priceBox.className = "muted";
    priceBox.style.width = "130px";
    priceBox.style.height = "42px";
    priceBox.style.display = "flex";
    priceBox.style.alignItems = "center";
    priceBox.style.justifyContent = "center";
    priceBox.style.border = "1px solid var(--line)";
    priceBox.style.borderRadius = "12px";
    priceBox.style.background = "#fff";
    priceBox.style.color = "var(--muted)";
    priceBox.style.fontSize = "14px";
    priceBox.textContent = "هزینه: —";

    let months = 0;
    let price = 0;

    const addWrapper = document.createElement("div");
    addWrapper.className = "button-wrapper add-btn-wrapper";
    
    // نمایش هزینه ریالی بالای دکمه
    const priceIRREl = document.createElement("div");
    priceIRREl.className = "card-price-irr";
    priceIRREl.textContent = "—";
    
    const updatePriceIRR = () => {
      const fee = price * (window.serviceFeePct / 100);
      const totalIRR = (price + fee) * window.currentRate;
      priceIRREl.textContent = totalIRR > 0 ? `${fmtIRR(totalIRR)} ریال` : "—";
    };

    select.onchange = () => {
      const [m, p] = String(select.value).split("|");
      months = Number(m) || 0;
      price = Number(p) || 0;
      priceBox.textContent = price ? `هزینه: ${fmtUSD(price)}` : "هزینه: —";
      updatePriceIRR();
    };
    
    const add = document.createElement("button");
    add.className = "btn add-btn";
    add.textContent = "افزودن به سفارش";

    add.onclick = () => {
      if (!months || !price) {
        alert("لطفاً مدت اشتراک را انتخاب کنید.");
        return;
      }

      cart.push({
        name: service.name,
        months,
        subtotalUSD: price,
        meta: {
          type: "telegram_premium",
          months,
          price_usd: price
        }
      });

      renderCart();
      showButtonMessage(add, "✓ به لیست سفارش اضافه شد");

      // optional: reset UI
      select.value = "";
      months = 0;
      price = 0;
      priceBox.textContent = "هزینه: —";
      priceIRREl.textContent = "—";
    };

    addWrapper.appendChild(priceIRREl);
    addWrapper.appendChild(add);
    
    // ✅ show next to each other: select + priceBox + add
    controls.append(select, priceBox, addWrapper);
  }

  card.append(title, note, controls);
  return card;
}

/* ---------------------------------------------------
   CART
--------------------------------------------------- */
function renderCart() {
  const wrap = document.getElementById("items");
  wrap.innerHTML = cart.length
    ? ""
    : `<div class="muted">هیچ آیتمی اضافه نشده است.</div>`;

  cart.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "line";

    let detail = "";
    if (it.meta?.type === "giftcard") {
      detail = `${it.meta.card} • ${it.meta.amount_usd}$ • ${it.meta.region}`;
    } else if (it.months) {
      detail = `${it.months} ماه`;
    } else {
      detail = fmtUSD(it.subtotalUSD);
    }

    row.innerHTML = `
      <div>
        <div class="name">${it.name}</div>
        <div class="small">${detail}</div>
      </div>
      <button class="remove">حذف</button>
    `;

    row.querySelector(".remove").onclick = () => {
      cart.splice(i, 1);
      renderCart();
    };

    wrap.appendChild(row);
  });

  calcTotals();
}

/* ---------------------------------------------------
   TOTALS
--------------------------------------------------- */
function calcTotals() {
  const serviceUSD = cart.reduce((s, it) => s + it.subtotalUSD, 0);
  const feeUSD = serviceUSD * (window.serviceFeePct / 100);
  const totalIRR = (serviceUSD + feeUSD) * window.currentRate;

  document.getElementById("serviceUSD").textContent = fmtUSD(serviceUSD);
  document.getElementById("rateShow").textContent = window.currentRate ? `${fmtIRR(window.currentRate)} ریال` : "—";
  document.getElementById("feeShow").textContent = fmtUSD(feeUSD);
  document.getElementById("grandIRR").textContent = fmtIRR(totalIRR) + " ریال";
}

/* ---------------------------------------------------
   RATE
--------------------------------------------------- */
async function updateExchangeRate() {
  try {
    const res = await fetch(
      "https://n8n-5lcpbbfq.darkube.app/webhook/vara_rate?v=" + Date.now(),
      { cache: "no-store" }
    );
    const data = await res.json();
    window.currentRate = Number(data.Rate) || 0;
    calcTotals();
  } catch (e) {
    console.error(e);
  }
}

/* ---------------------------------------------------
   SUBMIT ORDER
--------------------------------------------------- */
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

  try {
    await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    msg.style.display = "block";
    msg.textContent = "سفارش ثبت شد.";
    msg.style.background = "#f0fdf4";

    cart.length = 0;
    renderCart();
  } catch (err) {
    msg.style.display = "block";
    msg.textContent = "خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.";
    msg.style.background = "#fee2e2";
    console.error(err);
  }
}

/* ---------------------------------------------------
   HELPERS
--------------------------------------------------- */
function showButtonMessage(button, message) {
  // ایجاد المنت پیغام
  const messageEl = document.createElement("div");
  messageEl.className = "button-message";
  messageEl.textContent = message;
  
  // پیدا کردن wrapper (ممکن است button خودش باشد یا داخل wrapper باشد)
  let buttonWrapper = button.parentElement;
  if (!buttonWrapper || !buttonWrapper.classList.contains("button-wrapper")) {
    // اگر wrapper وجود ندارد، یکی ایجاد کن
    buttonWrapper = document.createElement("div");
    buttonWrapper.className = "button-wrapper add-btn-wrapper";
    buttonWrapper.style.position = "relative";
    buttonWrapper.style.display = "inline-block";
    
    // جایگزین کردن دکمه با wrapper
    if (button.parentElement) {
      button.parentElement.insertBefore(buttonWrapper, button);
      buttonWrapper.appendChild(button);
    }
  } else {
    // حذف پیغام قبلی اگر وجود دارد
    const existingMessage = buttonWrapper.querySelector(".button-message");
    if (existingMessage) {
      existingMessage.remove();
    }
  }
  
  // اضافه کردن پیغام به wrapper
  buttonWrapper.appendChild(messageEl);
  
  // نمایش با انیمیشن نرم
  setTimeout(() => {
    messageEl.style.opacity = "1";
    messageEl.style.transform = "translateY(-50%) translateX(0) scale(1)";
  }, 10);
  
  // پنهان کردن بعد از 3 ثانیه
  setTimeout(() => {
    messageEl.style.opacity = "0";
    messageEl.style.transform = "translateY(-50%) translateX(-10px) scale(0.95)";
    setTimeout(() => {
      if (messageEl.parentElement) {
        messageEl.remove();
      }
    }, 400);
  }, 3000);
}

function makeAddButton(onClick, getPriceUSD) {
  const wrapper = document.createElement("div");
  wrapper.className = "button-wrapper add-btn-wrapper";
  
  // نمایش هزینه ریالی بالای دکمه
  const priceIRR = document.createElement("div");
  priceIRR.className = "card-price-irr";
  
  // تابع به‌روزرسانی قیمت ریالی
  const updatePriceIRR = () => {
    const usd = typeof getPriceUSD === "function" ? getPriceUSD() : 0;
    const fee = usd * (window.serviceFeePct / 100);
    const totalIRR = (usd + fee) * window.currentRate;
    priceIRR.textContent = totalIRR > 0 ? `${fmtIRR(totalIRR)} ریال` : "—";
  };
  
  // به‌روزرسانی اولیه
  updatePriceIRR();
  
  // به‌روزرسانی هر 500ms (برای تغییرات stepper/input)
  const intervalId = setInterval(updatePriceIRR, 500);
  
  const btn = document.createElement("button");
  btn.className = "btn add-btn";
  btn.textContent = "افزودن به سفارش";
  btn.onclick = onClick;
  
  wrapper.appendChild(priceIRR);
  wrapper.appendChild(btn);
  
  // ذخیره intervalId برای پاکسازی بعدی (اختیاری)
  wrapper._priceInterval = intervalId;
  
  return wrapper;
}

function makeSelect(placeholder, values = [], onChange) {
  const select = document.createElement("select");
  select.innerHTML =
    `<option value="">${placeholder}</option>` +
    values.map(v => `<option value="${v}">${v}</option>`).join("");

  select.onchange = () => onChange(select.value);
  return select;
}

/* ---------------------------------------------------
   INIT
--------------------------------------------------- */
renderServices();
renderCart();
updateExchangeRate();

document.getElementById("submitBtn").onclick = submitOrder;
