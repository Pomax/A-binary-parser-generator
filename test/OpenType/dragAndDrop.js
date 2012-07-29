/**
 * Try to enable drag and drop for files
 */
(function() {

  var dnd = function() {
    document.removeEventListener("DOMContentLoaded", dnd, false);
    if (typeof window.FileReader === 'undefined') {}
    else {
      var holders = document.querySelectorAll(".drag-and-drop"),
          i=0,
          last=holders.length,m
          holder;

      for(i=0; i<last; i++) {
        holder = holders[i];

        var highlight = function () { $(holder).addClass('hover'); return false; };
        var unhighlight = function () { $(holder).removeClass('hover'); return false; };

        holder.ondragover = function () { highlight(); }
        holder.ondragend  = function () { unhighlight(); }
        holder.ondragexit = function () { unhighlight(); }
        holder.parentNode.onmouseover = function () { unhighlight(); }

        holder.ondrop = function (e) {
          unhighlight();

          $("#data_obj").text("Loading your font...");
          e.preventDefault();
          var file = e.dataTransfer.files[0],
              reader = new FileReader(),
              data;

          reader.onload = function (event) {
            data = event.target.result;
            xhrData = {pointer: 0, marks: [], bytecode: buildDataView(data)};
            load(data);
          };
          reader.readAsArrayBuffer(file);
          return false;
        };
      }
    }
  };

  document.addEventListener("DOMContentLoaded", dnd, false);
}());