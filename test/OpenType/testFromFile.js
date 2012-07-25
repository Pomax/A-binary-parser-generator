// font debugging
var debug = false;
var filetype = "OpenType font";

function getData(url, callback, asByteCode) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  if(asByteCode) { xhr.responseType = 'arraybuffer'; }
  if(xhr.mozResponseType) { xhr.mozResponseType = xhr.responseType; }
  xhr.onreadystatechange = function() {
    if(xhr.readyState==4 && (xhr.status==200||xhr.status==0)) {
      callback(xhr);
    }
  }
  xhr.send(null);
}

var xhr_file = 'UbuntuMono-R.ttf', xhrData = false;
getData(xhr_file, function(xhr) {
  var dataResponse = xhr.mozResponseArrayBuffer || xhr.mozResponse || xhr.responseArrayBuffer || xhr.response;
  xhrData = {pointer: 0, marks: [], bytecode: buildDataView(dataResponse)};
}, true);

var spec_file = '../../OpenType.spec', specData = false;
getData(spec_file, function(xhr) {
  specData = xhr.responseText;
  var src = document.createElement("script");
  src.type = "text/javascript";
  src.innerHTML = generateParser(specData);
  document.head.appendChild(src);
}, false);

// ==============

function tryLoad() {
  if(xhrData===false || specData===false) { setTimeout(tryLoad, 250); }
  else { setTimeout(load, 1000); }
}

/**
 * When both fonts have been loaded, we parse them, to see what they're made of!
 */
function load() {
  var dataObject;
  xhrData.pointer = 0;
  var parser = new Parser();
  dataObject = parser.parse(xhrData);
  showObject(filetype, document.getElementById('data_obj'), dataObject, 0);
}

tryLoad();


/**
 * Try to enable drag and drop for files
 */
if (typeof window.FileReader === 'undefined') {} else {
  var holder = document.getElementById('holder');

  holder.ondragover = function () { $(holder).addClass('hover'); return false; };
  holder.ondragend = function () { $(holder).removeClass('hover'); return false; };
  holder.ondrop = function (e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0],
        reader = new FileReader(),
        data;

    reader.onload = function (event) {
      data = event.target.result;
      xhrData = {pointer: 0, marks: [], bytecode: buildDataView(data)};
      load();
    };

    console.log(file);
    reader.readAsArrayBuffer(file);

    return false;
  };
}
