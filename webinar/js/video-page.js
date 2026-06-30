(function () {
  var params = new URLSearchParams(window.location.search);
  var firstname = params.get('firstname');
  var greeting = document.getElementById('video-greeting');

  if (greeting && firstname) {
    greeting.textContent = ', ' + firstname;
  }
})();
