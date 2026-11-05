/* ============================================================
   Harbourline Home Loans — shared behaviour (vanilla ES module)
   All integrations are simulated client-side: no API keys, no
   server. Swap the CONFIG values for real endpoints when going
   live. See README.md.
   ============================================================ */

const CONFIG = {
  site: "Harbourline Home Loans",
  source: "harbourline-demo",
  // Replace with your real GoHighLevel inbound webhook URL:
  ghlWebhook: "https://actions.highlevel.com/webhook/EXAMPLE-TOKEN",
  // Replace with your real Calendly link or embed:
  calendlyUrl: "https://calendly.com/your-link",
  phone: "(02) 9000 1234",
  slots: ["9:00 AM", "10:30 AM", "1:00 PM", "3:30 PM", "5:00 PM"],
};

/* ---------- storage helpers ---------- */
const KEYS = {
  leads: "harbourline_leads",
  bookings: "harbourline_bookings",
  inspector: "harbourline_inspector",
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* storage unavailable: demo still works in memory */
  }
}

const state = Object.assign(
  { events: [], payloads: [] },
  loadJSON(KEYS.inspector, {})
);
state.events = state.events || [];
state.payloads = state.payloads || [];

/* ---------- tracking ---------- */
window.dataLayer = window.dataLayer || [];

function track(event, data = {}) {
  const entry = { event, ...data, _ts: new Date().toISOString() };
  window.dataLayer.push(entry);
  state.events.push(entry);
  if (state.events.length > 200) state.events.shift();
  persistInspector();
  renderInspector();
}

function logPayload(kind, payload) {
  state.payloads.push({ kind, payload, _ts: new Date().toISOString() });
  if (state.payloads.length > 60) state.payloads.shift();
  persistInspector();
  renderInspector();
}

function persistInspector() {
  saveJSON(KEYS.inspector, state);
}

function saveLead(lead) {
  const leads = loadJSON(KEYS.leads, []);
  leads.push(lead);
  saveJSON(KEYS.leads, leads);
  renderInspector();
}

function clearDemoData() {
  state.events = [];
  state.payloads = [];
  try {
    localStorage.removeItem(KEYS.leads);
    localStorage.removeItem(KEYS.bookings);
    localStorage.removeItem(KEYS.inspector);
  } catch (e) { /* ignore */ }
  renderInspector();
}

/* ---------- small utils ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function validEmail(v) { return /^\S+@\S+\.\S+$/.test(v.trim()); }
function validMobileAU(v) {
  return /^(04\d{2} ?\d{3} ?\d{3}|\+61\s?4\d{2} ?\d{3} ?\d{3})$/.test(v.trim());
}
function normaliseMobileAU(v) {
  const digits = v.replace(/[^\d+]/g, "");
  if (digits.startsWith("61")) return "+" + digits;
  if (digits.startsWith("+61")) return digits;
  if (digits.startsWith("0")) return "+61" + digits.slice(1);
  return "+61" + digits;
}
const aud = new Intl.NumberFormat("en-AU", {
  style: "currency", currency: "AUD", maximumFractionDigits: 0,
});

const PURPOSE_TAGS = {
  "first-home": "first-home-buyer",
  "refinance": "refinance",
  "investment": "investment-loan",
  "invest": "investment-loan",
  "construction": "construction-loan",
  "self-employed": "self-employed-loan",
  "debt-consolidation": "debt-consolidation",
  "other": "general-enquiry",
};

function ghlPayload({ firstName, lastName = "", email, phone, purpose, extraTags = [], properties = {}, source }) {
  const tags = ["website-lead", purpose ? PURPOSE_TAGS[purpose] : null, ...extraTags].filter(Boolean);
  return {
    integration: "GoHighLevel webhook (simulated)",
    endpoint: CONFIG.ghlWebhook,
    contact: { firstName, lastName, email, phone: phone || null },
    tags,
    pipeline: "Home Loans",
    stage: "New Enquiry",
    source,
    properties,
    createdAt: new Date().toISOString(),
  };
}

/* ============================================================
   Mobile navigation
   ============================================================ */
