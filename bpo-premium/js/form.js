/* Atribuição: captura UTMs da URL + referrer nos campos ocultos de todos os formulários.
   Persiste em sessionStorage para sobreviver a navegação interna. */
(function () {
  var params = new URLSearchParams(window.location.search);
  var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var utm = {};
  keys.forEach(function (k) {
    var v = params.get(k) || sessionStorage.getItem(k) || '';
    if (params.get(k)) sessionStorage.setItem(k, params.get(k));
    utm[k] = v;
  });
  if (document.referrer) sessionStorage.setItem('referrer', document.referrer);
  var ref = document.referrer || sessionStorage.getItem('referrer') || '';
  var lp = window.location.href.split('?')[0];
  document.querySelectorAll('.js-lead-form').forEach(function (form) {
    keys.forEach(function (k) {
      var el = form.querySelector('[name="' + k + '"]');
      if (el) el.value = utm[k];
    });
    var l = form.querySelector('[name="landing_page"]'); if (l) l.value = lp;
    var r = form.querySelector('[name="referrer"]'); if (r) r.value = ref;
  });
})();

/* Formulários — validação + envio para HubSpot + handoff para WhatsApp */
(function () {
  var HUBSPOT = {
    portalId: '47154604',
    formId: 'ae85b656-bdee-449b-8d74-34c845b2d597',
    endpoint: 'https://api.hsforms.com/submissions/v3/integration/submit'
  };

  function digitsOnly(v) { return v.replace(/\D/g, ''); }
  function maskPhone(v) {
    var d = digitsOnly(v).slice(0, 11);
    if (!d.length) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  function validateFirstname(input) {
    var v = input.value.trim();
    if (!v) return 'Informe seu primeiro nome.';
    if (v.length < 2) return 'Informe pelo menos 2 caracteres.';
    return '';
  }
  function validateEmail(input) {
    var v = input.value.trim();
    if (!v) return 'Informe seu e-mail.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Informe um e-mail válido.';
    return '';
  }
  function validatePhone(input) {
    var d = digitsOnly(input.value);
    if (!d.length) return 'Informe seu WhatsApp.';
    if (d.length < 10 || d.length > 11) return 'Informe um WhatsApp válido com DDD.';
    if (d.length === 11 && d.charAt(2) !== '9') return 'Celular deve começar com 9 após o DDD.';
    return '';
  }
  function validateFaturamento(input) {
    if (!input.value) return 'Selecione uma faixa de faturamento.';
    return '';
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

  function buildHubspotFields(d) {
    var name = splitName(d.firstname || '');
    var submittedFields = [
      { name: 'firstname', value: name.firstname },
      { name: 'lastname', value: name.lastname },
      { name: 'email', value: d.email || '' },
      { name: 'phone', value: d.phone || '' },
      { name: 'faturamento_medio_mensal', value: d.faturamento_mensal || '' },
      { name: 'trigger_formulario', value: 'BPO - Step 1' }
    ];

    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
      if (d[key]) submittedFields.push({ name: key, value: d[key] });
    });

    return submittedFields;
  }

  function submitToHubspot(d) {
    var submittedFields = buildHubspotFields(d);
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

  function initLeadForm(form) {
    var phone = form.querySelector('input[name="phone"]');
    var fields = [
      { el: form.querySelector('input[name="firstname"]'), name: 'firstname', validate: validateFirstname },
      { el: form.querySelector('input[name="email"]'), name: 'email', validate: validateEmail },
      { el: phone, name: 'phone', validate: validatePhone },
      { el: form.querySelector('select[name="faturamento_mensal"]'), name: 'faturamento_mensal', validate: validateFaturamento }
    ].filter(function (f) { return f.el; });

    function setFieldState(field, message) {
      var errorEl = form.querySelector('.form-error[data-error="' + field.name + '"]');
      var ok = !message;
      field.el.setCustomValidity(message || '');
      field.el.classList.toggle('form-field--invalid', !ok);
      field.el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (errorEl) errorEl.textContent = message || '';
    }
    function validateField(field) {
      var message = field.validate(field.el);
      setFieldState(field, message);
      return !message;
    }
    function validateForm() {
      var ok = true;
      fields.forEach(function (f) { if (!validateField(f)) ok = false; });
      return ok;
    }

    if (phone) {
      phone.addEventListener('input', function () {
        var fromEnd = phone.value.length - phone.selectionStart;
        phone.value = maskPhone(phone.value);
        var pos = Math.max(phone.value.length - fromEnd, 0);
        phone.setSelectionRange(pos, pos);
        var pf = fields.filter(function (f) { return f.el === phone; })[0];
        if (pf && (phone.classList.contains('form-field--invalid') || phone.value)) validateField(pf);
      });
    }
    fields.forEach(function (field) {
      field.el.addEventListener('blur', function () { validateField(field); });
      field.el.addEventListener('input', function () { if (field.el.classList.contains('form-field--invalid')) validateField(field); });
      field.el.addEventListener('change', function () { validateField(field); });
    });

    var submitBtn = form.querySelector('#submitBtn');
    var submitError = form.querySelector('#submitError');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm()) {
        var first = form.querySelector('.form-field--invalid');
        if (first) first.focus();
        return;
      }

      if (submitError) submitError.classList.remove('show');

      var d = Object.fromEntries(new FormData(form).entries());
      var originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
      }

      submitToHubspot(d).catch(function (err) {
        console.error('HubSpot submit error:', err);
        if (submitError) submitError.classList.add('show');
      }).then(function () {
        if (typeof fbq === 'function') fbq('track', 'Lead');

        var msg = encodeURIComponent(
          'Olá! Quero agendar o diagnóstico de economia do plano Premium (BPO).\n\n' +
          'Nome: ' + d.firstname + '\n' +
          'E-mail: ' + d.email + '\n' +
          'WhatsApp: ' + d.phone + '\n' +
          'Faturamento mensal: ' + d.faturamento_mensal + '\n' +
          'Origem: ' + (d.utm_source || 'direto') + (d.utm_campaign ? (' / ' + d.utm_campaign) : '')
        );
        var url = 'https://wa.me/5527928340088?text=' + msg;
        var card = form.closest('.form-card') || form.parentElement;
        var link = card && card.querySelector('.link-whats');
        if (link) link.href = url;
        form.style.display = 'none';
        var success = card && card.querySelector('.form-sucesso');
        if (success) success.style.display = 'block';

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      });
    });
  }

  document.querySelectorAll('.js-lead-form').forEach(initLeadForm);
})();
