(() => {
  'use strict';
  const SLOTS = new Set(['finn', 'aria', 'luna', 'noah', 'leo', 'zoey', 'max']);
  const stage = document.getElementById('stage'), status = document.getElementById('status');
  let ready = false, pending = null, agents = [], selected = null;
  const post = data => { if (parent !== window) parent.postMessage({version: 1, ...data}, location.origin); };
  const apply = data => {
    agents = data.agents.filter(a => a && SLOTS.has(a.slot) && typeof a.id === 'string' && typeof a.name === 'string' && ['working', 'idle', 'error'].includes(a.status)).slice(0, 7).map(a => ({slot: a.slot, id: a.id, name: a.name.slice(0, 80), status: a.status}));
    MV.setAgents(agents, data.connected === true);
    const person = agents.find(a => a.id === data.selectedId);
    selectionOption.disabled = !person;
    if (person && selected !== person.id) {
      if (MV.debug().sel !== person.slot) MV.select(person.slot);
      MV.follow(person.slot);
      zoneSelect.value = 'selected';
      document.body.dataset.view = 'selected';
    }
    selected = person?.id ?? null;
    stage.setAttribute('aria-label', agents.length ? agents.map(a => a.name).join(' · ') + ' — 연구실' : '연결된 연구원이 없는 연구실');
  };
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    const data = event.data;
    if (!data || data.version !== 1 || data.type !== 'research-lab:state' || !Array.isArray(data.agents)) return;
    pending = data; if (ready) apply(data);
  });
  const zoneSelect = document.createElement('select');
  zoneSelect.setAttribute('aria-label', '공간 보기');
  for (const [key, zone] of Object.entries(MV.zones)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = zone.name;
    zoneSelect.append(option);
  }
  const selectionOption = document.createElement('option');
  selectionOption.value = 'selected';
  selectionOption.disabled = true;
  selectionOption.textContent = '선택한 연구원';
  zoneSelect.append(selectionOption);
  zoneSelect.value = 'all';
  zoneSelect.addEventListener('change', () => {
    document.body.dataset.view = zoneSelect.value === 'all' ? 'all' : zoneSelect.value === 'selected' ? 'selected' : 'zone';
    if (zoneSelect.value === 'selected') {
      const person = agents.find(agent => agent.id === selected);
      if (person) MV.follow(person.slot);
      else { zoneSelect.value = 'all'; MV.setView('all'); }
    } else MV.setView(zoneSelect.value);
  });
  document.getElementById('zones').append(zoneSelect);
  stage.addEventListener('click', event => {
    if (!ready) return;
    const rect = stage.getBoundingClientRect(), W = MV.spec.stage.W, H = MV.spec.stage.H;
    const x = (event.clientX - rect.left) * W / rect.width, y = (event.clientY - rect.top) * H / rect.height, d = MV.debug();
    const inside = r => r && x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
    for (const person of agents) {
      const r = person.slot === 'finn' ? MV.roiFinn() : MV.roi(person.slot), raw = MV.tags().rects[person.slot];
      const tag = raw?.map((v, i) => (i % 2 ? H / 2 : W / 2) + (v - d.cam.c[i % 2]) * d.cam.z);
      if (inside(r) || inside(tag)) { post({type: 'research-lab:select', agentId: person.id}); break; }
    }
  });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const setMotion = () => MV.setReducedMotion(motion.matches); motion.addEventListener('change', setMotion); setMotion();
  MV.start().then(() => { ready = true; status.hidden = true; if (pending) apply(pending); post({type:'research-lab:ready'}); }).catch(() => { status.textContent = '연구실을 불러오지 못했습니다. 새로고침해 주세요.'; });
})();
