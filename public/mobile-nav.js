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

(function hydrateCartShortcutFromStorage() {
  try {
    const headerActions = document.querySelector('.site-header__actions');
    if (!headerActions || headerActions.querySelector('.cart-trigger')) return;

    const raw = window.localStorage.getItem('carnivoras-tucuman-cart-v3');
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

    let count = 0;
    for (const value of Object.values(parsed)) {
      if (Number.isInteger(value) && value >= 1) count += Math.min(value, 99);
    }
    if (count <= 0) return;

    const link = document.createElement('a');
    link.className = 'cart-trigger';
    link.href = '/catalogo.html';
    link.setAttribute('aria-label', `Ver mi pedido, ${count} productos`);
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="bag-icon"><path d="M5.5 8.5h13l1 12h-15l1-12Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /><path d="M9 9V6a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" /></svg><span class="cart-trigger__label">Mi pedido</span><span class="cart-trigger__count">' + count + '</span>';
    headerActions.insertBefore(link, toggleButton || headerActions.firstChild);
  } catch {
    // Sin almacenamiento disponible.
  }
})();

(async function hydrateStaticSiteSettings() {
  try {
    const response = await fetch('/api/site-data', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    const settings = payload?.data?.settings;
    if (!settings || typeof settings !== 'object') return;

    if (settings.whatsappNumber) {
      document.querySelectorAll('[data-store-whatsapp]').forEach((anchor) => {
        try {
          const parsed = new URL(anchor.getAttribute('href'), window.location.origin);
          parsed.pathname = `/${settings.whatsappNumber}`;
          anchor.setAttribute('href', parsed.toString());
        } catch {
          // Mantener enlace existente si no es URL válida.
        }
      });
    }

    if (settings.whatsappDisplay) {
      document.querySelectorAll('[data-store-whatsapp-display]').forEach((node) => {
        node.textContent = settings.whatsappDisplay;
      });
    }

    if (settings.instagramUrl || settings.instagramHandle) {
      document.querySelectorAll('[data-store-instagram]').forEach((anchor) => {
        if (settings.instagramUrl) anchor.setAttribute('href', settings.instagramUrl);
        if (settings.instagramHandle) anchor.textContent = settings.instagramHandle;
      });
    }

    if (settings.showPreviewBanner && settings.previewBannerText && !document.querySelector('.preview-banner')) {
      const banner = document.createElement('aside');
      banner.className = 'preview-banner';
      banner.setAttribute('role', 'note');
      banner.textContent = settings.previewBannerText;
      const skipLink = document.body.querySelector('.skip-link');
      if (skipLink) skipLink.after(banner);
      else document.body.prepend(banner);
    }
  } catch {
    // Modo offline o estático.
  }
})();
