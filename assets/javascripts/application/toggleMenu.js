$(function() {
  var headerNav = $('.header-nav');
  var body = $('body');

  var openMenu = function() {
    headerNav.addClass('open');
    body.on('click', closeMenu);
  };

  var closeMenu = function() {
    headerNav.removeClass('open');
    body.off('click');
  };

  $('.header-nav-open').on('click', function(event) {
    event.stopPropagation();
    openMenu();
  });
});
