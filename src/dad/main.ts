// The /dad parent view (Screens 14, 14B–14E).
//
// Plain DOM on purpose: design/README.md keeps this view off the game skin, and
// a 78-row collapsible table, date state and a CSV download are all ordinary
// HTML. Everything it shows is derived in report.ts, which is pure and tested;
// this file only draws it and writes the two things a parent can change.

import curriculumJson from "../data/curriculum.json";
import scheduleJson from "../data/schedule.json";
import { load, save, type SaveFile } from "../game/save";
import { BOSS_UNLOCKS } from "../data/campaign";
import { fleetEntry } from "../data/fleet";
import type { Schedule } from "../engine/scheduler";
import {
  buildReport, summarise, allRows, toCsv, scheduleRows, activityByDay,
  STRONG_AT, FLAGGED_BELOW,
  type ChapterLite, type RegistrySkillLite, type ReportInput, type SkillRow,
} from "./report";

const curriculum = curriculumJson as unknown as {
  chapters: ChapterLite[];
  skills: RegistrySkillLite[];
};
const schedule = scheduleJson as unknown as Schedule;

type Tab = "heat" | "schedule" | "activity" | "credits";

const TABS: { id: Tab; label: string }[] = [
  { id: "heat", label: "Heat map" },
  { id: "schedule", label: "Schedule" },
  { id: "activity", label: "Activity" },
  { id: "credits", label: "Credits" },
];

/** Chapters a parent has collapsed, by chapter id. Open is the default. */
const collapsed = new Set<string>();
let tab: Tab = "heat";
let honorsOnly = false;
let file: SaveFile = load();

/* ------------------------------------------------------------- elements */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: { class?: string; text?: string; attrs?: Record<string, string> } = {},
  children: (Node | null)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  // textContent, never innerHTML: skill names and error tags are data.
  if (opts.text !== undefined) node.textContent = opts.text;
  for (const [k, v] of Object.entries(opts.attrs ?? {})) node.setAttribute(k, v);
  for (const c of children) if (c) node.append(c);
  return node;
}

const pct = (n: number | null): string => (n === null ? "—" : `${n}%`);

const dateOf = (ts: number | null): string =>
  ts === null ? "—" : new Date(ts).toLocaleDateString(undefined, { dateStyle: "medium" });

