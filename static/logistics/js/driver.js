(function(){
  const C = window.__DRIVER__;
  if (!C) return;
  const dutyBtn = document.getElementById('duty-btn');
  const dutyStatus = document.getElementById('duty-status');

  async function postForm(url, fd){
    const r = await fetch(url, {method:'POST', body: fd});
    return r.json();
  }

  dutyBtn && dutyBtn.addEventListener('click', async () => {
    const j = await postForm(C.dutyUrl, new FormData());
    if (j.ok){
      dutyBtn.textContent = j.is_on_duty ? '🟢 On duty' : '⚪ Off duty';
      dutyBtn.classList.toggle('on', j.is_on_duty);
      dutyBtn.classList.toggle('off', !j.is_on_duty);
    }
  });

  // Accept buttons
  document.querySelectorAll('.accept-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Accepting…';
      const fd = new FormData();
      const j = await postForm(C.acceptUrl(btn.dataset.jid), fd);
      if (j.ok){ window.location.reload(); }
      else { alert(j.error || 'Could not accept.'); btn.disabled=false; btn.textContent='Accept job'; }
    });
  });

  // Ping location every 20 seconds while on-duty
  let watchId = null;
  function startWatch(){
    if (!navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(async pos => {
      const fd = new FormData();
      fd.append('lat', pos.coords.latitude);
      fd.append('lng', pos.coords.longitude);
      fd.append('on_duty', dutyBtn.classList.contains('on') ? '1' : '0');
      try {
        await postForm(C.pingUrl, fd);
        dutyStatus.textContent = 'GPS: online ('+pos.coords.accuracy.toFixed(0)+'m)';
      }catch(e){ dutyStatus.textContent = 'GPS: sync error'; }
    }, err => {
      dutyStatus.textContent = 'GPS: unavailable – please enable location';
    }, { enableHighAccuracy:true, maximumAge:15000, timeout:20000 });
  }
  if (dutyBtn) startWatch();

  // Refresh nearby jobs every 30s
  async function refreshNearby(){
    try{
      const r = await fetch(C.jobsUrl);
      const j = await r.json();
      if (!j.ok) return;
      const count = document.getElementById('nearby-count');
      if (count) count.textContent = j.jobs.length;
      // Naive refresh: reload list HTML from server to keep template consistent
      // (avoid duplicating rendering logic in JS for a demo)
    }catch(e){}
  }
  setInterval(refreshNearby, 30000);
})();
