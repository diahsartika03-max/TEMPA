/* =========================================================
   TEMPA | script.js
   Bagian 1: CONFIG  (ubah nomor dokter, warna patch, dll. di sini)
   Bagian 2: Logika penilaian (fungsi murni, mudah diuji)
   Bagian 3: Tampilan (form bertahap, hasil, riwayat)
   ========================================================= */

/* ---------------------------------------------------------
   1. CONFIG
   --------------------------------------------------------- */
const CONFIG = {
  // Nomor darurat nasional
  emergencyNumbers: [
    { label: "Ambulans dan darurat medis", number: "119" },
    { label: "Darurat umum", number: "112" },
  ],

  // Dokter yang bisa dihubungi. Ganti dengan data asli.
  // whatsapp: format internasional tanpa tanda + atau spasi (contoh 6281234567890)
  doctors: [
    {
      name: "dr. [Nama Dokter], Sp.A",
      schedule: "Isi jadwal konsultasi di sini",
      phone: "+62 812-0000-0000",
      whatsapp: "6281200000000",
    },
  ],

  // Pencarian IGD terdekat di Google Maps
  hospitalSearchUrl: "https://www.google.com/maps/search/?api=1&query=IGD+rumah+sakit+terdekat",

  // Perkiraan dosis parasetamol berdasarkan berat badan.
  // Dimatikan secara default. Aktifkan hanya setelah angka di bawah
  // dikonfirmasi oleh dokter atau apoteker pembimbing.
  showDose: false,
  dose: { mgPerKgMin: 10, mgPerKgMax: 15, intervalHours: "4 sampai 6", maxDosesPerDay: 4 },

  // Skala warna patch. Sesuaikan warna (hex) dengan warna patch yang sebenarnya.
  // level 1 = normal ... level 5 = paling tinggi
  tempLevels: [
    { id: "t1", level: 1, name: "Normal",             range: "di bawah 37,5 °C", color: "#9ccbe6" },
    { id: "t2", level: 2, name: "Demam ringan",       range: "37,5 sampai 38,4 °C", color: "#a8d5b5" },
    { id: "t3", level: 3, name: "Demam sedang",       range: "38,5 sampai 39,4 °C", color: "#f7d58b" },
    { id: "t4", level: 4, name: "Demam tinggi",       range: "39,5 sampai 40,4 °C", color: "#f5ae8b" },
    { id: "t5", level: 5, name: "Demam sangat tinggi", range: "40,5 °C atau lebih",  color: "#ee8ca6" },
  ],

  // Rentang lama demam
  durations: [
    { id: "d0", label: "Kurang dari 24 jam", days: 0 },
    { id: "d1", label: "1 sampai 2 hari",    days: 1 },
    { id: "d3", label: "3 hari",             days: 3 },
    { id: "d4", label: "Lebih dari 3 hari",  days: 4 },
    { id: "d6", label: "Lebih dari 5 hari",  days: 6 },
  ],

  // Keluhan. sev: "red" = tanda bahaya, "yellow" = perlu konsultasi, "mild" = pemantau
  symptoms: [
    // Tanda bahaya
    { id: "kejang",     sev: "red", group: "danger", label: "Sedang kejang atau baru saja kejang" },
    { id: "sulit_bgn",  sev: "red", group: "danger", label: "Sulit dibangunkan, tidak merespons, atau sangat lemas" },
    { id: "sesak",      sev: "red", group: "danger", label: "Sesak atau napas cepat" },
    { id: "leher",      sev: "red", group: "danger", label: "Leher kaku atau tidak mau menunduk" },
    { id: "petekie",    sev: "red", group: "danger", label: "Bintik merah di kulit yang tidak hilang saat ditekan" },
    { id: "muntah_trs", sev: "red", group: "danger", label: "Muntah terus-menerus atau berwarna hijau" },
    { id: "dehidrasi",  sev: "red", group: "danger", label: "Tidak mau minum, jarang buang air kecil, bibir kering, atau mata cekung" },
    { id: "pucat",      sev: "red", group: "danger", label: "Bibir atau kulit membiru atau pucat, tangan dan kaki dingin" },
    // Perlu konsultasi
    { id: "kepala_hebat", sev: "yellow", group: "other", label: "Sakit kepala hebat" },
    { id: "suhu_naik",    sev: "yellow", group: "other", label: "Badan terasa makin panas dalam beberapa jam terakhir" },
    { id: "muntah",       sev: "yellow", group: "other", label: "Muntah 1 sampai 2 kali" },
    { id: "diare",        sev: "yellow", group: "other", label: "Diare" },
    { id: "telinga",      sev: "yellow", group: "other", label: "Nyeri telinga atau cairan keluar dari telinga" },
    { id: "bak",          sev: "yellow", group: "other", label: "Nyeri saat buang air kecil" },
    { id: "ruam",         sev: "yellow", group: "other", label: "Ruam kemerahan yang memudar saat ditekan" },
    { id: "kurang_minum", sev: "yellow", group: "other", label: "Minum atau menyusu jauh berkurang" },
    // Dipantau
    { id: "sakit_kepala", sev: "mild", group: "other", label: "Sakit kepala ringan" },
    { id: "menggigil",    sev: "mild", group: "other", label: "Menggigil" },
    { id: "keringat",     sev: "mild", group: "other", label: "Berkeringat banyak" },
    { id: "rewel",        sev: "mild", group: "other", label: "Lemas atau rewel" },
    { id: "nafsu",        sev: "mild", group: "other", label: "Nafsu makan turun" },
    { id: "batuk",        sev: "mild", group: "other", label: "Batuk atau pilek" },
    { id: "tenggorokan",  sev: "mild", group: "other", label: "Nyeri tenggorokan" },
  ],

  // Riwayat di perangkat
  storageKey: "tempa-riwayat-v1",
  maxHistory: 20,
};

