/* Scroll reveal */
const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }) }, { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* Dia da semana no headline */
(function () {
  const dias = ['o domingo', 'a segunda-feira', 'a terça-feira', 'a quarta-feira', 'a quinta-feira', 'a sexta-feira', 'o sábado'];
  document.getElementById('dia-semana').textContent = dias[new Date().getDay()];
})();

/* Lógica do formulário (validação, envio ao HubSpot e handoff para WhatsApp) está em js/form.js */
