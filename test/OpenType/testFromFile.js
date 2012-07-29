// font debugging
var debug = false;
var filetype = "OpenType font";
var spec_file = '../../OpenType.spec', specData = false;
var xhr_file = 'UbuntuMono-R.ttf', xhrData = false;

function getData(url, callback, asByteCode) {
  var xhr = new XMLHttpRequest({MozSystem: true});
  xhr.open('GET', url, true);
  if(asByteCode) { xhr.responseType = 'arraybuffer'; }
  if(xhr.mozResponseType) { xhr.mozResponseType = xhr.responseType; }
  xhr.onreadystatechange = function() {
    if(xhr.readyState==4 && (xhr.status==200||xhr.status==0)) {
      callback(xhr);
    }
  }
  window.console.log(url);
  xhr.send(null);
}

getData(xhr_file, function(xhr) {
  var dataResponse = xhr.mozResponseArrayBuffer || xhr.mozResponse || xhr.responseArrayBuffer || xhr.response;
  xhrData = {pointer: 0, marks: [], data: dataResponse, bytecode: buildDataView(dataResponse)};
}, true);

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
function load(rawData) {
  var dataObject;
  xhrData.pointer = 0;
  var parser = new Parser();
  dataObject = parser.parse(xhrData);
  showObject(filetype, document.getElementById('data_obj'), dataObject, 0);

  // map to file's hex code
  if(typeof rawData === "undefined" && typeof xhrData !== "undefined") {
    rawData = xhrData.data;
  }
  var strData = new Uint8Array(rawData),
      hex = "",
      last=strData.length,
      i, hv,
      wrap = 8*2,
      lno="0x00000\n";

  for(i=0; i<last; i++) {
    hv = strData[i].toString(16).toUpperCase();
    hex += (hv.length == 1 ? "0" : '') + hv + (i > 0 && (i+1) % wrap === 0 ?  "\n" : " ");
    if (i > 0 && (i+1) % wrap === 0) {
      var mark = (i+1).toString(16).toUpperCase();
      while(mark.length<5) { mark = "0" + mark; }
      lno += "0x" + mark + "\n";
    }
  }
  $('#lines').text(hex);
  $('#main').width($(document).width() - $('#sidebar').width() - 20);
  $('#gutter').text(lno);
}


tryLoad();


/**
 * map to hex range
 */
function mapToHex(start, end) {
  var selector = "#lines",
      hex = $(selector).text();
      hex = hex.replace(/<\/?span>/g,'');

  start = 3 * start;
  end = 3 * end - 1;

  if(end>start) {
    hex = hex.substring(0,start) + "<span>" + hex.substring(start,end) + "</span>" + hex.substring(end);
  }

  $(selector).html(hex);

  if(end<start) return;

  // Scroll to that position (if not already in screen)
  var cr = $(selector+" span")[0].getBoundingClientRect()
  if(cr.top<140 || cr.top>120+$("#sidebar").height()) {
    $(selector+' span')[0].scrollIntoView();
  }
  // a correction might be necessary, due to css positioning tricks
  cr = $(selector+" span")[0].getBoundingClientRect()
  if(cr.top<140) {
    $("#sidebar").scrollTo("-=20px");
  }

  return false;
}