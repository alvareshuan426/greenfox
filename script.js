// Настройки (цены, ссылки на оплату и канал) — в config.js


const isEarly = CONFIG.seatsSold < CONFIG.seatsTotal;
const price = isEarly ? CONFIG.priceEarly : CONFIG.priceRegular;
const rub = (n) => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₽";
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/* ---------- Цены и счётчик мест ---------- */
$$(".js-price").forEach((el) => (el.textContent = rub(price)));
$(".js-pay-full").textContent = rub(price);
$(".js-pay-split").textContent = "4 × " + rub(Math.ceil(price / 4));

if (isEarly) {
  const left = CONFIG.seatsTotal - CONFIG.seatsSold;
  $(".js-seats-left").textContent = left;
  $(".js-seats-note").textContent = `осталось ${left} из ${CONFIG.seatsTotal} мест по этой цене`;
} else {
  $$(".js-price-old").forEach((el) => el.remove());
  $(".js-seats").remove();
  $(".js-seats-note").remove();
}

/* ---------- Заставка ---------- */
// логотип успевает «нарисоваться», затем шторки расходятся
const introMin = new Promise((r) => setTimeout(r, 1700));
const pageLoad = new Promise((r) => window.addEventListener("load", r));
Promise.all([introMin, pageLoad]).then(() => {
  document.body.classList.add("is-loaded");
  setTimeout(() => document.body.classList.add("is-ready"), 700);
});
// подстраховка, если какая-то картинка грузится долго
setTimeout(() => document.body.classList.add("is-loaded", "is-ready"), 4500);

/* ---------- Навигация ---------- */
const nav = $(".nav");
const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ---------- Лианы: длина стебля для анимации ---------- */
$$(".vine__stem").forEach((p) => p.style.setProperty("--len", Math.ceil(p.getTotalLength())));
$$(".vine__leaves").forEach((g) =>
  [...g.children].forEach((leaf, i) => (leaf.style.transitionDelay = 0.5 + i * 0.22 + "s"))
);

/* ---------- Появление при скролле ---------- */
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (el.classList.contains("overgrow")) el.classList.add("is-open");
      else if (el.classList.contains("vine")) el.classList.add("is-grown");
      else if (el.classList.contains("seats")) $(".js-seats-bar").style.width =
        (CONFIG.seatsSold / CONFIG.seatsTotal) * 100 + "%";
      else el.classList.add("is-visible");
      io.unobserve(el);
    }),
  { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
);
$$(".reveal, .overgrow, .seats").forEach((el) => io.observe(el));
// лиана в hero растёт сразу после заставки, остальные — по скроллу
$$(".vine").forEach((el) => io.observe(el));

/* ---------- Живая лиса в первом экране ---------- */
const video = $(".js-hero-video");
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (video && !calm) {
  video.src = innerWidth < 760 ? video.dataset.srcMobile : video.dataset.src;
  video.play().catch(() => {}); // без автозапуска остаётся постер — тот же кадр
  // не тратим батарею, когда первый экран прокручен
  new IntersectionObserver(([e]) => (e.isIntersecting ? video.play().catch(() => {}) : video.pause()))
    .observe(video);
}

/* ---------- Цитата: слова проявляются из размытия по мере прокрутки ---------- */
const quote = $(".quote");
const words = [];
$$(".js-blur-words").forEach((p) => {
  const accent = ["понимания.", "хаоса"];
  // делим только по обычным пробелам, неразрывные («в косметичке») остаются вместе
  p.innerHTML = p.textContent.split(/ +/).map((w) => {
    const cls = accent.some((a) => w.includes(a)) ? "word word--accent" : "word";
    return `<span class="${cls}">${w}</span>`;
  }).join(" ");
  words.push(...p.querySelectorAll(".word"));
});
const onQuoteScroll = () => {
  const r = quote.getBoundingClientRect();
  // 0 — секция появилась снизу, 1 — дошла до середины экрана
  const progress = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.75)));
  const shown = Math.round(progress * words.length);
  words.forEach((w, i) => w.classList.toggle("is-on", i < shown));
  quote.style.setProperty("--parallax", (r.top / innerHeight) * -60 + "px");
};
if (quote) {
  if (calm) words.forEach((w) => w.classList.add("is-on"));
  else { onQuoteScroll(); window.addEventListener("scroll", onQuoteScroll, { passive: true }); }
}

