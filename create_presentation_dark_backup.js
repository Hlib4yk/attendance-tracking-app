const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Dmytro Zubyk";
pres.title = "Information System for Automated Student Attendance Tracking Using Computer Vision";

// ── Palette ───────────────────────────────────────────────────────────────────
// Dark gradient feel: bg1 (near-black navy) → bg2 (deep indigo)
// Cards: semi-transparent dark surface
// Accent: electric cyan
const C = {
  bg1:     "0A0F1E",   // almost-black navy (slide background)
  bg2:     "0F172A",   // slightly lighter dark blue
  surface: "141C33",   // card surface
  border:  "1E2D50",   // subtle border
  cyan:    "00D4FF",   // electric cyan — main accent
  cyanDim: "0EA5C9",   // dimmer cyan for secondary
  purple:  "818CF8",   // soft indigo for variety
  white:   "FFFFFF",
  text:    "E2E8F0",   // near-white text
  muted:   "64748B",   // muted text
  green:   "34D399",   // success green
  amber:   "FBBF24",   // warning / future work
  red:     "F87171",   // caution
};

// ── Gradient background helper (PNG injected as base64 via sharp-less approach)
// We simulate gradient by layering two rectangles with transparency
function gradBg(slide) {
  slide.background = { color: C.bg1 };
  // Top-left glow (purple)
  slide.addShape(pres.shapes.OVAL, {
    x: -1, y: -1, w: 5, h: 5,
    fill: { color: "312E81", transparency: 75 },
    line: { color: "312E81", transparency: 75 },
  });
  // Bottom-right glow (cyan)
  slide.addShape(pres.shapes.OVAL, {
    x: 7, y: 3, w: 4, h: 4,
    fill: { color: "0C4A6E", transparency: 75 },
    line: { color: "0C4A6E", transparency: 75 },
  });
}

// ── Card (dark surface, glowing cyan border) ──────────────────────────────────
function card(slide, x, y, w, h, opts = {}) {
  const glow = opts.glow || false;
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: opts.fill || C.surface },
    line: { color: glow ? C.cyan : (opts.border || C.border), width: glow ? 1.2 : 0.7 },
    shadow: opts.shadow !== false ? { type: "outer", blur: 12, offset: 0, angle: 135, color: "000000", opacity: 0.45 } : undefined,
  });
}

const makeShadow = () => ({ type: "outer", blur: 12, offset: 0, angle: 135, color: "000000", opacity: 0.45 });

