const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout  = "LAYOUT_16x9";
pres.author  = "Dmytro Zubyk";
pres.title   = "Information System for Automated Student Attendance Tracking Using Computer Vision";

// ── Palette (light theme) ────────────────────────────────────────────────────
const C = {
  white:   "FFFFFF",
  bg:      "FFFFFF",       // slide background — pure white
  navy:    "0F2044",       // primary headings / dark text
  blue:    "1D4ED8",       // primary accent
  blueLt:  "DBEAFE",       // light blue fill for cards
  teal:    "0D9488",       // secondary accent
  tealLt:  "CCFBF1",
  purple:  "7C3AED",
  purpleLt:"EDE9FE",
  amber:   "D97706",
  amberLt: "FEF3C7",
  green:   "059669",
  greenLt: "D1FAE5",
  red:     "DC2626",
  redLt:   "FEE2E2",
  text:    "1E293B",       // body text
  sub:     "475569",       // secondary text
  muted:   "94A3B8",       // muted/caption
  border:  "E2E8F0",       // card borders
  borderMd:"CBD5E1",
};

const makeShadow = () => ({
  type: "outer", blur: 10, offset: 3, angle: 135,
  color: "0F2044", opacity: 0.08,
});

// ── Card helper ──────────────────────────────────────────────────────────────
function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: opts.fill || C.white },
    line: { color: opts.border || C.border, width: opts.glow ? 1.5 : 0.8 },
    shadow: makeShadow(),
  });
  if (opts.glow) {
    // extra thin colored border on top to simulate "active" card
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w, h: 0.05,
      fill: { color: opts.glow }, line: { color: opts.glow },
    });
  }
}

// ── Pill / tag ───────────────────────────────────────────────────────────────
function pill(slide, x, y, label, bgColor, txtColor) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: 1.5, h: 0.27, fill: { color: bgColor },
    line: { color: bgColor }, rectRadius: 0.06,
  });
  slide.addText(label, {
    x, y, w: 1.5, h: 0.27,
    fontSize: 8, bold: true, color: txtColor || C.white,
    align: "center", valign: "middle", fontFace: "Calibri", margin: 0,
  });
}

// ── Thin accent top-bar on card ──────────────────────────────────────────────
function accentBar(slide, x, y, w, color) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h: 0.05, fill: { color }, line: { color },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };  // title slide stays dark — classic "sandwich"

  // Diagonal decorative shape (light)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.2, y: -0.5, w: 5, h: 7,
    fill: { color: "162D54", transparency: 0 }, line: { color: "162D54" },
  });
  // Blue accent left bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.blue }, line: { color: C.blue },
  });

  s.addText(
    "Information System for\nAutomated Student Attendance Tracking\nUsing Computer Vision Technologies",
    {
      x: 0.5, y: 0.55, w: 8.8, h: 2.5,
      fontSize: 28, bold: true, color: C.white,
      fontFace: "Calibri", align: "left", valign: "bottom",
    }
  );

  // Thin white rule
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.18, w: 2.4, h: 0.04,
    fill: { color: C.blue }, line: { color: C.blue },
  });

  s.addText("Bachelor's Qualification Work  ·  Specialty 122 — Computer Science", {
    x: 0.5, y: 3.3, w: 8.8, h: 0.38,
    fontSize: 12, color: "94A3B8", fontFace: "Calibri",
  });

  s.addText([
    { text: "Student: ",    options: { color: "64748B" } },
    { text: "Dmytro Zubyk", options: { color: C.white, bold: true } },
  ], { x: 0.5, y: 3.82, w: 5, h: 0.35, fontSize: 13, fontFace: "Calibri" });

  s.addText([
    { text: "Supervisor: ", options: { color: "64748B" } },
    { text: "PhD Assist. Petro Lyashchynskyi", options: { color: "CBD5E1" } },
  ], { x: 0.5, y: 4.18, w: 6, h: 0.35, fontSize: 12, fontFace: "Calibri" });

  s.addText("Lviv Polytechnic National University  ·  2026", {
    x: 0.5, y: 5.2, w: 6, h: 0.3,
    fontSize: 10, color: "475569", fontFace: "Calibri",
  });
}