/* ---------------------------------------------------------
   2. LOGIKA PENILAIAN
   --------------------------------------------------------- */
const tempById = (id) => CONFIG.tempLevels.find((t) => t.id === id);
const durationById = (id) => CONFIG.durations.find((d) => d.id === id);

/**
 * input: {
 *   ageMonths: number, tempId: string, durationId: string,
 *   seizure: "tidak" | "ya" | "tidak_tahu", symptoms: string[]
 * }
 * return: { level: "red" | "yellow" | "green", reasons: string[] }
 */
function evaluate(input) {
  const months = input.ageMonths;
  const temp = tempById(input.tempId);
  const dur = durationById(input.durationId);
  const t = temp.level;
  const fever = t >= 2;

  const picked = CONFIG.symptoms.filter((s) => input.symptoms.includes(s.id));
  const red = picked.filter((s) => s.sev === "red").map((s) => s.label);
  const yellow = picked.filter((s) => s.sev === "yellow").map((s) => s.label);
  const mildCount = picked.filter((s) => s.sev === "mild").length;

  // Tanda bahaya tambahan dari usia, suhu, dan riwayat
  if (fever && months < 3) red.push("Bayi di bawah 3 bulan yang demam perlu diperiksa dokter segera");
  if (t >= 5) red.push("Suhu sangat tinggi (40,5 °C atau lebih)");
  if (input.seizure === "ya" && t >= 4) red.push("Pernah kejang saat demam dan suhu sekarang 39,5 °C atau lebih");

  // Perlu konsultasi
  if (fever && months >= 3 && months < 6) yellow.push("Bayi usia 3 sampai 6 bulan yang demam sebaiknya diperiksa dokter");
  if (t === 4) yellow.push("Suhu tinggi (39,5 sampai 40,4 °C)");
  if (fever && input.seizure === "ya") yellow.push("Ada riwayat kejang saat demam");
  if (fever && dur.days >= 6) yellow.push("Demam sudah lebih dari 5 hari dan perlu pemeriksaan penyebabnya");
  else if (fever && dur.days >= 3) yellow.push("Demam sudah berlangsung " + dur.label.toLowerCase());
  if (fever && mildCount >= 3) yellow.push("Beberapa keluhan muncul bersamaan");

  if (red.length) return { level: "red", reasons: red };
  if (yellow.length) return { level: "yellow", reasons: yellow };

  const reasons = fever
    ? ["Demam masih tergolong ringan sampai sedang dan tidak ada tanda bahaya"]
    : ["Suhu normal dan tidak ada tanda bahaya"];
  return { level: "green", reasons };
}

