/* La Guayatón — formulario de donación
 * Valida los datos, muestra un resumen en vivo y arma el mensaje de WhatsApp.
 */
(() => {
  'use strict';

  const WHATSAPP_NUMBER = '573113114891';

  // OPCIONAL: pega aquí la URL de un Google Apps Script o servicio de formularios
  // (Formspree, etc.) para guardar además cada registro. Si queda vacío, el
  // formulario solo genera el mensaje de WhatsApp.
  const DONATION_ENDPOINT = '';

  const form = document.getElementById('donForm');
  if (!form) return;

  const TIPOS = {
    'guayos-usados': 'Guayos usados en buen estado',
    'guayos-nuevos': 'Guayos nuevos',
    'dinero': 'Aporte económico',
    'colecta': 'Organizar una colecta'
  };
  const ENTREGAS = {
    oficina: 'Los llevo a la Oficina 217',
    recoleccion: 'Coordinar con el equipo'
  };

  const $$ = (sel, root = form) => Array.from(root.querySelectorAll(sel));
  const money = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  const digits = s => (s || '').replace(/\D/g, '');

  /* ---------- lectura del formulario (solo campos habilitados) ---------- */
  function read() {
    const fd = new FormData(form);
    const g = k => (fd.get(k) || '').toString().trim();
    return {
      tipo: g('tipo'),
      donante: g('donante') || 'persona',
      nombre: g('nombre'),
      organizacion: g('organizacion'),
      telefono: g('telefono'),
      correo: g('correo'),
      ciudad: g('ciudad'),
      origen: g('origen'),
      docTipo: g('doc_tipo'),
      docNum: g('doc_num'),
      pares: g('pares'),
      tallas: fd.getAll('tallas'),
      entrega: g('entrega'),
      direccion: g('direccion'),
      barrio: g('barrio'),
      monto: g('monto'),
      montoOtro: g('monto_otro'),
      colectaOrg: g('colecta_org'),
      colectaTipo: g('colecta_tipo'),
      colectaPares: g('colecta_pares'),
      colectaFecha: g('colecta_fecha'),
      mensaje: g('mensaje'),
      anonimo: fd.get('anonimo') === 'si',
      novedades: fd.get('novedades') === 'si',
      acepta: fd.get('acepta') === 'si',
      trampa: g('website')
    };
  }

  const montoValor = d => d.monto === 'otro' ? parseInt(digits(d.montoOtro), 10) || 0 : parseInt(d.monto, 10) || 0;
  const esGuayos = t => t === 'guayos-usados' || t === 'guayos-nuevos';

  /* ---------- teléfono ---------- */
  const fmt10 = s => `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`;
  function normalizePhone(raw) {
    const s = (raw || '').replace(/[^\d+]/g, '');
    if (s.startsWith('+')) {
      const d = s.slice(1);
      if (d.startsWith('57') && d.length === 12 && d[2] === '3') return '+57 ' + fmt10(d.slice(2));
      return d.length >= 8 && d.length <= 15 ? '+' + d : null;
    }
    const local = s.replace(/^57(?=3\d{9}$)/, '');
    return /^3\d{9}$/.test(local) ? fmt10(local) : null;
  }

  /* ---------- visibilidad de bloques según las respuestas ---------- */
  function applyVisibility() {
    const d = read();
    const ctx = { tipo: d.tipo, donante: d.donante, entrega: d.entrega, monto: d.monto };
    $$('[data-types],[data-when],[data-none]').forEach(el => {
      let show = true;
      if (el.dataset.types) show = el.dataset.types.split(' ').includes(d.tipo);
      if (show && el.dataset.when) {
        const [k, v] = el.dataset.when.split('=');
        show = ctx[k] === v;
      }
      if (el.hasAttribute('data-none')) show = !d.tipo;
      el.hidden = !show;
    });
    // los campos de bloques ocultos se deshabilitan: no se validan ni se envían
    $$('input,select,textarea').forEach(c => {
      if (c.name === 'website') return;
      c.disabled = !!c.closest('[hidden]');
    });
  }

  /* ---------- resumen en vivo ---------- */
  function summaryRows(d) {
    const rows = [];
    if (!d.tipo) return rows;
    rows.push(['Aporte', TIPOS[d.tipo]]);
    if (d.nombre) rows.push(['Donante', d.nombre + (d.anonimo ? ' (anónimo)' : '')]);
    if (d.donante === 'organizacion' && d.organizacion) rows.push(['Organización', d.organizacion]);
    if (d.telefono) rows.push(['WhatsApp', normalizePhone(d.telefono) || d.telefono]);
    if (d.ciudad) rows.push(['Ciudad', d.ciudad]);
    if (esGuayos(d.tipo)) {
      if (d.pares) rows.push(['Pares', d.pares]);
      if (d.tallas.length) rows.push(['Tallas', d.tallas.map(t => t.split(' ')[0]).join(', ')]);
      if (d.entrega) rows.push(['Entrega', ENTREGAS[d.entrega]]);
    }
    if (d.tipo === 'dinero') {
      const v = montoValor(d);
      if (v) rows.push(['Monto', money(v)]);
    }
    if (d.tipo === 'colecta') {
      if (d.colectaOrg) rows.push(['Grupo', d.colectaOrg]);
      if (d.colectaTipo) rows.push(['Tipo', d.colectaTipo]);
      if (d.colectaPares) rows.push(['Meta', d.colectaPares + ' pares']);
    }
    return rows;
  }

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prevSummary = new Map();

  function renderSummary() {
    const rows = summaryRows(read());
    const list = document.getElementById('sumList');
    const empty = document.getElementById('sumEmpty');
    const keys = new Set(rows.map(r => r[0]));
    // quitar filas que ya no aplican
    Array.from(list.children).forEach(el => {
      if (!keys.has(el.dataset.k)) { el.remove(); prevSummary.delete(el.dataset.k); }
    });
    // actualizar o crear (solo la fila que cambió se anima)
    let anchor = null;
    rows.forEach(([k, v]) => {
      let row = Array.from(list.children).find(el => el.dataset.k === k);
      if (!row) {
        row = document.createElement('div');
        row.className = 'sum-row';
        row.dataset.k = k;
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        row.append(dt, dd);
        if (!REDUCED) row.classList.add('enter');
      }
      const dd = row.querySelector('dd');
      if (prevSummary.get(k) !== String(v)) {
        dd.textContent = v;
        if (prevSummary.has(k) && !REDUCED) {
          row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
        }
        prevSummary.set(k, String(v));
      }
      // mantener el orden
      const ref = anchor ? anchor.nextSibling : list.firstChild;
      if (row !== ref) list.insertBefore(row, ref);
      anchor = row;
    });
    list.hidden = rows.length === 0;
    empty.hidden = rows.length > 0;
  }

  /* ---------- riel de progreso (4 pasos) ---------- */
  const rail = document.getElementById('rail');
  const railBall = document.getElementById('railBall');
  let lastCur = 0;

  function stepsDone(d) {
    const done = [false, false, false, false];
    done[0] = !!d.tipo;
    done[1] = d.nombre.length >= 3 && !!normalizePhone(d.telefono) && d.ciudad.length >= 2 &&
      (d.donante !== 'organizacion' || d.organizacion.length >= 2);
    if (esGuayos(d.tipo)) {
      done[2] = parseInt(d.pares, 10) >= 1 && !!d.entrega && (d.entrega !== 'recoleccion' || d.direccion.length >= 5);
    } else if (d.tipo === 'dinero') {
      done[2] = !!d.monto && (d.monto !== 'otro' || montoValor(d) >= 1000);
    } else if (d.tipo === 'colecta') {
      done[2] = d.colectaOrg.length >= 2 && !!d.colectaTipo;
    }
    done[3] = !!d.acepta;
    return done;
  }

  function renderRail() {
    if (!rail) return;
    const done = stepsDone(read());
    let cur = done.findIndex(x => !x);          // primer paso pendiente
    if (cur === -1) cur = 4;
    rail.style.setProperty('--p', Math.min(cur, 3) / 3);
    if (cur === 4) rail.style.setProperty('--p', 1);
    rail.querySelectorAll('li').forEach((li, i) => {
      li.classList.toggle('done', done[i]);
      li.classList.toggle('cur', i === cur);
      if (i === cur) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      const n = li.querySelector('.n');
      n.textContent = done[i] ? '✓' : String(i + 1);
    });
    if (cur !== lastCur && railBall && !REDUCED) {
      railBall.classList.remove('hop'); void railBall.offsetWidth; railBall.classList.add('hop');
    }
    lastCur = cur;
  }

  function sync() {
    applyVisibility();
    applyVisibility(); // segunda pasada: los campos recién habilitados ya cuentan
    renderSummary();
    renderRail();
  }

  /* ---------- validación ---------- */
  function validate(d) {
    const errs = [];
    const add = (name, msg) => errs.push({ name, msg });

    if (!d.tipo) add('tipo', 'Elige cómo quieres ayudar.');
    if (d.nombre.length < 3 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(d.nombre)) add('nombre', 'Escribe tu nombre completo.');
    if (d.donante === 'organizacion' && d.organizacion.length < 2) add('organizacion', 'Escribe el nombre de la empresa u organización.');
    if (!normalizePhone(d.telefono)) add('telefono', 'Ingresa un celular válido de 10 dígitos (ej. 311 311 4891).');
    if (d.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) add('correo', 'Revisa el correo: parece incompleto.');
    if (d.ciudad.length < 2) add('ciudad', 'Escribe tu municipio o ciudad.');
    if (d.docNum && !d.docTipo) add('doc_tipo', 'Selecciona el tipo de documento.');
    if (d.docNum && !/^[A-Za-z0-9.\-]{4,20}$/.test(d.docNum)) add('doc_num', 'Revisa el número de documento.');

    if (esGuayos(d.tipo)) {
      const n = parseInt(d.pares, 10);
      if (!(n >= 1 && n <= 500)) add('pares', 'Indica cuántos pares (entre 1 y 500).');
      if (!d.entrega) add('entrega', 'Elige cómo los entregarás.');
      if (d.entrega === 'recoleccion' && d.direccion.length < 5) add('direccion', 'Escribe la dirección para coordinar.');
    }
    if (d.tipo === 'dinero') {
      if (!d.monto) add('monto', 'Elige o escribe un monto.');
      else if (d.monto === 'otro' && montoValor(d) < 1000) add('monto_otro', 'El monto mínimo es $1.000.');
    }
    if (d.tipo === 'colecta') {
      if (d.colectaOrg.length < 2) add('colecta_org', 'Escribe el nombre de tu colegio, empresa, club o grupo.');
      if (!d.colectaTipo) add('colecta_tipo', 'Selecciona el tipo de organización.');
      if (d.colectaPares && !(parseInt(d.colectaPares, 10) >= 1)) add('colecta_pares', 'Escribe un número válido.');
      if (d.colectaFecha) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        if (new Date(d.colectaFecha + 'T00:00:00') < hoy) add('colecta_fecha', 'La fecha no puede estar en el pasado.');
      }
    }
    if (!d.acepta) add('acepta', 'Debes aceptar el tratamiento de datos para continuar.');
    return errs;
  }

  const wrapperOf = name => form.querySelector(`[data-field="${name}"]`);

  function clearError(wrapper) {
    if (!wrapper) return;
    wrapper.classList.remove('has-error');
    const e = wrapper.querySelector('.field-error');
    if (e) e.textContent = '';
    wrapper.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
  }

  function showErrors(errs) {
    $$('[data-field]').forEach(clearError);
    const alertBox = document.getElementById('formAlert');
    errs.forEach(({ name, msg }) => {
      const w = wrapperOf(name);
      if (!w) return;
      w.classList.add('has-error');
      const e = w.querySelector('.field-error');
      if (e) e.textContent = msg;
      w.querySelectorAll('input,select,textarea').forEach(i => i.setAttribute('aria-invalid', 'true'));
    });
    if (errs.length) {
      alertBox.innerHTML = `<strong>Revisa ${errs.length === 1 ? 'un campo' : errs.length + ' campos'}</strong> antes de enviar: están marcados en el formulario.`;
      alertBox.classList.add('show');
    } else {
      alertBox.classList.remove('show');
      alertBox.textContent = '';
    }
  }

  /* ---------- mensaje de WhatsApp ---------- */
  function buildMessage(d) {
    const L = [];
    const add = (k, v) => { if (v) L.push(`*${k}:* ${v}`); };

    L.push('*SOLICITUD DE DONACIÓN — LA GUAYATÓN*', '');
    add('Aporte', TIPOS[d.tipo]);
    add('Donante', d.nombre + (d.anonimo ? ' (donación anónima)' : ''));
    add('Tipo de donante', d.donante === 'organizacion' ? 'Empresa u organización' : 'Persona natural');
    if (d.donante === 'organizacion') add('Organización', d.organizacion);
    add('WhatsApp', d.telefono);
    add('Correo', d.correo);
    add('Municipio/ciudad', d.ciudad);
    if (d.docNum) add('Documento', `${d.docTipo} ${d.docNum}`);
    add('Nos conoció por', d.origen);

    L.push('', '*— Detalle —*');
    if (esGuayos(d.tipo)) {
      add('Pares', d.pares);
      add('Tallas', d.tallas.join(', '));
      add('Entrega', ENTREGAS[d.entrega]);
      if (d.entrega === 'recoleccion') {
        add('Dirección', d.direccion);
        add('Barrio/sector', d.barrio);
      }
    } else if (d.tipo === 'dinero') {
      add('Monto', money(montoValor(d)));
    } else if (d.tipo === 'colecta') {
      add('Grupo', d.colectaOrg);
      add('Tipo de organización', d.colectaTipo);
      add('Meta aproximada', d.colectaPares && `${d.colectaPares} pares`);
      add('Fecha tentativa', d.colectaFecha && d.colectaFecha.split('-').reverse().join('/'));
    }
    if (d.mensaje) L.push('', '*Mensaje:*', d.mensaje);

    L.push('', '*— Autorizaciones —*');
    L.push(`Tratamiento de datos (Ley 1581): Sí`);
    L.push(`Recibir noticias de La Guayatón: ${d.novedades ? 'Sí' : 'No'}`);
    L.push('', `Enviado el ${new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })} desde el sitio web.`);
    return L.join('\n');
  }

  function sendToEndpoint(d, message) {
    if (!DONATION_ENDPOINT) return;
    try {
      fetch(DONATION_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...d, tipoLabel: TIPOS[d.tipo], mensajeWhatsApp: message, fecha: new Date().toISOString() }),
        keepalive: true
      });
    } catch (_) { /* el registro es opcional: no bloquea la donación */ }
  }

  /* ---------- pantalla de confirmación ---------- */
  const successBox = document.getElementById('donSuccess');
  const pre = document.getElementById('donSuccessPre');
  const waAgain = document.getElementById('waAgain');
  const copyBtn = document.getElementById('copyMsg');
  let lastMessage = '';

  function scrollToForm() {
    const target = document.getElementById('formulario');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showSuccess(message, url) {
    lastMessage = message;
    pre.textContent = message;
    waAgain.href = url;
    form.hidden = true;
    successBox.hidden = false;
    scrollToForm();
    const h = successBox.querySelector('h2');
    if (h) setTimeout(() => h.focus({ preventScroll: true }), 400);
  }

  function showForm() {
    successBox.hidden = true;
    form.hidden = false;
    scrollToForm();
  }

  copyBtn.addEventListener('click', async () => {
    const original = copyBtn.textContent;
    try {
      await navigator.clipboard.writeText(lastMessage);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = lastMessage;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (__) { /* sin portapapeles */ }
      ta.remove();
    }
    copyBtn.textContent = '¡Copiado!';
    setTimeout(() => { copyBtn.textContent = original; }, 1800);
  });

  document.getElementById('editForm').addEventListener('click', showForm);
  document.getElementById('newDon').addEventListener('click', () => {
    form.reset();
    showErrors([]);
    sync();
    countMsg();
    showForm();
  });

  /* ---------- envío ---------- */
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const d = read();
    if (d.trampa) return; // campo trampa para bots
    const errs = validate(d);
    showErrors(errs);
    if (errs.length) {
      const first = wrapperOf(errs[0].name);
      const field = first && first.querySelector('input:not([type=hidden]),select,textarea');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (field) setTimeout(() => field.focus({ preventScroll: true }), 350);
      return;
    }
    d.telefono = normalizePhone(d.telefono);
    const message = buildMessage(d);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');   // dentro del gesto del usuario
    sendToEndpoint(d, message);
    const btn = document.getElementById('donSubmit');
    const label = btn.textContent;
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = 'Preparando tu mensaje…';
    setTimeout(() => {
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
      btn.textContent = label;
      showSuccess(message, url);
    }, REDUCED ? 0 : 750);
  });

  /* ---------- interacciones del formulario ---------- */
  form.addEventListener('input', ev => {
    clearError(ev.target.closest('[data-field]'));
    if (ev.target.name === 'monto_otro') {
      const n = digits(ev.target.value);
      ev.target.value = n ? Number(n).toLocaleString('es-CO') : '';
    }
    if (ev.target.name === 'doc_num') ev.target.value = ev.target.value.replace(/\s+/g, '');
    sync();
  });
  form.addEventListener('change', ev => {
    clearError(ev.target.closest('[data-field]'));
    sync();
  });

  const OK_FIELDS = ['nombre', 'organizacion', 'telefono', 'correo', 'ciudad', 'direccion'];
  form.addEventListener('focusout', ev => {
    const w = ev.target.closest('[data-field]');
    if (!w || !OK_FIELDS.includes(w.dataset.field)) return;
    const input = w.querySelector('input');
    const valid = input && input.value.trim() && !validate(read()).some(e => e.name === w.dataset.field);
    w.classList.toggle('ok', !!valid);
  });
  form.addEventListener('input', ev => {
    const w = ev.target.closest('.field.ok');
    if (w) w.classList.remove('ok');
  });

  const tel = form.elements.telefono;
  tel.addEventListener('blur', () => {
    const n = normalizePhone(tel.value);
    if (n) { tel.value = n; sync(); }
  });

  // contador del mensaje
  const msg = form.elements.mensaje;
  const counter = document.getElementById('msgCount');
  function countMsg() { counter.textContent = msg.value.length; }
  msg.addEventListener('input', countMsg);

  // pares: botones + / −
  form.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-step]');
    if (!btn) return;
    const input = form.elements.pares;
    const next = Math.min(500, Math.max(1, (parseInt(input.value, 10) || 1) + parseInt(btn.dataset.step, 10)));
    input.value = next;
    if (!REDUCED) { input.classList.remove('bump'); void input.offsetWidth; input.classList.add('bump'); }
    clearError(wrapperOf('pares'));
    sync();
  });

  // la fecha de la colecta no puede ser pasada
  const fecha = form.elements.colecta_fecha;
  if (fecha) {
    const t = new Date();
    fecha.min = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }

  /* ---------- atajos: ?tipo=... y botones data-pick ---------- */
  function pick(tipo, scroll) {
    const radio = form.querySelector(`input[name="tipo"][value="${tipo}"]`);
    if (!radio) return;
    radio.checked = true;
    clearError(wrapperOf('tipo'));
    sync();
    if (scroll) scrollToForm();
  }

  document.querySelectorAll('[data-pick]').forEach(a => {
    a.addEventListener('click', ev => {
      ev.preventDefault();
      if (!form.hidden) { pick(a.dataset.pick, true); } else { showForm(); pick(a.dataset.pick, true); }
    });
  });

  const preset = new URLSearchParams(location.search).get('tipo');
  if (preset && TIPOS[preset]) pick(preset, false);

  sync();
  countMsg();

  /* ---------- movimiento de la página ---------- */
  const rvEls = document.querySelectorAll('.rv, .route');
  if ('IntersectionObserver' in window && !REDUCED) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    rvEls.forEach(el => io.observe(el));
  } else {
    rvEls.forEach(el => el.classList.add('in'));
  }

  // paralaje suave del hero (transform solamente, un solo rAF por scroll)
  const bg = document.querySelector('.kh-bg');
  const ghost = document.querySelector('.kh-ghost');
  const hero = document.querySelector('.kh');
  if (hero && !REDUCED) {
    let tick = false;
    const update = () => {
      tick = false;
      const y = Math.min(window.scrollY, hero.offsetHeight);
      if (bg) bg.style.transform = `translate3d(0,${y * 0.22}px,0) scale(1.08)`;
      if (ghost) ghost.style.transform = `translate3d(${-y * 0.18}px,0,0)`;
    };
    window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
  }

  // barra de acción en móvil: visible fuera del hero, del formulario y del cierre
  const mCta = document.getElementById('mCta');
  if (mCta && 'IntersectionObserver' in window) {
    const hide = new Set();
    const ioC = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) hide.add(e.target.id); else hide.delete(e.target.id); });
      mCta.classList.toggle('show', hide.size === 0 && window.scrollY > 200);
    }, { threshold: 0.05 });
    ['top', 'formulario', 'cta-final'].forEach(id => { const el = document.getElementById(id); if (el) ioC.observe(el); });
  }
})();
