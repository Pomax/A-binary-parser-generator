// font debugging
var debug = false;
var filetype = "OpenType font";

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

var xhr_file = 'UbuntuMono-R.ttf', xhrData = false;
getData(xhr_file, function(xhr) {
  var dataResponse = xhr.mozResponseArrayBuffer || xhr.mozResponse || xhr.responseArrayBuffer || xhr.response;
  xhrData = {pointer: 0, marks: [], data: dataResponse, bytecode: buildDataView(dataResponse)};
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
      wrap = 8*2;
  for(i=0; i<last; i++) {
    hv = strData[i].toString(16).toUpperCase();
    hex += (hv.length == 1 ? "0" : '') + hv + (i > 0 && (i+1) % wrap === 0 ?  "\n" : " ");
  }
  $('#codepre').text(hex);
  $('.sidebar').css("width",(3*wrap + 2)+"em");
}


tryLoad();

/**
 * map to hex range
 */
function mapToHex(start, length) {
  start *= 3;
  length *= 3;
  var hex = $('#codepre').text();
  hex = hex.replace("<span>",'');
  hex = hex.replace("</span>",'');
  hex = hex.substring(0,start) + "<span >" + hex.substring(start,start+length) + "</span>" + hex.substring(start+length);
  $('#codepre').html(hex);
  $('.sidebar').height($(document).height()-50);
/*
  var fooOffset = jQuery('#codepre span').offset(),
      destination = fooOffset.top + 200;
  $('.sidebar').scrollTop(destination);
*/
  return false;
}

/**
 * scroll to hex range
 */
function scrollToHex(start, length) {
  start *= 3;
  length *= 3;
  //...
  return false;
}

/**
 * Try to enable drag and drop for files
 */
if (typeof window.FileReader === 'undefined') {} else {
  var holder = document.getElementById('holder');

  holder.ondragover = function () { $(holder).addClass('hover'); return false; };
  holder.ondragend = holder.onmouseout = holder.onblur = function () { $(holder).removeClass('hover'); return false; };
  holder.ondrop = function (e) {
    $(holder).removeClass('hover');
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
