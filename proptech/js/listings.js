/* PropTech — browse page: filters, cards + live map */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var qs = PT.qs, qsa = PT.qsa;

    var state = {
      q: "", area: "", pt: "", lt: "", max: "",
      pending: false,
      sort: "verified-new",
      view: "split"
    };

    /* read URL params */
    var params = new URLSearchParams(location.search);
    ["q", "area", "pt", "lt", "max"].forEach(function (k) {
      if (params.get(k)) state[k] = params.get(k);
    });
    if (params.get("view")) state.view = params.get("view");

    /* populate controls */
    var areaSel = qs("#fArea");
    PT_DATA.NEIGHBORHOODS.forEach(function (n) {
      var o = document.createElement("option");
      o.value = n.name; o.textContent = n.name;
      areaSel.appendChild(o);
    });
    qs("#fQ").value = state.q;
    areaSel.value = state.area;
    qs("#fPt").value = state.pt;
    qs("#fLt").value = state.lt;
    qs("#fMax").value = state.max;
    qs("#fPending").checked = state.pending;

    /* map state */
    var map = null, markers = [], L_OK = typeof window.L !== "undefined";

    function ensureMap() {
      if (!L_OK || map) return;
      map = L.map("map", { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      map.on("focus", function () { map.scrollWheelZoom.enable(); });
      map.on("blur", function () { map.scrollWheelZoom.disable(); });
      map.setView([4.853, 31.594], 13);
    }

    function clearMarkers() {
      markers.forEach(function (m) { map && map.removeLayer(m); });
      markers = [];
    }

    function plotMarkers(list) {
      if (!L_OK || !map) return;
      clearMarkers();
      var pts = [];
      list.forEach(function (l) {
        if (typeof l.lat !== "number" || typeof l.lng !== "number") return;
        var mk = L.marker([l.lat, l.lng], { icon: PT.pinIcon(l), title: l.title });
        var pop =
          '<div class="map-pop">' +
            "<b>" + PT.esc(l.title) + "</b>" +
            '<div class="pp">' + PT.esc(PT.priceShort(l)) + (l.status === "verified" ? " · ✓ verified" : " · pending") + "</div>" +
            "<div>" + PT.esc(l.neighborhood) + " · " + PT.esc(PT.typeLabel(l.type)) + "</div>" +
            '<a href="property.html?id=' + encodeURIComponent(l.id) + '">View details →</a>' +
          "</div>";
        mk.bindPopup(pop);
        mk.ptId = l.id;
        mk.addTo(map);
        markers.push(mk);
        pts.push([l.lat, l.lng]);
      });
      if (pts.length) {
        map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
      }
    }

    function apply() {
      var max = state.max === "" ? null : Number(state.max);
      var list = PT.allListings({ includePending: state.pending }).filter(function (l) {
        if (l.status !== "verified" && !(state.pending && l.status === "pending")) return false;
        if (state.q) {
          var hay = (l.title + " " + l.neighborhood + " " + l.address + " " + (l.description || "")).toLowerCase();
          if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
        }
        if (state.area && l.neighborhood !== state.area) return false;
        if (state.pt && l.type !== state.pt) return false;
        if (state.lt && l.listingType !== state.lt) return false;
        if (max != null && Number(l.price) > max) return false;
        return true;
      });

      switch (state.sort) {
        case "price-asc": list.sort(function (a, b) { return a.price - b.price; }); break;
        case "price-desc": list.sort(function (a, b) { return b.price - a.price; }); break;
        case "size-desc": list.sort(function (a, b) { return (b.size || 0) - (a.size || 0); }); break;
        case "listed-new": list.sort(function (a, b) { return new Date(b.listedAt) - new Date(a.listedAt); }); break;
        default:
          list.sort(function (a, b) {
            return new Date(b.verifiedAt || b.listedAt) - new Date(a.verifiedAt || a.listedAt);
          });
      }

      render(list);
      /* persist in URL (shareable searches) */
      var p = new URLSearchParams();
      ["q", "area", "pt", "lt", "max"].forEach(function (k) { if (state[k]) p.set(k, state[k]); });
      if (state.view !== "split") p.set("view", state.view);
      history.replaceState(null, "", "listings.html" + (p.toString() ? "?" + p : ""));
    }

    function render(list) {
      var wrap = qs("#cardsWrap");
      var count = qs("#resultCount");
      var empty = qs("#empty");

      var v = list.filter(function (l) { return l.status === "verified"; }).length;
      var pd = list.length - v;
      count.innerHTML = "<em>" + list.length + "</em> " + (list.length === 1 ? "property" : "properties") +
        (pd ? ' <span class="muted small">(' + v + " verified · " + pd + " awaiting visit)</span>" : ' <span class="muted small">verified by field agents</span>');

      if (!list.length) {
        wrap.innerHTML = "";
        empty.classList.remove("hidden");
      } else {
        empty.classList.add("hidden");
        wrap.innerHTML = '<div class="market__list"><div class="cards">' +
          list.map(function (l) { return PT.card(l); }).join("") +
          "</div></div>";
      }

      if (state.view !== "grid") {
        ensureMap();
        plotMarkers(list);
        setTimeout(function () { map && map.invalidateSize(); }, 60);
      }
    }

    /* wire controls */
    var form = qs("#filters");
    form.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
    qs("#fQ").addEventListener("input", function () { state.q = this.value.trim(); apply(); });
    areaSel.addEventListener("change", function () { state.area = this.value; apply(); });
    qs("#fPt").addEventListener("change", function () { state.pt = this.value; apply(); });
    qs("#fLt").addEventListener("change", function () { state.lt = this.value; apply(); });
    qs("#fMax").addEventListener("change", function () { state.max = this.value; apply(); });
    qs("#fPending").addEventListener("change", function () { state.pending = this.checked; apply(); });
    qs("#fSort").addEventListener("change", function () { state.sort = this.value; apply(); });
    qs("#fReset").addEventListener("click", function (e) {
      e.preventDefault();
      state.q = state.area = state.pt = state.lt = state.max = "";
      state.pending = false; state.sort = "verified-new";
      qs("#fQ").value = ""; areaSel.value = ""; qs("#fPt").value = "";
      qs("#fLt").value = ""; qs("#fMax").value = ""; qs("#fPending").checked = false;
      qs("#fSort").value = "verified-new";
      apply();
      PT.toast("Filters cleared");
    });
    var emptyReset = qs("#emptyReset");
    if (emptyReset) emptyReset.addEventListener("click", function () { qs("#fReset").click(); });

    /* view toggle */
    qsa("[data-view]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.view = b.getAttribute("data-view");
        syncView();
        apply();
      });
    });
    function syncView() {
      qsa("[data-view]").forEach(function (x) {
        x.classList.toggle("active", x.getAttribute("data-view") === state.view);
      });
      var market = qs("#market");
      market.classList.remove("market--grid", "market--maponly");
      if (state.view === "grid") market.classList.add("market--grid");
      if (state.view === "map") market.classList.add("market--maponly");
    }

    /* card ↔ map highlight */
    document.addEventListener("click", function (e) {
      var c = e.target.closest ? e.target.closest(".prop-card") : null;
      if (!c || !map) return;
      var mk = markers.filter(function (m) { return m.ptId === c.getAttribute("data-id"); })[0];
      if (mk && e.target.tagName !== "A" && !e.target.closest("a") && !e.target.closest("button")) {
        map.setView(mk.getLatLng(), Math.max(map.getZoom(), 14), { animate: true });
        mk.openPopup();
      }
    });

    if (!L_OK) {
      var mm = qs(".market__map");
      if (mm) {
        mm.innerHTML = '<div class="map-offline"><div><h3>Map unavailable</h3><p>Couldn’t load the map tiles (no internet?). Every listing card still shows its verified neighbourhood.</p></div></div>';
      }
    }

    syncView();
    apply();
  });
})();
