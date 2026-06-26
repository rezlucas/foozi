const HUBSPOT = {
  portalId: '47154604',
  formId: 'a2d4006e-faf0-4f5e-999d-1134b1415a70',
  endpoint: 'https://api.hsforms.com/submissions/v3/integration/submit'
};

const SIGNUP_URL = 'https://app.foozi.com.br/auth/sign-up';
const REDIRECT_SECONDS = 3;

const $ = id => document.getElementById(id);
const phoneRegex = /^\(\d{2}\) (?:\d{4}-\d{4}|\d{5}-\d{4})$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

let fields;
let redirectInterval = null;

function goToSignup() {
  if (redirectInterval) {
    clearInterval(redirectInterval);
    redirectInterval = null;
  }
  location.href = SIGNUP_URL;
}

function startRedirectCountdown() {
  const continueBtn = $('continueBtn');
  if (!continueBtn) {
    setTimeout(goToSignup, REDIRECT_SECONDS * 1000);
    return;
  }

  let seconds = REDIRECT_SECONDS;
  continueBtn.textContent = `Continuar (${seconds})`;

  redirectInterval = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      goToSignup();
      return;
    }
    continueBtn.textContent = `Continuar (${seconds})`;
  }, 1000);
}

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstname: parts[0] || '',
    lastname: parts.slice(1).join(' ')
  };
}

function getHubspotUtk() {
  const match = document.cookie.match(/(?:^|;\s*)hubspotutk=([^;]+)/);
  return match ? match[1] : '';
}

function getUtms() {
  const utms = LeadStorage.getUtms();
  LeadStorage.UTM_KEYS.forEach(key => {
    const el = $(key);
    if (el) el.value = utms[key] || '';
  });
  return utms;
}

function buildHubspotFields(lead) {
  const { firstname, lastname } = splitName(lead.nome);
  const fields = [
    { name: 'firstname', value: firstname },
    { name: 'lastname', value: lastname },
    { name: 'email', value: lead.email },
    { name: 'phone', value: lead.telefone },
    { name: 'faturamento_medio_mensal', value: lead.faturamento }
  ];

  LeadStorage.UTM_KEYS.forEach(key => {
    const value = lead.utms[key];
    if (value) fields.push({ name: key, value });
  });

  return fields;
}

async function submitToHubspot(lead) {
  const submittedFields = buildHubspotFields(lead);
  const hutk = getHubspotUtk();
  const context = {
    pageUri: window.location.href,
    pageName: document.title
  };
  if (hutk) context.hutk = hutk;

  const response = await fetch(
    `${HUBSPOT.endpoint}/${HUBSPOT.portalId}/${HUBSPOT.formId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submittedAt: Date.now(),
        fields: submittedFields,
        context,
        legalConsentOptions: {
          consent: {
            consentToProcess: true,
            text: 'Ao continuar você concorda com os Termos e a Política de Privacidade.'
          }
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Erro ao enviar formulário');
  }

  const hubspotResponse = await response.json();

  return {
    ...hubspotResponse,
    fields: submittedFields
  };
}

function showSuccessState(lead, result) {
  $('firstName').textContent = lead.nome.split(' ')[0] + '!';

  const doneMessage = $('doneMessage');
  if (doneMessage) {
    doneMessage.innerHTML = result.inlineMessage
      || 'Estamos te redirecionando para finalizar a criação da sua conta...';
  }

  $('formBody').classList.add('hide');
  $('done').classList.add('show');
}

function setupPhoneMask() {
  fields.telefone.el.addEventListener('input', e => {
    let d = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (d.length > 10) e.target.value = d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (d.length > 6) e.target.value = d.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    else if (d.length > 2) e.target.value = d.replace(/(\d{2})(\d+)/, '($1) $2');
    else e.target.value = d;
  });
}

function setupFieldValidation() {
  Object.values(fields).forEach(f => {
    const clearError = () => {
      f.wrap.classList.remove('invalid');
      f.el.classList.remove('err');
    };
    f.el.addEventListener('input', clearError);
    f.el.addEventListener('change', clearError);
  });
}

function setupSubmit() {
  const submitBtn = $('submitBtn');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', async () => {
    $('submitError')?.classList.remove('show');

    let ok = true;
    let first = null;
    Object.values(fields).forEach(f => {
      if (!f.el || !f.test(f.el.value)) {
        f.wrap?.classList.add('invalid');
        f.el?.classList.add('err');
        if (!first) first = f.el;
        ok = false;
      }
    });
    if (!ok) {
      first?.focus();
      first?.closest('.field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const lead = {
      nome: fields.nome.el.value.trim(),
      telefone: fields.telefone.el.value.trim(),
      email: fields.email.el.value.trim(),
      faturamento: fields.faturamento.el.value,
      utms: getUtms()
    };

    const btn = $('submitBtn');
    const originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Enviando...';

    try {
      const result = await submitToHubspot(lead);
      LeadStorage.save(lead);

      showSuccessState(lead, result);
      startRedirectCountdown();
    } catch (err) {
      console.error('HubSpot submit error:', err);
      $('submitError').classList.add('show');
      btn.disabled = false;
      btn.innerHTML = originalLabel;
    }
  });
}

function initForm() {
  if (typeof LeadStorage === 'undefined') {
    console.error('[cadastro-gratis] lead-storage.js não carregou. Verifique o caminho do script.');
    return;
  }

  fields = {
    nome: { el: $('nome'), wrap: $('f-nome'), test: v => v.trim().length >= 2 },
    telefone: { el: $('telefone'), wrap: $('f-telefone'), test: v => phoneRegex.test(v.trim()) },
    email: { el: $('email'), wrap: $('f-email'), test: v => emailRegex.test(v.trim()) },
    faturamento: { el: $('faturamento'), wrap: $('f-faturamento'), test: v => v !== '' }
  };

  if (!$('submitBtn')) {
    console.error('[cadastro-gratis] Botão #submitBtn não encontrado.');
    return;
  }

  LeadStorage.populate('cadastro');
  LeadStorage.populateUtms();
  setupPhoneMask();
  setupFieldValidation();
  setupSubmit();

  const continueBtn = $('continueBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', goToSignup);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForm);
} else {
  initForm();
}
