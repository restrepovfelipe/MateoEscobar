/* Somos la 13 al ritmo del fútbol — convocatoria e inscripción de equipos */
(() => {
  'use strict';

  const WHATSAPP_NUMBER = '573113114891';
  // OPCIONAL: URL de un Google Apps Script / Formspree para guardar además cada inscripción.
  const TEAM_ENDPOINT = '';
  const MIN_P = 12, MAX_P = 15, AGE_MIN = 14, AGE_MAX = 40;

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ================= movimiento de página ================= */
  const revealEls = $$('.rv, .route, .cat, .mosaic');
  if ('IntersectionObserver' in window && !REDUCED) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        if (e.target.classList.contains('mosaic')) $$('.ph', e.target).forEach(p => p.classList.add('in'));
        io.unobserve(e.target);
      }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
    $$('.ph').forEach(p => p.classList.add('in'));
  }

  // paralaje (solo transform, un rAF por scroll)
  const bg = $('.kh-bg'), ghost = $('.kh-ghost'), hero = $('.kh'), qb = $('.qb-img');
  const phImgs = $$('.ph img[data-speed]');
  if (!REDUCED) {
    let tick = false;
    const vh = () => window.innerHeight;
    const update = () => {
      tick = false;
      const sy = window.scrollY;
      if (hero) {
        const y = Math.min(sy, hero.offsetHeight);
        if (bg) bg.style.transform = `translate3d(0,${y * 0.22}px,0) scale(1.08)`;
        if (ghost) ghost.style.transform = `translate3d(${-y * 0.12}px,${y * 0.08}px,0)`;
      }
      if (qb) {
        const r = qb.parentElement.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh()) {
          const lim = r.height * 0.1;
          qb.style.transform = `translate3d(0,${Math.max(-lim, Math.min(lim, (r.top - vh() / 2) * -0.08))}px,0)`;
        }
      }
      phImgs.forEach(img => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh()) return;
        const lim = r.height * 0.12;
        const off = (r.top + r.height / 2 - vh() / 2) * parseFloat(img.dataset.speed);
        img.style.transform = `translate3d(0,${Math.max(-lim, Math.min(lim, off))}px,0)`;
      });
    };
    window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ================= cuenta regresiva ================= */
  const cd = $('#countdown');
  if (cd) {
    const target = new Date(cd.dataset.target).getTime();
    const cells = {};
    $$('.cd-n', cd).forEach(n => { cells[n.dataset.u] = n; });
    const pad = n => String(n).padStart(2, '0');
    const setVal = (el, val, animate) => {
      const cur = el.querySelector('b:not(.old)');
      if (cur.textContent === val) return;
      if (!animate || REDUCED) { cur.textContent = val; return; }
      const old = cur.cloneNode(true);
      old.classList.add('old');
      el.append(old);
      cur.textContent = val;
      cur.style.transition = 'none';
      cur.style.transform = 'translateY(100%)';
      old.style.transform = 'translateY(0)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cur.style.transition = '';
        cur.style.transform = 'translateY(0)';
        old.style.transform = 'translateY(-100%)';
      }));
      setTimeout(() => old.remove(), 520);
    };
    let first = true;
    const render = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        cd.outerHTML = '<div class="cd-msg kh-fade" style="--d:0">¡Llegó el día! Sábado 28 de noviembre</div>';
        clearInterval(timer);
        return;
      }
      const s = Math.floor(diff / 1000);
      setVal(cells.d, pad(Math.floor(s / 86400)), !first);
      setVal(cells.h, pad(Math.floor(s % 86400 / 3600)), !first);
      setVal(cells.m, pad(Math.floor(s % 3600 / 60)), !first);
      setVal(cells.s, pad(s % 60), !first);
      first = false;
    };
    const timer = setInterval(render, 1000);
    render();
  }

  /* ================= video ================= */
  const vid = $('#vid'), vEl = $('#vidEl'), vBtn = $('#vidPlay');
  if (vid && vEl && vBtn) {
    vBtn.addEventListener('click', () => {
      vEl.hidden = false;
      vid.classList.add('playing');
      vEl.play().catch(() => { vEl.controls = true; });
    });
    vEl.addEventListener('ended', () => { vid.classList.remove('playing'); vEl.hidden = true; });
  }

  /* ================= iniciativas: se enciende la que cruza el centro ================= */
  const iniList = $('#iniList');
  if (iniList) {
    const items = $$('.ini', iniList);
    const upd = () => {
      const mid = window.innerHeight * 0.52;
      let active = -1;
      items.forEach((it, i) => { const r = it.getBoundingClientRect(); if (r.top < mid) active = i; });
      items.forEach((it, i) => it.classList.toggle('on', i <= active));
      iniList.style.setProperty('--pg', active < 0 ? 0 : (active + 1) / items.length);
    };
    let t = false;
    window.addEventListener('scroll', () => { if (!t) { t = true; requestAnimationFrame(() => { t = false; upd(); }); } }, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }

  /* ================= barra móvil ================= */
  const mCta = $('#mCta');
  if (mCta && 'IntersectionObserver' in window) {
    const hide = new Set();
    const ioC = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) hide.add(e.target.id); else hide.delete(e.target.id); });
      mCta.classList.toggle('show', hide.size === 0 && window.scrollY > 200);
    }, { threshold: 0.05 });
    ['top', 'inscripcion', 'cta-final'].forEach(id => { const el = document.getElementById(id); if (el) ioC.observe(el); });
  }

  /* ================= formulario de inscripción ================= */
  const form = $('#teamForm');
  if (!form) return;

  const digits = s => (s || '').replace(/\D/g, '');
  const normalizePhone = raw => {
    const d = digits(raw);
    if (/^3\d{9}$/.test(d)) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    if (/^573\d{9}$/.test(d)) return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
    return null;
  };
  const fmtAvg = n => (Math.round(n * 10) / 10).toString().replace('.', ',');

  /* ---- planilla ---- */
  const plList = $('#plList');
  const addBtn = $('#plAdd');
  const rosterN = $('#rosterN');
  const meterFill = $('#meterFill');
  const avgHint = $('#avgHint');
  const promedio = form.elements.promedio;
  let promedioTouched = false;

  function addRow(focus) {
    if ($$('.pl', plList).length >= MAX_P) return;
    const li = document.createElement('li');
    li.className = 'pl';
    li.innerHTML =
      '<span class="idx"></span>' +
      '<input class="f-n" type="text" name="pl_nombre" maxlength="70" autocomplete="off" aria-label="Nombre completo del jugador" placeholder="Nombre completo">' +
      '<input class="f-d" type="text" name="pl_doc" maxlength="20" autocomplete="off" inputmode="numeric" aria-label="Documento del jugador (opcional)" placeholder="Documento">' +
      '<input class="f-e" type="number" name="pl_edad" min="14" max="40" inputmode="numeric" aria-label="Edad del jugador" placeholder="Edad">' +
      '<input class="f-no" type="text" name="pl_num" maxlength="3" inputmode="numeric" autocomplete="off" aria-label="Número de camiseta (opcional)" placeholder="N.º">' +
      '<button type="button" class="rm" aria-label="Quitar jugador">×</button>';
    plList.append(li);
    if (REDUCED) li.style.animation = 'none';
    reindex();
    if (focus) li.querySelector('.f-n').focus();
  }

  function removeRow(li) {
    if ($$('.pl', plList).length <= 1) return;
    const done = () => { li.remove(); reindex(); sync(); };
    if (REDUCED) return done();
    li.classList.add('out');
    setTimeout(done, 260);
  }

  function reindex() {
    const rows = $$('.pl', plList).filter(r => !r.classList.contains('out'));
    rows.forEach((r, i) => {
      r.querySelector('.idx').textContent = i + 1;
      r.querySelector('.rm').disabled = rows.length <= 1;
    });
    addBtn.disabled = rows.length >= MAX_P;
    addBtn.textContent = rows.length >= MAX_P ? 'Máximo de 15 jugadores' : '+ Agregar jugador';
  }

  const rowData = row => ({
    row,
    nombre: row.querySelector('.f-n').value.trim(),
    doc: row.querySelector('.f-d').value.trim(),
    edad: parseInt(row.querySelector('.f-e').value, 10),
    num: row.querySelector('.f-no').value.trim()
  });
  const rowValid = p => p.nombre.length >= 3 && p.edad >= AGE_MIN && p.edad <= AGE_MAX;
  const rowsNow = () => $$('.pl', plList).filter(r => !r.classList.contains('out')).map(rowData);

  /* ---- lectura ---- */
  function read() {
    const fd = new FormData(form);
    const g = k => (fd.get(k) || '').toString().trim();
    const players = rowsNow();
    return {
      trampa: g('website'),
      categoria: g('categoria'), equipo: g('equipo'), barrio: g('barrio'), historia: g('historia'),
      promedio: g('promedio'), uniforme: g('uniforme'), insignia: g('insignia'),
      players, validPlayers: players.filter(rowValid),
      resp: g('resp_nombre'), telefono: g('telefono'), correo: g('correo'), mensaje: g('mensaje'),
      acepta: !!fd.get('acepta'), autoriza: !!fd.get('autoriza')
    };
  }

  /* ---- resumen en vivo (solo la fila que cambia se anima) ---- */
  const prevSummary = new Map();
  function summaryRows(d) {
    const rows = [];
    if (!d.categoria) return rows;
    rows.push(['Categoría', d.categoria]);
    if (d.equipo) rows.push(['Equipo', d.equipo]);
    if (d.barrio) rows.push(['Barrio', d.barrio]);
    if (d.uniforme) rows.push(['Uniforme', d.uniforme]);
    if (d.promedio) rows.push(['Edad promedio', d.promedio.replace('.', ',')]);
    rows.push(['Planilla', `${d.validPlayers.length} de ${MAX_P} jugadores`]);
    if (d.resp) rows.push(['Responsable', d.resp]);
    if (d.telefono) rows.push(['WhatsApp', normalizePhone(d.telefono) || d.telefono]);
    return rows;
  }
  function renderSummary(d) {
    const rows = summaryRows(d);
    const list = $('#sumList'), empty = $('#sumEmpty');
    const keys = new Set(rows.map(r => r[0]));
    Array.from(list.children).forEach(el => { if (!keys.has(el.dataset.k)) { el.remove(); prevSummary.delete(el.dataset.k); } });
    let anchor = null;
    rows.forEach(([k, v]) => {
      let row = Array.from(list.children).find(el => el.dataset.k === k);
      if (!row) {
        row = document.createElement('div');
        row.className = 'sum-row';
        row.dataset.k = k;
        const dt = document.createElement('dt'); dt.textContent = k;
        row.append(dt, document.createElement('dd'));
        if (!REDUCED) row.classList.add('enter');
      }
      const dd = row.querySelector('dd');
      if (prevSummary.get(k) !== String(v)) {
        dd.textContent = v;
        if (prevSummary.has(k) && !REDUCED) { row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
        prevSummary.set(k, String(v));
      }
      const ref = anchor ? anchor.nextSibling : list.firstChild;
      if (row !== ref) list.insertBefore(row, ref);
      anchor = row;
    });
    list.hidden = rows.length === 0;
    empty.hidden = rows.length > 0;
  }

  /* ---- riel ---- */
  const rail = $('#rail'), railBall = $('#railBall');
  let lastCur = 0;
  function renderRail(d) {
    const avg = parseFloat(d.promedio);
    const done = [
      !!d.categoria,
      d.equipo.length >= 2 && d.barrio.length >= 2 && d.historia.length >= 20 && avg >= AGE_MIN && avg <= AGE_MAX && d.uniforme.length >= 3 && d.insignia.length >= 3,
      d.validPlayers.length >= MIN_P,
      d.resp.length >= 3 && !!normalizePhone(d.telefono) && d.acepta && d.autoriza
    ];
    let cur = done.findIndex(x => !x);
    if (cur === -1) cur = 4;
    rail.style.setProperty('--p', Math.min(cur, 3) / 3);
    if (cur === 4) rail.style.setProperty('--p', 1);
    $$('li', rail).forEach((li, i) => {
      li.classList.toggle('done', done[i]);
      li.classList.toggle('cur', i === cur);
      if (i === cur) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.querySelector('.n').textContent = done[i] ? '✓' : String(i + 1);
    });
    if (cur !== lastCur && railBall && !REDUCED) { railBall.classList.remove('hop'); void railBall.offsetWidth; railBall.classList.add('hop'); }
    lastCur = cur;
  }

  /* ---- planilla: contador, medidor, promedio ---- */
  function renderRoster(d) {
    const n = d.validPlayers.length;
    rosterN.textContent = n;
    meterFill.style.setProperty('--m', Math.min(n, MAX_P) / MAX_P);
    d.players.forEach(p => {
      p.row.classList.toggle('ok', rowValid(p));
      p.row.classList.remove('bad');
    });
    if (d.validPlayers.length) {
      const avg = d.validPlayers.reduce((a, p) => a + p.edad, 0) / d.validPlayers.length;
      avgHint.hidden = false;
      avgHint.innerHTML = `Según tu planilla: <b>${fmtAvg(avg)}</b> años`;
      if (!promedioTouched) promedio.value = fmtAvg(avg).replace(',', '.');
    } else {
      avgHint.hidden = true;
    }
  }

  function sync() {
    const d = read();
    renderRoster(d);
    const d2 = read();           // el promedio autocompletado ya cuenta
    renderSummary(d2);
    renderRail(d2);
  }

  /* ---- validación ---- */
  function validate(d) {
    const errs = [];
    const add = (name, msg) => errs.push({ name, msg });
    if (!d.categoria) add('categoria', 'Escoge la categoría de tu equipo.');
    if (d.equipo.length < 2) add('equipo', 'Escribe el nombre del equipo.');
    if (d.barrio.length < 2) add('barrio', 'Escribe el barrio del equipo.');
    if (d.historia.length < 20) add('historia', 'Cuéntanos un poco más: mínimo 20 caracteres.');
    const avg = parseFloat(d.promedio);
    if (!(avg >= AGE_MIN && avg <= AGE_MAX)) add('promedio', `El promedio debe estar entre ${AGE_MIN} y ${AGE_MAX} años.`);
    if (d.uniforme.length < 3) add('uniforme', 'Indica el color del uniforme.');
    if (d.insignia.length < 3) add('insignia', 'Escribe al menos un jugador insignia.');

    // planilla
    let bad = 0;
    d.players.forEach(p => {
      const touched = p.nombre || p.doc || !isNaN(p.edad) || p.num;
      if (touched && !rowValid(p)) { bad++; p.row.classList.add('bad'); }
    });
    if (d.validPlayers.length < MIN_P) {
      add('planilla', `Faltan ${MIN_P - d.validPlayers.length} jugador${MIN_P - d.validPlayers.length === 1 ? '' : 'es'} para completar la planilla mínima de ${MIN_P}. Cada uno necesita nombre y edad (${AGE_MIN}–${AGE_MAX}).`);
    } else if (bad) {
      add('planilla', `Revisa ${bad} fila${bad === 1 ? '' : 's'} marcada${bad === 1 ? '' : 's'}: falta el nombre o la edad (${AGE_MIN}–${AGE_MAX}).`);
    }
    if (d.resp.length < 3) add('resp_nombre', 'Escribe el nombre del responsable.');
    if (!normalizePhone(d.telefono)) add('telefono', 'Ingresa un celular válido de 10 dígitos (ej. 311 311 4891).');
    if (d.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) add('correo', 'Revisa el correo: parece incompleto.');
    if (!d.acepta) add('acepta', 'Debes aceptar el tratamiento de datos para continuar.');
    if (!d.autoriza) add('autoriza', 'Debes confirmar la autorización de los jugadores.');
    return errs;
  }

  const wrapperOf = name => form.querySelector(`[data-field="${name}"]`);
  function clearError(w) {
    if (!w) return;
    w.classList.remove('has-error');
    const e = w.querySelector(':scope > .field-error');
    if (e) e.textContent = '';
    $$('[aria-invalid]', w).forEach(i => i.removeAttribute('aria-invalid'));
  }
  function showErrors(errs) {
    $$('[data-field]').forEach(clearError);
    const alertBox = $('#formAlert');
    errs.forEach(({ name, msg }) => {
      const w = wrapperOf(name); if (!w) return;
      w.classList.add('has-error');
      const e = w.querySelector(':scope > .field-error'); if (e) e.textContent = msg;
      $$('input,select,textarea', w).forEach(i => { if (name !== 'planilla') i.setAttribute('aria-invalid', 'true'); });
    });
    if (errs.length) {
      alertBox.innerHTML = `<strong>Revisa ${errs.length === 1 ? 'un campo' : errs.length + ' campos'}</strong> antes de enviar: están marcados en el formulario.`;
      alertBox.classList.add('show');
    } else { alertBox.classList.remove('show'); alertBox.textContent = ''; }
  }

  /* ---- mensaje de WhatsApp ---- */
  function buildMessage(d) {
    const L = [];
    const add = (k, v) => { if (v) L.push(`*${k}:* ${v}`); };
    L.push('*INSCRIPCIÓN DE EQUIPO — SOMOS LA 13 AL RITMO DEL FÚTBOL*');
    L.push('Sábado 28 de noviembre de 2026 · Comuna 13, Medellín');
    L.push('');
    add('Categoría', d.categoria);
    add('Equipo', d.equipo);
    add('Barrio', d.barrio);
    add('Promedio de edad', d.promedio.replace('.', ','));
    add('Color de uniforme', d.uniforme);
    add('Jugadores insignia', d.insignia);
    add('Historia', d.historia);
    L.push('');
    L.push(`*Planilla (${d.validPlayers.length} jugadores):*`);
    d.validPlayers.forEach((p, i) => {
      L.push(`${i + 1}. ${p.nombre} — ${p.edad} años${p.doc ? ' — Doc. ' + p.doc : ''}${p.num ? ' — Camiseta ' + p.num : ''}`);
    });
    L.push('');
    L.push('*Responsable*');
    add('Nombre', d.resp);
    add('WhatsApp', normalizePhone(d.telefono));
    add('Correo', d.correo);
    add('Mensaje', d.mensaje);
    L.push('');
    L.push('_Autorizo el tratamiento de datos (Ley 1581 de 2012) y confirmo la autorización de los jugadores._');
    return L.join('\n');
  }

  async function sendToEndpoint(d, message) {
    if (!TEAM_ENDPOINT) return;
    try {
      await fetch(TEAM_ENDPOINT, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          fecha: new Date().toISOString(), categoria: d.categoria, equipo: d.equipo, barrio: d.barrio,
          promedio: d.promedio, uniforme: d.uniforme, insignia: d.insignia, historia: d.historia,
          jugadores: d.validPlayers.map(p => ({ nombre: p.nombre, doc: p.doc, edad: p.edad, camiseta: p.num })),
          responsable: d.resp, telefono: normalizePhone(d.telefono), correo: d.correo, mensaje: d.mensaje, whatsapp: message
        })
      });
    } catch (_) { /* el mensaje de WhatsApp ya salió */ }
  }

  /* ---- éxito / edición ---- */
  const successBox = $('#teamSuccess'), pre = $('#successPre'), waAgain = $('#waAgain'), copyBtn = $('#copyMsg');
  let lastMessage = '';
  const scrollToForm = () => { const t = $('#inscripcion'); if (t) t.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); };
  function showSuccess(message, url) {
    lastMessage = message; pre.textContent = message; waAgain.href = url;
    form.hidden = true; successBox.hidden = false; scrollToForm();
    const h = successBox.querySelector('h2'); if (h) setTimeout(() => h.focus({ preventScroll: true }), 400);
  }
  function showForm() { successBox.hidden = true; form.hidden = false; scrollToForm(); }

  copyBtn.addEventListener('click', async () => {
    const original = copyBtn.textContent;
    try { await navigator.clipboard.writeText(lastMessage); }
    catch (_) {
      const ta = document.createElement('textarea');
      ta.value = lastMessage; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select();
      try { document.execCommand('copy'); } catch (__) { /* sin portapapeles */ }
      ta.remove();
    }
    copyBtn.textContent = '¡Copiado!';
    setTimeout(() => { copyBtn.textContent = original; }, 1800);
  });
  $('#editForm').addEventListener('click', showForm);
  $('#newTeam').addEventListener('click', () => {
    form.reset(); promedioTouched = false;
    plList.textContent = ''; for (let i = 0; i < MIN_P; i++) addRow(false);
    showErrors([]); sync(); histCount(); showForm();
  });

  /* ---- envío ---- */
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const d = read();
    if (d.trampa) return;
    const errs = validate(d);
    showErrors(errs);
    if (errs.length) {
      const first = wrapperOf(errs[0].name);
      const field = first && (first.querySelector('.pl.bad input') || first.querySelector('input:not([type=hidden]),select,textarea'));
      if (first) first.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
      if (field) setTimeout(() => field.focus({ preventScroll: true }), 350);
      return;
    }
    const message = buildMessage(d);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
    sendToEndpoint(d, message);
    const btn = $('#teamSubmit'), label = btn.textContent;
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Preparando tu inscripción…';
    setTimeout(() => {
      btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); btn.textContent = label;
      showSuccess(message, url);
    }, REDUCED ? 0 : 750);
  });

  /* ---- interacciones ---- */
  form.addEventListener('input', ev => {
    const t = ev.target;
    clearError(t.closest('[data-field]'));
    if (t === promedio) promedioTouched = !!t.value;
    if (t.name === 'pl_doc') t.value = t.value.replace(/\s+/g, '');
    if (t.name === 'pl_num') t.value = t.value.replace(/\D/g, '');
    if (t.closest('.field.ok')) t.closest('.field').classList.remove('ok');
    sync();
  });
  form.addEventListener('change', ev => { clearError(ev.target.closest('[data-field]')); sync(); });

  const tel = form.elements.telefono;
  tel.addEventListener('blur', () => { const n = normalizePhone(tel.value); if (n) { tel.value = n; sync(); } });

  const OK_FIELDS = ['equipo', 'barrio', 'uniforme', 'insignia', 'resp_nombre', 'telefono', 'correo'];
  form.addEventListener('focusout', ev => {
    const w = ev.target.closest('.field[data-field]');
    if (!w || !OK_FIELDS.includes(w.dataset.field)) return;
    const input = w.querySelector('input');
    const valid = input && input.value.trim() && !validate(read()).some(e => e.name === w.dataset.field);
    w.classList.toggle('ok', !!valid);
  });

  const his = form.elements.historia, hisCount = $('#hisCount');
  function histCount() { hisCount.textContent = his.value.length; }
  his.addEventListener('input', histCount);

  addBtn.addEventListener('click', () => { addRow(true); sync(); });
  plList.addEventListener('click', ev => { const b = ev.target.closest('.rm'); if (b && !b.disabled) removeRow(b.closest('.pl')); });
  // Enter en el nombre de un jugador salta a la siguiente fila (o crea una nueva)
  plList.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' || !ev.target.matches('.f-e, .f-no')) return;
    ev.preventDefault();
    const row = ev.target.closest('.pl'), next = row.nextElementSibling;
    if (next) next.querySelector('.f-n').focus(); else { addRow(true); sync(); }
  });

  /* ---- atajos: cupos y ?categoria= ---- */
  function pickCat(cat, scroll) {
    const r = form.querySelector(`input[name="categoria"][value="${cat}"]`);
    if (!r) return;
    r.checked = true; clearError(wrapperOf('categoria')); sync();
    if (scroll) { if (!form.hidden) scrollToForm(); else showForm(); }
  }
  $$('[data-pick-cat]').forEach(b => b.addEventListener('click', () => pickCat(b.dataset.pickCat, true)));
  const preset = new URLSearchParams(location.search).get('categoria');
  if (preset) pickCat(preset.charAt(0).toUpperCase() + preset.slice(1).toLowerCase(), false);

  for (let i = 0; i < MIN_P; i++) addRow(false);
  sync(); histCount();
})();