// ── Pill / tag ─────────────────────────────────────────────────────────────────
function pill(slide, x, y, label, color) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.4, h: 0.26, fill: { color }, line: { color }, rectRadius: 0.06 });
  slide.addText(label, { x, y, w: 1.4, h: 0.26, fontSize: 8, bold: true, color: C.bg1, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
}

// ── Cyan dot decoration ───────────────────────────────────────────────────────
function dotAccent(slide, x, y) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: 0.06, h: 0.06, fill: { color: C.cyan }, line: { color: C.cyan } });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);

  // Horizontal cyan rule
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.55, w: 2.2, h: 0.04, fill: { color: C.cyan }, line: { color: C.cyan } });

  s.addText("Information System for\nAutomated Student Attendance Tracking\nUsing Computer Vision Technologies", {
    x: 0.5, y: 0.55, w: 9.0, h: 1.9,
    fontSize: 28, bold: true, color: C.white, fontFace: "Calibri",
    align: "left", valign: "bottom",
  });

  // Subtitle pill
  pill(s, 0.5, 1.74, "Computer Science · 122", C.cyan);

  s.addText([
    { text: "Student: ", options: { color: C.muted } },
    { text: "Dmytro Zubyk", options: { color: C.white, bold: true } },
    { text: "   ·   ", options: { color: C.muted } },
    { text: "Supervisor: ", options: { color: C.muted } },
    { text: "PhD Assist. Petro Lyashchynskyi", options: { color: C.text } },
  ], { x: 0.5, y: 2.15, w: 9.0, h: 0.38, fontSize: 13, fontFace: "Calibri" });

  // Big decorative number in background
  s.addText("CV", {
    x: 5.5, y: 1.0, w: 4.0, h: 3.5,
    fontSize: 220, bold: true, color: "0D1730", fontFace: "Calibri", align: "right", valign: "middle",
  });

  // Bottom info bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.15, w: 10, h: 0.47, fill: { color: "07091A" }, line: { color: "07091A" } });
  s.addText("Lviv Polytechnic National University  ·  Department of Automated Control Systems  ·  2026", {
    x: 0.5, y: 5.18, w: 9.0, h: 0.35, fontSize: 10, color: C.muted, fontFace: "Calibri", align: "center",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Relevance
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);

  s.addText("Relevance", { x: 0.4, y: 0.15, w: 9.2, h: 0.55, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.72, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  // Problem card
  card(s, 0.4, 0.86, 5.5, 3.9, { glow: false });
  s.addText("The Problem", { x: 0.65, y: 0.96, w: 5.0, h: 0.38, fontSize: 14, bold: true, color: C.cyan, fontFace: "Calibri" });

  const problems = [
    "Manual roll call in groups of 25–30 students takes 5–15 minutes per lecture",
    "Paper journals are prone to loss and manipulation",
    "RFID / QR code systems require special hardware or are easily spoofed",
    "No contactless, hardware-free automated solution for universities",
  ];
  s.addText(problems.map((t, i) => ({
    text: t,
    options: { bullet: { char: "›" }, color: C.text, breakLine: i < problems.length - 1, paraSpaceAfter: 10 }
  })), { x: 0.65, y: 1.44, w: 5.0, h: 3.0, fontSize: 13, fontFace: "Calibri" });

  // Stat cards
  const stats = [
    { val: "15 min", label: "wasted per lecture\non manual roll call", color: C.red },
    { val: "0%", label: "extra hardware\ninvestment needed", color: C.green },
    { val: ">99%", label: "CNN accuracy\non LFW benchmark", color: C.cyan },
  ];
  stats.forEach((st, i) => {
    const y = 0.86 + i * 1.35;
    card(s, 6.15, y, 3.45, 1.18, { glow: i === 1 });
    s.addText(st.val, { x: 6.15, y: y + 0.06, w: 3.45, h: 0.62, fontSize: 30, bold: true, color: st.color, align: "center", fontFace: "Calibri" });
    s.addText(st.label, { x: 6.15, y: y + 0.72, w: 3.45, h: 0.4, fontSize: 10, color: C.muted, align: "center", fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Object, Subject, Goal
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("Research Parameters", { x: 0.4, y: 0.15, w: 9.2, h: 0.55, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.72, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const boxes = [
    { label: "OBJECT", accent: C.cyan,   text: "Student attendance tracking processes in higher education institutions" },
    { label: "SUBJECT", accent: C.purple, text: "Methods for automating attendance using face recognition and client-server architecture" },
    { label: "GOAL",    accent: C.green,  text: "Design and implement a practical, contactless, automated attendance system suitable for real university environments" },
  ];

  boxes.forEach((b, i) => {
    const y = 0.88 + i * 1.3;
    card(s, 0.4, y, 9.2, 1.15);
    // Left accent bar
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 0.06, h: 1.15, fill: { color: b.accent }, line: { color: b.accent } });
    pill(s, 0.62, y + 0.1, b.label, b.accent);
    s.addText(b.text, { x: 0.62, y: y + 0.44, w: 8.8, h: 0.62, fontSize: 13.5, color: C.text, fontFace: "Calibri" });
  });

  s.addText("Key Objectives: Analyse existing approaches · Review CV methods · Design microservices architecture · Implement & test", {
    x: 0.4, y: 5.1, w: 9.2, h: 0.38, fontSize: 10.5, color: C.muted, italic: true, fontFace: "Calibri", align: "center",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Existing Approaches
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("Analysis of Existing Approaches", { x: 0.4, y: 0.15, w: 9.2, h: 0.55, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.72, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const hOpts = { bold: true, color: C.cyan, fontSize: 10.5, fontFace: "Calibri", align: "center", valign: "middle" };
  const cOpts = { fontSize: 11, color: C.text, fontFace: "Calibri", align: "center", valign: "middle" };

  const rows = [
    [
      { text: "Approach",        options: { ...hOpts, align: "left"  } },
      { text: "Accuracy",        options: hOpts },
      { text: "Speed",           options: hOpts },
      { text: "Cost",            options: hOpts },
      { text: "Anti-spoofing",   options: hOpts },
      { text: "Special HW",      options: hOpts },
    ],
    ["RFID / NFC",              "High",      "High",   "Medium",      "Low ✗",    "Yes ✗"],
    ["Fingerprint",             "Very High", "Medium", "High",        "High ✓",   "Yes ✗"],
    [{ text: "Face Recognition ✓", options: { ...cOpts, bold: true, color: C.cyan, align: "left" } },
                                "High",      "High",   "Low ✓",       "High ✓",   "No ✓"],
    ["QR Code",                 "Medium",    "High",   "Low",         "Low ✗",    "No"],
    ["Commercial SaaS",         "Very High", "High",   "Very High ✗", "High",     "Partial"],
  ];

  const styledRows = rows.map((row, ri) => row.map((cell, ci) => {
    if (ri === 0) return cell;
    const isHL = ri === 3;
    const fillColor = isHL ? "0D2540" : (ri % 2 === 0 ? "0F1A2E" : C.surface);
    if (typeof cell === "string") {
      return { text: cell, options: { ...cOpts, fill: { color: fillColor }, align: ci === 0 ? "left" : "center" } };
    }
    return { ...cell, options: { ...cell.options, fill: { color: fillColor } } };
  }));

  s.addTable(styledRows, {
    x: 0.4, y: 0.86, w: 9.2, h: 4.5,
    border: { pt: 0.6, color: C.border },
    colW: [2.4, 1.35, 1.15, 1.15, 1.55, 1.6],
    rowH: 0.64,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Competitor Software
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("Competitor Software Analysis", { x: 0.4, y: 0.15, w: 9.2, h: 0.55, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.72, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const competitors = [
    { name: "Classter / Moodle",          type: "LMS + Attendance",             pros: "Rich feature set, university-grade",        cons: "No face recognition, manual input, high licence cost",          highlight: false },
    { name: "RecFaces / Face++",           type: "Commercial Face Recognition",  pros: "State-of-the-art accuracy",                 cons: "GPU servers required, SaaS only, GDPR concerns, very expensive", highlight: false },
    { name: "Eigenfaces-based solutions",  type: "Research prototypes",          pros: "No GPU needed, open source",                cons: "F1 = 74–84% — insufficient for real-world use",                 highlight: false },
    { name: "DeepFace / FaceNet",          type: "Open-source library",          pros: "Recall 97.3% — highest accuracy",           cons: "8–12 s model load, GPU dependency, no full-stack solution",      highlight: false },
    { name: "Our System  ✦",               type: "This work",                    pros: "Precision 100%, Recall 96%, FPR 0%, no GPU", cons: "Recall 75–83% in poor lighting (manual override available)",    highlight: true  },
  ];

  competitors.forEach((c, i) => {
    const y = 0.88 + i * 0.9;
    const fillC = c.highlight ? "09213A" : C.surface;
    card(s, 0.4, y, 9.2, 0.8, { fill: fillC, glow: c.highlight });
    s.addText(c.name, { x: 0.62, y: y + 0.07, w: 2.2, h: 0.3, fontSize: 12, bold: true, color: c.highlight ? C.cyan : C.white, fontFace: "Calibri" });
    s.addText(c.type, { x: 0.62, y: y + 0.44, w: 2.2, h: 0.26, fontSize: 9.5, color: C.muted, italic: true, fontFace: "Calibri" });
    s.addText(`✓  ${c.pros}`, { x: 2.95, y: y + 0.1, w: 3.2, h: 0.6, fontSize: 10.5, color: C.green, fontFace: "Calibri" });
    s.addText(`✗  ${c.cons}`, { x: 6.3,  y: y + 0.1, w: 3.2, h: 0.6, fontSize: 10.5, color: C.red,   fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Technology Stack
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("Technology Stack", { x: 0.4, y: 0.15, w: 9.2, h: 0.55, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.72, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const groups = [
    { title: "Backend API",      color: C.cyan,    items: ["NestJS (TypeScript)", "Prisma ORM", "JWT Auth", "PostgreSQL 16"] },
    { title: "AI Microservice",  color: C.green,   items: ["Python 3.11", "FastAPI", "dlib / face_recognition", "ResNet-34 (128-dim)"] },
    { title: "Frontend Web",     color: C.purple,  items: ["Next.js 14", "React Query", "Tailwind CSS", "Recharts"] },
    { title: "Mobile App",       color: C.amber,   items: ["React Native / Expo", "Expo Camera", "TypeScript"] },
    { title: "Infrastructure",   color: "F87171",  items: ["Docker Compose", "pnpm workspaces", "GitHub Actions CI"] },
  ];

  const cols   = [0.4, 2.42, 4.44, 6.46, 8.12];
  const widths = [1.85, 1.85, 1.85, 1.5, 1.5];

  groups.forEach((g, i) => {
    const x = cols[i]; const w = widths[i];
    card(s, x, 0.86, w, 4.5, { glow: false });
    // Top accent bar
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.86, w, h: 0.04, fill: { color: g.color }, line: { color: g.color } });
    s.addText(g.title, { x: x + 0.08, y: 0.95, w: w - 0.16, h: 0.48, fontSize: 11, bold: true, color: g.color, fontFace: "Calibri", align: "center" });
    // divider
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: 1.46, w: w - 0.24, h: 0.02, fill: { color: C.border }, line: { color: C.border } });
    s.addText(g.items.map((item, j) => ({
      text: item,
      options: { bullet: { char: "·" }, color: C.text, breakLine: j < g.items.length - 1, paraSpaceAfter: 10 }
    })), { x: x + 0.1, y: 1.56, w: w - 0.2, h: 3.6, fontSize: 11, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — System Architecture
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("System Architecture (C4 — Container Level)", { x: 0.4, y: 0.1, w: 9.2, h: 0.52, fontSize: 28, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.64, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  // Actors
  const actors = [
    { label: "Teacher\n/ Admin", x: 0.12, y: 1.3 },
    { label: "Student",           x: 0.12, y: 3.5 },
  ];
  actors.forEach(a => {
    s.addShape(pres.shapes.OVAL, { x: a.x, y: a.y, w: 0.85, h: 0.85, fill: { color: C.surface }, line: { color: C.cyan, width: 1.2 } });
    s.addText("👤", { x: a.x, y: a.y, w: 0.85, h: 0.85, fontSize: 18, align: "center", valign: "middle" });
    s.addText(a.label, { x: a.x - 0.1, y: a.y + 0.92, w: 1.05, h: 0.5, fontSize: 9, color: C.muted, align: "center", fontFace: "Calibri" });
  });

  // Containers
  const containers = [
    { title: "Next.js\nWeb App",       sub: "TypeScript / React",      color: C.purple, x: 1.3, y: 0.86, w: 2.1, h: 1.05 },
    { title: "React Native\nMobile",   sub: "Expo / TypeScript",        color: C.amber,  x: 1.3, y: 2.2,  w: 2.1, h: 1.05 },
    { title: "NestJS\nBackend API",    sub: "REST · JWT · Prisma",      color: C.cyan,   x: 4.1, y: 1.4,  w: 2.3, h: 1.2  },
    { title: "FastAPI\nAI Service",    sub: "dlib · face_recognition",  color: C.green,  x: 7.2, y: 1.4,  w: 2.5, h: 1.2  },
    { title: "PostgreSQL",             sub: "Relational Database",       color: "38BDF8", x: 4.1, y: 3.45, w: 2.3, h: 1.0  },
  ];

  containers.forEach(c => {
    card(s, c.x, c.y, c.w, c.h, { glow: c.color === C.cyan });
    s.addShape(pres.shapes.RECTANGLE, { x: c.x, y: c.y, w: c.w, h: 0.06, fill: { color: c.color }, line: { color: c.color } });
    s.addText(c.title, { x: c.x, y: c.y + 0.12, w: c.w, h: 0.52, fontSize: 11.5, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
    s.addText(c.sub,   { x: c.x, y: c.y + 0.68, w: c.w, h: 0.28, fontSize: 9,    color: C.muted, align: "center", italic: true, fontFace: "Calibri" });
  });

  // ── Arrows ─────────────────────────────────────────────────────────────────
  const lineStyle = { color: C.cyan, width: 1.2, dashType: "sysDash", transparency: 40 };
  const studentStyle = { color: C.purple, width: 1.2, dashType: "sysDash", transparency: 30 };

  // Teacher → Web App (horizontal)
  s.addShape(pres.shapes.LINE, { x: 0.97, y: 1.72, w: 0.33, h: 0.01, line: lineStyle });
  // Teacher → Mobile App (diagonal down)
  s.addShape(pres.shapes.LINE, { x: 0.97, y: 1.72, w: 0.33, h: 1.0,  line: lineStyle });
  // Student → Mobile App (diagonal up — from student right to mobile left)
  s.addShape(pres.shapes.LINE, { x: 0.97, y: 2.73, w: 0.33, h: 1.2,  line: studentStyle });

  // Web App → Backend (diagonal)
  s.addShape(pres.shapes.LINE, { x: 3.4, y: 1.38, w: 0.7, h: 0.62, line: lineStyle });
  // Mobile → Backend (diagonal up)
  s.addShape(pres.shapes.LINE, { x: 3.4, y: 2.0,  w: 0.7, h: 0.73, line: lineStyle });
  // Backend → AI
  s.addShape(pres.shapes.LINE, { x: 6.4, y: 2.0,  w: 0.8, h: 0.01, line: lineStyle });
  // Backend → DB
  s.addShape(pres.shapes.LINE, { x: 5.25, y: 2.6, w: 0.01, h: 0.85, line: lineStyle });

  // "views attendance" label
  s.addText("views\nattendance", { x: 1.35, y: 3.25, w: 1.4, h: 0.42, fontSize: 8, color: C.purple, italic: true, fontFace: "Calibri", align: "center" });

  s.addText("HTTP/REST between all services  ·  Docker Compose deployment  ·  pnpm monorepo", {
    x: 0.4, y: 5.2, w: 9.2, h: 0.3, fontSize: 10, color: C.muted, italic: true, align: "center", fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — AI Pipeline
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("Face Recognition Pipeline", { x: 0.4, y: 0.15, w: 9.2, h: 0.52, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.68, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const steps = [
    { n: "1", title: "Image Input",         desc: "Photo captured via mobile camera or web upload",                              color: C.purple },
    { n: "2", title: "Pre-processing",      desc: "Resize 256×256, normalise pixel values, histogram equalisation",             color: "38BDF8" },
    { n: "3", title: "HOG Detection",       desc: "Histogram of Oriented Gradients locates face bounding boxes",                color: C.cyan   },
    { n: "4", title: "ResNet-34 Encoding",  desc: "dlib ResNet-34 maps each face to 128-dimensional vector embedding",          color: C.green  },
    { n: "5", title: "Euclidean Matching",  desc: "Compare against stored profiles; distance d < 0.6 → student identified",    color: C.amber  },
    { n: "6", title: "Attendance Record",   desc: "Matched students logged to PostgreSQL; unmatched flagged for manual review", color: "F87171" },
  ];

  // Arrow connector between steps
  const arrowY1 = 1.42, arrowY2 = 3.62;
  [0,1].forEach(row => {
    const y = row === 0 ? arrowY1 : arrowY2;
    [0,1].forEach(gap => {
      const x = 0.4 + (gap + 1) * 3.18 - 0.25;
      s.addShape(pres.shapes.LINE, { x, y, w: 0.18, h: 0.01, line: { color: C.cyan, width: 1.5 } });
    });
  });

  steps.forEach((st, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 3.18;
    const y = 0.84 + row * 2.24;
    card(s, x, y, 2.98, 2.0, { glow: st.color === C.cyan });
    // Step number circle
    s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: y + 0.12, w: 0.5, h: 0.5, fill: { color: st.color }, line: { color: st.color } });
    s.addText(st.n, { x: x + 0.12, y: y + 0.12, w: 0.5, h: 0.5, fontSize: 15, bold: true, color: C.bg1, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(st.title, { x: x + 0.75, y: y + 0.14, w: 2.1, h: 0.46, fontSize: 12.5, bold: true, color: C.white, fontFace: "Calibri", valign: "middle" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: y + 0.7, w: 2.74, h: 0.02, fill: { color: C.border }, line: { color: C.border } });
    s.addText(st.desc, { x: x + 0.12, y: y + 0.8, w: 2.74, h: 1.08, fontSize: 11, color: C.text, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Database Design
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("Database Design (ER Overview)", { x: 0.4, y: 0.15, w: 9.2, h: 0.52, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.68, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const entities = [
    { name: "User",             color: C.purple,  x: 0.4,  y: 0.88, fields: ["id (PK)", "email", "passwordHash", "role (ADMIN/TEACHER)"] },
    { name: "Student",          color: C.cyan,    x: 0.4,  y: 3.1,  fields: ["id (PK)", "firstName, lastName", "groupId (FK)", "faceEncoding (JSON)"] },
    { name: "AcademicGroup",    color: C.green,   x: 3.55, y: 0.88, fields: ["id (PK)", "name", "year"] },
    { name: "Schedule",         color: C.amber,   x: 3.55, y: 3.1,  fields: ["id (PK)", "groupId (FK)", "teacherId (FK)", "datetime, room"] },
    { name: "AttendanceRecord", color: "F87171",  x: 6.7,  y: 1.98, fields: ["id (PK)", "scheduleId (FK)", "studentId (FK)", "status, timestamp"] },
  ];

  entities.forEach(e => {
    const h = 0.52 + e.fields.length * 0.34;
    card(s, e.x, e.y, 2.9, h, { glow: false });
    s.addShape(pres.shapes.RECTANGLE, { x: e.x, y: e.y, w: 2.9, h: 0.04, fill: { color: e.color }, line: { color: e.color } });
    s.addText(e.name, { x: e.x, y: e.y + 0.08, w: 2.9, h: 0.38, fontSize: 12, bold: true, color: e.color, align: "center", fontFace: "Calibri" });
    s.addText(e.fields.map((f, i) => ({
      text: f,
      options: { bullet: { char: "›" }, color: C.text, breakLine: i < e.fields.length - 1, paraSpaceAfter: 2 }
    })), { x: e.x + 0.14, y: e.y + 0.5, w: 2.62, h: h - 0.6, fontSize: 10.5, fontFace: "Calibri" });
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
  gradBg(s);
  s.addText("System Demo — Web Interface", { x: 0.4, y: 0.15, w: 9.2, h: 0.52, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.68, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const screens = [
    { title: "Login / Auth",         desc: "JWT-based, role detection (Admin / Teacher)" },
    { title: "Schedule View",        desc: "Teacher selects a class to start attendance" },
    { title: "Attendance Capture",   desc: "Upload photo → AI detects & identifies faces" },
    { title: "Attendance Report",    desc: "Per-student stats, export, manual correction" },
    { title: "Student Registration", desc: "Admin uploads 3–5 reference photos per student" },
    { title: "Group Management",     desc: "Manage groups, assign teachers to schedules" },
  ];

  screens.forEach((sc, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 3.22;
    const y = 0.86 + row * 2.3;
    card(s, x, y, 3.0, 2.12, { glow: i === 2 });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: y + 0.1, w: 2.8, h: 1.3, fill: { color: "07111F" }, line: { color: C.border } });
    s.addText("[ Screenshot ]", { x: x + 0.1, y: y + 0.1, w: 2.8, h: 1.3, fontSize: 10, color: C.border, align: "center", valign: "middle", italic: true, fontFace: "Calibri" });
    s.addText(sc.title, { x: x + 0.1, y: y + 1.46, w: 2.8, h: 0.3, fontSize: 11.5, bold: true, color: C.cyan, fontFace: "Calibri" });
    s.addText(sc.desc,  { x: x + 0.1, y: y + 1.76, w: 2.8, h: 0.28, fontSize: 9.5, color: C.muted, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Demo Mobile
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("System Demo — Mobile Application (React Native / Expo)", { x: 0.4, y: 0.15, w: 9.2, h: 0.52, fontSize: 26, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.68, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const mobileScreens = [
    { title: "Schedule Screen",   desc: "Teacher views daily timetable" },
    { title: "Camera Capture",    desc: "One-tap classroom photo capture" },
    { title: "Results Screen",    desc: "Recognised vs unrecognised students" },
    { title: "Student Profile",   desc: "Student views own attendance stats" },
  ];

  mobileScreens.forEach((sc, i) => {
    const x = 0.4 + i * 2.42;
    card(s, x, 0.84, 2.2, 4.52, { glow: i === 1 });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.12, y: 0.96, w: 1.96, h: 3.2, fill: { color: "07111F" }, line: { color: C.border } });
    s.addText("[ Screenshot ]", { x: x + 0.12, y: 0.96, w: 1.96, h: 3.2, fontSize: 9, color: C.border, align: "center", valign: "middle", italic: true, fontFace: "Calibri" });
    s.addText(sc.title, { x: x + 0.06, y: 4.22, w: 2.08, h: 0.3, fontSize: 11, bold: true, color: sc.title === "Camera Capture" ? C.cyan : C.white, align: "center", fontFace: "Calibri" });
    s.addText(sc.desc,  { x: x + 0.06, y: 4.54, w: 2.08, h: 0.7, fontSize: 9.5, color: C.muted, align: "center", fontFace: "Calibri" });
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
  gradBg(s);
  s.addText("Testing — Recognition Accuracy", { x: 0.4, y: 0.15, w: 9.2, h: 0.52, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.68, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const metrics = [
    { val: "100%",  label: "Precision",          sub: "Normal conditions", color: C.green },
    { val: "96.0%", label: "Recall",             sub: "Normal conditions", color: C.cyan  },
    { val: "97.9%", label: "F1-Score",           sub: "Normal conditions", color: C.purple},
    { val: "0%",    label: "False Positive Rate",sub: "All scenarios",     color: C.amber },
  ];

  metrics.forEach((m, i) => {
    card(s, 0.4 + i * 2.4, 0.86, 2.22, 1.35, { glow: m.color === C.cyan });
    s.addText(m.val,   { x: 0.4 + i * 2.4, y: 0.88, w: 2.22, h: 0.72, fontSize: 36, bold: true, color: m.color, align: "center", fontFace: "Calibri" });
    s.addText(m.label, { x: 0.4 + i * 2.4, y: 1.6,  w: 2.22, h: 0.3,  fontSize: 12, bold: true, color: C.text,  align: "center", fontFace: "Calibri" });
    s.addText(m.sub,   { x: 0.4 + i * 2.4, y: 1.9,  w: 2.22, h: 0.24, fontSize: 9,  color: C.muted, align: "center", fontFace: "Calibri" });
  });

  s.addChart(pres.charts.BAR, [{
    name: "Recall (%)",
    labels: ["Normal light", "Side angle ±15°", "Partial occlusion", "Mask", "Low light"],
    values: [96.0, 92.0, 78.6, 83.3, 75.0],
  }], {
    x: 0.4, y: 2.38, w: 9.2, h: 2.98, barDir: "col",
    chartColors: ["00D4FF"],
    chartArea: { fill: { color: "0A0F1E" }, roundedCorners: false },
    catAxisLabelColor: "94A3B8",
    valAxisLabelColor: "94A3B8",
    valGridLine: { color: "1E2D50", size: 0.5 },
    catGridLine: { style: "none" },
    showValue: true,
    dataLabelColor: "E2E8F0",
    showLegend: false,
    valAxisMinVal: 0,
    valAxisMaxVal: 100,
    showTitle: true,
    title: "Recall (%) by Testing Scenario",
    titleFontSize: 12,
    titleColor: "94A3B8",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Performance & Unit Tests
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("Testing — Performance & Unit Tests", { x: 0.4, y: 0.15, w: 9.2, h: 0.52, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.68, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const perf = [
    { val: "3.42 s",   label: "Image processing p95",            target: "req. ≤ 5 s   ✓",       color: C.cyan   },
    { val: "98 ms",    label: "CRUD endpoint p95",                target: "req. ≤ 2000 ms   ✓",   color: C.green  },
    { val: "50 users", label: "Concurrent users (load test)",     target: "Error rate: 0%   ✓",   color: C.amber  },
    { val: "21 / 21",  label: "API endpoints tested in Postman",  target: "All pass   ✓",         color: C.purple },
  ];

  perf.forEach((p, i) => {
    const x = i < 2 ? 0.4 + i * 4.7 : 0.4 + (i - 2) * 4.7;
    const y = i < 2 ? 0.86 : 2.04;
    card(s, x, y, 4.5, 1.0, { glow: p.color === C.cyan });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.06, h: 1.0, fill: { color: p.color }, line: { color: p.color } });
    s.addText(p.val,    { x: x + 0.22, y: y + 0.06, w: 2.4,  h: 0.5, fontSize: 26, bold: true, color: p.color, fontFace: "Calibri" });
    s.addText(p.label,  { x: x + 0.22, y: y + 0.58, w: 2.4,  h: 0.3, fontSize: 10, color: C.muted, fontFace: "Calibri" });
    s.addText(p.target, { x: x + 2.72, y: y + 0.3,  w: 1.65, h: 0.35, fontSize: 11, bold: true, color: C.green, fontFace: "Calibri", align: "right" });
  });

  // Unit test table
  const hOpts = { bold: true, color: C.cyan, fontSize: 10.5, fontFace: "Calibri", valign: "middle" };
  const cOpts = { fontSize: 11, color: C.text, fontFace: "Calibri", align: "center", valign: "middle" };
  const rows = [
    [
      { text: "Service",            options: { ...hOpts, align: "left"  } },
      { text: "Tests",              options: hOpts },
      { text: "Coverage",           options: hOpts },
      { text: "Result",             options: hOpts },
    ],
    ["AttendanceService", "12", "87%", { text: "PASS ✓", options: { ...cOpts, color: C.green, bold: true } }],
    ["AuthService",       "8",  "91%", { text: "PASS ✓", options: { ...cOpts, color: C.green, bold: true } }],
    ["StudentsService",   "10", "84%", { text: "PASS ✓", options: { ...cOpts, color: C.green, bold: true } }],
    ["ScheduleService",   "9",  "88%", { text: "PASS ✓", options: { ...cOpts, color: C.green, bold: true } }],
  ];

  const styledRows = rows.map((row, ri) => row.map((cell, ci) => {
    if (ri === 0) return cell;
    const fill = ri % 2 === 0 ? "0F1A2E" : C.surface;
    if (typeof cell === "object" && cell.options) return { ...cell, options: { ...cell.options, fill: { color: fill } } };
    return { text: cell, options: { ...cOpts, fill: { color: fill }, align: ci === 0 ? "left" : "center" } };
  }));

  s.addTable(styledRows, {
    x: 0.4, y: 3.18, w: 9.2, h: 2.1,
    border: { pt: 0.5, color: C.border },
    colW: [3.8, 1.8, 2.0, 1.6],
    rowH: 0.4,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — Future Work
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);
  s.addText("Future Work & Scalability", { x: 0.4, y: 0.15, w: 9.2, h: 0.52, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.68, w: 9.2, h: 0.02, fill: { color: C.border }, line: { color: C.border } });

  const items = [
    { n: "01", title: "Better Low-Light Detection",  desc: "Replace HOG with MTCNN / RetinaFace to raise Recall from 75% to 90%+ under poor lighting.", color: C.cyan   },
    { n: "02", title: "Horizontal AI Scaling",        desc: "Multiple AI service replicas behind a load balancer for 500+ concurrent users.",             color: C.green  },
    { n: "03", title: "LMS Integration",              desc: "Connect with Moodle / Blackboard via API to sync attendance with existing grade-books.",      color: C.purple },
    { n: "04", title: "Liveness Detection",           desc: "Anti-spoofing to reject photo / video attacks; step toward GDPR production deployment.",      color: C.amber  },
  ];

  items.forEach((item, i) => {
    const x = i < 2 ? 0.4 : 5.1;
    const y = i % 2 === 0 ? 0.86 : 3.1;
    card(s, x, y, 4.5, 2.0, { glow: item.color === C.cyan });
    // Big number background
    s.addText(item.n, { x: x + 2.7, y: y + 0.1, w: 1.65, h: 1.8, fontSize: 80, bold: true, color: C.border, fontFace: "Calibri", align: "right", valign: "bottom" });
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.18, w: 0.5, h: 0.5, fill: { color: item.color }, line: { color: item.color } });
    s.addText(item.n, { x: x + 0.15, y: y + 0.18, w: 0.5, h: 0.5, fontSize: 13, bold: true, color: C.bg1, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(item.title, { x: x + 0.8, y: y + 0.2, w: 3.55, h: 0.46, fontSize: 13.5, bold: true, color: C.white, fontFace: "Calibri", valign: "middle" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.15, y: y + 0.78, w: 4.22, h: 0.02, fill: { color: C.border }, line: { color: C.border } });
    s.addText(item.desc, { x: x + 0.15, y: y + 0.9, w: 4.22, h: 0.98, fontSize: 11.5, color: C.text, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — Conclusions
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  gradBg(s);

  s.addText("Conclusions", { x: 0.4, y: 0.1, w: 9.2, h: 0.55, fontSize: 34, bold: true, color: C.white, fontFace: "Calibri" });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 0.68, w: 9.2, h: 0.02, fill: { color: C.cyan }, line: { color: C.cyan } });

  const conclusions = [
    { text: "Analysed existing approaches — face recognition provides best accuracy / cost / usability balance vs RFID, QR, fingerprint.", color: C.cyan   },
    { text: "Designed and implemented microservices: NestJS REST API · Next.js web · FastAPI AI service · React Native mobile app.",      color: C.purple },
    { text: "Achieved Precision 100%, Recall 96.0%, F1 97.9% and False Positive Rate 0% across all test scenarios.",                     color: C.green  },
    { text: "Performance: image p95 = 3.42 s (req. ≤ 5 s); CRUD p95 = 98 ms; stable at 50 concurrent users with 0% error rate.",        color: C.amber  },
    { text: "Practical impact: attendance time reduced from 5–15 min to 1–1.5 min per class; no special hardware required.",             color: C.cyan   },
    { text: "All 8 functional requirements (FR1–FR8) fully implemented; deployed via a single Docker Compose command.",                   color: C.green  },
  ];

  conclusions.forEach((c, i) => {
    const y = 0.84 + i * 0.74;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: y + 0.08, w: 0.04, h: 0.52, fill: { color: c.color }, line: { color: c.color } });
    s.addText(c.text, { x: 0.6, y, w: 9.0, h: 0.68, fontSize: 12.5, color: C.text, fontFace: "Calibri", valign: "middle" });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.22, w: 10, h: 0.4, fill: { color: C.cyan }, line: { color: C.cyan } });
  s.addText("Thank you for your attention!", {
    x: 0, y: 5.22, w: 10, h: 0.4, fontSize: 14, bold: true, color: C.bg1, align: "center", valign: "middle", fontFace: "Calibri", margin: 0,
  });
}

// ── Save ──────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "/Users/dmyrto/Desktop/diploma web/Zubyk_Defense_Presentation.pptx" })
  .then(() => console.log("Done ✓"))
  .catch(e => { console.error(e); process.exit(1); });
