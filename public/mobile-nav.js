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

(async function hydrateAdminShortcutsWhenAuthenticated() {
  try {
    const response = await fetch('/api/admin/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (!payload?.data?.authenticated) return;

    if (navMenu && !navMenu.querySelector('.main-nav__admin-mobile')) {
      const mobileAdminLink = document.createElement('a');
      mobileAdminLink.className = 'main-nav__admin-mobile';
      mobileAdminLink.href = '/admin.html';
      mobileAdminLink.textContent = 'Panel Admin';
      navMenu.appendChild(mobileAdminLink);
    }

    const headerActions = document.querySelector('.site-header__actions');
    if (headerActions && !headerActions.querySelector('.admin-pill-link')) {
      const adminPill = document.createElement('a');
      adminPill.className = 'admin-pill-link';
      adminPill.href = '/admin.html';
      adminPill.setAttribute('aria-label', 'Abrir panel de administración');
      adminPill.textContent = 'Admin';
      headerActions.insertBefore(adminPill, toggleButton || headerActions.firstChild);
    }

    const footerLinks = document.querySelector('.site-footer__links');
    if (footerLinks && !footerLinks.querySelector('a[href="/admin.html"]')) {
      const footerAdminLink = document.createElement('a');
      footerAdminLink.href = '/admin.html';
      footerAdminLink.textContent = 'Admin';
      footerLinks.appendChild(footerAdminLink);
    }
  } catch {
    // Silencioso para visitantes sin sesión de administrador.
  }
})();
