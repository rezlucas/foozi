(function () {
  document.querySelectorAll('a[href="#inscricao"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var target = document.getElementById('inscricao');
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', '#inscricao');
    });
  });
})();