const navToggle = $(".nav-toggle");
const mainNav = $(".main-nav");
if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  $$("a", mainNav).forEach((a) =>
    a.addEventListener("click", () => {
      mainNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );
}

/* ============================================================
   CTA click tracking — every [data-cta] element
   ============================================================ */
$$("[data-cta]").forEach((el) => {
  el.addEventListener("click", () => {
    track("cta_click", {
      label: el.textContent.trim().replace(/\s+/g, " "),
      location: el.dataset.cta,
      page: location.pathname,
    });
  });
});

/* ============================================================
   Integration Inspector (drawer)
   ============================================================ */
const devMode = new URLSearchParams(location.search).get("dev") === "1";
const inspector = document.createElement("aside");
inspector.className = "inspector";
inspector.setAttribute("aria-label", "Integration Inspector");
inspector.innerHTML = `
  <div class="inspector-head">
    <strong>Integration Inspector</strong>
    <button type="button" aria-label="Close inspector">&times;</button>
  </div>
  <p class="inspector-note">Simulated integrations. Events and payloads stay in this browser only.</p>
  <div class="insp-tabs" role="tablist">
    <button role="tab" id="tab-events" aria-selected="true" data-pane="events">Events<span class="badge-count" data-count="events">0</span></button>
    <button role="tab" id="tab-payloads" aria-selected="false" data-pane="payloads">CRM Payloads<span class="badge-count" data-count="payloads">0</span></button>
    <button role="tab" id="tab-leads" aria-selected="false" data-pane="leads">Stored Leads<span class="badge-count" data-count="leads">0</span></button>
  </div>
  <div class="insp-body"><ul id="insp-list" aria-live="polite"></ul></div>
  <div class="inspector-foot">
    <button type="button" class="btn btn-primary btn-sm" data-action="clear">Clear demo data</button>
  </div>
`;
document.body.appendChild(inspector);

let inspTab = "events";
let inspBackdrop = null;
$$(".insp-tabs button", inspector).forEach((t) =>
  t.addEventListener("click", () => {
    inspTab = t.dataset.pane;
    $$(".insp-tabs button", inspector).forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    renderInspector();
  })
);

function renderInspector() {
  const list = $("#insp-list", inspector);
  if (!list) return;
  let items = [];
  if (inspTab === "events") {
    items = state.events.map((e) => {
      const { event, _ts, ...rest } = e;
      return `<li><span class="ev-name">${event}</span><span class="ev-time">${new Date(_ts).toLocaleTimeString("en-AU")}</span><pre>${escapeHTML(JSON.stringify(rest, null, 1))}</pre></li>`;
    });
  } else if (inspTab === "payloads") {
    items = state.payloads.map((p) => {
      return `<li><span class="ev-name">${escapeHTML(p.kind)}</span><span class="ev-time">${new Date(p._ts).toLocaleTimeString("en-AU")}</span><pre>${escapeHTML(JSON.stringify(p.payload, null, 1))}</pre></li>`;
    });
  } else {
    items = loadJSON(KEYS.leads, []).map((l) => {
      const who = (l.contact && l.contact.firstName) || l.name || "—";
      const mail = (l.contact && l.contact.email) || l.email || "";
      return `<li><strong>${escapeHTML(String(who))}</strong> · ${escapeHTML(String(mail))}<pre>${escapeHTML(JSON.stringify(l, null, 1))}</pre></li>`;
    });
  }
  list.innerHTML = items.length
    ? items.reverse().join("")
    : `<li class="insp-empty">Nothing yet. Interact with the site and events will appear here.</li>`;
  const counts = {
    events: state.events.length,
    payloads: state.payloads.length,
    leads: loadJSON(KEYS.leads, []).length,
  };
  for (const [k, v] of Object.entries(counts)) {
    const el = $(`[data-count="${k}"]`, inspector);
    if (el) el.textContent = String(v);
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function openInspector() {
  inspector.classList.add("open");
  inspToggle.setAttribute("aria-expanded", "true");
  if (!inspBackdrop) {
    inspBackdrop = document.createElement("div");
    inspBackdrop.className = "insp-backdrop";
    inspBackdrop.addEventListener("click", closeInspector);
    document.body.appendChild(inspBackdrop);
  }
  renderInspector();
}
function closeInspector() {
  inspector.classList.remove("open");
  if (inspToggle) inspToggle.setAttribute("aria-expanded", "false");
  if (inspBackdrop) { inspBackdrop.remove(); inspBackdrop = null; }
}
const inspToggle = $("#inspector-toggle");
if (inspToggle) {
  inspToggle.classList.toggle("is-visible", devMode);
  inspToggle.addEventListener("click", () =>
    inspector.classList.contains("open") ? closeInspector() : openInspector()
  );
}
$(".inspector-head button", inspector).addEventListener("click", closeInspector);
$('[data-action="clear"]', inspector).addEventListener("click", () => {
  clearDemoData();
  track("demo_data_cleared", {});
});

/* ============================================================
   Chatbot — Harbourline Assistant (rule-based, no API keys)
   ============================================================ */
const launcher = $("#chat-launcher");const panel = document.createElement("section");
panel.className = "chat-panel";
panel.id = "chat-panel";
panel.hidden = true;
panel.setAttribute("role", "dialog");
panel.setAttribute("aria-label", "Harbourline Assistant");
panel.innerHTML = `
  <div class="chat-head">
    <span class="dot" aria-hidden="true"></span>
    <strong>Harbourline Assistant</strong>
    <button type="button" aria-label="Close chat">&times;</button>
  </div>
  <div class="chat-body" id="chat-body" aria-live="polite"></div>
  <div class="chat-input-row" id="chat-input-row" hidden>
    <label class="visually-hidden" for="chat-input">Your answer</label>
    <input id="chat-input" type="text" autocomplete="off" placeholder="Type your answer…" />
    <button type="button" class="btn btn-primary btn-sm" id="chat-send">Send</button>
  </div>
`;
document.body.appendChild(panel);

const chatBody = $("#chat-body", panel);
const chatInputRow = $("#chat-input-row", panel);
const chatInput = $("#chat-input", panel);
let chatStarted = false;
let chatAnswers = {};

function openChat() {
  panel.hidden = false;
  if (launcher) launcher.setAttribute("aria-expanded", "true");
  if (!chatStarted) {
    chatStarted = true;
    startChat();
  } else if (!chatBody.children.length) {
    botSay("Hi! I'm the <strong>Harbourline Assistant</strong>. Ask me about first home loans, refinancing or booking a call.");
  }
}
function closeChat() {
  panel.hidden = true;
  if (launcher) launcher.setAttribute("aria-expanded", "false");
}

if (launcher) {
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", panel.id);
  launcher.addEventListener("click", () => {
    if (panel.hidden) openChat();
    else closeChat();
  });
}
$(".chat-head button", panel).addEventListener("click", () => {
  closeChat();
  if (launcher) launcher.focus();
});

function botSay(html, cb) {
  const div = document.createElement("div");
  div.className = "chat-msg bot";
  div.innerHTML = html;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
  if (cb) setTimeout(cb, 450);
}
function userSay(text) {
  const div = document.createElement("div");
  div.className = "chat-msg user";
  div.textContent = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function quickReplies(options) {
  const row = document.createElement("div");
  row.className = "chat-quick";
  options.forEach((o) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = o.label;
    b.addEventListener("click", () => {
      row.remove();
      userSay(o.label);
      o.next();
    });
    row.appendChild(b);
  });
  chatBody.appendChild(row);
  chatBody.scrollTop = chatBody.scrollHeight;
}

const FLOW = [
  {
    q: "What brings you here today?",
    key: "purpose",
    options: [
      { label: "Buy my first home", value: "first-home" },
      { label: "Refinance", value: "refinance" },
      { label: "Invest", value: "invest" },
      { label: "Something else", value: "other" },
    ],
  },
  {
    q: "Roughly how much do you need to borrow?",
    key: "amount",
    options: [
      { label: "Under $500k", value: "lt500" },
      { label: "$500k – $1M", value: "500k-1m" },
      { label: "$1M+", value: "gt1m" },
    ],
  },
  {
    q: "When would you like to move forward?",
    key: "timeline",
    options: [
      { label: "Within 3 months", value: "within-3m" },
      { label: "3–6 months", value: "3-6m" },
      { label: "Just researching", value: "researching" },
    ],
  },
  {
    q: "Are you employed PAYG or self-employed?",
    key: "employment",
    options: [
      { label: "PAYG", value: "payg" },
      { label: "Self-employed", value: "self-employed" },
    ],
  },
];

function scoreLead(a) {
  let s = 0;
  if (a.timeline === "within-3m") s += 3;
  if (a.timeline === "3-6m") s += 2;
  if (a.amount === "500k-1m" || a.amount === "gt1m") s += 2;
  if (a.purpose === "refinance" || a.purpose === "invest") s += 1;
  const label = s >= 5 ? "Hot" : s >= 3 ? "Warm" : "Cold";
  return { score: s, label };
}

function startChat() {
  botSay(
    "Hi! I'm the <strong>Harbourline Assistant</strong>. Answer four quick questions and I'll point you to the right next step in about 30 seconds.",
    () =>
      quickReplies([
        { label: "Yes, let's go", next: () => askStep(0) },
        {
          label: "Just browsing",
          next: () => {
            userSay("Just browsing");
            botSay("No worries. Take a look around — or grab the <strong>First Home Buyer Checklist</strong> in the footer. Happy to help any time.");
          },
        },
      ])
  );
}

function askStep(i) {
  if (i >= FLOW.length) { finishChat(); return; }
  const step = FLOW[i];
  botSay(step.q, () =>
    quickReplies(
      step.options.map((o) => ({
        label: o.label,
        next: () => {
          chatAnswers[step.key] = o.value;
          askStep(i + 1);
        },
      }))
    )
  );
}

function finishChat() {
  const { score, label } = scoreLead(chatAnswers);
  const cls = "lead-" + label.toLowerCase();
  track("chatbot_qualified", { score, label, answers: chatAnswers });
  botSay(
    `Done — you look like a <span class="lead-badge ${cls}">${label}</span> lead (score ${score}/6). Here is my advice:`,
    () => route(label)
  );
}

function route(label) {
  const extraTags = ["chatbot", "lead-" + label.toLowerCase()];
  if (chatAnswers.employment) extraTags.push(chatAnswers.employment);
  const purpose = chatAnswers.purpose;

  if (label === "Hot") {
    botSay("You are ready to talk to a broker. Grab a time with Kate — it takes 20 seconds.", () =>
      quickReplies([
        { label: "Book a free 15-min call", next: () => goTo("contact.html#booking") },
        { label: "Call now instead", next: () => goTel() },
      ])
    );
  } else if (label === "Warm") {
    botSay("A pre-approval check would suit you. Leave your name and email and Kate will call within one business day.", () =>
      askFreeText("What is your first name?", (name) =>
        askFreeText("And your best email?", (email) => {
          if (!validEmail(email)) {
            botSay("That email doesn't look right — try again.", () => route("Warm"));
            return;
          }
          const payload = ghlPayload({
            firstName: name, email,
            phone: "", purpose,
            extraTags,
            properties: { from: "chatbot", score: scoreLead(chatAnswers).score, answers: chatAnswers },
            source: CONFIG.source + "/chatbot",
          });
          saveLead(payload);
          logPayload("GoHighLevel (simulated)", payload);
          track("generate_lead", { purpose, from: "chatbot" });
          userSay(name + " · " + email);
          botSay(`Perfect, <strong>${escapeHTML(name)}</strong> — you're in Kate's queue. Watch the Inspector (bottom-left) for the CRM payload.`);
        }, "email")
      )
    );
  } else {
    botSay("Early days? No problem. Most of our clients start with the <strong>First Home Buyer Checklist (PDF)</strong>. Want it sent over?", () =>
      quickReplies([
        { label: "Yes, send the checklist", next: () =>
          askFreeText("Where should I send it?", (email) => {
            if (!validEmail(email)) {
              botSay("That email doesn't look right — try again.", () => route("Cold"));
              return;
            }
            userSay(email);
            newsletterSignup(email, { from: "chatbot", tags: ["lead-magnet", "newsletter", "chatbot-cold"] });
            botSay("On its way! While you wait, the <strong>borrowing power estimator</strong> on the home page takes one minute.");
          }, "email")
        },
        { label: "Not now", next: () => botSay("No worries — I'm here whenever you need me.") },
      ])
    );
  }
}

function askFreeText(question, onAnswer, type) {
  botSay(question, () => {
    chatInputRow.hidden = false;
    chatInput.type = type === "email" ? "email" : "text";
    chatInput.placeholder = type === "email" ? "you@email.com" : "Type your answer…";
    chatInput.focus();
    const handler = () => {
      const val = chatInput.value.trim();
      if (!val) return;
      chatInput.value = "";
      chatInputRow.hidden = true;
      chatInput.removeEventListener("keydown", keyHandler);
      sendBtn.removeEventListener("click", handler);
      onAnswer(val);
    };
    const keyHandler = (e) => { if (e.key === "Enter") handler(); };
    const sendBtn = $("#chat-send", panel);
    chatInput.addEventListener("keydown", keyHandler);
    sendBtn.addEventListener("click", handler);
  });
}

function goTo(page) {
  if (location.pathname.endsWith("contact.html")) {
    const id = page.split("#")[1];
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    location.href = page;
  }
}
function goTel() { location.href = "tel:+61290001234"; }

/* ============================================================
   Newsletter (footer) — simulated Kit / Mailchimp signup
   ============================================================ */
function newsletterSignup(email, opts = {}) {
  const firstName = (opts.firstName || "").trim();
  const payload = {
    integration: "Kit (formerly ConvertKit) — simulated",
    endpoint: "https://api.kit.com/v4/forms/EXAMPLE/subscribe",
    form: opts.form || "first-home-checklist",
    subscriber: { email_address: email, first_name: firstName || null },
    tags: opts.tags || ["lead-magnet", "newsletter"],
    source: CONFIG.source + "/footer",
    createdAt: new Date().toISOString(),
  };
  logPayload("Kit (simulated)", payload);
  track("newsletter_signup", { form: payload.form, tags: payload.tags.join(",") });
  return payload;
}

$$(".newsletter").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailEl = $("input[type=email]", form);
    const nameEl = $("input[name=nl-name]", form);
    const statusEl = $(".nl-status", form);
    if (!emailEl || !validEmail(emailEl.value)) {
      if (statusEl) statusEl.textContent = "Please enter a valid email address.";
      return;
    }
    newsletterSignup(emailEl.value.trim(), {
      firstName: nameEl ? nameEl.value : "",
      tags: ["lead-magnet", "newsletter"],
    });
    form.innerHTML = `<p class="success-card big" role="status">🎉</p><p role="status" style="font-weight:700">Checklist on its way to <span style="color:var(--teal)">${escapeHTML(emailEl.value.trim())}</span>.</p><p class="hint">Tagged as <code>lead-magnet</code> + <code>newsletter</code> in Kit (simulated).</p>`;
  });
});

