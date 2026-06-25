(function () {
  var container = document.querySelector('.form-body--demio');
  if (!container) return;

  var PLACEHOLDER_MAP = {
    'select a session': 'Selecione uma sessão',
    'select session': 'Selecione uma sessão',
    'choose a session': 'Selecione uma sessão',
    'pick a time': 'Escolha um horário',
    'select a date': 'Selecione uma data'
  };

  var SESSION_SELECTORS = [
    'select option',
    '.ant-select-item-option-content',
    '.ant-select-selection-item',
    '[class*="demio-embed-date"]',
    '[role="option"]'
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

  function parseSessionDate(text, fallbackValue) {
    if (fallbackValue) {
      var fromValue = Date.parse(fallbackValue);
      if (!isNaN(fromValue)) return new Date(fromValue);
    }

    if (!text) return null;

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

  function setBrazilAsDefault() {
    var countrySelect = container.querySelector('.PhoneInputCountrySelect');
    if (!countrySelect || countrySelect.value === 'BR') return;

    countrySelect.value = 'BR';
    countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
    countrySelect.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function enhanceForm() {
    setBrazilAsDefault();
    container.querySelectorAll(SESSION_SELECTORS).forEach(formatElement);
    document.querySelectorAll('.ant-select-dropdown ' + SESSION_SELECTORS).forEach(formatElement);
  }

  function watchForm() {
    enhanceForm();

    var observer = new MutationObserver(enhanceForm);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  var demioScript = document.getElementById('demio-js');
  if (demioScript) {
    demioScript.addEventListener('load', enhanceForm);
  }

  watchForm();
})();
