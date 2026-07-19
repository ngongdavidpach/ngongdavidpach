(function(){
  const C = window.__JL__;
  const state = { pickup:null, dropoff:null };
  let tab = "pickup";

  const map = L.map('booking-map', { zoomControl:true }).setView(C.center, 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution:'© OpenStreetMap'
  }).addTo(map);

  const pickupIcon = L.divIcon({
    className:'', html:'<div style="background:#ff7a1a;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.4);"></div>',
    iconSize:[28,28], iconAnchor:[14,28]
  });
  const dropIcon = L.divIcon({
    className:'', html:'<div style="background:#19b372;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.4);"></div>',
    iconSize:[28,28], iconAnchor:[14,28]
  });
  let pickupMarker = null, dropMarker = null, routeLine = null;

  function setTab(name){
    tab = name;
    ['pickup','dropoff','confirm'].forEach(n => {
      document.getElementById('tab-'+n).classList.toggle('active', n===name);
      document.getElementById('sec-'+n).style.display = (n===name) ? 'block' : 'none';
    });
  }

  function setPickup(latlng, label){
    state.pickup = latlng;
    document.getElementById('pickup_lat').value = latlng.lat.toFixed(6);
    document.getElementById('pickup_lng').value = latlng.lng.toFixed(6);
    if (label) document.getElementById('pickup_label').value = label;
    if (pickupMarker) pickupMarker.setLatLng(latlng);
    else pickupMarker = L.marker(latlng, {icon:pickupIcon, draggable:true}).addTo(map)
      .bindPopup('Pickup').on('dragend', e=>{ setPickup(e.target.getLatLng()); updateRoute(); refreshQuote(); });
    updateRoute();
  }
  function setDropoff(latlng, label){
    state.dropoff = latlng;
    document.getElementById('dropoff_lat').value = latlng.lat.toFixed(6);
    document.getElementById('dropoff_lng').value = latlng.lng.toFixed(6);
    if (label) document.getElementById('dropoff_label').value = label;
    if (dropMarker) dropMarker.setLatLng(latlng);
    else dropMarker = L.marker(latlng, {icon:dropIcon, draggable:true}).addTo(map)
      .bindPopup('Drop-off').on('dragend', e=>{ setDropoff(e.target.getLatLng()); updateRoute(); refreshQuote(); });
    updateRoute();
  }
  function updateRoute(){
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    if (state.pickup && state.dropoff){
      routeLine = L.polyline([
        [state.pickup.lat, state.pickup.lng],
        [state.dropoff.lat, state.dropoff.lng]
      ], { color:'#ff7a1a', weight:4, dashArray:'6 8', opacity:0.8 }).addTo(map);
      map.fitBounds(L.latLngBounds([state.pickup, state.dropoff]).pad(0.25));
    }
  }

  map.on('click', e => {
    if (tab === 'pickup' || !state.pickup) { setPickup(e.latlng); if (!state.pickup) { /* just placed */ } }
    else if (tab === 'dropoff' || !state.dropoff) { setDropoff(e.latlng); }
    refreshQuote();
  });

  document.querySelectorAll('button[data-role="pickup"]').forEach(b => {
    b.addEventListener('click', () => {
      const lat = parseFloat(b.dataset.lat), lng=parseFloat(b.dataset.lng);
      setPickup({lat,lng}, b.dataset.name);
      map.setView([lat,lng], 16);
      refreshQuote();
    });
  });
  document.querySelectorAll('button[data-role="dropoff"]').forEach(b => {
    b.addEventListener('click', () => {
      const lat = parseFloat(b.dataset.lat), lng=parseFloat(b.dataset.lng);
      setDropoff({lat,lng}, b.dataset.name);
      map.setView([lat,lng], 16);
      refreshQuote();
    });
  });

  document.getElementById('to-dropoff').onclick = () => {
    if (!state.pickup){ alert('Please tap the map to set your pickup location first.'); return; }
    setTab('dropoff');
  };
  document.getElementById('back-pickup').onclick = () => setTab('pickup');
  document.getElementById('to-confirm').onclick = () => {
    if (!state.dropoff){ alert('Please tap the map to set the drop-off location.'); return; }
    if (!document.getElementById('recipient_name').value || !document.getElementById('recipient_phone').value){
      alert('Please provide recipient name and phone.'); return;
    }
    setTab('confirm'); refreshQuote();
  };

  async function refreshQuote(){
    if (!state.pickup || !state.dropoff){ document.getElementById('confirm-btn').disabled = true; return; }
    const size = document.getElementById('package_size').value;
    const u = `${C.quoteUrl}?plat=${state.pickup.lat}&plng=${state.pickup.lng}&dlat=${state.dropoff.lat}&dlng=${state.dropoff.lng}&size=${size}`;
    try{
      const r = await fetch(u); const j = await r.json();
      const box = document.getElementById('quote-box');
      const warn = document.getElementById('quote-warn');
      if (!j.ok){
        warn.textContent = j.error || 'Unable to quote this route.';
        warn.style.display='block'; box.style.display='none';
        document.getElementById('confirm-btn').disabled = true; return;
      }
      warn.style.display='none'; box.style.display='block';
      document.getElementById('quote-price').textContent = '£' + Math.round(j.fee_ssp).toLocaleString() + ' SSP';
      document.getElementById('quote-km').textContent = j.distance_km.toFixed(1);
      document.getElementById('quote-payout').textContent = '£' + Math.round(j.driver_payout_ssp).toLocaleString();
      document.getElementById('confirm-btn').disabled = false;
    }catch(e){ console.error(e); }
  }
  document.getElementById('package_size').addEventListener('change', refreshQuote);

  document.getElementById('booking-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('confirm-btn');
    btn.disabled = true; btn.textContent = 'Booking…';
    const fd = new FormData(e.target);
    fd.set('pickup_lat', state.pickup.lat);
    fd.set('pickup_lng', state.pickup.lng);
    fd.set('dropoff_lat', state.dropoff.lat);
    fd.set('dropoff_lng', state.dropoff.lng);
    try{
      const r = await fetch(C.createUrl, { method:'POST', body: fd });
      const j = await r.json();
      if (!j.ok){ alert(j.error || 'Booking failed'); btn.disabled=false; btn.textContent='📦 Confirm booking'; return; }
      window.location.href = C.myDeliveriesUrl;
    }catch(err){
      alert('Network error. Please try again.');
      btn.disabled=false; btn.textContent='📦 Confirm booking';
    }
  });

  // Try to geolocate the customer for convenience
  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos => {
      const ll = {lat:pos.coords.latitude, lng:pos.coords.longitude};
      // Only fly if near Juba
      if (ll.lat>4.7 && ll.lat<5.0 && ll.lng>31.3 && ll.lng<31.8){
        map.setView(ll, 15);
      }
    }, ()=>{}, {timeout:4000});
  }
})();