/* ============================================================
   Enquiry form (contact page) — simulated GoHighLevel lead
   ============================================================ */
const enquiryForm = $("#enquiry-form");
if (enquiryForm) {
  // Pre-fill loan purpose from ?service=
  const svc = new URLSearchParams(location.search).get("service");
  const purposeEl = $("#f-purpose", enquiryForm);
  if (svc && purposeEl && [...purposeEl.options].some((o) => o.value === svc)) {
    purposeEl.value = svc;
    const note = $("#prefill-note");
    if (note) {
      note.hidden = false;
      note.textContent = `Pre-filled from the Services page: ${purposeEl.selectedOptions[0].textContent}. Change it if you like.`;
    }
  }

  function setInvalid(input, msg) {
    const field = input.closest(".field");
    field.classList.add("invalid");
    const err = $(".error", field);
    if (err) err.textContent = msg;
    input.setAttribute("aria-invalid", "true");
  }
  function clearInvalid(input) {
    const field = input.closest(".field");
    field.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
  }

  enquiryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    const name = $("#f-name", enquiryForm);
    const email = $("#f-email", enquiryForm);
    const mobile = $("#f-mobile", enquiryForm);
    const purpose = $("#f-purpose", enquiryForm);
    const consent = $("#f-consent", enquiryForm);
    const amount = $("#f-amount", enquiryForm);
    const time = $("#f-time", enquiryForm);
    const message = $("#f-message", enquiryForm);

    [name, email, mobile, purpose, consent].forEach(clearInvalid);

    if (name.value.trim().length < 2) { setInvalid(name, "Please enter your name."); ok = false; }
    if (!validEmail(email.value)) { setInvalid(email, "Please enter a valid email address."); ok = false; }
    if (!validMobileAU(mobile.value)) { setInvalid(mobile, "Use an Australian mobile, e.g. 0412 345 678."); ok = false; }
    if (!purpose.value) { setInvalid(purpose, "Please choose a loan purpose."); ok = false; }
    if (!consent.checked) {
      setInvalid(consent, "Please tick the consent box so we can contact you."); ok = false;
    }
    if (!ok) {
      const firstBad = $(".field.invalid input, .field.invalid select", enquiryForm);
      if (firstBad) firstBad.focus();
      return;
    }

    const parts = name.value.trim().split(/\s+/);
    const payload = ghlPayload({
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
      email: email.value.trim(),
      phone: normaliseMobileAU(mobile.value),
      purpose: purpose.value,
      extraTags: [],
      properties: {
        loanAmount: amount ? amount.value : "",
        preferredContactTime: time ? time.value : "",
        message: message ? message.value.trim() : "",
      },
      source: CONFIG.source + "/contact",
    });

    saveLead(payload);
    logPayload("GoHighLevel (simulated)", payload);
    track("generate_lead", { purpose: purpose.value, source: "contact-form" });

    $("#enquiry-success").hidden = false;
    $("#enquiry-success").setAttribute("role", "status");
    enquiryForm.hidden = true;
    $("#enquiry-success").scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/* ============================================================
   Booking widget (contact page) — simulated Calendly
   ============================================================ */
const booking = $("#booking");
if (booking) {
  const days = [];
  const d = new Date();
  while (days.length < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.push(new Date(d));
    }
  }
  const fmt = (dt) => dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

  const daysRow = $("#booking-days", booking);
  const slotsWrap = $("#booking-slots", booking);
  const slotLabel = $("#booking-slot-label", booking);
  let chosen = null;

  days.forEach((dt, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "day-tab";
    b.setAttribute("aria-pressed", String(i === 0));
    b.textContent = fmt(dt);
    b.addEventListener("click", () => {
      $$(".day-tab", daysRow).forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      chosen = { day: b.textContent, slot: null };
      renderSlots();
    });
    daysRow.appendChild(b);
  });
  chosen = { day: days[0] ? fmt(days[0]) : "", slot: null };

  function renderSlots() {
    slotsWrap.innerHTML = "";
    CONFIG.slots.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "slot";
      b.textContent = s;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        $$(".slot", slotsWrap).forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        chosen.slot = s;
        slotLabel.textContent = `Selected: ${chosen.day} at ${s}`;
      });
      slotsWrap.appendChild(b);
    });
    slotLabel.textContent = "Pick a time:";
  }
  renderSlots();

  $("#booking-form", booking).addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#b-name", booking);
    const email = $("#b-email", booking);
    $$(".field", booking).forEach((f) => f.classList.remove("invalid"));
    let ok = true;
    if (name.value.trim().length < 2) {
      name.closest(".field").classList.add("invalid"); ok = false;
    }
    if (!validEmail(email.value)) {
      email.closest(".field").classList.add("invalid"); ok = false;
    }
    if (!chosen || !chosen.slot) {
      slotLabel.textContent = "Please pick a time first.";
      slotLabel.style.color = "#B3261E";
      ok = false;
    } else {
      slotLabel.style.color = "";
    }
    if (!ok) return;

    const payload = {
      integration: "Calendly (simulated)",
      link: CONFIG.calendlyUrl,
      eventType: "Free 15-min broker chat",
      name: name.value.trim(),
      email: email.value.trim(),
      date: chosen.day,
      time: chosen.slot,
      timezone: "Australia/Sydney (AEST)",
      createdAt: new Date().toISOString(),
    };
    const bookings = loadJSON(KEYS.bookings, []);
    bookings.push(payload);
    saveJSON(KEYS.bookings, bookings);
    logPayload("Calendly (simulated)", payload);
    track("book_appointment", { date: chosen.day, time: chosen.slot });

    $("#booking-success").hidden = false;
    $("#booking-success").setAttribute("role", "status");
    $("#booking-success-email").textContent = email.value.trim();
    $("#booking-success-when").textContent = `${chosen.day} at ${chosen.slot} AEST`;
    $("#booking-form", booking).hidden = true;
    daysRow.hidden = true;
    slotsWrap.hidden = true;
    slotLabel.hidden = true;
  });
}

