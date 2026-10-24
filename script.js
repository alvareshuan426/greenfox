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
// над тёмной сценой с лисой шапка остаётся прозрачной, светлеет — после неё
const heroEl = $(".js-hero");
const onScroll = () => {
  const heroEnd = heroEl ? heroEl.offsetTop + heroEl.offsetHeight - 80 : 40;
  nav.classList.toggle("is-scrolled", window.scrollY > heroEnd);
  nav.classList.toggle("is-over-hero", window.scrollY > 40 && window.scrollY <= heroEnd);
};
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
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) video.pause();
    else if (!hero.classList.contains("is-running")) video.play().catch(() => {});
  }).observe(video);
}

/* ---------- Лиса убегает при прокрутке ---------- */
// Кадры видео «лиса просыпается и убегает» лежат в img/run (и лёгкие — в img/run-m).
// Номер кадра зависит от того, насколько прокручен первый экран.
const hero = $(".js-hero");
const runCanvas = $(".js-hero-run");
const RUN = { count: Number(runCanvas?.dataset.frames || 0), frames: [], drawn: -1 };
const heroStatic = !hero || calm || !RUN.count;
if (heroStatic && hero) hero.classList.add("hero--static");

if (!heroStatic) {
  const dir = innerWidth < 760 ? "img/run-m/" : "img/run/";
  const ctx = runCanvas.getContext("2d");
  const pad = (n) => String(n).padStart(3, "0");
  // кадры грузятся после всего остального, чтобы не тормозить первый экран
  window.addEventListener("load", () => {
    for (let i = 0; i < RUN.count; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = `${dir}f${pad(i + 1)}.jpg`;
      RUN.frames[i] = img;
    }
  });

  const fitCanvas = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    runCanvas.width = runCanvas.clientWidth * dpr;
    runCanvas.height = runCanvas.clientHeight * dpr;
    RUN.drawn = -1;
  };
  // как object-fit: cover, с тем же смещением кадра, что у видео
  const drawCover = (img) => {
    const cw = runCanvas.width, ch = runCanvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    const posX = innerWidth < 760 ? 0.4 : 0.5, posY = innerWidth < 760 ? 1 : 0.75;
    ctx.drawImage(img, (cw - w) * posX, (ch - h) * posY, w, h);
  };
  // берём ближайший уже загруженный кадр, если нужный ещё в пути
  const frameAt = (i) => {
    for (let d = 0; d < RUN.count; d++) {
      const a = RUN.frames[i - d], b = RUN.frames[i + d];
      if (a && a.complete && a.naturalWidth) return a;
      if (b && b.complete && b.naturalWidth) return b;
    }
    return null;
  };

  let ticking = false;
  const onHeroScroll = () => {
    ticking = false;
    const total = hero.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / total));
    // бег занимает почти всю прокрутку сцены, в конце — пустая поляна
    const run = Math.min(1, p / 0.85);
    const running = p > 0.01 && frameAt(0);
    hero.classList.toggle("is-running", !!running);
    if (running) {
      video.pause();
      const i = Math.round(run * (RUN.count - 1));
      const img = frameAt(i);
      if (img && i !== RUN.drawn) { drawCover(img); RUN.drawn = i; }
    } else if (video && video.paused && video.src) video.play().catch(() => {});
    // текст уходит вверх и растворяется во второй половине
    const t = Math.min(1, Math.max(0, (p - 0.28) / 0.3));
    hero.style.setProperty("--text-o", 1 - t);
    hero.style.setProperty("--text-y", t * -60 + "px");
  };
  const requestHero = () => { if (!ticking) { ticking = true; requestAnimationFrame(onHeroScroll); } };
  fitCanvas();
  window.addEventListener("resize", () => { fitCanvas(); requestHero(); });
  window.addEventListener("scroll", requestHero, { passive: true });
  window.addEventListener("load", requestHero);
}

/* ---------- Светлячки над поляной ---------- */
// Золотые искры, как в видео после того, как лиса убежала. При прокрутке их становится больше.
const ffCanvas = $(".js-fireflies");
if (ffCanvas && !calm) {
  const fctx = ffCanvas.getContext("2d");
  const small = innerWidth < 760;
  const MAX = small ? 34 : 70;
  let W = 0, H = 0, dpr = 1, visible = true, boost = 0;
  const flies = [];
  const spawn = (fly = {}) => Object.assign(fly, {
    x: Math.random() * W,
    // рождаются у земли, в нижней половине кадра, и медленно поднимаются
    y: H * (0.55 + Math.random() * 0.45),
    r: (1 + Math.random() * 1.8) * dpr,
    vy: -(0.08 + Math.random() * 0.25) * dpr,
    phase: Math.random() * Math.PI * 2,
    wobble: 0.3 + Math.random() * 0.7,
    life: 0, ttl: 400 + Math.random() * 700,
  });
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = ffCanvas.width = ffCanvas.clientWidth * dpr;
    H = ffCanvas.height = ffCanvas.clientHeight * dpr;
  };
  resize();
  for (let i = 0; i < MAX; i++) { const f = spawn(); f.life = Math.random() * f.ttl; flies.push(f); }
  window.addEventListener("resize", resize);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(ffCanvas);

  const tick = (t) => {
    requestAnimationFrame(tick);
    if (!visible) return;
    // сколько светлячков видно: часть в покое, все — когда лиса убегает
    const p = hero ? Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / (hero.offsetHeight - innerHeight || 1))) : 0;
    boost += ((0.45 + p * 0.55) - boost) * 0.05;
    const active = Math.round(MAX * boost);
    fctx.clearRect(0, 0, W, H);
    for (let i = 0; i < flies.length; i++) {
      const f = flies[i];
      f.life++;
      if (f.life > f.ttl || f.y < H * 0.15) spawn(f);
      if (i >= active) continue;
      f.y += f.vy * (1 + p * 2);
      f.x += Math.sin(t / 900 + f.phase) * f.wobble * dpr * 0.4;
      // плавно зажигаются и гаснут, плюс мерцание
      const fade = Math.min(1, f.life / 60, (f.ttl - f.life) / 60);
      const a = Math.max(0, fade * (0.55 + 0.45 * Math.sin(t / 260 + f.phase * 3)));
      const g = fctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 6);
      g.addColorStop(0, `rgba(255, 226, 140, ${a})`);
      g.addColorStop(0.25, `rgba(243, 190, 90, ${a * 0.55})`);
      g.addColorStop(1, "rgba(243, 190, 90, 0)");
      fctx.fillStyle = g;
      fctx.beginPath();
      fctx.arc(f.x, f.y, f.r * 6, 0, Math.PI * 2);
      fctx.fill();
    }
  };
  requestAnimationFrame(tick);
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
