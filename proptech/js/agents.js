/* PropTech — field-agent verification console (demo)
   Reviews the queue: compares owner-claimed location with the agent's
   on-site GPS capture, checks photos, then issues or denies the badge. */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var qs = PT.qs, esc = PT.esc, icon = PT.icon;

    var CHECK_LABELS = [
      ["site", "Physical site visit completed"],
      ["gps", "GPS match within 50m of claimed address"],
      ["photos", "Photos are fresh, on-site & match the property"],
      ["docs", "Ownership / authority documents sighted"]
    ];
    var CHECK_KEYS = "pt_checks";

    function readChecks() {
      try { return JSON.parse(localStorage.getItem(CHECK_KEYS)) || {}; }
      catch (e) { return {}; }
    }
    function writeChecks(m) {
      try { localStorage.setItem(CHECK_KEYS, JSON.stringify(m)); } catch (e) {}
    }

    function gpsFlag(p) {
      if (!p.claimed || !p.captured) {
        return '<div class="gps-flag gps-flag--warn">' + icon("gps") +
          "<div><b>GPS not captured on-site yet.</b> The agent must stand at the property and capture coordinates before this can be approved.</div></div>";
      }
      var d = PT.haversineM(p.claimed, p.captured);
      var cls = d <= 50 ? "ok" : d <= 200 ? "warn" : "bad";
      var verdict = d <= 50
        ? "Within tolerance — pin and property match."
        : d <= 200
          ? "Borderline — call the owner to explain the offset before approving."
          : "Outside tolerance — likely a wrong pin or a different property. Reject or re-visit.";
      return '<div class="gps-flag gps-flag--' + cls + '">' + icon("gps") + "<div>" +
        "<b>Claimed vs. captured: " + esc(PT.distLabel(d)) + " apart.</b> " + esc(verdict) +
        '<br><code>claimed ' + p.claimed.lat.toFixed(5) + ", " + p.claimed.lng.toFixed(5) +
        " · captured " + p.captured.lat.toFixed(5) + ", " + p.captured.lng.toFixed(5) +
        " (±" + (p.captured.accuracy || "?") + "m)</code></div></div>";
    }

    function qCard(p) {
      var checks = readChecks()[p.id] || {};
      var media = (p.images && p.images.length)
        ? '<img src="' + esc(p.images[0].src) + '" alt="Submission photo — ' + esc(p.title) + '">'
        : '<div class="img-ph">' + icon("camera") + "<span>" + (p.photoCount || 0) + "<br>owner photos</span></div>";

      var metaBits = [
        "<span>" + icon("tag") + esc(PT.typeLabel(p.type)) + " · " + esc(p.listingType === "rent" ? "For rent" : "For sale") + "</span>",
        "<span>" + icon("pin") + esc(p.neighborhood) + "</span>",
        "<span>" + icon("clock") + "Submitted " + esc(PT.timeAgo(p.submittedAt)) + (p.source ? " via " + esc(p.source) : "") + "</span>",
        "<span>" + icon("phone") + esc(p.landlord ? p.landlord.name + " · " + p.landlord.phone : "Owner unknown") + "</span>"
      ];

      return '<article class="q-card" data-id="' + esc(p.id) + '">' +
        '<div class="q-card__media"><span class="qsrc">' + esc(p.photoCount || (p.images ? p.images.length : 0)) + ' photos</span>' + media + "</div>" +
        '<div class="q-card__body">' +
          '<div class="q-card__title"><h3>' + esc(p.title) + '</h3><span class="qprice">' + PT.priceHTML(p) + "</span></div>" +
          '<div class="q-meta">' + metaBits.join("") + "</div>" +
          (p.note ? '<p class="q-note">' + esc(p.note) + "</p>" : "") +
          gpsFlag(p) +
          '<div class="checklist">' +
            CHECK_LABELS.map(function (c) {
              return "<label><input type='checkbox' data-check='" + c[0] + "'" + (checks[c[0]] ? " checked" : "") + ">" + esc(c[1]) + "</label>";
            }).join("") +
          "</div>" +
          '<div class="q-actions">' +
            '<input class="input q-note-input" type="text" data-note placeholder="Agent note (optional) — e.g. “owner met on site, meter number recorded”">' +
            '<span class="spacer"></span>' +
            '<button class="btn btn-danger-outline btn-sm" data-act="reject">' + icon("x") + "Reject</button>" +
            '<button class="btn btn-green btn-sm" data-act="approve">' + icon("shield") + "Approve &amp; issue badge</button>" +
          "</div>" +
        "</div>" +
      "</article>";
    }

    function processedCard(p) {
      var ok = p.status === "verified";
      return '<div class="processed-item" data-id="' + esc(p.id) + '">' +
        PT.badgeHTML(ok ? "verified" : "rejected") +
        "<div><div class='pi-title'>" + esc(p.title) + "</div>" +
        "<div class='pi-sub'>" + esc(ok ? "Badge issued " + PT.timeAgo(p.decidedAt) + " — now live in search" : "Rejected " + PT.timeAgo(p.decidedAt) + (p.decisionNote ? " — " + p.decisionNote : "")) + "</div></div>" +
        '<span class="spacer"></span>' +
        (ok ? '<a class="btn btn-outline btn-sm" href="property.html?id=' + encodeURIComponent(p.id) + '">View live listing</a>' : "") +
        '<button class="btn btn-ghost btn-sm" style="color:var(--slate);border-color:var(--line)" data-act="undo">Undo</button>' +
      "</div>";
    }

    function render() {
      var queue = PT.reviewQueue();
      var pending = queue.filter(function (p) { return p.status === "pending"; });
      var done = queue.filter(function (p) { return p.status !== "pending"; });

      /* stats */
      var weekAgo = Date.now() - 7 * 864e5;
      var verifiedWeek =
        PT_DATA.LISTINGS.filter(function (l) { return new Date(l.verifiedAt).getTime() > weekAgo; }).length +
        done.filter(function (p) { return p.status === "verified" && new Date(p.decidedAt).getTime() > weekAgo; }).length;
      var rejected = done.filter(function (p) { return p.status === "rejected"; }).length;
      var flagged = pending.filter(function (p) {
        return p.claimed && p.captured && PT.haversineM(p.claimed, p.captured) > 200;
      }).length;

      qs("#statPending").textContent = pending.length;
      qs("#statVerified").textContent = verifiedWeek;
      qs("#statFlag").textContent = flagged;
      qs("#statRejected").textContent = rejected;

      var qWrap = qs("#queueWrap");
      qWrap.innerHTML = pending.length
        ? pending.map(qCard).join("")
        : '<div class="empty"><h3>Queue is empty</h3><p>New submissions appear here when owners list a property — try the <a href="list-property.html">list-property form</a>.</p></div>';

      var pWrap = qs("#processedWrap");
      var pSec = qs("#processedSec");
      if (done.length) {
        pSec.classList.remove("hidden");
        pWrap.innerHTML = done.map(processedCard).join("");
      } else {
        pSec.classList.add("hidden");
        pWrap.innerHTML = "";
      }
    }

    /* interactions (delegated) */
    document.addEventListener("change", function (e) {
      var cb = e.target.closest ? e.target.closest("[data-check]") : null;
      if (!cb) return;
      var card = cb.closest("[data-id]");
      var id = card.getAttribute("data-id");
      var m = readChecks();
      m[id] = m[id] || {};
      m[id][cb.getAttribute("data-check")] = cb.checked;
      writeChecks(m);
    });

    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!btn) return;
      var card = btn.closest("[data-id]");
      var id = card.getAttribute("data-id");
      var act = btn.getAttribute("data-act");
      var noteEl = card.querySelector("[data-note]");
      var note = noteEl ? noteEl.value.trim() : "";

      if (act === "undo") {
        PT.setDecision(id, null);
        PT.toast("Decision undone — back in the queue");
      } else if (act === "approve") {
        var m = readChecks()[id] || {};
        var missing = CHECK_LABELS.filter(function (c) { return !m[c[0]]; });
        var p = PT.reviewQueue().filter(function (x) { return x.id === id; })[0];
        var gpsBad = p && p.claimed && p.captured && PT.haversineM(p.claimed, p.captured) > 200;
        if (gpsBad) {
          PT.toast("Blocked: GPS is over 200m off — resolve or reject first");
          return;
        }
        if (missing.length) {
          PT.toast("Complete all 4 checks before approving (" + missing.length + " missing)");
          return;
        }
        PT.setDecision(id, { status: "verified", at: new Date().toISOString(), note: note, agent: "You (field demo)" });
        PT.toast("Badge issued — listing is now live", "ok");
      } else if (act === "reject") {
        PT.setDecision(id, { status: "rejected", at: new Date().toISOString(), note: note || "Failed verification" });
        PT.toast("Submission rejected");
      }
      render();
    });

    var resetBtn = qs("#demoReset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        PT.clearDemo();
        render();
        PT.toast("Demo data cleared — queue back to its seeded state");
      });
    }

    render();
  });
})();
