(function () {
  const TYPE_LABELS = {
    telegram: "Telegram арнаға",
    notice: "Бекітілетін хабарлама",
    info: "НЗМ / БИЛ ақпарат",
    poll: "Сауалнама",
    problem: "Аптаның есебі",
    answer: "Жауап",
    tip: "Кеңес",
    faq: "Жиі сұрақ",
    offer: "Курс туралы",
    reminder: "Еске салу",
  };
  const MONTHS = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
  const MONTHS_SHORT = ["қаң", "ақп", "нау", "сәу", "мам", "мау", "шіл", "там", "қыр", "қаз", "қар", "жел"];
  const WEEKDAYS = ["жексенбі", "дүйсенбі", "сейсенбі", "сәрсенбі", "бейсенбі", "жұма", "сенбі"];
  const WEEKDAYS_SHORT = ["Жс", "Дс", "Сс", "Ср", "Бс", "Жм", "Сб"];

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    },
  };

  function realToday() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  const dateParam = new URLSearchParams(location.search).get("date");
  const testMode = Boolean(dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam));
  const TODAY = testMode ? dateParam : realToday();

  // Two WhatsApp groups: each gets the same plan, only in its own language.
  const LANGS = { kk: "Қазақ тобы", ru: "Орыс тобы" };
  let lang = store.get("nzm.lang", "kk");
  if (!LANGS[lang]) lang = "kk";
  const sent = store.get("nzm.sent", {});
  let selected = TODAY;

  function parse(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function daysBetween(a, b) {
    return Math.round((parse(b) - parse(a)) / 86400000);
  }

  function toIso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Every day from the group's first message to its last, including days with nothing to send.
  function allDates(list) {
    if (!list.length) return [];
    const out = [];
    const end = list[list.length - 1].date;
    for (let d = parse(list[0].date); toIso(d) <= end; d.setDate(d.getDate() + 1)) out.push(toIso(d));
    return out;
  }

  // Monday of the week that contains the given date.
  function weekStart(iso) {
    const d = parse(iso);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return toIso(d);
  }

  function fullDate(iso) {
    const d = parse(iso);
    return d.getDate() + " " + MONTHS[d.getMonth()] + ", " + WEEKDAYS[d.getDay()];
  }

  function sentKey(m) {
    return m.id + ":" + lang;
  }

  function isSent(m) {
    if (Object.prototype.hasOwnProperty.call(sent, sentKey(m))) return sent[sentKey(m)];
    return Boolean(m.sentDefault);
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function highlight(s) {
    return escapeHtml(s).replace(/\[[^\]]+\]/g, (x) => "<mark>" + x + "</mark>");
  }

  function hasPlaceholder(m) {
    const text = m.poll ? m.poll[lang].q + " " + m.poll[lang].options.join(" ") : m[lang] || "";
    return /\[[^\]]+\]/.test(text);
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "text") node.textContent = v;
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v);
      }
    }
    (children || []).forEach((c) => c && node.appendChild(c));
    return node;
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function copy(text, msg) {
    const done = () => toast(msg || "Көшірілді");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("Көшіру мүмкін болмады, мәтінді қолмен белгілеңіз"); }
    ta.remove();
  }

  function groupList() {
    return MESSAGES.slice().sort((a, b) => a.date.localeCompare(b.date));
  }

  function renderChips(list) {
    const box = document.getElementById("days");
    box.replaceChildren();
    allDates(list).forEach((iso) => {
      const d = parse(iso);
      const msgs = list.filter((m) => m.date === iso);
      const cls = ["chip"];
      if (iso < TODAY) cls.push("is-past");
      if (iso === TODAY) cls.push("is-today");
      if (iso === selected) cls.push("is-selected");
      if (!msgs.length) cls.push("is-empty");
      else if (msgs.every(isSent)) cls.push("is-sent");
      const chip = el("button", {
        type: "button",
        class: cls.join(" "),
        "data-date": iso,
        "aria-label": fullDate(iso) + (iso === TODAY ? ", бүгін" : "") + (msgs.length ? "" : ", хабарлама жоқ"),
        "aria-current": iso === selected ? "date" : "false",
        onclick: () => { selected = iso; render(); },
      }, [
        el("span", { class: "wd", text: iso === TODAY ? "Бүгін" : WEEKDAYS_SHORT[d.getDay()] }),
        el("span", { class: "dn", text: String(d.getDate()) }),
        el("span", { class: "mo", text: MONTHS_SHORT[d.getMonth()] }),
      ]);
      box.appendChild(chip);
    });
    const current = box.querySelector(".is-selected");
    if (current) current.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function renderMessage(m) {
    const card = el("article", { class: "card" });

    const top = el("div", { class: "card-top" }, [
      el("div", {}, [
        el("span", { class: "badge", "data-type": m.type, text: TYPE_LABELS[m.type] || m.type }),
        el("h3", { class: "card-title", text: m.title }),
        el("p", { class: "card-meta", text: "Уақыты: " + m.time + (m.who ? " · Жауапты: " + m.who : "") }),
      ]),
      isSent(m) ? el("span", { class: "sent-pill", text: "Жіберілді" }) : null,
    ]);
    card.appendChild(top);

    if (m.poll) {
      const poll = m.poll[lang];
      card.appendChild(el("p", { class: "hint", text: "WhatsApp-та: қағаз қыстырғыш белгісі → «Сауалнама». Сұрақ пен әр нұсқаны жеке көшіріп қойыңыз." }));
      const bubble = el("div", { class: "bubble" }, [
        el("p", { class: "bubble-label", text: "САУАЛНАМА · " + LANGS[lang].toUpperCase() }),
        el("div", { class: "poll-q-row" }, [
          el("p", { class: "poll-q", text: poll.q }),
          el("button", { class: "btn small", type: "button", text: "Көшіру", onclick: () => copy(poll.q, "Сұрақ көшірілді") }),
        ]),
      ]);
      poll.options.forEach((o, i) => {
        bubble.appendChild(el("div", { class: "poll-row" }, [
          el("span", { class: "radio", "aria-hidden": "true" }),
          el("span", { class: "txt", text: o }),
          el("button", { class: "btn small", type: "button", text: "Көшіру", onclick: () => copy(o, (i + 1) + "-нұсқа көшірілді") }),
        ]));
      });
      card.appendChild(bubble);
    } else {
      const placeholder = hasPlaceholder(m);
      card.appendChild(el("div", { class: "actions" }, [
        el("button", { class: "btn primary", type: "button", text: "Көшіру (" + LANGS[lang].toLowerCase() + ")", onclick: () => copy(m[lang], placeholder ? "Көшірілді. Сары жерлерді толтыруды ұмытпаңыз" : "Көшірілді") }),
      ]));
      if (placeholder) {
        card.appendChild(el("div", { class: "box warn", text: "Сары түспен белгіленген жерлерді жібермес бұрын толтырыңыз немесе өшіріңіз." }));
      }
      card.appendChild(el("div", { class: "bubble" }, [
        el("p", { class: "bubble-label", text: LANGS[lang].toUpperCase() + "НДА ОСЫЛАЙ КӨРІНЕДІ" }),
        el("p", { class: "text", html: highlight(m[lang]) }),
      ]));
    }

    if (m.attach) {
      card.appendChild(el("div", { class: "box attach" }, [el("b", { text: "Тіркеме" }), el("span", { text: m.attach })]));
    }
    if (m.note) {
      card.appendChild(el("div", { class: "box note" }, [el("b", { text: "Ескерту" }), el("span", { text: m.note })]));
    }
    if (m.extra) {
      const ex = m.extra;
      card.appendChild(el("div", { class: "extra" }, [
        el("p", { class: "extra-title", text: ex.title }),
        ex.hint ? el("p", { class: "hint", text: ex.hint }) : null,
        el("div", { class: "actions" }, [
          el("button", { class: "btn primary", type: "button", text: "Көшіру", onclick: () => copy(ex[lang], "Жеке хабарлама көшірілді") }),
        ]),
        el("div", { class: "bubble private" }, [
          el("p", { class: "bubble-label", text: "ЖЕКЕ ХАБАРЛАМА" }),
          el("p", { class: "text", html: highlight(ex[lang]) }),
        ]),
      ]));
    }

    const on = isSent(m);
    card.appendChild(el("button", {
      type: "button",
      class: "sent-btn" + (on ? " is-on" : ""),
      text: on ? "Жіберілді ✓ (белгіні алу)" : "Жіберілді деп белгілеу",
      onclick: () => {
        sent[sentKey(m)] = !isSent(m);
        store.set("nzm.sent", sent);
        toast(sent[sentKey(m)] ? "Жіберілді деп белгіленді (" + LANGS[lang].toLowerCase() + ")" : "Белгі алынды");
        render();
      },
    }));
    return card;
  }

  function render() {
    document.querySelectorAll(".switch button").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.lang === lang));
    });
    renderInfo();

    const list = groupList();
    const dates = allDates(list);

    renderChips(list);

    document.getElementById("day-title").textContent = fullDate(selected);
    const when = selected === TODAY ? "Бүгін" : selected < TODAY ? "Өткен күн" : "Алдағы күн";
    const week = dates.length ? Math.floor(daysBetween(weekStart(dates[0]), selected) / 7) + 1 : 0;
    document.getElementById("day-sub").textContent = when + (week > 0 ? " · " + week + "-апта" : "");

    const prevDate = [...dates].reverse().find((d) => d < selected);
    const nextDate = dates.find((d) => d > selected);
    const prev = document.getElementById("prev");
    const next = document.getElementById("next");
    prev.disabled = !prevDate;
    next.disabled = !nextDate;
    prev.onclick = () => { if (prevDate) { selected = prevDate; render(); } };
    next.onclick = () => { if (nextDate) { selected = nextDate; render(); } };

    const view = document.getElementById("day-view");
    view.replaceChildren();
    const msgs = list.filter((m) => m.date === selected);
    if (msgs.length) {
      msgs.forEach((m) => view.appendChild(renderMessage(m)));
    } else {
      const children = [el("p", { text: "Бұл күні топқа ештеңе жіберілмейді 🙂" })];
      const nextMsgDate = list.map((m) => m.date).find((d) => d > selected);
      if (nextMsgDate) {
        children.push(el("button", { class: "btn", type: "button", text: "Келесі хабарлама: " + fullDate(nextMsgDate), onclick: () => { selected = nextMsgDate; render(); } }));
      }
      view.appendChild(el("div", { class: "empty" }, children));
    }

    const banner = document.getElementById("test-banner");
    if (testMode) {
      banner.hidden = false;
      banner.innerHTML = "Тексеру режимі: бүгінгі күн орнына " + escapeHtml(fullDate(TODAY)) + " көрсетіліп тұр. <a href=\"./\">Нақты бүгінгі күнге оралу</a>";
    }

    window.__navTo = { prevDate, nextDate };
  }

  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    const nav = window.__navTo || {};
    if (e.key === "ArrowLeft" && nav.prevDate) { selected = nav.prevDate; render(); }
    if (e.key === "ArrowRight" && nav.nextDate) { selected = nav.nextDate; render(); }
  });

  function renderInfo() {
    const info = document.getElementById("group-info");
    info.replaceChildren();
    info.appendChild(el("p", { class: "hint", text: LANGS[lang] + ". WhatsApp-та: топ атауын басыңыз → «Топ сипаттамасы». Атауы мен сипаттамасын жеке көшіріп қойыңыз." }));
    info.appendChild(el("div", { class: "actions" }, [
      el("button", { class: "btn", type: "button", text: "Атауын көшіру", onclick: () => copy(GROUP_NAMES[lang], "Топ атауы көшірілді") }),
      el("button", { class: "btn primary", type: "button", text: "Сипаттаманы көшіру", onclick: () => copy(GROUP_INFO[lang], "Сипаттама көшірілді. Сары жерлерді толтыруды ұмытпаңыз") }),
    ]));
    info.appendChild(el("div", { class: "bubble" }, [
      el("p", { class: "bubble-label", text: GROUP_NAMES[lang].toUpperCase() }),
      el("p", { class: "text", html: highlight(GROUP_INFO[lang]) }),
    ]));
    info.appendChild(el("p", { class: "extra-title", text: "Топтарды баптау" }));
    info.appendChild(el("ul", { class: "plain-list" }, GROUP_SETUP.map((s) => el("li", {}, [
      el("b", { text: s.title + ": " }),
      el("span", { html: highlight(s.text) }),
    ]))));
  }

  document.querySelectorAll(".switch button").forEach((b) => {
    b.addEventListener("click", () => {
      lang = b.dataset.lang;
      store.set("nzm.lang", lang);
      render();
    });
  });

  const q = document.getElementById("questions");
  OPEN_QUESTIONS.forEach((t) => q.appendChild(el("li", { text: t })));

  render();
})();