function isoToLabel(iso: string): string {
  const t = Date.parse(`${iso}T00:00:00`);
  return Number.isNaN(t) ? iso : new Date(t).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function input(): ReportInput {
  return { file, skills: curriculum.skills, chapters: curriculum.chapters, schedule, now: Date.now() };
}

/** Persist and redraw. The game reads the same key on its next launch. */
function update(next: SaveFile): void {
  file = next;
  save(file);
  render();
}

/* ------------------------------------------------------------- heat map */

function honorsBadge(): HTMLElement {
  return el("span", { class: "d-honors", text: "H", attrs: { title: "Honors · Grade 8" } });
}

function skillRow(row: SkillRow): HTMLElement {
  return el("div", { class: "d-row" }, [
    el("span", { class: "d-skill-id", text: row.id }),
    el("span", { class: "d-skill-name", text: row.name }, []),
    el("span", { class: "d-cell " + row.heat, attrs: { title: heatTitle(row) } }),
    el("span", {
      class: "d-pct" + (row.accuracy === null ? " d-muted" : ""),
      text: row.heat === "unavailable" && row.attempts === 0 ? "—" : pct(row.accuracy),
    }),
    el("span", {
      class: "d-err",
      text: row.topError ? `${row.topError.tag} ×${row.topError.count}` : "",
    }),
  ]);
}

function heatTitle(row: SkillRow): string {
  if (row.heat === "unavailable") return "This chapter has not opened yet";
  if (row.attempts === 0) return "Not attempted yet";
  const basis = row.basis === "first-try"
    ? `${row.firstTryCorrect} of ${row.firstTries} first tries correct`
    : `${row.correct} of ${row.attempts} correct, counting retries`;
  return `${basis} · ${row.attempts} answers in total · ${row.status}`;
}

/** Say which answers the percentages came from, rather than let it be assumed. */
function basisNote(basis: "first-try" | "all-attempts" | null): string {
  if (basis === "first-try") return "Percentages are first-try accuracy: retries after a wrong answer are not counted.";
  if (basis === "all-attempts") return "Percentages count every answer, including retries. These sorties were flown before first tries were recorded.";
  return "Nothing answered yet.";
}

function heatView(): HTMLElement {
  const report = buildReport(input());
  const sum = summarise(report, file);

  const stats = el("div", { class: "d-card" }, [
    el("div", { class: "d-stats" }, [
      stat("Skills online", `${sum.online} / ${sum.total}`),
      stat("Flagged", String(sum.flagged)),
      stat("Not seen yet", String(sum.unseen)),
      stat("Answers logged", String(sum.attempts)),
      stat(sum.basis === "all-attempts" ? "Accuracy (all answers)" : "First-try accuracy", pct(sum.accuracy)),
      stat("Last played", dateOf(sum.lastSeen)),
    ]),
  ]);

  const body = el("div", { class: "d-card" }, [
    el("div", { class: "d-card-head" }, [
      el("div", {}, [
        el("div", { class: "d-card-title", text: `Skill heat map · ${sum.total} sub-skills` }),
        el("div", { class: "d-note", text: basisNote(sum.basis) }),
      ]),
      el("div", { class: "d-legend" }, [
        legend("strong", `Strong ${STRONG_AT}%+`),
        legend("steady", `Steady ${FLAGGED_BELOW}–${STRONG_AT - 1}%`),
        legend("flagged", `Flagged under ${FLAGGED_BELOW}%`),
        legend("unseen", "Not seen"),
        legend("unavailable", "Not open yet"),
      ]),
    ]),
    el("div", { class: "d-card-head" }, [
      el("div", { class: "d-legend" }, [
        button("Collapse all", () => {
          for (const c of curriculum.chapters) collapsed.add(c.id);
          render();
        }),
        button("Expand all", () => { collapsed.clear(); render(); }),
        honorsToggle(),
      ]),
      button("Export CSV", exportCsv),
    ]),
  ]);

  let drew = 0;
  for (const q of report) {
    const chapters = q.chapters
      .map((c) => ({ ...c, skills: honorsOnly ? c.skills.filter((s) => s.honors) : c.skills }))
      .filter((c) => c.skills.length > 0);
    if (chapters.length === 0) continue;

    body.append(el("div", {
      class: "d-quarter",
      text: `Quarter ${q.quarter} · opens ${isoToLabel(q.starts)}`,
    }));

    for (const c of chapters) {
      drew += c.skills.length;
      const shut = collapsed.has(c.chapter);
      const wrap = el("div", { class: "d-chapter", attrs: shut ? {} : { open: "" } });
      const bar = el("button", {
        class: "d-chapter-bar",
        attrs: { "aria-expanded": String(!shut) },
      }, [
        el("span", { class: "d-caret", text: shut ? "▸" : "▾" }),
        el("span", { class: "d-chapter-name", text: `Ch ${c.n} · ${c.name}` }),
        el("span", {
          class: "d-chapter-meta",
          text: `${c.skills.length} skills · ${c.open ? `accuracy ${pct(c.accuracy)}` : "not open yet"}`,
        }),
      ]);
      bar.addEventListener("click", () => {
        if (collapsed.has(c.chapter)) collapsed.delete(c.chapter);
        else collapsed.add(c.chapter);
        render();
      });
      wrap.append(bar);

      if (!shut) {
        const rows = el("div", { class: "d-rows" });
        for (const s of c.skills) {
          const r = skillRow(s);
          if (s.honors) r.querySelector(".d-skill-name")?.append(" ", honorsBadge());
          rows.append(r);
        }
        wrap.append(rows);
      }
      body.append(wrap);
    }
  }

  if (drew === 0) body.append(el("div", { class: "d-empty", text: "No skills match that filter." }));

  return el("div", {}, [stats, el("div", { attrs: { style: "height:16px" } }), body]);
}

function legend(kind: string, label: string): HTMLElement {
  return el("span", {}, [el("span", { class: "d-cell " + kind }), el("span", { text: label })]);
}

function honorsToggle(): HTMLElement {
  const b = button(honorsOnly ? "Showing honors only" : "Honors only", () => {
    honorsOnly = !honorsOnly;
    render();
  });
  if (honorsOnly) b.classList.add("primary");
  b.prepend(honorsBadge(), document.createTextNode(" "));
  return b;
}

function stat(label: string, value: string): HTMLElement {
  return el("div", {}, [
    el("div", { class: "d-stat-label", text: label }),
    el("div", { class: "d-stat-value", text: value }),
  ]);
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", { class: "d-btn", text: label });
  b.addEventListener("click", onClick);
  return b;
}

/* -------------------------------------------------------------- export */

function exportCsv(): void {
  const csv = toCsv(allRows(buildReport(input())));
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = el("a", { attrs: { href: url, download: `mach-ops-${file.callsign.toLowerCase()}.csv` } });
  document.body.append(a);
  a.click();
  a.remove();
  // Revoking immediately can beat the download on some browsers; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------ schedule */

function scheduleView(): HTMLElement {
  const rows = scheduleRows(input(), curriculum.chapters, BOSS_UNLOCKS);

  const table = el("table", { class: "d-table" });
  const head = el("tr", {}, [
    el("th", { text: "Chapter" }),
    el("th", { text: "Opens" }),
    el("th", { text: "Earns" }),
    el("th", { text: "State" }),
    el("th", { text: "Override" }),
  ]);
  table.append(el("thead", {}, [head]));

  const body = el("tbody");
  for (const r of rows) {
    const forced = r.overridden;
    const pill = el("span", {
      class: "d-pill" + (forced ? " forced" : r.open ? " open" : ""),
      text: forced ? (r.open ? "Forced open" : "Forced shut") : r.open ? "Open" : `Opens ${isoToLabel(r.opens)}`,
    });

    const controls = el("div", { class: "d-legend" }, [
      button(r.open ? "Close now" : "Open now", () => {
        update({ ...file, scheduleOverrides: { ...file.scheduleOverrides, [r.unit.id]: !r.open } });
      }),
      forced
        ? button("Clear", () => {
            const next = { ...file.scheduleOverrides };
            delete next[r.unit.id];
            update({ ...file, scheduleOverrides: next });
          })
        : null,
    ]);

    body.append(el("tr", {}, [
      el("td", { text: `Ch ${r.unit.id.replace("ch", "")} · ${r.chapterName}` }),
      el("td", { text: isoToLabel(r.opens) }),
      el("td", { text: r.earns ? (fleetEntry(r.earns)?.designation ?? r.earns) : "—" }),
      el("td", {}, [pill]),
      el("td", {}, [controls]),
    ]));
  }
  table.append(body);

  const toggles = el("div", { class: "d-card" }, [
    el("div", { class: "d-card-head" }, [el("div", { class: "d-card-title", text: "Rules" })]),
    el("div", { class: "d-toggles" }, [
      checkbox(
        "Honors work is required to fly a boss sortie",
        "Off by default. Honors skills are Grade 8 work sitting inside Grade 7 chapters; leaving this off means they earn extra credits but never block progress.",
        file.parentToggles.honorsRequiredForBoss,
        (on) => update({ ...file, parentToggles: { ...file.parentToggles, honorsRequiredForBoss: on } }),
      ),
      checkbox(
        "Passing a boss opens the next chapter early",
        "On, a chapter opens as soon as the previous boss is passed, without waiting for its date.",
        file.parentToggles.allowEarlyUnlockOnBossPass,
        (on) => update({ ...file, parentToggles: { ...file.parentToggles, allowEarlyUnlockOnBossPass: on } }),
      ),
    ]),
  ]);

  return el("div", {}, [
    el("div", { class: "d-card" }, [
      el("div", { class: "d-card-head" }, [
        el("div", { class: "d-card-title", text: "Chapter schedule" }),
        el("div", { class: "d-note", text: "Dates come from schedule.json. An override here wins until you clear it." }),
      ]),
      table,
    ]),
    el("div", { attrs: { style: "height:16px" } }),
    toggles,
  ]);
}

function checkbox(label: string, note: string, on: boolean, onChange: (on: boolean) => void): HTMLElement {
  const box = el("input", { attrs: { type: "checkbox" } });
  box.checked = on;
  box.addEventListener("change", () => onChange(box.checked));
  const id = `t-${label.replace(/\W+/g, "-").toLowerCase()}`;
  box.id = id;
  return el("div", { class: "d-toggle" }, [
    box,
    el("div", {}, [
      el("label", { text: label, attrs: { for: id } }),
      el("div", { class: "d-toggle-note", text: note }),
    ]),
  ]);
}

/* ------------------------------------------------------------ activity */

function activityView(): HTMLElement {
  const days = activityByDay(file.log);
  const card = el("div", { class: "d-card" }, [
    el("div", { class: "d-card-head" }, [
      el("div", { class: "d-card-title", text: "Activity by day" }),
      el("div", { class: "d-note", text: `${file.sortiesFlown} sorties flown in total` }),
    ]),
  ]);

  if (days.length === 0) {
    card.append(el("div", { class: "d-empty", text: "Nothing answered yet." }));
    return card;
  }

  const table = el("table", { class: "d-table" });
  table.append(el("thead", {}, [el("tr", {}, [
    el("th", { text: "Day" }),
    el("th", { text: "Answers" }),
    el("th", { text: "Correct" }),
    el("th", { text: "Accuracy" }),
    el("th", { text: "Skills touched" }),
  ])]));
  const body = el("tbody");
  for (const d of days) {
    body.append(el("tr", {}, [
      el("td", { text: isoToLabel(d.day) }),
      el("td", { text: String(d.attempts) }),
      el("td", { text: String(d.correct) }),
      el("td", { text: `${Math.round((d.correct / d.attempts) * 100)}%` }),
      el("td", { text: String(d.skills) }),
    ]));
  }
  table.append(body);
  card.append(table);
  return card;
}

/* ------------------------------------------------------------- credits */

function creditsView(): HTMLElement {
  return el("div", { class: "d-card d-credits" }, [
    el("div", { class: "d-card-title", text: "Credits and attribution" }),

    el("h3", { text: "Curriculum" }),
    el("p", { text: "Skills and standards follow the Tennessee Grade 7 math standards, with Grade 8 skills badged as honors. Chapter order follows the FSD Honors Math 7 sequence." }),

    el("h3", { text: "Aircraft figures" }),
    el("p", { text: "Every dimension on the fleet spec sheet comes from US government fact sheets published by the USAF, NAVAIR, NASA and the National Museum of the United States Air Force, as audited in design/accuracy-check.md. Where a fact sheet gives no figure, the game shows a dash rather than a guess." }),

    el("h3", { text: "Lesson links" }),
    el("p", { text: "The Flight Manual links out to Khan Academy, which is a separate free non-profit and is not affiliated with this game." }),

    el("h3", { text: "Typefaces" }),
    el("p", { text: "Chakra Petch and IBM Plex, both under the SIL Open Font License 1.1. They are self-hosted so the game works offline." }),

    el("h3", { text: "Sound" }),
    el("p", { text: "Every cue is synthesised in the browser with the Web Audio API. No audio files ship with the game." }),

    el("h3", { text: "Your data" }),
    el("p", { text: "Everything this page shows is stored in this browser only, under the key machops.save.v1. Nothing is sent anywhere. Export CSV writes a copy to your downloads; clearing the browser's site data erases the pilot." }),
  ]);
}

/* -------------------------------------------------------------- render */

function emptyState(): HTMLElement {
  return el("div", { class: "d-card" }, [
    el("div", { class: "d-card-title", text: "Nothing to report yet" }),
    el("p", { class: "d-note", text: "This page fills in once the pilot has answered something. Open the game, fly a sortie, then come back." }),
    el("p", {}, [linkToGame()]),
  ]);
}

function linkToGame(): HTMLElement {
  return el("a", { class: "d-btn", text: "Back to the game", attrs: { href: "/" } });
}

function render(): void {
  const root = document.getElementById("dad");
  if (!root) return;
  root.replaceChildren();

  const tabs = el("div", { class: "d-tabs" });
  for (const t of TABS) {
    const b = el("button", {
      class: "d-tab",
      text: t.label,
      attrs: { "aria-current": String(t.id === tab) },
    });
    b.addEventListener("click", () => { tab = t.id; render(); });
    tabs.append(b);
  }
  tabs.append(linkToGame());

  root.append(el("div", { class: "d-head" }, [
    el("div", {}, [
      el("h1", { class: "d-title", text: `Mach Ops · ${file.callsign}` }),
      el("div", { class: "d-sub", text: "Parent view. Everything here is read from this browser." }),
    ]),
    tabs,
  ]));

  const nothingYet = file.log.length === 0 && file.sortiesFlown === 0;
  if (nothingYet && tab !== "credits" && tab !== "schedule") {
    root.append(emptyState());
    return;
  }

  root.append(
    tab === "heat" ? heatView()
      : tab === "schedule" ? scheduleView()
        : tab === "activity" ? activityView()
          : creditsView(),
  );
}

render();