/* ============================================================
   Borrowing power estimator (home page)
   ============================================================ */
const calc = $("#calculator");
if (calc) {
  const inputs = ["income", "partner", "expenses", "dependants", "debts"].map((k) => $("#" + k, calc));
  const resultEl = $("#calc-result", calc);
  const sendBox = $("#calc-lead-box", calc);
  let announced = false;

  function num(el) {
    const v = parseFloat(el && el.value);
    return isNaN(v) || v < 0 ? 0 : v;
  }

  function calculate() {
    const [income, partner, expenses, dependants, debts] = inputs.map(num);
    const raw = (((income + partner) * 0.7) / 12 - expenses - debts * 0.03 - dependants * 400) * 12 * 5.2;
    const capped = Math.max(0, raw);
    const rounded = Math.round(capped / 5000) * 5000;
    const value = income + partner === 0 ? 0 : rounded;
    resultEl.textContent = aud.format(value);
    if (!announced && income + partner > 0) {
      announced = true;
      track("calculator_complete", { borrowing_power: value });
    }
    return value;
  }

  inputs.forEach((el) => el && el.addEventListener("input", calculate));
  calculate();

  $("#calc-send", calc).addEventListener("click", () => {
    sendBox.hidden = false;
    $("#calc-lead-name", calc).focus();
  });

  $("#calc-lead-form", calc).addEventListener("submit", (e) => {
    e.preventDefault();
    const nm = $("#calc-lead-name", calc);
    const em = $("#calc-lead-email", calc);
    $$(".field", calc).forEach((f) => f.classList.remove("invalid"));
    let ok = true;
    if (nm.value.trim().length < 2) { nm.closest(".field").classList.add("invalid"); ok = false; }
    if (!validEmail(em.value)) { em.closest(".field").classList.add("invalid"); ok = false; }
    if (!ok) return;

    const value = calculate();
    const payload = ghlPayload({
      firstName: nm.value.trim(),
      email: em.value.trim(),
      phone: "",
      purpose: null,
      extraTags: ["borrowing-power"],
      properties: { indicativeBorrowingPower: value },
      source: CONFIG.source + "/calculator",
    });
    saveLead(payload);
    logPayload("GoHighLevel (simulated)", payload);
    track("generate_lead", { purpose: "calculator", source: "calculator" });

    sendBox.innerHTML = `<p role="status" style="font-weight:700;color:var(--navy)">Thanks, ${escapeHTML(nm.value.trim())}! Kate will send your estimate and next steps.</p>`;
    $("#calc-cta-row", calc).hidden = true;
  });
}

/* ---------- initial render ---------- */
renderInspector();
