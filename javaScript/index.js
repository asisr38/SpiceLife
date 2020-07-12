var level = 0;
$("#snackbar").hide();
$(".btn").click(function(){
  level++;
  $(".count").text(level);
});

$(".btn").click(function(){
    $("#snackbar").show();
    setTimeout(function() { $("#snackbar").hide(); }, 2000);
});
