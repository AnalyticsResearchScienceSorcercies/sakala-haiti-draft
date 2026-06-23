(function () {
  var page = location.pathname.split('/').pop() || 'index.html';
  if (!page || page === '') page = 'index.html';
  document.querySelectorAll('.kn-links a').forEach(function (a) {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });
})();
