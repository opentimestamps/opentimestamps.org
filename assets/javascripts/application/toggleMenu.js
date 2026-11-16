$(function() {
  var headerNav = $('.header-nav');
  var body = $('body');
  var menuButton = $('.header-nav-open');

  var openMenu = function() {
    headerNav.addClass('open');
    menuButton.attr('aria-expanded', 'true');
    body.on('click', closeMenu);
  };

  var closeMenu = function() {
    headerNav.removeClass('open');
    menuButton.attr('aria-expanded', 'false');
    body.off('click');
  };

  menuButton.on('click', function(event) {
    event.stopPropagation();
    if (headerNav.hasClass('open')) closeMenu();
    else openMenu();
  });

  $(document).on('keydown', function(event) {
    if (event.key === 'Escape' && headerNav.hasClass('open')) {
      closeMenu();
      menuButton.trigger('focus');
    }
  });
});
