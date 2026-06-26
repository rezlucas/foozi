const LeadStorage = (() => {
  const COOKIE_NAME = 'foozi_lead';
  const MAX_AGE_DAYS = 30;
  const UTM_KEYS = ['utm_term', 'utm_source', 'utm_campaign', 'utm_content', 'utm_medium'];

  const FIELD_MAPS = {
    cadastro: {
      nome: '#nome',
      telefone: '#telefone',
      email: '#email',
      faturamento: '#faturamento'
    },
    signup: {
      nome: '[name="signup.name"]',
      telefone: '[name="signup.phone"]',
      email: '[name="signup.email"]'
    }
  };

  function getCookieDomain() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return null;
    if (host.endsWith('foozi.com.br')) return '.foozi.com.br';
    return null;
  }

  function setCookie(value) {
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
    const domain = getCookieDomain();
    const domainPart = domain ? `; domain=${domain}` : '';
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/${domainPart}; SameSite=Lax`;
  }

  function getCookie() {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function load() {
    try {
      const raw = getCookie();
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function save(data) {
    const current = load() || {};
    const merged = {
      ...current,
      ...data,
      utms: { ...(current.utms || {}), ...(data.utms || {}) }
    };
    setCookie(JSON.stringify(merged));
    return merged;
  }

  function getUtms() {
    const params = new URLSearchParams(window.location.search);
    const stored = load()?.utms || {};
    const utms = {};
    const fromUrl = {};

    UTM_KEYS.forEach(key => {
      const urlValue = params.get(key);
      if (urlValue) fromUrl[key] = urlValue;
      utms[key] = urlValue || stored[key] || '';
    });

    if (Object.keys(fromUrl).length) {
      save({ utms: fromUrl });
    }

    return utms;
  }

  function findElement(selector) {
    if (selector.startsWith('#') && !selector.includes(' ')) {
      return document.getElementById(selector.slice(1));
    }
    return document.querySelector(selector);
  }

  function populateUtms({ onlyEmpty = true } = {}) {
    const utms = getUtms();

    UTM_KEYS.forEach(key => {
      const value = utms[key];
      if (!value) return;

      const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
      if (!el) return;
      if (onlyEmpty && el.value) return;

      el.value = value;
    });
  }

  function populate(mapKeyOrMapping, { onlyEmpty = true } = {}) {
    const stored = load();
    const mapping = typeof mapKeyOrMapping === 'string'
      ? FIELD_MAPS[mapKeyOrMapping]
      : mapKeyOrMapping;

    if (!mapping) return false;

    if (stored) {
      Object.entries(mapping).forEach(([dataKey, selector]) => {
        const value = stored[dataKey];
        if (value == null || value === '') return;

        const el = findElement(selector);
        if (!el) return;
        if (onlyEmpty && el.value) return;

        el.value = value;
      });
    }

    populateUtms({ onlyEmpty });
    return true;
  }

  return { load, save, getUtms, populate, populateUtms, UTM_KEYS, FIELD_MAPS };
})();

window.LeadStorage = LeadStorage;
