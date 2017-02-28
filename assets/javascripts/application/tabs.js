$(function() {
  var tabs = $('.example-tabs-i');
  var tabsContent = $('.example-content');

  tabs.on('click', function() {
    tabs.removeClass('active');
    $(this).addClass('active');

    tabsContent.removeClass('active');
    $(".example-content_" + $(this).data('tab')).addClass('active');
  });
});
