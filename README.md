# Course Study Plan

A zero-build static web app that turns a two-month content plan for parent WhatsApp groups (NIS / BIL entrance-exam
preparation, grade 6) into a day-by-day dashboard: what to post, when, in which language, with one-click copy.

## Features

- Day strip (Nov – Dec) with "today" highlighting, prev/next buttons and ← / → keyboard navigation.
- Two audiences: a Kazakh group and a Russian group; one toggle switches every message to the right language.
- Message cards by type (announcement, info, poll, "problem of the week", answer, tip, FAQ, offer) with
  scheduled time and owner.
- One-click copy of message text; WhatsApp polls are rendered as a question plus separate copyable options.
- "Sent" marks stored per group in `localStorage`, so progress survives reloads on the same device.
- Placeholders in `[square brackets]` are highlighted in yellow so nothing half-filled is sent by mistake.
- Panels with group name/description, setup checklist and open questions.
- Test any date with a query parameter: `?date=2026-11-12`.

## Tech stack

- Plain HTML, CSS and vanilla JavaScript (ES2020+), no framework, no build step
- All content in a single data file (`data.js`)
- Optional `vercel.json` with `noindex` and no-cache headers for static hosting

## Project structure

```
index.html   page skeleton and static rules panel
styles.css   layout, cards, day strip, toast
app.js       rendering, date logic, copy-to-clipboard, "sent" state in localStorage
data.js      all messages (kk + ru), polls, group description, open questions
vercel.json  optional static-hosting headers
```

## How to run

No install needed. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
# then open http://localhost:8000/?date=2026-11-12
```

All data in this repository is randomly generated; brand names are anonymized.
The course name («Орбита»), brand (`EduApp`, `eduapp.example.com`), contacts and staff names are fictional;
public exam facts (NIS / BIL, eGov.kz, bilemtihan.kz) are kept for realism.

## Қысқаша (KZ)

НЗМ мен БИЛ-ге дайындық бойынша ата-аналардың WhatsApp топтарына арналған хабарламалар жоспары.
Құрастыру қажет емес: таза HTML, CSS және JavaScript, барлық мәтін `data.js` файлында.
Қазақ және орыс тобы бөлек, мәтінді бір батырмамен көшіріп, «Жіберілді» деп белгілеуге болады.
Іске қосу: `index.html` файлын браузерде ашыңыз. Бренд пен байланыс деректері ойдан алынған.
