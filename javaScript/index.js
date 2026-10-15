var level = 0;
$("#snackbar").hide();
$("#order .btn").click(function(){
  level++;
  $(".count").text(level);
});

$("#order .btn").click(function(){
    $("#snackbar").show();
    setTimeout(function() { $("#snackbar").hide(); }, 2000);
});
