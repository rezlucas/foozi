(function () {
  var container = document.querySelector('.form-body--demio');
  if (!container) return;

  var loader = container.querySelector('.form-loader');
  var FORM_SELECTORS = 'input, select, textarea, button, iframe, .demio-embed-form, .ant-form, .ant-btn';

  var PLACEHOLDER_MAP = {
    'select a session': 'Selecione uma sessão',
    'select session': 'Selecione uma sessão',
    'choose a session': 'Selecione uma sessão',
    'pick a time': 'Escolha um horário',
    'select a date': 'Selecione uma data'
  };

  var SESSION_SELECTORS = [
    '[class*="demio-embed-date"] .ant-select-item-option-content',
    '[class*="demio-embed-date"] .ant-select-selection-item',
    '[class*="demio-embed-date"] select option',
    '[class*="demio-embed-date"] [role="option"]'
  ].join(', ');

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function isAlreadyFormatted(text) {
    return /\bde\s+\d{4}\b/.test(text) && (/\bàs\s+\d{1,2}:\d{2}\b/.test(text) || /·/.test(text));
  }

  function translatePlaceholder(text) {
    var key = text.trim().toLowerCase();
    return PLACEHOLDER_MAP[key] || null;
  }

  function isNonSessionField(element) {
    var field = element.closest('.ant-form-item, .ant-row, [class*="demio-embed"]');
    if (!field) return false;

    var label = (field.textContent || '').toLowerCase();
    return /faturamento|revenue|billing|faturamento m[eé]dio|monthly revenue/.test(label);
  }

  function isSessionFieldElement(element) {
    if (isNonSessionField(element)) return false;
    if (element.closest('[class*="demio-embed-date"]')) return true;

    var field = element.closest('.ant-form-item, .ant-row, [class*="demio-embed"]');
    if (!field) return false;

    var label = (field.textContent || '').toLowerCase();
    return /sess[aã]o|session|hor[aá]rio|quando|select a session|selecione uma sess/.test(label);
  }

  function looksLikeSessionDate(text) {
    var lower = text.toLowerCase();

    if (/faturamento|r\$|\$|milh|mil\b|revenue|billing|under|over|acima|abaixo|entre|até|monthly/.test(lower)) {
      return false;
    }

    return /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)/.test(lower)
      || /\d{1,2}:\d{2}/.test(text)
      || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)
      || /\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i.test(lower)
      || /^\d{4}-\d{2}-\d{2}/.test(text);
  }

  function parseSessionDate(text, fallbackValue) {
    if (fallbackValue) {
      var fromValue = Date.parse(fallbackValue);
      if (!isNaN(fromValue)) return new Date(fromValue);
    }

    if (!text || !looksLikeSessionDate(text)) return null;

    var cleaned = text.trim()
      .replace(/\s+(EST|EDT|CST|CDT|MST|MDT|PST|PDT|GMT|UTC|BRT|BRST|[A-Z]{2,5})$/i, '')
      .replace(/\s+at\s+/gi, ' ')
      .replace(/(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
      .replace(/,\s*(\d{1,2}:\d{2})/, ' $1');

    var timestamp = Date.parse(cleaned);
    if (!isNaN(timestamp)) return new Date(timestamp);

    return null;
  }

  function formatSessionLabel(date, compact) {
    var weekday = capitalize(new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date));
    var datePart = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
    var timePart = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);

    if (compact) {
      return datePart + ' · ' + timePart;
    }

    return weekday + ', ' + datePart + '\nàs ' + timePart;
  }

  function formatElement(element) {
    if (!element || element.dataset.formattedPtBr === '1') return;
    if (!isSessionFieldElement(element)) return;

    var text = (element.textContent || '').trim();
    if (!text) return;

    var placeholder = translatePlaceholder(text);
    if (placeholder) {
      element.textContent = placeholder;
      element.dataset.formattedPtBr = '1';
      return;
    }

    if (isAlreadyFormatted(text)) {
      element.dataset.formattedPtBr = '1';
      return;
    }

    var fallbackValue = element.value || element.getAttribute('value') || '';
    var date = parseSessionDate(text, fallbackValue);
    if (!date) return;

    var compact = element.classList.contains('ant-select-selection-item');
    element.textContent = formatSessionLabel(date, compact);
    element.dataset.formattedPtBr = '1';
  }

  function formatActiveSessionDropdownOptions() {
    var openSelect = container.querySelector('.ant-select-open, .ant-select-focused');
    if (!openSelect || !isSessionFieldElement(openSelect)) return;

    document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content')
      .forEach(formatElement);
  }

  function isFormLoaded() {
    return !!container.querySelector(FORM_SELECTORS);
  }

  function hideLoader() {
    if (!isFormLoaded()) return;

    container.classList.add('form-body--demio--loaded');
    if (loader) {
      loader.setAttribute('aria-busy', 'false');
    }
  }

  function setBrazilAsDefault() {
    var countrySelect = container.querySelector('.PhoneInputCountrySelect');
    if (!countrySelect || countrySelect.value === 'BR') return;

    countrySelect.value = 'BR';
    countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
    countrySelect.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function enhanceForm() {
    hideLoader();
    setBrazilAsDefault();
    container.querySelectorAll(SESSION_SELECTORS).forEach(formatElement);
    formatActiveSessionDropdownOptions();
  }

  function watchForm() {
    if (isFormLoaded()) {
      hideLoader();
    }

    enhanceForm();

    var observer = new MutationObserver(enhanceForm);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  var demioScript = document.getElementById('demio-js');
  if (demioScript) {
    demioScript.addEventListener('load', function () {
      enhanceForm();
      setTimeout(hideLoader, 100);
      setTimeout(hideLoader, 500);
      setTimeout(hideLoader, 1500);
    });
  }

  watchForm();
})();
