/* PropTech — landing page */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var qs = PT.qs, qsa = PT.qsa;

    /* hero search → listings page */
    var form = qs("#heroSearch");
    if (form) {
      // populate area select
      var areaSel = qs("#hsArea");
      PT_DATA.NEIGHBORHOODS.forEach(function (n) {
        var o = document.createElement("option");
        o.value = n.name; o.textContent = n.name;
        areaSel.appendChild(o);
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var p = new URLSearchParams();
        if (areaSel.value) p.set("area", areaSel.value);
        if (qs("#hsType").value) p.set("pt", qs("#hsType").value);
        if (qs("#hsLt").value) p.set("lt", qs("#hsLt").value);
        if (qs("#hsMax").value) p.set("max", qs("#hsMax").value);
        location.href = "listings.html" + (p.toString() ? "?" + p.toString() : "");
      });
    }

    /* featured listings */
    var grid = qs("#featuredGrid");
    var featured = PT.allListings()
      .filter(function (l) { return l.status === "verified"; })
      .sort(function (a, b) { return new Date(b.verifiedAt) - new Date(a.verifiedAt); })
      .slice(0, 6);

    function renderFeatured(filter) {
      var list = featured.filter(function (l) {
        if (!filter) return true;
        if (filter === "land") return l.type === "land";
        if (filter === "homes") return l.type === "house" || l.type === "apartment";
        return l.type === filter;
      });
      grid.innerHTML = list.length
        ? list.map(function (l) { return PT.card(l); }).join("")
        : '<div class="empty" style="grid-column:1/-1"><h3>Nothing in this category yet</h3><p>Try another filter, or browse everything.</p></div>';
    }
    if (grid) {
      renderFeatured("");
      qsa("#featChips button").forEach(function (b) {
        b.addEventListener("click", function () {
          qsa("#featChips button").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          renderFeatured(b.getAttribute("data-f"));
        });
      });
    }

    /* hood counts */
    var hoods = qs("#hoodChips");
    if (hoods) {
      var counts = {};
      PT.allListings().forEach(function (l) {
        if (l.status !== "verified") return;
        counts[l.neighborhood] = (counts[l.neighborhood] || 0) + 1;
      });
      hoods.innerHTML = PT_DATA.NEIGHBORHOODS.map(function (n) {
        var c = counts[n.name] || 0;
        return '<a class="chip" href="listings.html?area=' + encodeURIComponent(n.name) + '">' +
          PT.icon("pin") + "<span>" + PT.esc(n.name) + (c ? "&nbsp;<b>" + c + "</b>" : "") + "</span></a>";
      }).join("");
    }

    /* animated stats */
    var stats = qsa("[data-count]");
    function animate(el) {
      var target = Number(el.getAttribute("data-count"));
      var t0 = null, dur = 1400;
      function tick(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString("en-US");
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    if ("IntersectionObserver" in window && stats.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
        });
      }, { threshold: 0.4 });
      stats.forEach(function (s) { io.observe(s); });
    } else {
      stats.forEach(function (el) {
        el.textContent = Number(el.getAttribute("data-count")).toLocaleString("en-US");
      });
    }

    /* scroll reveal */
    var revs = qsa(".reveal");
    if ("IntersectionObserver" in window && revs.length) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io2.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      revs.forEach(function (r) { io2.observe(r); });
    } else {
      revs.forEach(function (r) { r.classList.add("in"); });
    }
  });
})();