/* ---------- Визитка: переворот по клику и наклон за курсором ---------- */
$$(".js-bizcard").forEach((card) => {
  card.addEventListener("click", () => {
    const flipped = card.classList.toggle("is-flipped");
    card.setAttribute("aria-pressed", flipped);
  });
  if (calm) return;
  card.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty("--ry", x * 16 + "deg");
    card.style.setProperty("--rx", y * -12 + "deg");
  });
  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--rx", "0deg");
  });
});

/* ---------- Форма заказа ---------- */
const form = $("#order-form");
const modal = $("#modal");

// принимаем «@nick», «nick», «t.me/nick», «https://t.me/nick»
const cleanNick = (v) => v.trim().replace(/^(https?:\/\/)?(t\.me\/|telegram\.me\/)/i, "").replace(/^@+/, "");
const nickOk = (v) => /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(v);

const tgInput = form.elements.telegram;
tgInput.addEventListener("blur", () => (tgInput.value = cleanNick(tgInput.value)));

function setInvalid(input, bad) {
  const wrap = input.closest(".field, .check");
  if (!wrap) return; // радиокнопки оплаты не валидируются
  wrap.classList.toggle("is-invalid", bad);
  if (wrap.classList.contains("check")) wrap.nextElementSibling.classList.toggle("is-shown", bad);
}

function validate() {
  const f = form.elements;
  const checks = [
    [f.name, f.name.value.trim().length < 2],
    [f.contact, !/(@.+\..+)|(\d{10,})/.test(f.contact.value.replace(/[\s()+-]/g, ""))],
    [f.telegram, !nickOk(cleanNick(f.telegram.value))],
    [f.consent, !f.consent.checked],
    [f.offer, !f.offer.checked],
  ];
  checks.forEach(([el, bad]) => setInvalid(el, bad));
  const firstBad = checks.find(([, bad]) => bad);
  if (firstBad) firstBad[0].focus();
  return !firstBad;
}

// подсказка про Т-Банк под способами оплаты
$$("input[name=payment]", form).forEach((el) =>
  el.addEventListener("change", () => ($(".js-pay-note").hidden = form.elements.payment.value === "full"))
);

$$("input", form).forEach((el) =>
  el.addEventListener(el.type === "checkbox" ? "change" : "input", () => setInvalid(el, false))
);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const f = form.elements;
  const order = {
    date: new Date().toLocaleString("ru-RU"),
    name: f.name.value.trim(),
    contact: f.contact.value.trim(),
    telegram: "@" + cleanNick(f.telegram.value),
    payment: { full: "Картой целиком", split: "Т-Банк Долями", installment: "Т-Банк рассрочка" }[f.payment.value],
    price,
    tariff: isEarly ? "Ранний" : "Обычный",
    consent: "да",
  };

  const btn = $("button[type=submit]", form);
  btn.disabled = true;

  if (CONFIG.orderWebhook) {
    try {
      // text/plain + no-cors — так Google Apps Script принимает запрос без лишних настроек
      await fetch(CONFIG.orderWebhook, { method: "POST", mode: "no-cors", body: JSON.stringify(order) });
    } catch (err) {
      console.error("Не удалось отправить заказ", err);
    }
  }

  // ник нужен странице thanks.html, чтобы напомнить, с какого аккаунта подавать заявку
  try { localStorage.setItem("gf-nick", order.telegram); } catch (err) {}

  $(".js-modal-nick").textContent = order.telegram;
  modal.hidden = false;
  $(".js-modal-close").focus();

  const link = CONFIG.paymentLinks[isEarly ? "early" : "regular"][f.payment.value];
  if (link) setTimeout(() => (window.location.href = link), 2600);
  btn.disabled = false;
});

const closeModal = () => (modal.hidden = true);
$(".js-modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => e.target === modal && closeModal());
document.addEventListener("keydown", (e) => e.key === "Escape" && closeModal());
