(function () {
  var HUBSPOT = {
    portalId: '47154604',
    formId: '3f31df29-2a8e-4053-8ac4-2c11bd6efe12',
    endpoint: 'https://api.hsforms.com/submissions/v3/integration/submit'
  };

  var form = document.getElementById('lead-form');
  if (!form) return;

  var firstname = form.querySelector('#firstname');
  var email = form.querySelector('#email');
  var phone = form.querySelector('#phone');
  var faturamento = form.querySelector('#faturamento_mensal');
  var submitBtn = document.getElementById('submitBtn');
  var submitError = document.getElementById('submitError');

  var fields = [
    { el: firstname, errorId: 'firstname-error', validate: validateFirstname },
    { el: email, errorId: 'email-error', validate: validateEmail },
    { el: phone, errorId: 'phone-error', validate: validatePhone },
    { el: faturamento, errorId: 'faturamento-error', validate: validateFaturamento }
  ];

  function digitsOnly(value) {
    return value.replace(/\D/g, '');
  }

  function maskPhone(value) {
    var digits = digitsOnly(value).slice(0, 11);

    if (!digits.length) return '';
    if (digits.length <= 2) return '(' + digits;
    if (digits.length <= 6) {
      return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
    }
    if (digits.length <= 10) {
      return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
    }
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
  }

  function validateFirstname(input) {
    var value = input.value.trim();
    if (!value) return 'Informe seu primeiro nome.';
    if (value.length < 2) return 'Informe pelo menos 2 caracteres.';
    return '';
  }

  function validateEmail(input) {
    var value = input.value.trim();
    if (!value) return 'Informe seu e-mail.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return 'Informe um e-mail válido.';
    }
    return '';
  }

  function validatePhone(input) {
    var digits = digitsOnly(input.value);
    if (!digits.length) return 'Informe seu WhatsApp.';
    if (digits.length < 10 || digits.length > 11) {
      return 'Informe um WhatsApp válido com DDD.';
    }
    if (digits.length === 11 && digits.charAt(2) !== '9') {
      return 'Celular deve começar com 9 após o DDD.';
    }
    return '';
  }

  function validateFaturamento(input) {
    if (!input.value) return 'Selecione uma faixa de faturamento.';
    return '';
  }

  function setFieldState(field, message) {
    var errorEl = document.getElementById(field.errorId);
    var isValid = !message;

    field.el.setCustomValidity(message || '');
    field.el.classList.toggle('form-field--invalid', !isValid);
    field.el.setAttribute('aria-invalid', isValid ? 'false' : 'true');

    if (errorEl) {
      errorEl.textContent = message || '';
    }
  }

  function validateField(field) {
    var message = field.validate(field.el);
    setFieldState(field, message);
    return !message;
  }

  function validateForm() {
    var isValid = true;

    fields.forEach(function (field) {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  function splitName(fullName) {
    var parts = fullName.trim().split(/\s+/);
    return {
      firstname: parts[0] || '',
      lastname: parts.slice(1).join(' ')
    };
  }

  function getHubspotUtk() {
    var match = document.cookie.match(/(?:^|;\s*)hubspotutk=([^;]+)/);
    return match ? match[1] : '';
  }

  function getUtms() {
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var params = new URLSearchParams(window.location.search);
    var utms = {};

    keys.forEach(function (key) {
      var fromUrl = params.get(key);
      if (fromUrl) sessionStorage.setItem(key, fromUrl);
      utms[key] = fromUrl || sessionStorage.getItem(key) || '';
    });

    return utms;
  }

  function buildHubspotFields(lead) {
    var name = splitName(lead.firstname);
    var submittedFields = [
      { name: 'firstname', value: name.firstname },
      { name: 'lastname', value: name.lastname },
      { name: 'email', value: lead.email },
      { name: 'phone', value: lead.phone },
      { name: 'faturamento_medio_mensal', value: lead.faturamento },
      { name: 'trigger_formulario', value: 'Step 1' }
    ];

    Object.keys(lead.utms).forEach(function (key) {
      if (lead.utms[key]) submittedFields.push({ name: key, value: lead.utms[key] });
    });

    return submittedFields;
  }

  function submitToHubspot(lead) {
    var submittedFields = buildHubspotFields(lead);
    var hutk = getHubspotUtk();
    var context = {
      pageUri: window.location.href,
      pageName: document.title
    };
    if (hutk) context.hutk = hutk;

    return fetch(HUBSPOT.endpoint + '/' + HUBSPOT.portalId + '/' + HUBSPOT.formId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submittedAt: Date.now(),
        fields: submittedFields,
        context: context,
        legalConsentOptions: {
          consent: {
            consentToProcess: true,
            text: 'Ao continuar você concorda com os Termos e a Política de Privacidade.'
          }
        }
      })
    }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (error) {
          throw new Error(error.message || 'Erro ao enviar formulário');
        });
      }
      return response.json();
    });
  }

  phone.addEventListener('input', function () {
    var cursorFromEnd = phone.value.length - phone.selectionStart;
    phone.value = maskPhone(phone.value);
    var nextPos = Math.max(phone.value.length - cursorFromEnd, 0);
    phone.setSelectionRange(nextPos, nextPos);
    if (phone.classList.contains('form-field--invalid') || phone.value) {
      validateField({ el: phone, errorId: 'phone-error', validate: validatePhone });
    }
  });

  fields.forEach(function (field) {
    field.el.addEventListener('blur', function () {
      validateField(field);
    });

    field.el.addEventListener('input', function () {
      if (field.el.classList.contains('form-field--invalid')) {
        validateField(field);
      }
    });

    field.el.addEventListener('change', function () {
      validateField(field);
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!validateForm()) {
      var firstInvalid = form.querySelector('.form-field--invalid');
      if (firstInvalid) {
        firstInvalid.focus();
      }
      return;
    }

    if (submitError) submitError.classList.remove('show');

    var lead = {
      firstname: firstname.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      faturamento: faturamento.value,
      utms: getUtms()
    };

    var originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    submitToHubspot(lead).then(function () {
      if (typeof fbq === 'function') {
        fbq('track', 'Lead');
      }

      var params = new URLSearchParams(new FormData(form));
      window.location.href = 'video.html?' + params.toString();
    }).catch(function (err) {
      console.error('HubSpot submit error:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      if (submitError) submitError.classList.add('show');
    });
  });
})();
