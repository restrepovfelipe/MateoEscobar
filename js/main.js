// Mateo Escobar — sitio web — interacciones base
document.addEventListener('DOMContentLoaded', () => {

  // Nav móvil
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // Contadores animados (data-count)
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const animateCount = (el) => {
      const target = parseFloat(el.getAttribute('data-count'));
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(target * eased);
        el.textContent = val.toLocaleString('es-CO') + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const ioC = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { animateCount(entry.target); ioC.unobserve(entry.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(el => ioC.observe(el));
    } else {
      counters.forEach(animateCount);
    }
  }

  // Filtros (página Gestión)
  const filterBtns = document.querySelectorAll('.filter-btn');
  const filterItems = document.querySelectorAll('[data-cat]');
  if (filterBtns.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-filter');
        filterItems.forEach(item => {
          const show = cat === 'todos' || item.getAttribute('data-cat') === cat;
          item.style.display = show ? '' : 'none';
        });
      });
    });
  }

  // Año dinámico en footer
  document.querySelectorAll('.year-now').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Formulario de contacto -> abre WhatsApp con el mensaje prellenado
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = contactForm.nombre.value.trim();
      const telefono = contactForm.telefono.value.trim();
      const mensaje = contactForm.mensaje.value.trim();
      const texto = `Hola Mateo, mi nombre es ${nombre}.%0A${mensaje}%0A%0ATeléfono de contacto: ${telefono}`;
      window.open(`https://wa.me/573113114891?text=${texto}`, '_blank', 'noopener');
    });
  }

  // Formulario de voluntarios -> abre WhatsApp con el resumen de datos
  const volForm = document.getElementById('volForm');
  if (volForm) {
    volForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(volForm).entries());
      const texto = `Hola, quiero unirme al equipo de Mateo Escobar.%0A` +
        `Nombre: ${d.nombre}%0ACédula: ${d.cedula}%0ATeléfono: ${d.telefono}%0A` +
        `Municipio/Comuna: ${d.municipio}%0ADirección: ${d.direccion}%0ACorreo: ${d.correo}`;
      window.open(`https://wa.me/573113114891?text=${texto}`, '_blank', 'noopener');
    });
  }
});
