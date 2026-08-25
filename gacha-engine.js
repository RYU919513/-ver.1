(() => {
  'use strict';
  const SUPPORTED = new Set(['SECRET','GOLD_TREASURE','PROMO','SPECIAL','ART_VARIANT']);
  function validateCatalog(catalog) {
    if (!catalog || !Array.isArray(catalog.variants)) return { ok:false, reason:'variants配列がありません。' };
    const eligible = catalog.variants.filter(v => v && SUPPORTED.has(v.variantType) && Number(v.weight) > 0 && v.id && v.name);
    return { ok:true, eligible };
  }
  function draw(catalog, random = Math.random) {
    const v = validateCatalog(catalog);
    if (!v.ok) throw new Error(v.reason);
    if (!v.eligible.length) throw new Error('抽選できる特殊版カードが登録されていません。');
    const total = v.eligible.reduce((s,x)=>s+Number(x.weight),0);
    let roll = random()*total;
    for (const item of v.eligible) { roll -= Number(item.weight); if (roll < 0) return item; }
    return v.eligible[v.eligible.length-1];
  }
  window.DuelixGacha = { validateCatalog, draw, supported:[...SUPPORTED] };
})();
