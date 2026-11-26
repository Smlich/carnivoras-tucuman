const toggleButton = document.querySelector('[data-nav-toggle]');
const navMenu = document.getElementById('main-nav-menu');
const header = toggleButton?.closest('header');

if (toggleButton && navMenu) {
  function setOpen(open) {
    navMenu.classList.toggle('is-open', open);
    toggleButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggleButton.setAttribute('aria-label', open ? 'Cerrar menú de secciones' : 'Abrir menú de secciones');
    toggleButton.dataset.open = open ? 'true' : 'false';
  }

  toggleButton.addEventListener('click', () => {
    const isOpen = navMenu.classList.contains('is-open');
    setOpen(!isOpen);
  });

  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navMenu.classList.contains('is-open')) {
      setOpen(false);
      toggleButton.focus();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (navMenu.classList.contains('is-open') && header && !header.contains(event.target)) {
      setOpen(false);
    }
  });

  const mediaQuery = window.matchMedia('(min-width: 861px)');
  mediaQuery.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}
