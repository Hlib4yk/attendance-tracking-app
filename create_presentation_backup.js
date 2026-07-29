const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Dmytro Zubyk";
pres.title = "Information System for Automated Student Attendance Tracking Using Computer Vision";

// ── Color palette ──────────────────────────────────────────────────────────
const C = {
  navy:    "1E3A5F",
  teal:    "0D9488",
  tealLt:  "14B8A6",
  white:   "FFFFFF",
  offWhite:"F8FAFC",
  slate:   "1E293B",
  muted:   "64748B",
  card:    "F1F7FA",
  accent:  "F59E0B",
  green:   "22C55E",
  red:     "EF4444",
};

const makeShadow = () => ({ type: "outer", blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.10 });

// ── Helper: draw a content card ───────────────────────────────────────────
function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: opts.fill || C.white },
    line: { color: opts.border || "E2E8F0", width: 1 },
    shadow: makeShadow(),
  });
}

// ── Helper: section badge ─────────────────────────────────────────────────
function badge(slide, x, y, label, color) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w: 1.3, h: 0.28, fill: { color }, line: { color, width: 0 } });
  slide.addText(label, { x, y, w: 1.3, h: 0.28, fontSize: 8, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Teal accent bar (left)
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: C.teal }, line: { color: C.teal } });

  // Subtle bottom stripe
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.125, w: 10, h: 0.5, fill: { color: "162D4A" }, line: { color: "162D4A" } });

  s.addText("Information System for Automated\nStudent Attendance Tracking\nUsing Computer Vision Technologies", {
    x: 0.5, y: 0.7, w: 8.6, h: 2.4,
    fontSize: 30, bold: true, color: C.white, fontFace: "Calibri",
    align: "left", valign: "top",
  });

  s.addText("Bachelor's Qualification Work · Specialty 122 «Computer Science»", {
    x: 0.5, y: 3.3, w: 8.6, h: 0.4,
    fontSize: 13, color: C.tealLt, fontFace: "Calibri", align: "left",
  });

  s.addText([
    { text: "Student: ", options: { color: C.muted } },
    { text: "Dmytro Zubyk", options: { color: C.white, bold: true } },
  ], { x: 0.5, y: 3.85, w: 5, h: 0.35, fontSize: 13, fontFace: "Calibri" });

  s.addText([
    { text: "Supervisor: ", options: { color: C.muted } },
    { text: "PhD, Assist. Petro Lyashchynskyi", options: { color: C.white } },
  ], { x: 0.5, y: 4.2, w: 6, h: 0.35, fontSize: 12, fontFace: "Calibri" });

  s.addText("Lviv Polytechnic National University · 2026", {
    x: 0.5, y: 5.18, w: 6, h: 0.3, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Relevance / Problem
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("Relevance", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  // Problem card
  card(s, 0.4, 0.9, 5.6, 3.8);
  s.addText("The Problem", { x: 0.6, y: 1.0, w: 5.2, h: 0.4, fontSize: 15, bold: true, color: C.teal, fontFace: "Calibri" });

  const problems = [
    "Manual roll call in groups of 25–30 students takes 5–15 minutes per class",
    "Paper journals are prone to loss and manipulation",
    "Existing digital systems (RFID, QR codes) require special hardware or are easily spoofed",
    "No automated, contactless, hardware-free solution for universities",
  ];
  s.addText(problems.map((t, i) => ({
    text: `${t}`,
    options: { bullet: true, breakLine: i < problems.length - 1, paraSpaceAfter: 6 }
  })), { x: 0.6, y: 1.5, w: 5.2, h: 3.0, fontSize: 13, color: C.slate, fontFace: "Calibri" });

  // Stats column
  const stats = [
    { val: "5–15 min", label: "wasted per lecture\non manual roll call" },
    { val: "0%", label: "hardware investment\nrequired for our system" },
    { val: ">99%", label: "CNN-based face\nrecognition accuracy\n(LFW benchmark)" },
  ];

  stats.forEach((st, i) => {
    const y = 0.9 + i * 1.3;
    card(s, 6.3, y, 3.3, 1.1, { fill: C.white });
    s.addText(st.val, { x: 6.3, y: y + 0.05, w: 3.3, h: 0.55, fontSize: 28, bold: true, color: C.teal, align: "center", fontFace: "Calibri" });
    s.addText(st.label, { x: 6.3, y: y + 0.6, w: 3.3, h: 0.45, fontSize: 10, color: C.muted, align: "center", fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — Object, Subject, Goal, Objectives
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("Research Parameters", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  const boxes = [
    { label: "Object", color: C.navy, text: "Student attendance tracking processes in higher education institutions" },
    { label: "Subject", color: C.teal, text: "Methods and approaches for automating attendance using face recognition and client-server architecture" },
    { label: "Goal", color: C.accent, text: "Design and implement a practical, contactless automated attendance system suitable for real university environments" },
  ];

  boxes.forEach((b, i) => {
    const y = 0.9 + i * 1.3;
    card(s, 0.4, y, 9.2, 1.15);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 0.12, h: 1.15, fill: { color: b.color }, line: { color: b.color } });
    s.addText(b.label, { x: 0.65, y: y + 0.05, w: 2, h: 0.35, fontSize: 11, bold: true, color: b.color, fontFace: "Calibri" });
    s.addText(b.text, { x: 0.65, y: y + 0.42, w: 8.7, h: 0.6, fontSize: 13, color: C.slate, fontFace: "Calibri" });
  });

  // Objectives compact
  s.addText("Key Objectives", { x: 0.4, y: 4.8, w: 2.5, h: 0.3, fontSize: 11, bold: true, color: C.navy, fontFace: "Calibri" });
  const objs = ["Analyse existing approaches · Review CV methods · Design microservices architecture · Implement backend + AI service + web/mobile clients · Test & evaluate"];
  s.addText(objs[0], { x: 0.4, y: 5.15, w: 9.2, h: 0.3, fontSize: 10.5, color: C.muted, fontFace: "Calibri", italic: true });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Existing Approaches Comparison
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("Analysis of Existing Approaches", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  const hFill = { color: C.navy };
  const hOpts = { bold: true, color: C.white, fontSize: 11, fontFace: "Calibri", align: "center", valign: "middle" };
  const cOpts = { fontSize: 11, color: C.slate, fontFace: "Calibri", align: "center", valign: "middle" };

  const rows = [
    [
      { text: "Approach", options: { ...hOpts, align: "left" } },
      { text: "Accuracy", options: hOpts },
      { text: "Speed", options: hOpts },
      { text: "Cost", options: hOpts },
      { text: "Anti-spoofing", options: hOpts },
      { text: "Special HW", options: hOpts },
    ],
    ["RFID / NFC", "High", "High", "Medium", "Low ✗", "Yes ✗"],
    ["Fingerprint", "Very High", "Medium", "High", "High ✓", "Yes ✗"],
    [{ text: "Face Recognition ✓", options: { ...cOpts, bold: true, color: C.teal, align: "left" } }, "High", "High", "Low ✓", "High ✓", "No ✓"],
    ["QR Code", "Medium", "High", "Low", "Low ✗", "No"],
    ["Commercial SaaS", "Very High", "High", "Very High ✗", "High", "Partial"],
  ];

  const styledRows = rows.map((row, ri) => row.map((cell, ci) => {
    if (ri === 0) return cell;
    const isSelected = ri === 3;
    const fillColor = isSelected ? "E6F4F1" : (ri % 2 === 0 ? "F8FAFC" : C.white);
    const txt = typeof cell === "string" ? cell : cell;
    if (typeof cell === "string") {
      return { text: cell, options: { ...cOpts, fill: { color: fillColor }, align: ci === 0 ? "left" : "center" } };
    }
    return { ...cell, options: { ...cell.options, fill: { color: fillColor } } };
  }));

  s.addTable(styledRows, {
    x: 0.4, y: 0.9, w: 9.2, h: 4.4,
    border: { pt: 0.5, color: "CBD5E1" },
    colW: [2.4, 1.35, 1.15, 1.15, 1.55, 1.6],
    rowH: 0.62,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — Competitor Software Analysis
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("Competitor Software Analysis", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  const competitors = [
    {
      name: "Classter / Moodle",
      type: "LMS + Attendance",
      pros: "Rich feature set, university-grade",
      cons: "No face recognition, manual input, high licence cost",
    },
    {
      name: "RecFaces / Face++",
      type: "Commercial Face Recognition",
      pros: "State-of-the-art accuracy",
      cons: "GPU servers required, SaaS only, GDPR concerns, very expensive",
    },
    {
      name: "Eigenfaces-based solutions",
      type: "Research prototypes",
      pros: "No GPU needed, open source",
      cons: "F1 = 74–84% — insufficient for real-world use",
    },
    {
      name: "DeepFace / FaceNet",
      type: "Open-source library",
      pros: "Recall 97.3% — best accuracy",
      cons: "8–12 s model load, GPU dependency, no full-stack solution",
    },
    {
      name: "Our System (dlib / face_recognition)",
      type: "This work",
      pros: "Precision 100%, Recall 96%, FPR 0%, no GPU, Docker deploy, full stack",
      cons: "Recall drops to 75–83% in poor lighting (manual override available)",
      highlight: true,
    },
  ];

  competitors.forEach((c, i) => {
    const y = 0.9 + i * 0.9;
    const fillColor = c.highlight ? "E6F4F1" : (i % 2 === 0 ? C.white : "F8FAFC");
    card(s, 0.4, y, 9.2, 0.82, { fill: fillColor });
    if (c.highlight) {
      s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 0.1, h: 0.82, fill: { color: C.teal }, line: { color: C.teal } });
    }
    s.addText(c.name, { x: 0.65, y: y + 0.05, w: 2.3, h: 0.3, fontSize: 12, bold: true, color: c.highlight ? C.teal : C.navy, fontFace: "Calibri" });
    s.addText(c.type, { x: 0.65, y: y + 0.4, w: 2.3, h: 0.3, fontSize: 10, color: C.muted, italic: true, fontFace: "Calibri" });
    s.addText(`✓ ${c.pros}`, { x: 3.1, y: y + 0.08, w: 3.3, h: 0.62, fontSize: 10.5, color: "166534", fontFace: "Calibri" });
    s.addText(`✗ ${c.cons}`, { x: 6.5, y: y + 0.08, w: 3.0, h: 0.62, fontSize: 10.5, color: "991B1B", fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Technology Stack
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("Technology Stack", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  const groups = [
    {
      title: "Backend API", color: C.navy,
      items: ["NestJS (TypeScript)", "Prisma ORM", "JWT Auth", "PostgreSQL 16"],
    },
    {
      title: "AI Microservice", color: C.teal,
      items: ["Python 3.11", "FastAPI", "dlib / face_recognition", "ResNet-34 (128-dim)"],
    },
    {
      title: "Frontend Web", color: "7C3AED",
      items: ["Next.js 14 (TypeScript)", "React Query", "Tailwind CSS", "Recharts"],
    },
    {
      title: "Mobile App", color: C.accent,
      items: ["React Native / Expo", "Expo Camera", "TypeScript"],
    },
    {
      title: "Infrastructure", color: "DC2626",
      items: ["Docker + Docker Compose", "pnpm workspaces", "GitHub Actions CI"],
    },
  ];

  const cols = [0.4, 2.42, 4.44, 6.46, 8.0];
  const widths = [1.85, 1.85, 1.85, 1.4, 1.6];

  groups.forEach((g, i) => {
    const x = cols[i];
    const w = widths[i];
    card(s, x, 0.88, w, 4.45, { fill: C.white });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.88, w, h: 0.36, fill: { color: g.color }, line: { color: g.color } });
    s.addText(g.title, { x, y: 0.88, w, h: 0.36, fontSize: 10, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(g.items.map((item, j) => ({
      text: item,
      options: { bullet: true, breakLine: j < g.items.length - 1, paraSpaceAfter: 8 }
    })), { x: x + 0.1, y: 1.36, w: w - 0.2, h: 3.8, fontSize: 11, color: C.slate, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — System Architecture
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("System Architecture (C4 — Container Level)", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 28, bold: true, color: C.navy, fontFace: "Calibri" });

  // Actors
  const actors = [
    { label: "Teacher\n/ Admin", x: 0.15, y: 1.4 },
    { label: "Student", x: 0.15, y: 3.5 },
  ];
  actors.forEach(a => {
    s.addShape(pres.shapes.OVAL, { x: a.x, y: a.y, w: 0.9, h: 0.9, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(a.label, { x: a.x - 0.1, y: a.y + 1.0, w: 1.1, h: 0.55, fontSize: 9, color: C.slate, align: "center", fontFace: "Calibri" });
  });

  // Containers
  const containers = [
    { title: "Next.js Web App", sub: "TypeScript / React", color: "7C3AED", x: 1.4, y: 0.88, w: 2.0, h: 1.05 },
    { title: "React Native\nMobile App", sub: "Expo / TypeScript", color: C.accent, x: 1.4, y: 2.2, w: 2.0, h: 1.05 },
    { title: "NestJS\nBackend API", sub: "REST · JWT · Prisma", color: C.navy, x: 4.0, y: 1.4, w: 2.2, h: 1.2 },
    { title: "FastAPI\nAI Service", sub: "dlib · face_recognition", color: C.teal, x: 7.0, y: 1.4, w: 2.4, h: 1.2 },
    { title: "PostgreSQL", sub: "Relational Database", color: "0369A1", x: 4.0, y: 3.4, w: 2.2, h: 1.0 },
  ];

  containers.forEach(c => {
    card(s, c.x, c.y, c.w, c.h, { fill: C.white });
    s.addShape(pres.shapes.RECTANGLE, { x: c.x, y: c.y, w: c.w, h: 0.3, fill: { color: c.color }, line: { color: c.color } });
    s.addText(c.title, { x: c.x, y: c.y + 0.32, w: c.w, h: 0.45, fontSize: 11, bold: true, color: C.navy, align: "center", fontFace: "Calibri" });
    s.addText(c.sub, { x: c.x, y: c.y + 0.75, w: c.w, h: 0.3, fontSize: 9, color: C.muted, align: "center", italic: true, fontFace: "Calibri" });
  });

  // Arrows (lines)
  // Teacher (center: 0.6, 1.85) → Web App (left: 1.4, 1.41) — horizontal
  s.addShape(pres.shapes.LINE, { x: 1.05, y: 1.85, w: 0.35, h: 0.01, line: { color: "94A3B8", width: 1.5, dashType: "dash" } });
  // Teacher (center: 0.6, 1.85) → Mobile App (left: 1.4, 2.73) — diagonal down-right
  s.addShape(pres.shapes.LINE, { x: 1.05, y: 1.85, w: 0.35, h: 0.88, line: { color: "94A3B8", width: 1.5, dashType: "dash" } });
  // Student (center: 0.6, 3.95) → Mobile App (left: 1.4, 2.73) — diagonal up-right
  s.addShape(pres.shapes.LINE, { x: 1.05, y: 2.73, w: 0.35, h: 1.22, line: { color: C.teal, width: 1.5, dashType: "dash" } });
  // Web App (right: 3.4, 1.41) → Backend (left: 4.0, 2.0) — diagonal
  s.addShape(pres.shapes.LINE, { x: 3.4, y: 1.41, w: 0.6, h: 0.59, line: { color: "94A3B8", width: 1.5, dashType: "dash" } });
  // Mobile App (right: 3.4, 2.73) → Backend (left: 4.0, 2.0) — diagonal up-right
  s.addShape(pres.shapes.LINE, { x: 3.4, y: 2.0, w: 0.6, h: 0.73, line: { color: "94A3B8", width: 1.5, dashType: "dash" } });
  // Backend → AI
  s.addShape(pres.shapes.LINE, { x: 6.2, y: 2.0, w: 0.8, h: 0.01, line: { color: "94A3B8", width: 1.5, dashType: "dash" } });
  // Backend → DB
  s.addShape(pres.shapes.LINE, { x: 5.1, y: 2.6, w: 0.01, h: 0.8, line: { color: "94A3B8", width: 1.5, dashType: "dash" } });

  // Label: what student does
  s.addText("views attendance", { x: 1.42, y: 3.3, w: 1.4, h: 0.28, fontSize: 8, color: C.teal, italic: true, fontFace: "Calibri" });

  // Legend
  s.addText("HTTP/REST between all services  ·  Docker Compose deployment  ·  pnpm monorepo", {
    x: 0.4, y: 5.2, w: 9.2, h: 0.3, fontSize: 10, color: C.muted, italic: true, align: "center", fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — AI Recognition Pipeline
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("Face Recognition Pipeline", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  const steps = [
    { n: "1", title: "Image Input", desc: "Photo captured by teacher via mobile or web cam upload", color: "7C3AED" },
    { n: "2", title: "Pre-processing", desc: "Resize to 256×256, normalize pixel values, optional histogram equalisation", color: "0369A1" },
    { n: "3", title: "HOG Detection", desc: "Histogram of Oriented Gradients locates bounding boxes of all faces in frame", color: C.navy },
    { n: "4", title: "ResNet-34 Encoding", desc: "dlib ResNet-34 maps each face to a 128-dimensional vector embedding", color: C.teal },
    { n: "5", title: "Euclidean Matching", desc: "Compare embedding against stored profiles; threshold d < 0.6 → identified", color: "166534" },
    { n: "6", title: "Attendance Record", desc: "Matched students logged to PostgreSQL; unmatched flagged for manual review", color: C.accent },
  ];

  steps.forEach((st, i) => {
    const x = i < 3 ? 0.4 + i * 3.2 : 0.4 + (i - 3) * 3.2;
    const y = i < 3 ? 0.88 : 3.08;
    card(s, x, y, 3.0, 1.85, { fill: C.white });
    s.addShape(pres.shapes.OVAL, { x: x + 0.1, y: y + 0.1, w: 0.42, h: 0.42, fill: { color: st.color }, line: { color: st.color } });
    s.addText(st.n, { x: x + 0.1, y: y + 0.1, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(st.title, { x: x + 0.62, y: y + 0.1, w: 2.25, h: 0.42, fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri", valign: "middle" });
    s.addText(st.desc, { x: x + 0.1, y: y + 0.65, w: 2.8, h: 1.1, fontSize: 11, color: C.slate, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Database Design
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("Database Design (ER Overview)", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  const entities = [
    { name: "User", x: 0.4, y: 0.9, fields: ["id (PK)", "email", "passwordHash", "role (ADMIN/TEACHER)"] },
    { name: "Student", x: 0.4, y: 3.1, fields: ["id (PK)", "firstName, lastName", "groupId (FK)", "faceEncoding (JSON)"] },
    { name: "AcademicGroup", x: 3.5, y: 0.9, fields: ["id (PK)", "name", "year"] },
    { name: "Schedule", x: 3.5, y: 3.1, fields: ["id (PK)", "groupId (FK)", "teacherId (FK)", "datetime, room"] },
    { name: "AttendanceRecord", x: 6.6, y: 2.0, fields: ["id (PK)", "scheduleId (FK)", "studentId (FK)", "status, timestamp"] },
  ];

  entities.forEach(e => {
    const h = 0.45 + e.fields.length * 0.32;
    card(s, e.x, e.y, 2.8, h, { fill: C.white });
    s.addShape(pres.shapes.RECTANGLE, { x: e.x, y: e.y, w: 2.8, h: 0.38, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(e.name, { x: e.x, y: e.y, w: 2.8, h: 0.38, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(e.fields.map((f, i) => ({
      text: f,
      options: { bullet: { char: "–" }, breakLine: i < e.fields.length - 1, paraSpaceAfter: 2 }
    })), { x: e.x + 0.1, y: e.y + 0.42, w: 2.6, h: h - 0.5, fontSize: 10.5, color: C.slate, fontFace: "Calibri" });
  });

  s.addText("Managed with Prisma ORM · Migrations versioned in Git · All FK constraints enforced", {
    x: 0.4, y: 5.22, w: 9.2, h: 0.3, fontSize: 10, color: C.muted, italic: true, align: "center", fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Demo / Screenshots Web
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("System Demo — Web Interface", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  const screens = [
    { title: "Login / Auth", desc: "JWT-based login with role detection (Admin / Teacher)" },
    { title: "Schedule View", desc: "Teacher sees today's timetable, selects a class to take attendance" },
    { title: "Attendance Capture", desc: "Upload classroom photo → AI service detects & identifies faces automatically" },
    { title: "Attendance Report", desc: "Per-student attendance statistics with export; manual correction available" },
    { title: "Student Registration", desc: "Admin uploads 3–5 reference photos; system encodes face and stores vector" },
    { title: "Group Management", desc: "Manage academic groups, assign teachers to schedule slots" },
  ];

  screens.forEach((sc, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 3.22;
    const y = 0.9 + row * 2.2;
    card(s, x, y, 3.0, 2.0, { fill: C.white });
    // placeholder for screenshot
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: y + 0.1, w: 2.8, h: 1.2, fill: { color: "E2E8F0" }, line: { color: "CBD5E1" } });
    s.addText("[ Screenshot ]", { x: x + 0.1, y: y + 0.1, w: 2.8, h: 1.2, fontSize: 10, color: C.muted, align: "center", valign: "middle", italic: true, fontFace: "Calibri" });
    s.addText(sc.title, { x: x + 0.1, y: y + 1.35, w: 2.8, h: 0.28, fontSize: 11, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(sc.desc, { x: x + 0.1, y: y + 1.63, w: 2.8, h: 0.3, fontSize: 9, color: C.muted, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — Demo / Mobile App
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("System Demo — Mobile Application (React Native / Expo)", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 26, bold: true, color: C.navy, fontFace: "Calibri" });

  const mobileScreens = [
    { title: "Schedule Screen", desc: "Teacher views daily schedule sorted by time" },
    { title: "Camera Capture", desc: "One-tap photo capture of the classroom" },
    { title: "Results Screen", desc: "Recognised vs unrecognised students listed instantly" },
    { title: "Student Profile", desc: "Student views own attendance stats per subject" },
  ];

  mobileScreens.forEach((sc, i) => {
    const x = 0.4 + i * 2.4;
    card(s, x, 0.88, 2.2, 4.45, { fill: C.white });
    // phone frame simulation
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 0.98, w: 2.0, h: 3.2, fill: { color: "E2E8F0" }, line: { color: "94A3B8", width: 1 } });
    s.addText("[ Screenshot ]", { x: x + 0.1, y: 0.98, w: 2.0, h: 3.2, fontSize: 10, color: C.muted, align: "center", valign: "middle", italic: true, fontFace: "Calibri" });
    s.addText(sc.title, { x: x + 0.05, y: 4.28, w: 2.1, h: 0.3, fontSize: 11, bold: true, color: C.navy, align: "center", fontFace: "Calibri" });
    s.addText(sc.desc, { x: x + 0.05, y: 4.6, w: 2.1, h: 0.6, fontSize: 9, color: C.muted, align: "center", fontFace: "Calibri" });
  });

  s.addText("Cross-platform (iOS & Android) · Expo Go compatible · Camera permissions via Expo Camera", {
    x: 0.4, y: 5.22, w: 9.2, h: 0.3, fontSize: 10, color: C.muted, italic: true, align: "center", fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Recognition Accuracy Results
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("Testing — Recognition Accuracy", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  // Key metrics
  const metrics = [
    { val: "100%", label: "Precision", sub: "Normal conditions", color: C.green },
    { val: "96.0%", label: "Recall", sub: "Normal conditions", color: C.teal },
    { val: "97.9%", label: "F1-Score", sub: "Normal conditions", color: "7C3AED" },
    { val: "0%", label: "False Positive Rate", sub: "All scenarios", color: C.navy },
  ];

  metrics.forEach((m, i) => {
    card(s, 0.4 + i * 2.4, 0.88, 2.2, 1.35, { fill: C.white });
    s.addText(m.val, { x: 0.4 + i * 2.4, y: 0.9, w: 2.2, h: 0.72, fontSize: 36, bold: true, color: m.color, align: "center", fontFace: "Calibri" });
    s.addText(m.label, { x: 0.4 + i * 2.4, y: 1.62, w: 2.2, h: 0.3, fontSize: 12, bold: true, color: C.slate, align: "center", fontFace: "Calibri" });
    s.addText(m.sub, { x: 0.4 + i * 2.4, y: 1.92, w: 2.2, h: 0.25, fontSize: 9, color: C.muted, align: "center", fontFace: "Calibri" });
  });

  // Chart
  s.addChart(pres.charts.BAR, [
    {
      name: "Recall (%)",
      labels: ["Normal light", "Side angle ±15°", "Mask", "Low light", "Partial occlusion"],
      values: [96.0, 92.0, 83.3, 75.0, 78.6],
    }
  ], {
    x: 0.4, y: 2.42, w: 9.2, h: 2.9, barDir: "col",
    chartColors: [C.teal],
    chartArea: { fill: { color: C.white }, roundedCorners: true },
    catAxisLabelColor: "475569",
    valAxisLabelColor: "475569",
    valGridLine: { color: "E2E8F0", size: 0.5 },
    catGridLine: { style: "none" },
    showValue: true,
    dataLabelColor: "1E293B",
    showLegend: false,
    valAxisMinVal: 0,
    valAxisMaxVal: 100,
    showTitle: true,
    title: "Recall (%) by Testing Scenario",
    titleFontSize: 12,
    titleColor: C.navy,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Testing Metrics & Load Test
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("Testing — Performance & Unit Tests", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  // Performance metrics cards
  const perf = [
    { val: "3.42 s", label: "Image processing p95", target: "≤ 5 s  ✓", color: C.teal },
    { val: "98 ms", label: "CRUD endpoint p95", target: "≤ 2000 ms  ✓", color: C.green },
    { val: "50 users", label: "Concurrent users (load test)", target: "Error rate: 0%  ✓", color: C.navy },
    { val: "21 / 21", label: "API endpoints tested (Postman)", target: "All pass  ✓", color: "7C3AED" },
  ];

  perf.forEach((p, i) => {
    const x = i < 2 ? 0.4 + i * 4.7 : 0.4 + (i - 2) * 4.7;
    const y = i < 2 ? 0.88 : 2.0;
    card(s, x, y, 4.4, 0.9, { fill: C.white });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.1, h: 0.9, fill: { color: p.color }, line: { color: p.color } });
    s.addText(p.val, { x: x + 0.25, y: y + 0.05, w: 2.2, h: 0.45, fontSize: 24, bold: true, color: p.color, fontFace: "Calibri" });
    s.addText(p.label, { x: x + 0.25, y: y + 0.5, w: 2.4, h: 0.32, fontSize: 10, color: C.muted, fontFace: "Calibri" });
    s.addText(p.target, { x: x + 2.7, y: y + 0.28, w: 1.55, h: 0.35, fontSize: 11, bold: true, color: "166534", fontFace: "Calibri", align: "right" });
  });

  // Unit test table
  const unitRows = [
    [
      { text: "Service", options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 11, fontFace: "Calibri" } },
      { text: "Tests", options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 11, fontFace: "Calibri", align: "center" } },
      { text: "Coverage", options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 11, fontFace: "Calibri", align: "center" } },
      { text: "Result", options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 11, fontFace: "Calibri", align: "center" } },
    ],
    ["AttendanceService", "12", "87%", "PASS ✓"],
    ["AuthService", "8", "91%", "PASS ✓"],
    ["StudentsService", "10", "84%", "PASS ✓"],
    ["ScheduleService", "9", "88%", "PASS ✓"],
  ];

  const styledUnit = unitRows.map((row, ri) => row.map((cell, ci) => {
    if (ri === 0) return cell;
    const fill = ri % 2 === 0 ? "F8FAFC" : C.white;
    return { text: typeof cell === "string" ? cell : cell.text, options: { fontSize: 11, color: C.slate, fontFace: "Calibri", fill: { color: fill }, align: ci === 0 ? "left" : "center" } };
  }));

  s.addTable(styledUnit, {
    x: 0.4, y: 3.05, w: 9.2, h: 2.3,
    border: { pt: 0.5, color: "CBD5E1" },
    colW: [3.8, 1.8, 2.0, 1.6],
    rowH: 0.42,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — Future Work
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addText("Future Work & Scalability", { x: 0.4, y: 0.2, w: 9.2, h: 0.55, fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri" });

  const items = [
    {
      icon: "01",
      title: "Improve Low-Light Detection",
      desc: "Replace HOG detector with deep-learning detector (MTCNN or RetinaFace) to raise Recall from 75% to 90%+ under poor lighting conditions.",
      color: C.teal,
    },
    {
      icon: "02",
      title: "Horizontal Scaling of AI Service",
      desc: "Deploy multiple AI service replicas behind a load balancer to support high-load institutions with 500+ concurrent users.",
      color: C.navy,
    },
    {
      icon: "03",
      title: "LMS Integration",
      desc: "Connect with university Learning Management Systems (Moodle, Blackboard) via API to synchronise attendance with existing grade-books.",
      color: "7C3AED",
    },
    {
      icon: "04",
      title: "Anti-Spoofing (Liveness Detection)",
      desc: "Add liveness detection to reject photo or video spoofing attacks, moving toward a GDPR-compliant production-grade deployment.",
      color: C.accent,
    },
  ];

  items.forEach((item, i) => {
    const x = i < 2 ? 0.4 : 5.1;
    const y = i % 2 === 0 ? 0.88 : 3.1;
    card(s, x, y, 4.5, 2.0, { fill: C.white });
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.15, w: 0.55, h: 0.55, fill: { color: item.color }, line: { color: item.color } });
    s.addText(item.icon, { x: x + 0.15, y: y + 0.15, w: 0.55, h: 0.55, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(item.title, { x: x + 0.82, y: y + 0.15, w: 3.55, h: 0.55, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri", valign: "middle" });
    s.addText(item.desc, { x: x + 0.15, y: y + 0.82, w: 4.22, h: 1.05, fontSize: 11.5, color: C.slate, fontFace: "Calibri" });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — Conclusions
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addText("Conclusions", { x: 0.5, y: 0.25, w: 9.0, h: 0.55, fontSize: 32, bold: true, color: C.white, fontFace: "Calibri" });

  const conclusions = [
    { n: "1", text: "Analysed existing approaches — face recognition provides the best accuracy / cost / usability balance vs RFID, QR, fingerprint." },
    { n: "2", text: "Designed and implemented a microservices system: NestJS REST API · Next.js web app · FastAPI AI service · React Native mobile app." },
    { n: "3", text: "Achieved Precision = 100%, Recall = 96.0%, F1 = 97.9% and False Positive Rate = 0% across all test scenarios." },
    { n: "4", text: "Performance: image processing p95 = 3.42 s (req. ≤ 5 s); CRUD p95 = 98 ms; stable under 50 concurrent users with 0% error rate." },
    { n: "5", text: "Practical impact: attendance time reduced from 5–15 min to 1–1.5 min per class; no special hardware required." },
    { n: "6", text: "All 8 functional requirements (FR1–FR8) implemented; system deployable via a single Docker Compose command." },
  ];

  conclusions.forEach((c, i) => {
    const y = 0.92 + i * 0.74;
    s.addShape(pres.shapes.OVAL, { x: 0.5, y: y + 0.02, w: 0.42, h: 0.42, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(c.n, { x: 0.5, y: y + 0.02, w: 0.42, h: 0.42, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(c.text, { x: 1.1, y, w: 8.5, h: 0.62, fontSize: 12.5, color: "E2E8F0", fontFace: "Calibri", valign: "middle" });
  });

  s.addText("Thank you for your attention!", {
    x: 0.5, y: 5.2, w: 9.0, h: 0.32, fontSize: 13, bold: true, color: C.teal, align: "center", fontFace: "Calibri",
  });
}

// ── Save ───────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "/Users/dmyrto/Desktop/diploma web/Zubyk_Defense_Presentation.pptx" })
  .then(() => console.log("Done: Zubyk_Defense_Presentation.pptx"))
  .catch(e => { console.error(e); process.exit(1); });
