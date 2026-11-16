$(function() {
  var tabs = $('.example-tabs-i');
  var tabsContent = $('.example-content');

  function selectTab(tab) {
    tabs.removeClass('active').attr({'aria-selected': 'false', 'tabindex': '-1'});
    $(tab).addClass('active').attr({'aria-selected': 'true', 'tabindex': '0'});

    tabsContent.removeClass('active').prop('hidden', true);
    $('#' + $(tab).attr('aria-controls')).addClass('active').prop('hidden', false);
  }

  tabs.on('click', function() {
    selectTab(this);
  });

  tabs.on('keydown', function(event) {
    var index = tabs.index(this);
    var next;

    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;

    if (next !== undefined) {
      event.preventDefault();
      selectTab(tabs[next]);
      tabs[next].focus();
    }
  });
});
