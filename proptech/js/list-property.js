/* PropTech — "List your property" flow
   Landlord submits → listing enters the agent review queue (localStorage),
   agent then verifies on-site before the Verified badge is issued. */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var qs = PT.qs, qsa = PT.qsa;

    var form = qs("#lpForm");
    if (!form) return;

    /* populate neighborhoods */
    var areaSel = qs("#lpArea");
    PT_DATA.NEIGHBORHOODS.forEach(function (n) {
      var o = document.createElement("option");
      o.value = n.name; o.textContent = n.name;
      areaSel.appendChild(o);
    });
    var other = document.createElement("option");
    other.value = "Other (tell us in address)";
    other.textContent = "Other / not listed";
    areaSel.appendChild(other);

    /* segmented: rent vs sale */
    var lt = "rent";
    qsa("#ltSeg button").forEach(function (b) {
      b.addEventListener("click", function () {
        lt = b.getAttribute("data-v");
        qsa("#ltSeg button").forEach(function (x) { x.classList.toggle("active", x === b); });
        qs("#priceHint").textContent = lt === "rent" ? "USD per month (Juba rentals are usually priced in USD)" : "Total asking price in USD";
      });
    });

    /* property type → conditional fields */
    var ptSel = qs("#lpType");
    function syncType() {
      var isLand = ptSel.value === "land";
      qs("#roomsRow").classList.toggle("hidden", isLand);
      qs("#plotRow").classList.toggle("hidden", !isLand);
      ["#lpBeds", "#lpBaths"].forEach(function (s) { qs(s).required = !isLand; });
      qs("#lpPlot").required = isLand;
    }
    ptSel.addEventListener("change", syncType);
    syncType();

    /* GPS capture */
    var captured = null;
    var gpsBtn = qs("#gpsBtn"), gpsStatus = qs("#gpsStatus");
    gpsBtn.addEventListener("click", function () {
      gpsStatus.className = "gps-status";
      gpsStatus.innerHTML = PT.icon("gps") + "<span>Requesting location… allow the browser prompt.</span>";
      if (!navigator.geolocation) {
        gpsStatus.className = "gps-status warn";
        gpsStatus.innerHTML = PT.icon("warn") + "<span>This device has no GPS API — the agent will capture coordinates on-site.</span>";
        return;
      }
      navigator.geolocation.getCurrentPosition(function (pos) {
        captured = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 0)
        };
        gpsStatus.className = "gps-status ok";
        gpsStatus.innerHTML = PT.icon("check") + "<span>Captured while you stand at the property: <b>" +
          captured.lat.toFixed(5) + ", " + captured.lng.toFixed(5) + "</b> (±" + captured.accuracy + "m)</span>";
        PT.toast("Location captured", "ok");
      }, function () {
        gpsStatus.className = "gps-status warn";
        gpsStatus.innerHTML = PT.icon("warn") + "<span>Couldn't capture location — no problem, the field agent captures GPS during the visit.</span>";
      }, { enableHighAccuracy: true, timeout: 12000 });
    });

    /* photo previews (kept in-browser only) */
    var fileIn = qs("#lpPhotos"), prev = qs("#thumbsPrev");
    fileIn.addEventListener("change", function () {
      prev.innerHTML = "";
      var files = Array.prototype.slice.call(fileIn.files).slice(0, 8);
      files.forEach(function (f) {
        if (!/^image\//.test(f.type)) return;
        var url = URL.createObjectURL(f);
        var d = document.createElement("div");
        d.className = "tp";
        d.innerHTML = '<img src="' + url + '" alt="Selected photo preview">';
        prev.appendChild(d);
      });
      if (files.length) PT.toast(files.length + " photo" + (files.length > 1 ? "s" : "") + " attached — they’ll be re-shot by the agent at verification", "ok");
    });

    /* validation helpers */
    function setInvalid(id, bad) {
      var f = qs(id);
      if (f) f.closest(".field").classList.toggle("invalid", !!bad);
      return !bad;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      ok = setInvalid("#lpName", !qs("#lpName").value.trim()) && ok;
      var phone = qs("#lpPhone").value.replace(/[\s-]/g, "");
      ok = setInvalid("#lpPhone", !/^(\+?211|0)?9[0-9]{8}$/.test(phone)) && ok;
      ok = setInvalid("#lpType", !ptSel.value) && ok;
      ok = setInvalid("#lpArea", !areaSel.value) && ok;
      var price = Number(qs("#lpPrice").value);
      ok = setInvalid("#lpPrice", !(price > 0)) && ok;
      var isLand = ptSel.value === "land";
      if (!isLand) {
        ok = setInvalid("#lpBeds", !(Number(qs("#lpBeds").value) >= 0)) && ok;
        ok = setInvalid("#lpBaths", !(Number(qs("#lpBaths").value) >= 0)) && ok;
      } else {
        ok = setInvalid("#lpPlot", !qs("#lpPlot").value.trim()) && ok;
      }
      ok = setInvalid("#lpConsent", !qs("#lpConsent").checked) && ok;
      if (!ok) {
        PT.toast("Please fix the highlighted fields");
        var firstBad = qs(".field.invalid .input, .field.invalid input[type=checkbox]");
        if (firstBad) firstBad.focus();
        return;
      }

      var hood = PT_DATA.NEIGHBORHOODS.filter(function (n) { return n.name === areaSel.value; })[0];
      var id = "PT-L" + String(1000 + PT.getSubmissions().length + 1);

      var submission = {
        id: id,
        title: (isLand ? qs("#lpPlot").value.trim() + " plot" :
                (qs("#lpBeds").value ? qs("#lpBeds").value + "-bedroom " : "") + PT.typeLabel(ptSel.value).toLowerCase()) +
               " — " + (hood ? hood.name : "Juba"),
        type: ptSel.value,
        listingType: lt,
        price: price,
        beds: isLand ? undefined : Number(qs("#lpBeds").value) || undefined,
        baths: isLand ? undefined : Number(qs("#lpBaths").value) || undefined,
        size: isLand ? undefined : Number(qs("#lpSize").value) || undefined,
        plot: isLand ? qs("#lpPlot").value.trim() : undefined,
        neighborhood: hood ? hood.name : areaSel.value,
        address: qs("#lpAddress").value.trim(),
        description: qs("#lpDesc").value.trim(),
        landlord: { name: qs("#lpName").value.trim(), phone: phone.indexOf("+") === 0 ? phone : "+211" + phone.replace(/^(\+?211|0)/, "") },
        submittedAt: new Date().toISOString(),
        claimed: captured
          ? { lat: captured.lat, lng: captured.lng }
          : hood ? { lat: hood.lat + 0.0012, lng: hood.lng + 0.0009 } : { lat: 4.8594, lng: 31.5713 },
        captured: null,
        photos: [],
        photoCount: Math.min(fileIn.files ? fileIn.files.length : 0, 8),
        note: qs("#lpDesc").value.trim() ? "Owner notes: “" + qs("#lpDesc").value.trim().slice(0, 160) + "”" : "No extra notes from the owner.",
        source: "Web form"
      };

      PT.addSubmission(submission);

      /* success panel */
      form.classList.add("hidden");
      var succ = qs("#lpSuccess");
      succ.classList.remove("hidden");
      qs("#succRef").textContent = id;
      succ.scrollIntoView({ behavior: "smooth", block: "start" });
      PT.toast("Submitted — agent visit queued", "ok");
    });
  });
})();
