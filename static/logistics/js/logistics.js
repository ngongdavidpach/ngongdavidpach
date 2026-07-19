/* JunubLogistics shared UI helpers */
(function(){
  // Auto-dismiss flash messages after 5 seconds
  setTimeout(function(){
    document.querySelectorAll('.jl-flash').forEach(function(el){
      el.style.transition = 'opacity .5s';
      el.style.opacity = '0';
      setTimeout(()=>el.remove(), 600);
    });
  }, 5000);

  // Simple phone input normalisation for South Sudan +211 prefix
  document.addEventListener('blur', function(e){
    const t = e.target;
    if (t && t.name && t.name.toLowerCase().includes('phone')) {
      let v = (t.value||'').replace(/\s+/g,'').replace(/-/g,'');
      if (v.startsWith('0')) v = '+211' + v.slice(1);
      else if (v.startsWith('211') && !v.startsWith('+')) v = '+' + v;
      else if (v.length === 9 && /^\d+$/.test(v)) v = '+211' + v;
      t.value = v;
    }
  }, true);
})();
