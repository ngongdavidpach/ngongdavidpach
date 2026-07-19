/* PropTech — property detail page */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var qs = PT.qs, esc = PT.esc, icon = PT.icon;

    var id = new URLSearchParams(location.search).get("id");
    var l = PT.getListing(id);
    var root = qs("#propRoot");
    var crumbs = qs("#crumbTitle");

    if (!l) {
      root.innerHTML =
        '<div class="empty">' +
          "<h3>Listing not found</h3>" +
          "<p>It may have been rented out, sold, or removed after a failed verification.</p>" +
          '<div class="reset"><a class="btn btn-primary" href="listings.html">Browse verified listings</a></div>' +
        "</div>";
      return;
    }

    document.title = l.title + " — " + l.neighborhood + " | PropTech Juba";
    if (crumbs) crumbs.textContent = l.title;

    /* ---------- gallery ---------- */
    var galleryHTML = "";
    if (l.images && l.images.length) {
      galleryHTML =
        '<div class="gallery">' +
          '<div class="gallery__main">' +
            '<img id="galMain" src="' + esc(l.images[0].src) + '" alt="' + esc(l.images[0].caption || l.title) + '">' +
            '<span class="cap" id="galCap">' + icon("camera") + "<span>" + esc(l.images[0].caption || "") +
              (l.images[0].taken ? " · " + esc(PT.dateFmt(l.images[0].taken)) : "") + "</span></span>" +
          "</div>" +
          (l.images.length > 1
            ? '<div class="gallery__thumbs">' +
              l.images.slice(1).map(function (im, i) {
                return '<button type="button" data-idx="' + (i + 1) + '" aria-label="Show photo ' + (i + 2) + '">' +
                  '<img src="' + esc(im.src) + '" alt="' + esc(im.caption || "Photo " + (i + 2)) + '"></button>';
              }).join("") +
              "</div>"
            : "") +
        "</div>";
    } else {
      galleryHTML =
        '<div class="gallery"><div class="gallery__main"><div class="img-ph" style="position:absolute;inset:0">' +
          icon("camera") + "<span>" + (l.photoCount || 0) + " owner photos on file —<br>published once the agent visit is complete</span>" +
        "</div></div></div>";
    }

    /* ---------- badges row ---------- */
    var badges = [PT.badgeHTML(l.status, "badge--xl")];
    badges.push('<span class="chip">' + icon(l.type === "house" ? "home" : l.type === "land" ? "plot" : "building") + esc(PT.typeLabel(l.type)) + "</span>");
    badges.push('<span class="chip">' + esc(l.listingType === "rent" ? "For rent" : "For sale") + "</span>");
    badges.push('<span class="chip">Ref ' + esc(l.id) + "</span>");

    /* ---------- specs ---------- */
    var specs = [];
    if (l.type === "land") {
      specs.push('<span class="spec">' + icon("plot") + esc(PT.sizeLabel(l)) + "</span>");
    } else {
      if (l.beds) specs.push('<span class="spec">' + icon("bed") + l.beds + " bedroom" + (l.beds > 1 ? "s" : "") + "</span>");
      if (l.baths) specs.push('<span class="spec">' + icon("bath") + l.baths + " bathroom" + (l.baths > 1 ? "s" : "") + "</span>");
      if (l.size) specs.push('<span class="spec">' + icon("area") + esc(l.size + " m²") + "</span>");
    }
    specs.push('<span class="spec">' + icon("pin") + esc(l.neighborhood) + "</span>");

    /* ---------- verification panel ---------- */
    var verifyPanel = "";
    if (l.status === "verified" && l.verification) {
      var v = l.verification;
      verifyPanel =
        '<section class="panel report" aria-label="Verification report">' +
          '<div class="report__head">' +
            '<span class="rshield">' + icon("shield") + "</span>" +
            "<div><b>PropTech Verification Report</b><span>Issued " + esc(PT.dateTimeFmt(l.verifiedAt)) + " · valid 90 days from visit</span></div>" +
            '<span style="margin-left:auto">' + PT.badgeHTML("verified", "badge--soft") + "</span>" +
          "</div>" +
          "<dl>" +
            "<div><dt>Physical site visit</dt><dd>" + icon("check") + "Completed by agent " + esc(l.agent || "Field Team") + "</dd></div>" +
            (v.gpsMeters != null
              ? "<div><dt>GPS location match</dt><dd>" + icon("check") + "On-site GPS within " + esc(PT.distLabel(v.gpsMeters)) + " of listed address</dd></div>"
              : "") +
            "<div><dt>Photo authenticity</dt><dd>" + icon("check") + "All photos timestamped " + esc(PT.dateFmt((l.images[0] || {}).taken || l.verifiedAt)) + " at the property</dd></div>" +
            "<div><dt>Ownership documents</dt><dd>" + icon("check") + esc(v.ownerDocs || "Checked") + "</dd></div>" +
            "<div><dt>Duplicate / scam check</dt><dd>" + icon("check") + "No duplicate listings or prior fraud flags for this address</dd></div>" +
          "</dl>" +
          (v.notes ? '<div class="rnotes"><b>Agent field notes</b>' + esc(v.notes) + "</div>" : "") +
          '<p class="sig">Signed digitally · ' + esc(l.agent || "PropTech Field Team") + " · Agent line " + esc(l.agentPhone || "+211 915 234 800") + "</p>" +
        "</section>";
    } else if (l.status === "pending") {
      verifyPanel =
        '<div class="notice notice--amber" role="status">' + icon("clock") +
          "<div><b>Awaiting physical verification</b>" +
          "A field agent visit has been scheduled for this listing. It goes live with the Verified badge once the visit, GPS check and photo review are complete — typically within 48 hours. " +
          (l.source ? "Submitted via " + esc(l.source) + "." : "") + "</div>" +
        "</div>";
    } else {
      verifyPanel =
        '<div class="notice suspended-band" role="alert">' + icon("warn") +
          "<div><b>Listing suspended</b>This listing failed a re-verification check and is hidden from search results while the agent reviews it.</div>" +
        "</div>";
    }

    /* ---------- amenities ---------- */
    var amen = (l.amenities && l.amenities.length)
      ? '<section class="panel"><h2>' + icon("check") + "What this place offers</h2>" +
        '<div class="amenities">' + l.amenities.map(function (a) { return '<span class="chip">' + esc(a) + "</span>"; }).join("") + "</div></section>"
      : "";

    /* ---------- map panel ---------- */
    var hasGeo = typeof l.lat === "number" && typeof l.lng === "number";
    var coordText = hasGeo
      ? l.lat.toFixed(5) + ", " + l.lng.toFixed(5) +
        (l.captured ? " · agent GPS captured on-site (±" + (l.captured.accuracy || "?") + "m)" : "")
      : "Pinned after field visit";

    /* ---------- contact card ---------- */
    var wa = (l.landlord && l.landlord.phone || "").replace(/[^0-9]/g, "");
    var waText = encodeURIComponent(
      "Hello " + (l.landlord ? l.landlord.name : "") + ", I found your listing \"" + l.title +
      "\" (ref " + l.id + ") on PropTech Juba. Is it still available?"
    );
    var initials = (l.landlord ? l.landlord.name : "P T").trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();

    root.innerHTML =
      '<div class="prop-head">' +
        "<div>" +
          "<h1>" + esc(l.title) + "</h1>" +
          '<p class="loc">' + icon("pin") + "<span>" + esc(l.address ? l.address + " · " : "") + esc(l.neighborhood) + ", Juba, South Sudan</span></p>" +
          '<div class="badges">' + badges.join("") + "</div>" +
        "</div>" +
        '<div class="price-box">' +
          '<div class="p">' + PT.priceHTML(l) + "</div>" +
          '<div class="listed">Listed ' + esc(PT.timeAgo(l.listedAt)) + "</div>" +
          '<button class="fav-btn" style="position:static;margin-top:.6rem;width:100%;height:38px;border-radius:10px;display:flex;gap:.5rem;align-items:center;justify-content:center;border:1px solid var(--line)" data-fav="' + esc(l.id) + '" aria-pressed="' + PT.isFav(l.id) + '">' + icon("heart") + '<span style="font-size:.83rem;font-weight:650">Shortlist</span></button>' +
        "</div>" +
      "</div>" +
      galleryHTML +
      '<div class="prop-grid">' +
        "<div>" +
          verifyPanel +
          '<section class="panel"><h2>' + icon("doc") + "About this property</h2>" +
            '<div class="specs">' + specs.join("") + "</div>" +
            '<p class="desc">' + esc(l.description || "Description provided by the owner; confirmed during the agent visit.") + "</p>" +
          "</section>" +
          amen +
          '<section class="panel map-panel"><div class="map-head"><h2>' + icon("pin") + "Verified location</h2></div>" +
            '<div class="map" id="propMap"></div>' +
            '<div class="coords">' + icon("gps") + "<span>" + esc(coordText) + "</span></div>" +
          "</section>" +
        "</div>" +
        "<aside>" +
          '<div class="panel contact-card">' +
            '<div class="who"><span class="ava">' + esc(initials) + "</span>" +
              "<div><b>" + esc(l.landlord ? l.landlord.name : "PropTech listing") + "</b><span>" + (l.status === "verified" ? "Owner checked by agent" : "Owner — pending verification") + "</span></div>" +
            "</div>" +
            '<div class="contact-actions">' +
              (l.landlord && l.landlord.phone
                ? '<a class="btn btn-primary btn-block" href="tel:' + esc(l.landlord.phone) + '">' + icon("phone") + "Call " + esc(l.landlord.phone.replace("+211", "+211 ")) + "</a>"
                : "") +
              (wa
                ? '<a class="btn btn-green btn-block" href="https://wa.me/' + wa + "?text=" + waText + '" target="_blank" rel="noopener">' + icon("chat") + "Chat on WhatsApp</a>"
                : "") +
              '<a class="btn btn-outline btn-block" href="list-property.html">' + icon("home") + "List your own property</a>" +
            "</div>" +
            '<div class="ref"><span>Quote this reference</span><code>' + esc(l.id) + "</code></div>" +
            '<p class="safety">' + icon("warn") + "<span><b>Stay safe:</b> never pay before viewing. PropTech never keeps rent money — fees apply only to verification &amp; successful brokerage.</span></p>" +
          "</div>" +
        "</aside>" +
      "</div>";

    /* gallery thumbs behaviour */
    var main = qs("#galMain"), cap = qs("#galCap");
    PT.qsa(".gallery__thumbs button").forEach(function (b) {
      b.addEventListener("click", function () {
        var im = l.images[Number(b.getAttribute("data-idx"))];
        if (!im) return;
        main.src = im.src;
        main.alt = im.caption || l.title;
        cap.innerHTML = icon("camera") + "<span>" + esc(im.caption || "") + (im.taken ? " · " + esc(PT.dateFmt(im.taken)) : "") + "</span>";
        PT.qsa(".gallery__thumbs button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
      });
    });

    /* map */
    if (hasGeo && typeof window.L !== "undefined") {
      var map = L.map("propMap", { scrollWheelZoom: false }).setView([l.lat, l.lng], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      L.marker([l.lat, l.lng], { icon: PT.pinIcon(l) }).addTo(map);
      if (l.captured) {
        L.circle([l.captured.lat, l.captured.lng], {
          radius: l.captured.accuracy || 15, color: "#0e7a6c", weight: 1.5, fillOpacity: 0.12
        }).addTo(map);
      }
    } else if (hasGeo) {
      qs("#propMap").innerHTML = '<div class="map-offline"><p>Map needs an internet connection. Coordinates: ' + esc(coordText) + "</p></div>";
    }

    /* similar listings */
    var sim = PT.allListings().filter(function (x) {
      return x.id !== l.id && x.status === "verified" && (x.neighborhood === l.neighborhood || x.type === l.type);
    }).slice(0, 3);
    var simWrap = qs("#similarWrap");
    if (simWrap && sim.length) {
      simWrap.innerHTML =
        '<section class="section" style="padding-top:1rem">' +
          '<div class="row-between" style="margin-bottom:1.4rem"><h2 class="sim-title">Similar verified listings</h2>' +
          '<a class="btn btn-outline btn-sm" href="listings.html">View all ' + icon("arrow") + "</a></div>" +
          '<div class="cards">' + sim.map(function (x) { return PT.card(x); }).join("") + "</div>" +
        "</section>";
    }

    /* JSON-LD for search engines */
    try {
      var ld = {
        "@context": "https://schema.org",
        "@type": l.type === "land" ? "LandParcel" : "Residence",
        "name": l.title,
        "address": { "@type": "PostalAddress", "streetAddress": l.address || l.neighborhood, "addressLocality": "Juba", "addressCountry": "SS" },
        "geo": hasGeo ? { "@type": "GeoCoordinates", "latitude": l.lat, "longitude": l.lng } : undefined,
        "offers": { "@type": "Offer", "price": l.price, "priceCurrency": "USD", "availability": "https://schema.org/" + (l.status === "verified" ? "InStock" : "PreOrder") }
      };
      var s = document.createElement("script");
      s.type = "application/ld+json";
      s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
    } catch (e) {}
  });
})();
