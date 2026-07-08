(function () {
  var params = new URLSearchParams(window.location.search);
  var firstname = params.get('firstname');
  var greeting = document.getElementById('video-greeting');

  if (greeting && firstname) {
    greeting.textContent = ', ' + firstname;
  }

  function getUtms() {
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var utms = {};

    keys.forEach(function (key) {
      var fromUrl = params.get(key);
      if (fromUrl) sessionStorage.setItem(key, fromUrl);
      utms[key] = fromUrl || sessionStorage.getItem(key) || '';
    });

    return utms;
  }

  var platformLink = document.querySelector('a[href^="https://app.foozi.com.br"]');
  if (platformLink) {
    var utms = getUtms();
    var url = new URL(platformLink.href);
    Object.keys(utms).forEach(function (key) {
      if (utms[key]) url.searchParams.set(key, utms[key]);
    });
    platformLink.href = url.toString();
  }
})();