/* ---------------------------------------------------------
   3. TAMPILAN
   --------------------------------------------------------- */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Pembuat elemen. Teks selalu lewat textContent agar aman dari injeksi HTML.
  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "style") node.setAttribute("style", v);
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return node;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollToEl = (node) => node.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

  const LEVELS = {
    red: {
      cls: "alert", badge: "Darurat", title: "Segera ke IGD rumah sakit",
      answer: "Ya. Bawa anak ke rumah sakit sekarang.",
    },
    yellow: {
      cls: "warn", badge: "Waspada", title: "Konsultasi dokter hari ini",
      answer: "Belum tentu perlu ke IGD. Hubungi dokter hari ini, dan segera ke rumah sakit bila muncul tanda bahaya.",
    },
    green: {
      cls: "ok", badge: "Aman dipantau", title: "Pantau di rumah",
      answer: "Belum perlu ke rumah sakit. Terus pantau warna patch dan kondisi anak.",
    },
  };

  const ACTIONS = {
    red: [
      "Bawa anak ke IGD terdekat sekarang, atau hubungi 119.",
      "Bila anak kejang, ikuti langkah pertolongan pertama kejang di bawah.",
      "Selama perjalanan, baringkan anak miring bila kurang sadar dan longgarkan pakaiannya.",
      "Jangan memberi makan atau minum bila anak kurang sadar atau sedang kejang.",
      "Catat jam demam mulai, suhu tertinggi, dan obat yang sudah diberikan untuk disampaikan ke dokter.",
    ],
    yellow: [
      "Hubungi dokter hari ini lewat kontak di bawah dan sampaikan hasil pemeriksaan ini.",
      "Pakaikan baju tipis dan jaga ruangan tetap sejuk serta berventilasi.",
      "Kompres dengan air hangat suam-suam kuku di dahi, ketiak, dan lipatan paha. Jangan memakai air es atau alkohol.",
      "Beri cairan sedikit-sedikit tetapi sering. Bayi tetap disusui.",
      "Periksa warna patch tiap 30 sampai 60 menit dan catat perubahannya.",
      "Jangan memberi aspirin pada anak.",
    ],
    green: [
      "Pakaikan baju tipis dan jaga ruangan tetap sejuk serta berventilasi.",
      "Bila demam, kompres dengan air hangat suam-suam kuku di dahi, ketiak, dan lipatan paha.",
      "Beri minum yang cukup. Bayi tetap disusui.",
      "Biarkan anak beristirahat.",
      "Periksa warna patch tiap 1 sampai 2 jam dan catat perubahannya.",
      "Obat penurun panas hanya bila dianjurkan dokter atau apoteker, sesuai petunjuk kemasan dan berat badan. Jangan memberi aspirin pada anak.",
    ],
  };

  const GO_TO_ER = [
    "Anak kejang",
    "Sulit dibangunkan, sangat lemas, atau tidak merespons",
    "Sesak atau napas cepat",
    "Muntah terus-menerus, tidak mau minum, atau jarang buang air kecil",
    "Bintik merah di kulit yang tidak hilang saat ditekan, atau leher kaku",
    "Patch menunjukkan warna paling tinggi (40,5 °C atau lebih)",
  ];

  const SEIZURE_STEPS = [
    "Tetap tenang dan catat jam mulai kejang.",
    "Baringkan anak di tempat datar, miringkan badannya agar air liur atau muntah dapat keluar.",
    "Longgarkan pakaian di leher dan dada, jauhkan benda keras di sekitarnya.",
    "Jangan masukkan apa pun ke mulut (sendok, jari, obat) dan jangan menahan gerakan kejang.",
    "Jangan memberi makan atau minum sampai anak sadar penuh.",
    "Hubungi 119 atau bawa ke IGD bila kejang lebih dari 5 menit, berulang, anak tidak sadar setelahnya, atau sulit bernapas. Walaupun kejang sudah berhenti, anak tetap perlu diperiksa dokter, terutama pada kejang pertama.",
  ];

  /* ---------- Util ---------- */
  const fmtNum = (n) => String(n).replace(".", ",");
  function fmtAge(months) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const parts = [];
    if (y) parts.push(y + " tahun");
    if (m || !y) parts.push(m + " bulan");
    return parts.join(" ");
  }

  let toastTimer;
  function toast(msg) {
    const node = $("#toast");
    node.textContent = msg;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.hidden = true; }, 2200);
  }

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg || "Tersalin");
    } catch (e) {
      // Cadangan untuk browser yang menolak clipboard API
      const ta = el("textarea", { style: "position:fixed;opacity:0;left:-9999px" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
      ta.remove();
      toast(ok ? (okMsg || "Tersalin") : "Gagal menyalin. Salin manual.");
    }
  }

  /* ---------- Render awal: skala, chip, keluhan ---------- */
  function renderScale() {
    const list = $("#scale-strip");
    CONFIG.tempLevels.forEach((t) => {
      list.append(
        el("li", { style: "--c:" + t.color },
          el("span", { class: "sw" }),
          el("span", { class: "nm" }, t.name),
          el("span", { class: "rg" }, t.range.replace(" °C", "°")))
      );
    });
  }

  function renderTempChips() {
    const wrap = $("#chips-temp");
    CONFIG.tempLevels.forEach((t) => {
      wrap.append(
        el("label", { class: "chip", style: "--c:" + t.color },
          el("input", { type: "radio", name: "temp", value: t.id }),
          el("span", {},
            el("i", { class: "sw" }),
            el("span", { class: "tx" }, t.name, el("small", {}, t.range))))
      );
    });
  }

  function renderDurationChips() {
    const wrap = $("#chips-duration");
    CONFIG.durations.forEach((d) => {
      wrap.append(
        el("label", { class: "chip" },
          el("input", { type: "radio", name: "duration", value: d.id }),
          el("span", {}, d.label))
      );
    });
  }

  function renderSymptoms() {
    const root = $("#symptom-groups");
    const groups = [
      { key: "danger", title: "Tanda bahaya", cls: "danger" },
      { key: "other", title: "Keluhan lain", cls: "" },
    ];
    groups.forEach((g) => {
      const items = CONFIG.symptoms.filter((s) => s.group === g.key);
      root.append(
        el("fieldset", { class: "symptom-group " + g.cls },
          el("legend", {}, g.title),
          el("div", { class: "checks" },
            items.map((s) =>
              el("label", { class: "check" },
                el("input", { type: "checkbox", name: "symptom", value: s.id }),
                el("span", {}, s.label)))))
      );
    });
  }

  /* ---------- Form bertahap ---------- */
  const form = $("#form");
  const steps = $$(".step", form);
  const stepperItems = $$("#stepper li");
  const btnBack = $("#btn-back");
  const btnNext = $("#btn-next");
  const errBox = $("#form-error");
  let current = 1;

  function showStep(n) {
    current = n;
    steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    stepperItems.forEach((li) => {
      const i = Number(li.dataset.stepper);
      li.classList.toggle("done", i < n);
      if (i === n) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    btnBack.hidden = n === 1;
    btnNext.textContent = n === steps.length ? "Lihat hasil" : "Lanjut";
    hideError();
  }

  function showError(msg) { errBox.textContent = msg; errBox.hidden = false; }
  function hideError() { errBox.hidden = true; errBox.textContent = ""; }

  const radioValue = (name) => {
    const r = form.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : null;
  };

  function validate(n) {
    if (n === 1) {
      const name = $("#nama").value.trim();
      if (!name) return ($("#nama").focus(), "Isi nama anak terlebih dahulu.");

      const yRaw = $("#umur-tahun").value.trim();
      const mRaw = $("#umur-bulan").value.trim();
      if (yRaw === "" && mRaw === "") return ($("#umur-tahun").focus(), "Isi umur anak, boleh hanya tahun atau hanya bulan.");
      const y = yRaw === "" ? 0 : Number(yRaw);
      const m = mRaw === "" ? 0 : Number(mRaw);
      if (!Number.isInteger(y) || y < 0 || y > 17) return ($("#umur-tahun").focus(), "Umur tahun harus 0 sampai 17. TEMPA dirancang untuk anak.");
      if (!Number.isInteger(m) || m < 0 || m > 11) return ($("#umur-bulan").focus(), "Umur bulan harus 0 sampai 11.");

      const w = Number($("#berat").value);
      if (!$("#berat").value || !(w >= 2 && w <= 120)) return ($("#berat").focus(), "Isi berat badan antara 2 sampai 120 kg.");
      if (!radioValue("gender")) return "Pilih jenis kelamin anak.";
    }
    if (n === 2) {
      if (!radioValue("temp")) return "Pilih warna atau suhu yang terbaca saat ini.";
      if (!radioValue("duration")) return "Pilih sudah berapa lama anak demam.";
      if (!radioValue("seizure")) return "Pilih apakah anak pernah kejang saat demam.";
    }
    return null;
  }

  function collect() {
    const y = Number($("#umur-tahun").value) || 0;
    const m = Number($("#umur-bulan").value) || 0;
    return {
      name: $("#nama").value.trim(),
      ageMonths: y * 12 + m,
      weight: Number($("#berat").value),
      gender: radioValue("gender"),
      tempId: radioValue("temp"),
      durationId: radioValue("duration"),
      seizure: radioValue("seizure"),
      symptoms: $$('input[name="symptom"]:checked', form).map((i) => i.value),
    };
  }

  btnNext.addEventListener("click", () => {
    const err = validate(current);
    if (err) return showError(err);
    if (current < steps.length) {
      showStep(current + 1);
      scrollToEl($("#periksa"));
    } else {
      submit();
    }
  });
  btnBack.addEventListener("click", () => {
    if (current > 1) showStep(current - 1);
  });
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox") {
      e.preventDefault();
      btnNext.click();
    }
  });

  /* ---------- Hasil ---------- */
  function summaryText(d, r) {
    const t = tempById(d.tempId);
    const dur = durationById(d.durationId);
    const sx = CONFIG.symptoms.filter((s) => d.symptoms.includes(s.id)).map((s) => s.label);
    return [
      "Hasil pemeriksaan TEMPA",
      "Nama: " + d.name,
      "Umur: " + fmtAge(d.ageMonths),
      "Berat badan: " + fmtNum(d.weight) + " kg",
      "Jenis kelamin: " + d.gender,
      "Suhu patch: " + t.name + " (" + t.range + ")",
      "Lama demam: " + dur.label,
      "Riwayat kejang demam: " + ({ tidak: "belum pernah", ya: "pernah", tidak_tahu: "tidak tahu" }[d.seizure]),
      "Keluhan: " + (sx.length ? sx.join("; ") : "tidak ada yang dipilih"),
      "Penilaian: " + LEVELS[r.level].title,
    ].join("\n");
  }

  function contactRow(doc, d, r) {
    const wa = "https://wa.me/" + doc.whatsapp + "?text=" + encodeURIComponent(summaryText(d, r));
    return el("li", { class: "contact" },
      el("div", { class: "contact-info" },
        el("span", { class: "contact-name" }, doc.name),
        el("span", { class: "contact-meta" }, doc.schedule),
        el("span", { class: "contact-number" }, doc.phone)),
      el("div", { class: "contact-actions" },
        el("a", { class: "btn btn-primary btn-small", href: wa, target: "_blank", rel: "noopener" }, "Chat WhatsApp"),
        el("button", { type: "button", class: "btn btn-ghost btn-small", onclick: () => copyText(doc.phone, "Nomor tersalin") }, "Salin nomor")));
  }

  function emergencyRow(e) {
    return el("li", { class: "contact emergency" },
      el("div", { class: "contact-info" },
        el("span", { class: "contact-name" }, e.label),
        el("span", { class: "contact-number" }, e.number)),
      el("div", { class: "contact-actions" },
        el("a", { class: "btn btn-pink btn-small", href: "tel:" + e.number }, "Hubungi " + e.number)));
  }

  function renderResult(d, r) {
    const meta = LEVELS[r.level];
    const t = tempById(d.tempId);
    const dur = durationById(d.durationId);
    const body = $("#hasil-body");
    body.replaceChildren();

    const verdict = el("div", { class: "verdict " + meta.cls },
      el("span", { class: "verdict-badge" }, el("i"), meta.badge),
      el("h2", { id: "hasil-title" }, meta.title),
      el("p", { class: "verdict-q" }, "Perlu ke rumah sakit?"),
      el("p", { class: "verdict-answer" }, meta.answer),
      r.level === "red"
        ? el("div", { class: "hero-actions" },
            el("a", { class: "btn btn-primary", href: CONFIG.hospitalSearchUrl, target: "_blank", rel: "noopener" }, "Cari IGD terdekat"))
        : null);

    const summary = el("section", { class: "card panel" },
      el("h3", {}, "Data pemeriksaan"),
      el("dl", { class: "summary" },
        el("div", {}, el("dt", {}, "Nama"), el("dd", {}, d.name)),
        el("div", {}, el("dt", {}, "Umur"), el("dd", {}, fmtAge(d.ageMonths))),
        el("div", {}, el("dt", {}, "Berat badan"), el("dd", {}, fmtNum(d.weight) + " kg")),
        el("div", {}, el("dt", {}, "Jenis kelamin"), el("dd", {}, d.gender)),
        el("div", {}, el("dt", {}, "Suhu patch"),
          el("dd", {}, el("i", { class: "sw", style: "--c:" + t.color }), t.name + ", " + t.range)),
        el("div", {}, el("dt", {}, "Lama demam"), el("dd", {}, dur.label))));

    const reasons = el("section", { class: "card panel" },
      el("h3", {}, "Dasar penilaian"),
      el("ul", { class: "bullets" + (r.level === "red" ? " danger" : "") }, r.reasons.map((x) => el("li", {}, x))));

    const actions = el("section", { class: "card panel" },
      el("h3", {}, "Yang bisa dilakukan sekarang"),
      el("ol", { class: "plain-steps" }, ACTIONS[r.level].map((x) => el("li", {}, x))),
      doseBlock(d));

    const goEr = r.level === "red" ? null : el("section", { class: "card panel" },
      el("h3", {}, "Segera ke IGD bila muncul"),
      el("ul", { class: "bullets danger" }, GO_TO_ER.map((x) => el("li", {}, x))));

    const contacts = el("section", { class: "card panel" },
      el("h3", {}, "Hubungi"),
      el("ul", { class: "contact-list" },
        r.level === "red" ? CONFIG.emergencyNumbers.map(emergencyRow) : null,
        CONFIG.doctors.map((doc) => contactRow(doc, d, r)),
        r.level !== "red" ? CONFIG.emergencyNumbers.map(emergencyRow) : null),
      el("button", { type: "button", class: "btn btn-ghost btn-small", style: "align-self:flex-start",
        onclick: () => copyText(summaryText(d, r), "Ringkasan tersalin") }, "Salin ringkasan untuk dokter"));

    const seizure = el("details", { class: "card seizure seizure-in-result", open: r.level === "red" },
      el("summary", {}, "Pertolongan pertama saat anak kejang"),
      el("ol", { class: "plain-steps" }, SEIZURE_STEPS.map((x) => el("li", {}, x))));

    const buttons = el("div", { class: "result-actions" },
      el("button", { type: "button", class: "btn btn-primary", onclick: recheck }, "Periksa ulang"),
      el("button", { type: "button", class: "btn btn-ghost", onclick: startNew }, "Anak lain"));

    const order = r.level === "red"
      ? [verdict, contacts, actions, seizure, reasons, summary, buttons]
      : [verdict, reasons, actions, goEr, contacts, seizure, summary, buttons];

    body.append(el("div", { class: "result" }, order));
    const section = $("#hasil");
    section.hidden = false;
    scrollToEl(section);
    body.focus({ preventScroll: true });
  }

  function doseBlock(d) {
    if (!CONFIG.showDose || d.ageMonths < 3) return null;
    const c = CONFIG.dose;
    const lo = Math.round(d.weight * c.mgPerKgMin);
    const hi = Math.round(d.weight * c.mgPerKgMax);
    return el("div", { class: "dose" },
      el("span", {}, "Perkiraan dosis parasetamol sekali minum"),
      el("strong", {}, lo + " sampai " + hi + " mg"),
      el("small", {}, "Jarak " + c.intervalHours + " jam, maksimal " + c.maxDosesPerDay + " kali dalam 24 jam. Cocokkan dengan petunjuk kemasan dan tanyakan dokter atau apoteker sebelum memberikan."));
  }

  function recheck() {
    // Data anak tetap, ulangi dari langkah suhu
    $("#hasil").hidden = true;
    showStep(2);
    scrollToEl($("#periksa"));
  }

  function startNew() {
    form.reset();
    $("#hasil").hidden = true;
    showStep(1);
    scrollToEl($("#periksa"));
    $("#nama").focus({ preventScroll: true });
  }

  /* ---------- Riwayat ---------- */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function saveHistory(list) {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(list)); } catch (e) { /* abaikan */ }
  }

  function renderHistory() {
    const list = loadHistory();
    const ul = $("#history-list");
    ul.replaceChildren();
    list.forEach((h) => {
      const meta = LEVELS[h.level] || LEVELS.green;
      const when = new Date(h.time).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      ul.append(
        el("li", {},
          el("span", { class: "dot " + meta.cls }),
          el("div", { class: "h-main" },
            el("span", { class: "h-name" }, h.name),
            el("span", { class: "h-meta" }, when + " · " + h.temp + " · demam " + h.duration.toLowerCase())),
          el("span", { class: "h-result " + meta.cls }, meta.title)));
    });
    $("#history-empty").hidden = list.length > 0;
    $("#btn-clear-history").hidden = list.length === 0;
  }

  function pushHistory(d, r) {
    const list = loadHistory();
    list.unshift({
      time: new Date().toISOString(),
      name: d.name,
      level: r.level,
      temp: tempById(d.tempId).name,
      duration: durationById(d.durationId).label,
    });
    saveHistory(list.slice(0, CONFIG.maxHistory));
    renderHistory();
  }

  $("#btn-clear-history").addEventListener("click", () => {
    saveHistory([]);
    renderHistory();
    toast("Riwayat dihapus");
  });

  /* ---------- Kirim ---------- */
  function submit() {
    const d = collect();
    const r = evaluate(d);
    pushHistory(d, r);
    renderResult(d, r);
  }

  /* ---------- Mulai ---------- */
  renderScale();
  renderTempChips();
  renderDurationChips();
  renderSymptoms();
  renderHistory();
  showStep(1);
})();