// ── SLIDE HEADER helper (for all light slides) ───────────────────────────────
function slideHeader(s, title) {
  s.background = { color: C.bg };
  s.addText(title, {
    x: 0.4, y: 0.18, w: 9.2, h: 0.52,
    fontSize: 26, bold: true, color: C.navy, fontFace: "Calibri",
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 0.74, w: 9.2, h: 0.03,
    fill: { color: C.border }, line: { color: C.border },
  });
  // small colored dot next to title
  s.addShape(pres.shapes.OVAL, {
    x: 0.26, y: 0.3, w: 0.1, h: 0.1,
    fill: { color: C.blue }, line: { color: C.blue },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Relevance
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Relevance");

  // Problem card
  card(s, 0.4, 0.9, 5.55, 3.9);
  accentBar(s, 0.4, 0.9, 5.55, C.blue);
  s.addText("The Problem", {
    x: 0.62, y: 1.0, w: 5.1, h: 0.36,
    fontSize: 13, bold: true, color: C.blue, fontFace: "Calibri",
  });

  const problems = [
    "Manual roll call in groups of 25–30 takes 5–15 min per lecture",
    "Paper journals are prone to loss and manipulation",
    "RFID / QR code systems require hardware or are easily spoofed",
    "No contactless, hardware-free automated solution exists",
  ];
  s.addText(
    problems.map((t, i) => ({
      text: t,
      options: { bullet: { char: "›" }, color: C.text, breakLine: i < problems.length - 1, paraSpaceAfter: 10 },
    })),
    { x: 0.62, y: 1.44, w: 5.1, h: 3.1, fontSize: 13, fontFace: "Calibri" }
  );

  // Stat cards
  const stats = [
    { val: "15 min",  label: "wasted per lecture\non manual roll call",    bg: C.redLt,   txt: C.red   },
    { val: "0%",      label: "extra hardware\ninvestment needed",           bg: C.greenLt, txt: C.green },
    { val: ">99%",    label: "CNN accuracy on\nLFW benchmark",              bg: C.blueLt,  txt: C.blue  },
  ];
  stats.forEach((st, i) => {
    const y = 0.9 + i * 1.35;
    card(s, 6.2, y, 3.35, 1.2, { fill: st.bg });
    s.addText(st.val,   { x: 6.2, y: y + 0.06, w: 3.35, h: 0.62, fontSize: 30, bold: true, color: st.txt, align: "center", fontFace: "Calibri" });
    s.addText(st.label, { x: 6.2, y: y + 0.72, w: 3.35, h: 0.4,  fontSize: 10, color: C.sub,  align: "center", fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Research Parameters
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Research Parameters");

  const boxes = [
    { label: "OBJECT",  accent: C.blue,   bg: C.blueLt,   text: "Student attendance tracking processes in higher education institutions" },
    { label: "SUBJECT", accent: C.purple, bg: C.purpleLt, text: "Methods for automating attendance using face recognition and client-server architecture" },
    { label: "GOAL",    accent: C.teal,   bg: C.tealLt,   text: "Design and implement a practical, contactless automated attendance system for real university environments" },
  ];

  boxes.forEach((b, i) => {
    const y = 0.9 + i * 1.32;
    card(s, 0.4, y, 9.2, 1.18, { fill: b.bg, border: b.accent });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 0.07, h: 1.18, fill: { color: b.accent }, line: { color: b.accent } });
    pill(s, 0.65, y + 0.1, b.label, b.accent);
    s.addText(b.text, { x: 0.65, y: y + 0.46, w: 8.8, h: 0.64, fontSize: 13.5, color: C.text, fontFace: "Calibri" });
  });

  s.addText(
    "Key Objectives: Analyse existing approaches  ·  Review CV methods  ·  Design microservices architecture  ·  Implement & test",
    { x: 0.4, y: 5.1, w: 9.2, h: 0.35, fontSize: 10.5, color: C.muted, italic: true, fontFace: "Calibri", align: "center" }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Existing Approaches
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Analysis of Existing Approaches");

  const hOpts = { bold: true, color: C.navy, fontSize: 11, fontFace: "Calibri", align: "center", valign: "middle" };
  const cOpts = { fontSize: 11, color: C.text, fontFace: "Calibri", align: "center", valign: "middle" };

  const rows = [
    [
      { text: "Approach",       options: { ...hOpts, fill: { color: C.navy }, color: C.white, align: "left"  } },
      { text: "Accuracy",       options: { ...hOpts, fill: { color: C.navy }, color: C.white } },
      { text: "Speed",          options: { ...hOpts, fill: { color: C.navy }, color: C.white } },
      { text: "Cost",           options: { ...hOpts, fill: { color: C.navy }, color: C.white } },
      { text: "Anti-spoofing",  options: { ...hOpts, fill: { color: C.navy }, color: C.white } },
      { text: "Special HW",     options: { ...hOpts, fill: { color: C.navy }, color: C.white } },
    ],
    ["RFID / NFC",             "High",      "High",   "Medium",      "Low ✗",    "Yes ✗"],
    ["Fingerprint",            "Very High", "Medium", "High",        "High ✓",   "Yes ✗"],
    [
      { text: "Face Recognition ✓", options: { ...cOpts, bold: true, color: C.blue, align: "left", fill: { color: C.blueLt } } },
      { text: "High",    options: { ...cOpts, fill: { color: C.blueLt } } },
      { text: "High",    options: { ...cOpts, fill: { color: C.blueLt } } },
      { text: "Low ✓",   options: { ...cOpts, color: C.green, fill: { color: C.blueLt } } },
      { text: "High ✓",  options: { ...cOpts, color: C.green, fill: { color: C.blueLt } } },
      { text: "No ✓",    options: { ...cOpts, color: C.green, fill: { color: C.blueLt } } },
    ],
    ["QR Code",                "Medium",    "High",   "Low",         "Low ✗",    "No"],
    ["Commercial SaaS",        "Very High", "High",   "Very High ✗", "High",     "Partial"],
  ];

  const styledRows = rows.map((row, ri) => row.map((cell, ci) => {
    if (ri === 0 || ri === 3) return cell;
    const fill = ri % 2 === 0 ? "F8FAFC" : C.white;
    return {
      text: typeof cell === "string" ? cell : cell.text,
      options: {
        ...cOpts,
        fill: { color: fill },
        align: ci === 0 ? "left" : "center",
        color: typeof cell === "string" && (cell.includes("✗") ? C.red : cell.includes("✓") ? C.green : C.text) || C.text,
      },
    };
  }));

  s.addTable(styledRows, {
    x: 0.4, y: 0.88, w: 9.2, h: 4.5,
    border: { pt: 0.6, color: C.borderMd },
    colW: [2.4, 1.35, 1.15, 1.15, 1.55, 1.6],
    rowH: 0.64,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Competitor Software
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Competitor Software Analysis");

  const competitors = [
    { name: "Classter / Moodle",         type: "LMS + Attendance",            pros: "Rich feature set, university-grade",          cons: "No face recognition, manual input, high licence cost",              hl: false },
    { name: "RecFaces / Face++",          type: "Commercial Face Recognition", pros: "State-of-the-art accuracy",                   cons: "GPU servers required, SaaS only, GDPR concerns, very expensive",   hl: false },
    { name: "Eigenfaces-based solutions", type: "Research prototypes",         pros: "No GPU needed, open source",                  cons: "F1 = 74–84% — insufficient for real-world use",                    hl: false },
    { name: "DeepFace / FaceNet",         type: "Open-source library",         pros: "Recall 97.3% — highest accuracy",             cons: "8–12 s model load, GPU dependency, no full-stack solution",         hl: false },
    { name: "Our System  ✦",              type: "This work",                   pros: "Precision 100%, Recall 96%, FPR 0%, no GPU",  cons: "Recall 75–83% in poor lighting (manual override available)",        hl: true  },
  ];

  competitors.forEach((c, i) => {
    const y = 0.9 + i * 0.9;
    card(s, 0.4, y, 9.2, 0.82, { fill: c.hl ? C.blueLt : C.white, glow: c.hl ? C.blue : null });
    s.addText(c.name, { x: 0.62, y: y + 0.08, w: 2.2, h: 0.3, fontSize: 12, bold: true, color: c.hl ? C.blue : C.navy, fontFace: "Calibri" });
    s.addText(c.type, { x: 0.62, y: y + 0.44, w: 2.2, h: 0.26, fontSize: 9.5, color: C.muted, italic: true, fontFace: "Calibri" });
    s.addShape(pres.shapes.RECTANGLE, { x: 2.98, y: y + 0.15, w: 0.02, h: 0.52, fill: { color: C.border }, line: { color: C.border } });
    s.addText(`✓  ${c.pros}`, { x: 3.1,  y: y + 0.1, w: 3.15, h: 0.62, fontSize: 10.5, color: C.green, fontFace: "Calibri" });
    s.addShape(pres.shapes.RECTANGLE, { x: 6.3, y: y + 0.15, w: 0.02, h: 0.52, fill: { color: C.border }, line: { color: C.border } });
    s.addText(`✗  ${c.cons}`, { x: 6.44, y: y + 0.1, w: 3.08, h: 0.62, fontSize: 10.5, color: C.red,   fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Technology Stack
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Technology Stack");

  const groups = [
    { title: "Backend API",     color: C.blue,   bg: C.blueLt,   items: ["NestJS (TypeScript)", "Prisma ORM", "JWT Auth", "PostgreSQL 16"] },
    { title: "AI Microservice", color: C.teal,   bg: C.tealLt,   items: ["Python 3.11", "FastAPI", "dlib / face_recognition", "ResNet-34 (128-dim)"] },
    { title: "Frontend Web",    color: C.purple, bg: C.purpleLt, items: ["Next.js 14", "React Query", "Tailwind CSS", "Recharts"] },
    { title: "Mobile App",      color: C.amber,  bg: C.amberLt,  items: ["React Native / Expo", "Expo Camera", "TypeScript"] },
    { title: "Infrastructure",  color: C.red,    bg: C.redLt,    items: ["Docker Compose", "pnpm workspaces", "GitHub Actions CI"] },
  ];

  const cols   = [0.4,  2.42, 4.44, 6.46, 8.12];
  const widths = [1.85, 1.85, 1.85, 1.5,  1.5 ];

  groups.forEach((g, i) => {
    const x = cols[i], w = widths[i];
    card(s, x, 0.88, w, 4.48, { fill: g.bg, glow: g.color });
    s.addText(g.title, { x: x + 0.08, y: 0.96, w: w - 0.16, h: 0.44, fontSize: 11, bold: true, color: g.color, fontFace: "Calibri", align: "center" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: 1.44, w: w - 0.24, h: 0.02, fill: { color: g.color, transparency: 60 }, line: { color: g.color, transparency: 60 } });
    s.addText(
      g.items.map((item, j) => ({
        text: item,
        options: { bullet: { char: "·" }, color: C.text, breakLine: j < g.items.length - 1, paraSpaceAfter: 10 },
      })),
      { x: x + 0.1, y: 1.54, w: w - 0.2, h: 3.6, fontSize: 11, fontFace: "Calibri" }
    );
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — System Architecture
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "System Architecture (C4 — Container Level)");

  // Actors
  const actors = [
    { label: "Teacher\n/ Admin", x: 0.1, y: 1.28 },
    { label: "Student",           x: 0.1, y: 3.48 },
  ];
  actors.forEach(a => {
    s.addShape(pres.shapes.OVAL, {
      x: a.x, y: a.y, w: 0.88, h: 0.88,
      fill: { color: C.blueLt }, line: { color: C.blue, width: 1.5 },
    });
    s.addText("👤", { x: a.x, y: a.y, w: 0.88, h: 0.88, fontSize: 18, align: "center", valign: "middle" });
    s.addText(a.label, { x: a.x - 0.08, y: a.y + 0.94, w: 1.04, h: 0.5, fontSize: 9, color: C.sub, align: "center", fontFace: "Calibri" });
  });

  // Containers
  const containers = [
    { title: "Next.js\nWeb App",       sub: "TypeScript / React",     color: C.purple, bg: C.purpleLt, x: 1.28, y: 0.86, w: 2.1, h: 1.05 },
    { title: "React Native\nMobile",   sub: "Expo / TypeScript",       color: C.amber,  bg: C.amberLt,  x: 1.28, y: 2.2,  w: 2.1, h: 1.05 },
    { title: "NestJS\nBackend API",    sub: "REST · JWT · Prisma",     color: C.blue,   bg: C.blueLt,   x: 4.1,  y: 1.4,  w: 2.3, h: 1.2  },
    { title: "FastAPI\nAI Service",    sub: "dlib · face_recognition", color: C.teal,   bg: C.tealLt,   x: 7.2,  y: 1.4,  w: 2.5, h: 1.2  },
    { title: "PostgreSQL",             sub: "Relational Database",      color: "0369A1", bg: "E0F2FE",   x: 4.1,  y: 3.45, w: 2.3, h: 1.0  },
  ];

  containers.forEach(c => {
    card(s, c.x, c.y, c.w, c.h, { fill: c.bg, border: c.color });
    accentBar(s, c.x, c.y, c.w, c.color);
    s.addText(c.title, { x: c.x, y: c.y + 0.12, w: c.w, h: 0.52, fontSize: 11.5, bold: true, color: c.color, align: "center", fontFace: "Calibri" });
    s.addText(c.sub,   { x: c.x, y: c.y + 0.68, w: c.w, h: 0.28, fontSize: 9,    color: C.sub, align: "center", italic: true, fontFace: "Calibri" });
  });

  // ── Arrows ─────────────────────────────────────────────────────────────────
  const ls  = { color: C.blue,   width: 1.2, dashType: "sysDash" };
  const lsP = { color: C.purple, width: 1.2, dashType: "sysDash" };

  // Teacher → Web (horizontal)
  s.addShape(pres.shapes.LINE, { x: 0.98, y: 1.72, w: 0.3,  h: 0.01, line: ls  });
  // Teacher → Mobile (diagonal down)
  s.addShape(pres.shapes.LINE, { x: 0.98, y: 1.72, w: 0.3,  h: 1.0,  line: ls  });
  // Student → Mobile (diagonal up)
  s.addShape(pres.shapes.LINE, { x: 0.98, y: 2.73, w: 0.3,  h: 1.2,  line: lsP });
  s.addText("views attendance", { x: 1.32, y: 3.2, w: 1.5, h: 0.36, fontSize: 8, color: C.purple, italic: true, fontFace: "Calibri", align: "center" });

  // Web → Backend
  s.addShape(pres.shapes.LINE, { x: 3.38, y: 1.38, w: 0.72, h: 0.62, line: ls });
  // Mobile → Backend
  s.addShape(pres.shapes.LINE, { x: 3.38, y: 2.0,  w: 0.72, h: 0.73, line: ls });
  // Backend → AI
  s.addShape(pres.shapes.LINE, { x: 6.4,  y: 2.0,  w: 0.8,  h: 0.01, line: ls });
  // Backend → DB
  s.addShape(pres.shapes.LINE, { x: 5.25, y: 2.6,  w: 0.01, h: 0.85, line: ls });

  s.addText("HTTP/REST between all services  ·  Docker Compose deployment  ·  pnpm monorepo", {
    x: 0.4, y: 5.2, w: 9.2, h: 0.3, fontSize: 10, color: C.muted, italic: true, align: "center", fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — AI Pipeline
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Face Recognition Pipeline");

  const steps = [
    { n: "1", title: "Image Input",        desc: "Classroom photo captured via mobile camera or web upload",                  color: C.purple, bg: C.purpleLt },
    { n: "2", title: "Pre-processing",     desc: "Resize 256×256, normalise pixels, histogram equalisation",                  color: "0369A1", bg: "E0F2FE"   },
    { n: "3", title: "HOG Detection",      desc: "Histogram of Oriented Gradients locates face bounding boxes",               color: C.blue,   bg: C.blueLt   },
    { n: "4", title: "ResNet-34 Encoding", desc: "dlib ResNet-34 maps each face to a 128-dimensional vector embedding",       color: C.teal,   bg: C.tealLt   },
    { n: "5", title: "Euclidean Matching", desc: "Compare against stored profiles; distance d < 0.6 → student identified",   color: C.green,  bg: C.greenLt  },
    { n: "6", title: "Attendance Record",  desc: "Matched students logged to PostgreSQL; unmatched flagged for manual review", color: C.amber,  bg: C.amberLt  },
  ];

  // Slightly shorter cards to make room for the registration note at the bottom
  const CARD_H = 1.82, ROW_GAP = 2.0;

  steps.forEach((st, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.4 + col * 3.18, y = 0.86 + row * ROW_GAP;
    card(s, x, y, 2.98, CARD_H, { fill: st.bg, border: st.color });
    accentBar(s, x, y, 2.98, st.color);
    s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: y + 0.12, w: 0.48, h: 0.48, fill: { color: st.color }, line: { color: st.color } });
    s.addText(st.n, { x: x + 0.12, y: y + 0.12, w: 0.48, h: 0.48, fontSize: 15, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(st.title, { x: x + 0.72, y: y + 0.14, w: 2.14, h: 0.46, fontSize: 12.5, bold: true, color: st.color, fontFace: "Calibri", valign: "middle" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: y + 0.68, w: 2.74, h: 0.02, fill: { color: st.color, transparency: 60 }, line: { color: st.color, transparency: 60 } });
    s.addText(st.desc, { x: x + 0.12, y: y + 0.78, w: 2.74, h: 0.92, fontSize: 11, color: C.text, fontFace: "Calibri" });
  });

  // ── Registration phase callout ─────────────────────────────────────────────
  // Step 5 says "stored profiles" — explain here where they come from
  const noteY = 0.86 + ROW_GAP + CARD_H + 0.1; // just below bottom row cards
  card(s, 0.4, noteY, 9.2, 0.72, { fill: C.tealLt, border: C.teal });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: noteY, w: 0.07, h: 0.72, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("🔑  Stored Profiles — Registration Phase:", {
    x: 0.62, y: noteY + 0.06, w: 3.2, h: 0.3,
    fontSize: 11, bold: true, color: C.teal, fontFace: "Calibri",
  });
  s.addText(
    "When a student is registered, the admin uploads 3–5 reference photos. Each photo goes through the same steps 2–4 (pre-processing → HOG detection → ResNet-34 encoding). The resulting 128-dim vectors are averaged and saved to PostgreSQL as the student's face profile.",
    {
      x: 3.9, y: noteY + 0.06, w: 5.62, h: 0.6,
      fontSize: 10.5, color: C.text, fontFace: "Calibri",
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Database Design
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Database Design (ER Overview)");

  const entities = [
    { name: "User",             color: C.purple, bg: C.purpleLt, x: 0.4,  y: 0.88, fields: ["id (PK)", "email", "passwordHash", "role (ADMIN/TEACHER)"] },
    { name: "Student",          color: C.blue,   bg: C.blueLt,   x: 0.4,  y: 3.08, fields: ["id (PK)", "firstName, lastName", "groupId (FK)", "faceEncoding (JSON)"] },
    { name: "AcademicGroup",    color: C.teal,   bg: C.tealLt,   x: 3.55, y: 0.88, fields: ["id (PK)", "name", "year"] },
    { name: "Schedule",         color: C.amber,  bg: C.amberLt,  x: 3.55, y: 3.08, fields: ["id (PK)", "groupId (FK)", "teacherId (FK)", "datetime, room"] },
    { name: "AttendanceRecord", color: C.red,    bg: C.redLt,    x: 6.7,  y: 1.98, fields: ["id (PK)", "scheduleId (FK)", "studentId (FK)", "status, timestamp"] },
  ];

  entities.forEach(e => {
    const h = 0.5 + e.fields.length * 0.34;
    card(s, e.x, e.y, 2.9, h, { fill: e.bg, border: e.color });
    accentBar(s, e.x, e.y, 2.9, e.color);
    s.addText(e.name, { x: e.x, y: e.y + 0.1, w: 2.9, h: 0.36, fontSize: 12, bold: true, color: e.color, align: "center", fontFace: "Calibri" });
    s.addText(
      e.fields.map((f, i) => ({
        text: f,
        options: { bullet: { char: "›" }, color: C.text, breakLine: i < e.fields.length - 1, paraSpaceAfter: 2 },
      })),
      { x: e.x + 0.14, y: e.y + 0.5, w: 2.62, h: h - 0.6, fontSize: 10.5, fontFace: "Calibri" }
    );
  });

  s.addText("Managed with Prisma ORM  ·  Migrations versioned in Git  ·  All FK constraints enforced", {
    x: 0.4, y: 5.2, w: 9.2, h: 0.3, fontSize: 10, color: C.muted, italic: true, align: "center", fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Demo Web
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "System Demo — Web Interface");

  const screens = [
    { title: "Login / Auth",         desc: "JWT-based, role detection (Admin / Teacher)",    color: C.purple },
    { title: "Schedule View",        desc: "Teacher selects class to start attendance",       color: C.blue   },
    { title: "Attendance Capture",   desc: "Upload photo → AI detects & identifies faces",   color: C.teal   },
    { title: "Attendance Report",    desc: "Per-student stats, export, manual correction",   color: C.green  },
    { title: "Student Registration", desc: "Admin uploads 3–5 reference photos per student", color: C.amber  },
    { title: "Group Management",     desc: "Manage groups, assign teachers to schedules",    color: C.red    },
  ];

  screens.forEach((sc, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.4 + col * 3.22, y = 0.88 + row * 2.3;
    card(s, x, y, 3.0, 2.12, { border: sc.color });
    accentBar(s, x, y, 3.0, sc.color);
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: y + 0.1, w: 2.8, h: 1.3, fill: { color: C.bg }, line: { color: C.border } });
    s.addText("[ Screenshot ]", { x: x + 0.1, y: y + 0.1, w: 2.8, h: 1.3, fontSize: 10, color: C.muted, align: "center", valign: "middle", italic: true, fontFace: "Calibri" });
    s.addText(sc.title, { x: x + 0.1, y: y + 1.46, w: 2.8, h: 0.3, fontSize: 11.5, bold: true, color: sc.color, fontFace: "Calibri" });
    s.addText(sc.desc,  { x: x + 0.1, y: y + 1.76, w: 2.8, h: 0.28, fontSize: 9.5, color: C.sub, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Demo Mobile
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "System Demo — Mobile Application (React Native / Expo)");

  const screens = [
    { title: "Schedule Screen",  desc: "Teacher views daily timetable",         color: C.blue   },
    { title: "Camera Capture",   desc: "One-tap classroom photo capture",        color: C.teal   },
    { title: "Results Screen",   desc: "Recognised vs unrecognised students",    color: C.green  },
    { title: "Student Profile",  desc: "Student views own attendance stats",     color: C.purple },
  ];

  screens.forEach((sc, i) => {
    const x = 0.4 + i * 2.42;
    card(s, x, 0.84, 2.2, 4.52, { border: sc.color });
    accentBar(s, x, 0.84, 2.2, sc.color);
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: 0.96, w: 1.96, h: 3.18, fill: { color: C.bg }, line: { color: C.border } });
    s.addText("[ Screenshot ]", { x: x + 0.12, y: 0.96, w: 1.96, h: 3.18, fontSize: 9, color: C.muted, align: "center", valign: "middle", italic: true, fontFace: "Calibri" });
    s.addText(sc.title, { x: x + 0.06, y: 4.22, w: 2.08, h: 0.3,  fontSize: 11, bold: true, color: sc.color, align: "center", fontFace: "Calibri" });
    s.addText(sc.desc,  { x: x + 0.06, y: 4.54, w: 2.08, h: 0.65, fontSize: 9.5, color: C.sub, align: "center", fontFace: "Calibri" });
  });

  s.addText("Cross-platform iOS & Android  ·  Expo Go compatible  ·  Camera via Expo Camera API", {
    x: 0.4, y: 5.25, w: 9.2, h: 0.28, fontSize: 10, color: C.muted, italic: true, align: "center", fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Recognition Accuracy
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Testing — Recognition Accuracy");

  const metrics = [
    { val: "100%",  label: "Precision",           sub: "Normal conditions", color: C.green,  bg: C.greenLt  },
    { val: "96.0%", label: "Recall",              sub: "Normal conditions", color: C.blue,   bg: C.blueLt   },
    { val: "97.9%", label: "F1-Score",            sub: "Normal conditions", color: C.purple, bg: C.purpleLt },
    { val: "0%",    label: "False Positive Rate", sub: "All scenarios",     color: C.teal,   bg: C.tealLt   },
  ];

  metrics.forEach((m, i) => {
    card(s, 0.4 + i * 2.4, 0.88, 2.22, 1.38, { fill: m.bg, border: m.color });
    s.addText(m.val,   { x: 0.4 + i * 2.4, y: 0.9,  w: 2.22, h: 0.72, fontSize: 36, bold: true, color: m.color, align: "center", fontFace: "Calibri" });
    s.addText(m.label, { x: 0.4 + i * 2.4, y: 1.62, w: 2.22, h: 0.3,  fontSize: 12, bold: true, color: C.navy,  align: "center", fontFace: "Calibri" });
    s.addText(m.sub,   { x: 0.4 + i * 2.4, y: 1.92, w: 2.22, h: 0.24, fontSize: 9,  color: C.muted, align: "center", fontFace: "Calibri" });
  });

  s.addChart(pres.charts.BAR, [{
    name: "Recall (%)",
    labels: ["Normal light", "Side angle ±15°", "Partial occlusion", "Mask", "Low light"],
    values: [96.0, 92.0, 78.6, 83.3, 75.0],
  }], {
    x: 0.4, y: 2.4, w: 9.2, h: 2.95, barDir: "col",
    chartColors: ["1D4ED8"],
    chartArea: { fill: { color: C.white }, roundedCorners: true },
    catAxisLabelColor: C.sub,
    valAxisLabelColor: C.sub,
    valGridLine: { color: C.border, size: 0.5 },
    catGridLine: { style: "none" },
    showValue: true,
    dataLabelColor: C.navy,
    showLegend: false,
    valAxisMinVal: 0,
    valAxisMaxVal: 100,
    showTitle: true,
    title: "Recall (%) by Testing Scenario",
    titleFontSize: 12,
    titleColor: C.sub,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Performance & Unit Tests
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Testing — Performance & Unit Tests");

  const perf = [
    { val: "3.42 s",   label: "Image processing p95",           target: "req. ≤ 5 s  ✓",      color: C.blue,   bg: C.blueLt   },
    { val: "98 ms",    label: "CRUD endpoint p95",               target: "req. ≤ 2000 ms  ✓",  color: C.green,  bg: C.greenLt  },
    { val: "50 users", label: "Concurrent users (load test)",    target: "Error rate: 0%  ✓",  color: C.amber,  bg: C.amberLt  },
    { val: "21 / 21",  label: "API endpoints tested in Postman", target: "All pass  ✓",        color: C.purple, bg: C.purpleLt },
  ];

  perf.forEach((p, i) => {
    const x = i < 2 ? 0.4 + i * 4.7 : 0.4 + (i - 2) * 4.7;
    const y = i < 2 ? 0.88 : 2.04;
    card(s, x, y, 4.5, 1.0, { fill: p.bg, border: p.color });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.07, h: 1.0, fill: { color: p.color }, line: { color: p.color } });
    s.addText(p.val,    { x: x + 0.22, y: y + 0.06, w: 2.4,  h: 0.5,  fontSize: 26, bold: true, color: p.color, fontFace: "Calibri" });
    s.addText(p.label,  { x: x + 0.22, y: y + 0.58, w: 2.4,  h: 0.3,  fontSize: 10, color: C.sub, fontFace: "Calibri" });
    s.addText(p.target, { x: x + 2.72, y: y + 0.3,  w: 1.65, h: 0.35, fontSize: 11, bold: true, color: C.green, fontFace: "Calibri", align: "right" });
  });

  const hOpts = { bold: true, color: C.white, fontSize: 11, fontFace: "Calibri", valign: "middle" };
  const cOpts = { fontSize: 11, color: C.text, fontFace: "Calibri", align: "center", valign: "middle" };

  const rows = [
    [
      { text: "Service",          options: { ...hOpts, fill: { color: C.navy }, align: "left"  } },
      { text: "Tests",            options: { ...hOpts, fill: { color: C.navy } } },
      { text: "Coverage",         options: { ...hOpts, fill: { color: C.navy } } },
      { text: "Result",           options: { ...hOpts, fill: { color: C.navy } } },
    ],
    ["AttendanceService", "12", "87%", { text: "PASS ✓", options: { ...cOpts, color: C.green, bold: true } }],
    ["AuthService",       "8",  "91%", { text: "PASS ✓", options: { ...cOpts, color: C.green, bold: true } }],
    ["StudentsService",   "10", "84%", { text: "PASS ✓", options: { ...cOpts, color: C.green, bold: true } }],
    ["ScheduleService",   "9",  "88%", { text: "PASS ✓", options: { ...cOpts, color: C.green, bold: true } }],
  ];

  const styledRows = rows.map((row, ri) => row.map((cell, ci) => {
    if (ri === 0) return cell;
    const fill = ri % 2 === 0 ? "F8FAFC" : C.white;
    if (typeof cell === "object" && cell.options) return { ...cell, options: { ...cell.options, fill: { color: fill } } };
    return { text: cell, options: { ...cOpts, fill: { color: fill }, align: ci === 0 ? "left" : "center" } };
  }));

  s.addTable(styledRows, {
    x: 0.4, y: 3.18, w: 9.2, h: 2.1,
    border: { pt: 0.5, color: C.borderMd },
    colW: [3.8, 1.8, 2.0, 1.6],
    rowH: 0.4,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — Future Work
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  slideHeader(s, "Future Work & Scalability");

  const items = [
    { n: "01", title: "Better Low-Light Detection", desc: "Replace HOG with MTCNN / RetinaFace → raise Recall from 75% to 90%+ under poor lighting.", color: C.blue,   bg: C.blueLt   },
    { n: "02", title: "Horizontal AI Scaling",       desc: "Multiple AI service replicas behind a load balancer for 500+ concurrent users.",           color: C.teal,   bg: C.tealLt   },
    { n: "03", title: "LMS Integration",             desc: "Connect with Moodle / Blackboard via API to sync attendance with existing grade-books.",    color: C.purple, bg: C.purpleLt },
    { n: "04", title: "Liveness Detection",          desc: "Anti-spoofing to reject photo / video attacks; step toward GDPR production deployment.",    color: C.amber,  bg: C.amberLt  },
  ];

  items.forEach((item, i) => {
    const x = i < 2 ? 0.4 : 5.1;
    const y = i % 2 === 0 ? 0.88 : 3.1;
    card(s, x, y, 4.5, 2.0, { fill: item.bg, border: item.color });
    accentBar(s, x, y, 4.5, item.color);
    // Big background number
    s.addText(item.n, { x: x + 2.8, y: y + 0.05, w: 1.6, h: 1.85, fontSize: 72, bold: true, color: item.color, fontFace: "Calibri", align: "right", valign: "bottom", transparency: 80 });
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.18, w: 0.5, h: 0.5, fill: { color: item.color }, line: { color: item.color } });
    s.addText(item.n, { x: x + 0.15, y: y + 0.18, w: 0.5, h: 0.5, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(item.title, { x: x + 0.8, y: y + 0.2, w: 3.55, h: 0.46, fontSize: 13.5, bold: true, color: item.color, fontFace: "Calibri", valign: "middle" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.15, y: y + 0.78, w: 4.22, h: 0.02, fill: { color: item.color, transparency: 60 }, line: { color: item.color, transparency: 60 } });
    s.addText(item.desc, { x: x + 0.15, y: y + 0.9, w: 4.22, h: 0.98, fontSize: 11.5, color: C.text, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — Conclusions
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy }; // dark closer — sandwich structure

  s.addText("Conclusions", {
    x: 0.5, y: 0.14, w: 9.0, h: 0.52,
    fontSize: 32, bold: true, color: C.white, fontFace: "Calibri",
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0.7, w: 9.0, h: 0.04, fill: { color: C.blue }, line: { color: C.blue } });

  const conclusions = [
    { text: "Analysed existing approaches — face recognition provides best accuracy / cost / usability balance vs RFID, QR, fingerprint.", color: C.blueLt  },
    { text: "Designed and implemented microservices: NestJS REST API · Next.js web · FastAPI AI service · React Native mobile app.",       color: "DDD6FE"  },
    { text: "Achieved Precision 100%, Recall 96.0%, F1 97.9% and False Positive Rate 0% across all test scenarios.",                      color: C.tealLt  },
    { text: "Performance: image p95 = 3.42 s (≤ 5 s); CRUD p95 = 98 ms; stable at 50 concurrent users with 0% error rate.",              color: C.amberLt },
    { text: "Practical impact: attendance time cut from 5–15 min to 1–1.5 min per class; no special hardware required.",                  color: C.greenLt },
    { text: "All 8 functional requirements (FR1–FR8) fully implemented; deployed via a single Docker Compose command.",                    color: C.blueLt  },
  ];

  conclusions.forEach((c, i) => {
    const y = 0.86 + i * 0.73;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y + 0.1, w: 0.05, h: 0.48, fill: { color: c.color }, line: { color: c.color } });
    s.addText(c.text, { x: 0.7, y, w: 8.8, h: 0.68, fontSize: 12.5, color: "E2E8F0", fontFace: "Calibri", valign: "middle" });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.2, w: 10, h: 0.43, fill: { color: C.blue }, line: { color: C.blue } });
  s.addText("Thank you for your attention!", {
    x: 0, y: 5.2, w: 10, h: 0.43,
    fontSize: 14, bold: true, color: C.white,
    align: "center", valign: "middle", fontFace: "Calibri", margin: 0,
  });
}

// ── Save ──────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "/Users/dmyrto/Downloads/Zubyk_Defense_Presentation.pptx" })
  .then(() => console.log("Done ✓  →  /Users/dmyrto/Downloads/Zubyk_Defense_Presentation.pptx"))
  .catch(e => { console.error(e); process.exit(1); });
