/* Scroll reveal */
const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }) }, { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* Dia da semana no headline */
(function () {
  const dias = ['o domingo', 'a segunda-feira', 'a terça-feira', 'a quarta-feira', 'a quinta-feira', 'a sexta-feira', 'o sábado'];
  document.getElementById('dia-semana').textContent = dias[new Date().getDay()];
})();

/* Atribuição: captura UTMs da URL + referrer nos campos ocultos de todos os formulários.
   Persiste em sessionStorage para sobreviver a navegação interna. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const utm = {};
  keys.forEach(k => {
    const v = params.get(k) || sessionStorage.getItem(k) || '';
    if (params.get(k)) sessionStorage.setItem(k, params.get(k));
    utm[k] = v;
  });
  if (document.referrer) sessionStorage.setItem('referrer', document.referrer);
  const ref = document.referrer || sessionStorage.getItem('referrer') || '';
  const lp = window.location.href.split('?')[0];
  document.querySelectorAll('.js-lead-form').forEach(form => {
    keys.forEach(k => { const el = form.querySelector('[name="' + k + '"]'); if (el) el.value = utm[k]; });
    const l = form.querySelector('[name="landing_page"]'); if (l) l.value = lp;
    const r = form.querySelector('[name="referrer"]'); if (r) r.value = ref;
  });
})();

/* Formulários — validação reutilizável (hero + recaptura final) */
(function () {
  function digitsOnly(v) { return v.replace(/\D/g, '') }
  function maskPhone(v) {
    const d = digitsOnly(v).slice(0, 11);
    if (!d.length) return '';
    if (d.length <= 2) return '(' + d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  function validateFirstname(input) {
    const v = input.value.trim();
    if (!v) return 'Informe seu primeiro nome.';
    if (v.length < 2) return 'Informe pelo menos 2 caracteres.';
    return '';
  }
  function validateEmail(input) {
    const v = input.value.trim();
    if (!v) return 'Informe seu e-mail.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Informe um e-mail válido.';
    return '';
  }
  function validatePhone(input) {
    const d = digitsOnly(input.value);
    if (!d.length) return 'Informe seu WhatsApp.';
    if (d.length < 10 || d.length > 11) return 'Informe um WhatsApp válido com DDD.';
    if (d.length === 11 && d.charAt(2) !== '9') return 'Celular deve começar com 9 após o DDD.';
    return '';
  }
  function validateFaturamento(input) {
    if (!input.value) return 'Selecione uma faixa de faturamento.';
    return '';
  }

  function initLeadForm(form) {
    const phone = form.querySelector('input[name="phone"]');
    const fields = [
      { el: form.querySelector('input[name="firstname"]'), name: 'firstname', validate: validateFirstname },
      { el: form.querySelector('input[name="email"]'), name: 'email', validate: validateEmail },
      { el: phone, name: 'phone', validate: validatePhone },
      { el: form.querySelector('select[name="faturamento_mensal"]'), name: 'faturamento_mensal', validate: validateFaturamento }
    ].filter(f => f.el);

    function setFieldState(field, message) {
      const errorEl = form.querySelector('.form-error[data-error="' + field.name + '"]');
      const ok = !message;
      field.el.setCustomValidity(message || '');
      field.el.classList.toggle('form-field--invalid', !ok);
      field.el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (errorEl) errorEl.textContent = message || '';
    }
    function validateField(field) {
      const message = field.validate(field.el);
      setFieldState(field, message);
      return !message;
    }
    function validateForm() {
      let ok = true;
      fields.forEach(f => { if (!validateField(f)) ok = false });
      return ok;
    }

    if (phone) {
      phone.addEventListener('input', function () {
        const fromEnd = phone.value.length - phone.selectionStart;
        phone.value = maskPhone(phone.value);
        const pos = Math.max(phone.value.length - fromEnd, 0);
        phone.setSelectionRange(pos, pos);
        const pf = fields.find(f => f.el === phone);
        if (pf && (phone.classList.contains('form-field--invalid') || phone.value)) validateField(pf);
      });
    }
    fields.forEach(field => {
      field.el.addEventListener('blur', () => validateField(field));
      field.el.addEventListener('input', () => { if (field.el.classList.contains('form-field--invalid')) validateField(field) });
      field.el.addEventListener('change', () => validateField(field));
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm()) {
        const first = form.querySelector('.form-field--invalid');
        if (first) first.focus();
        return;
      }
      const d = Object.fromEntries(new FormData(form).entries());
      const msg = encodeURIComponent(
        'Olá! Quero agendar o diagnóstico de economia do plano Premium (BPO).\n\n' +
        'Nome: ' + d.firstname + '\n' +
        'E-mail: ' + d.email + '\n' +
        'WhatsApp: ' + d.phone + '\n' +
        'Faturamento mensal: ' + d.faturamento_mensal + '\n' +
        'Origem: ' + (d.utm_source || 'direto') + (d.utm_campaign ? (' / ' + d.utm_campaign) : '')
      );
      const url = 'https://wa.me/5527928340088?text=' + msg;
      const card = form.closest('.form-card') || form.parentElement;
      const link = card && card.querySelector('.link-whats');
      if (link) link.href = url;
      form.style.display = 'none';
      const success = card && card.querySelector('.form-sucesso');
      if (success) success.style.display = 'block';
      window.open(url, '_blank');
    });
  }

  document.querySelectorAll('.js-lead-form').forEach(initLeadForm);
})();
