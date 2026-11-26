import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  defaultAdminGames,
  defaultAdminProducts,
  defaultGalleryItems,
  defaultSiteSettings,
} from '../data/site-defaults';

const isStaticPreview = import.meta.env.VITE_STATIC_PREVIEW === 'true';

const defaultValue = {
  settings: defaultSiteSettings,
  products: defaultAdminProducts,
  gallery: defaultGalleryItems,
  gamesPreview: defaultAdminGames.filter((game) => game.status !== 'admin-only'),
  assistantEnabled: null,
  isLoaded: false,
  reloadSiteData: async () => null,
};

const SiteContentContext = createContext(defaultValue);

async function fetchSiteData(signal) {
  const response = await fetch('/api/site-data', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error('No se pudo cargar el contenido dinámico.');
  const payload = await response.json();
  return payload?.data ?? null;
}

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState({
    settings: defaultSiteSettings,
    products: defaultAdminProducts,
    gallery: defaultGalleryItems,
    gamesPreview: defaultValue.gamesPreview,
    assistantEnabled: null,
    isLoaded: false,
  });

  const applyPayload = useCallback((data) => {
    if (!data) return;
    setContent({
      settings: data.settings ? { ...defaultSiteSettings, ...data.settings } : defaultSiteSettings,
      products: Array.isArray(data.products) ? data.products : defaultAdminProducts,
      gallery: Array.isArray(data.gallery) ? data.gallery : defaultGalleryItems,
      gamesPreview: Array.isArray(data.gamesPreview) ? data.gamesPreview : defaultValue.gamesPreview,
      assistantEnabled: typeof data.assistantEnabled === 'boolean' ? data.assistantEnabled : null,
      isLoaded: true,
    });
  }, []);

  useEffect(() => {
    if (isStaticPreview) return undefined;

    const controller = new AbortController();
    fetchSiteData(controller.signal)
      .then(applyPayload)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setContent((current) => ({ ...current, isLoaded: true }));
        }
      });

    return () => controller.abort();
  }, [applyPayload]);

  const reloadSiteData = useCallback(async () => {
    if (isStaticPreview) return null;
    try {
      const data = await fetchSiteData();
      applyPayload(data);
      return data;
    } catch {
      return null;
    }
  }, [applyPayload]);

  const value = useMemo(() => ({
    ...content,
    reloadSiteData,
  }), [content, reloadSiteData]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
