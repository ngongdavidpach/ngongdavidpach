/* ============================================================
   PropTech — shared helpers, state + UI builders
   ============================================================ */
window.PT = (function () {
  "use strict";

  /* ---------- tiny DOM & format helpers ---------- */
  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function usd(n) { return "$" + Number(n || 0).toLocaleString("en-US"); }
  function priceHTML(l) {
    return l.listingType === "rent"
      ? usd(l.price) + ' <span class="per">/ month</span>'
      : usd(l.price);
  }
  function priceShort(l) {
    var n = Number(l.price || 0);
    var base = n >= 1000 ? "$" + (n % 1000 === 0 ? (n / 1000) : (n / 1000).toFixed(1)) + "k" : usd(n);
    return l.listingType === "rent" ? base + "/mo" : base;
  }
  function timeAgo(iso) {
    var then = new Date(iso).getTime();
    if (!then) return "";
    var s = Math.max(1, Math.floor((Date.now() - then) / 1000));
    var m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d >= 60) return dateFmt(iso);
    if (d >= 1) return d + (d === 1 ? " day ago" : " days ago");
    if (h >= 1) return h + (h === 1 ? " hour ago" : " hours ago");
    if (m >= 1) return m + " min ago";
    return "just now";
  }
  function dateFmt(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function dateTimeFmt(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
      ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function haversineM(a, b) {
    var R = 6371000, toRad = function (x) { return x * Math.PI / 180; };
    var dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }
  function distLabel(m) {
    return m >= 1000 ? (m / 1000).toFixed(2).replace(/\.?0+$/, "") + " km" : m + " m";
  }

  var TYPE_LABEL = { house: "House", apartment: "Apartment", room: "Room", commercial: "Commercial", land: "Land" };
  function typeLabel(t) { return TYPE_LABEL[t] || t; }
  function sizeLabel(l) {
    if (l.type === "land") return l.plot || "Land";
    return l.size ? l.size + " m²" : "—";
  }

  /* ---------- inline SVG icons ---------- */
  var ICONS = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 2.6v5.2c0 4.5-3 7.9-7 9.7-4-1.8-7-5.2-7-9.7V5.6L12 3z"/><path d="M9.2 11.8l2 2 3.8-4.2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.2-6.5-10a6.5 6.5 0 0 1 13 0c0 4.8-6.5 10-6.5 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 18h18"/><path d="M7 9V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>',
    bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2z"/><path d="M6 12V5a2 2 0 0 1 4 0"/><path d="M8 18l-1 2M17 18l1 2"/></svg>',
    area: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h5V4M20 15h-5v5"/></svg>',
    plot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20L20 4"/><path d="M4 20h6M4 20v-6M20 4h-6M20 4v6"/><path d="M9 15l6-6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-9-9c-1.2-2.8.6-6 3.8-6 2 0 3.4 1.1 4.2 2.6L12 9l1-1.4C13.8 6.1 15.2 5 17.2 5c3.2 0 5 3.2 3.8 6-2 4.6-9 9-9 9z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    gps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l1.5 4.5L8 10a12 12 0 0 0 6 6l1.5-2.5L20 15v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 0-3.2 6.4L20 19l-.8-3.1A8 8 0 0 0 20 12z"/><path d="M8.8 12h.01M12 12h.01M15.2 12h.01"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.5" cy="14.5" r="4.5"/><path d="M11.7 11.3L20 3M16 7l3 3M13.5 9.5l2.5 2.5"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/></svg>',
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="1.5"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.5L11 20a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L12.5 3.5H4.5a1 1 0 0 0-1 1v8z"/><circle cx="8.5" cy="8.5" r="1.4"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5L22 20H2L12 3.5z"/><path d="M12 10v4.5M12 17.5h.01"/></svg>'
  };
  function icon(name) { return ICONS[name] || ""; }

  /* ---------- localStorage state ---------- */
  var LS = { favs: "pt_favs", subs: "pt_submissions", decisions: "pt_decisions", checks: "pt_checks" };
  function lsRead(k, fb) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; }
    catch (e) { return fb; }
  }
  function lsWrite(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }

  function getFavs() { return lsRead(LS.favs, []); }
  function isFav(id) { return getFavs().indexOf(id) !== -1; }
  function toggleFav(id) {
    var f = getFavs(), i = f.indexOf(id);
    if (i === -1) f.push(id); else f.splice(i, 1);
    lsWrite(LS.favs, f);
    document.dispatchEvent(new CustomEvent("pt:favs", { detail: id }));
    return i === -1;
  }

  function getSubmissions() { return lsRead(LS.subs, []); }
  function addSubmission(obj) {
    var all = getSubmissions(); all.push(obj); lsWrite(LS.subs, all); return obj;
  }
  function getDecisions() { return lsRead(LS.decisions, {}); }
  function setDecision(id, d) {
    var m = getDecisions();
    if (d == null) delete m[id]; else m[id] = d;
    lsWrite(LS.decisions, m);
  }
  function clearDemo() {
    [LS.subs, LS.decisions, LS.checks].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  }

  /* ---------- data access: merge seed + user submissions + decisions ---------- */
  function normalizePending(p) {
    var imgs = (p.photos || []).map(function (src, i) {
      return { src: src, caption: "Owner photo " + (i + 1), taken: (p.submittedAt || "").slice(0, 10) };
    });
    return {
      id: p.id,
      title: p.title,
      type: p.type, listingType: p.listingType,
      price: p.price, beds: p.beds, baths: p.baths, size: p.size, plot: p.plot,
      neighborhood: p.neighborhood, address: p.address || "",
      lat: p.claimed ? p.claimed.lat : p.lat, lng: p.claimed ? p.claimed.lng : p.lng,
      description: p.description || "",
      amenities: p.amenities || [],
      images: imgs, noPhotos: imgs.length === 0, photoCount: p.photoCount || imgs.length,
      landlord: p.landlord,
      listedAt: p.submittedAt,
      submittedAt: p.submittedAt,
      claimed: p.claimed, captured: p.captured, note: p.note, source: p.source,
      seed: !!p.seed,
      status: "pending"
    };
  }

  function reviewQueue() {
    var pending = PT_DATA.SEED_PENDING.map(normalizePending);
    getSubmissions().forEach(function (s) { pending.push(normalizePending(s)); });
    var dec = getDecisions();
    pending.forEach(function (p) {
      var d = dec[p.id];
      if (d) {
        p.status = d.status;
        p.decidedAt = d.at;
        p.decisionNote = d.note || "";
        if (d.status === "verified") {
          p.verifiedAt = d.at;
          p.agent = d.agent || "Field Team";
          p.verification = {
            siteVisit: true,
            gpsMeters: p.captured && p.claimed ? haversineM(p.claimed, p.captured) : null,
            photosDated: true,
            ownerDocs: "Checked during field visit",
            duplicateCheck: true,
            notes: d.note || "Approved by field agent."
          };
        }
      }
    });
    return pending;
  }

  function allListings(opts) {
    opts = opts || {};
    var out = PT_DATA.LISTINGS.slice();
    var dec = getDecisions();
    // decisions can also (in theory) flag a live listing
    out.forEach(function (l) {
      var d = dec[l.id];
      if (d && d.status === "rejected") l.status = "suspended";
    });
    reviewQueue().forEach(function (p) {
      if (p.status === "verified") out.push(p);
      else if (opts.includePending && p.status === "pending") out.push(p);
    });
    return out;
  }

  function getListing(id) {
    if (!id) return null;
    var live = PT_DATA.LISTINGS.filter(function (l) { return l.id === id; })[0];
    if (live) {
      var d = getDecisions()[live.id];
      if (d && d.status === "rejected") live.status = "suspended";
      return live;
    }
    var q = reviewQueue().filter(function (p) { return p.id === id; })[0];
    return q || null;
  }

  /* ---------- badges & cards ---------- */
  function badgeHTML(status, extra) {
    if (status === "verified") {
      return '<span class="badge badge--verified ' + (extra || "") + '">' + icon("shield") + "<span>Verified</span></span>";
    }
    if (status === "pending") {
      return '<span class="badge badge--pending ' + (extra || "") + '">' + icon("clock") + "<span>Awaiting visit</span></span>";
    }
    return '<span class="badge badge--rejected ' + (extra || "") + '">' + icon("x") + "<span>" + esc(status || "rejected") + "</span></span>";
  }

  function imgBlock(l) {
    if (l.noPhotos || !l.images || !l.images.length) {
      return '<div class="img-ph">' + icon("camera") + "<span>" + (l.photoCount || 0) + ' owner photo' + (l.photoCount === 1 ? "" : "s") + "<br>awaiting agent visit</span></div>";
    }
    return '<img src="' + esc(l.images[0].src) + '" alt="' + esc(l.title) + ' — ' + esc(l.neighborhood) + ', Juba" loading="lazy">';
  }

  function card(l) {
    var url = "property.html?id=" + encodeURIComponent(l.id);
    var meta = [];
    if (l.type === "land") {
      meta.push("<li>" + icon("plot") + esc(sizeLabel(l)) + "</li>");
    } else if (l.type === "commercial") {
      meta.push("<li>" + icon("area") + esc(sizeLabel(l)) + "</li>");
      meta.push("<li>" + icon("building") + "Shop unit</li>");
    } else {
      if (l.beds) meta.push("<li>" + icon("bed") + l.beds + " bed" + (l.beds > 1 ? "s" : "") + "</li>");
      if (l.baths) meta.push("<li>" + icon("bath") + l.baths + " bath" + (l.baths > 1 ? "s" : "") + "</li>");
      if (l.size) meta.push("<li>" + icon("area") + l.size + " m²</li>");
    }
    var foot;
    if (l.status === "verified") {
      foot = '<div class="verify-line">' + icon("shield") + "<span>Verified " + esc(timeAgo(l.verifiedAt)) +
        (l.agent ? " · Agent " + esc(l.agent.split(" ")[0]) : "") + "</span></div>";
    } else if (l.status === "pending") {
      foot = '<div class="verify-line verify-line--pending">' + icon("clock") + "<span>Submitted " + esc(timeAgo(l.listedAt)) + " · agent visit scheduled</span></div>";
    } else {
      foot = '<div class="verify-line verify-line--muted">' + icon("warn") + "<span>Temporarily unlisted</span></div>";
    }
    return '' +
      '<article class="prop-card" data-id="' + esc(l.id) + '">' +
        '<div class="prop-card__img">' +
          '<a href="' + url + '" tabindex="-1" aria-hidden="true">' + imgBlock(l) + "</a>" +
          badgeHTML(l.status) +
          '<span class="prop-card__price">' + priceHTML(l) + "</span>" +
          '<button class="fav-btn' + (isFav(l.id) ? " is-fav" : "") + '" data-fav="' + esc(l.id) + '" aria-pressed="' + isFav(l.id) + '" aria-label="Save to shortlist">' + icon("heart") + "</button>" +
        "</div>" +
        '<div class="prop-card__body">' +
          '<h3><a href="' + url + '">' + esc(l.title) + "</a></h3>" +
          '<p class="prop-card__loc">' + icon("pin") + "<span>" + esc(l.neighborhood) + ", Juba</span></p>" +
          '<ul class="prop-card__meta">' + meta.join("") + "</ul>" +
          foot +
        "</div>" +
      "</article>";
  }

  /* ---------- toast ---------- */
  function toast(msg, kind) {
    var holder = qs("#toastHolder");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "toastHolder";
      holder.setAttribute("aria-live", "polite");
      document.body.appendChild(holder);
    }
    var t = document.createElement("div");
    t.className = "toast" + (kind === "ok" ? " toast--ok" : "");
    t.innerHTML = (kind === "ok" ? icon("check") : "") + "<span>" + esc(msg) + "</span>";
    holder.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 350);
    }, 3200);
  }

  /* ---------- shared chrome ---------- */
  function initChrome() {
    var btn = qs("#navToggle"), nav = qs("#siteNav");
    if (btn && nav) {
      btn.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        document.body.classList.toggle("nav-open", open);
      });
      qsa("a", nav).forEach(function (a) {
        a.addEventListener("click", function () {
          nav.classList.remove("open");
          document.body.classList.remove("nav-open");
        });
      });
    }
    var header = qs(".site-header");
    if (header) {
      var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 6); };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    qsa("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

    // delegated favourite buttons
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-fav]") : null;
      if (!b) return;
      e.preventDefault();
      var on = toggleFav(b.getAttribute("data-fav"));
      b.classList.toggle("is-fav", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      toast(on ? "Saved to your shortlist" : "Removed from shortlist", on ? "ok" : null);
    });
  }

  function pinIcon(l) {
    /* expects window.L (Leaflet) — caller guards */
    return L.divIcon({
      className: "pt-pin-wrap",
      html: '<div class="pt-pin pt-pin--' + (l.status === "verified" ? "ok" : "pending") + '"><span>' + esc(priceShort(l)) + "</span></div>",
      iconSize: null,
      iconAnchor: [10, 34]
    });
  }

  document.addEventListener("DOMContentLoaded", initChrome);

  return {
    qs: qs, qsa: qsa, esc: esc, icon: icon,
    usd: usd, priceHTML: priceHTML, priceShort: priceShort,
    timeAgo: timeAgo, dateFmt: dateFmt, dateTimeFmt: dateTimeFmt,
    haversineM: haversineM, distLabel: distLabel,
    typeLabel: typeLabel, sizeLabel: sizeLabel,
    badgeHTML: badgeHTML, card: card, pinIcon: pinIcon, toast: toast,
    getFavs: getFavs, isFav: isFav, toggleFav: toggleFav,
    getSubmissions: getSubmissions, addSubmission: addSubmission,
    getDecisions: getDecisions, setDecision: setDecision, clearDemo: clearDemo,
    reviewQueue: reviewQueue, allListings: allListings, getListing: getListing
  };
})();
