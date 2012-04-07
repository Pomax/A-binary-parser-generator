var debug = false;

function spacer(n) {
  var r = "";
  while(n-->0) { r += "&nbsp;"; }
  return r;
}

function showObject(htmlelement, obj, depth) {
  var attr, act, grey;
  for(attr in obj) {
    if(attr === "__proto__") continue;
    if(attr === "__pointer") continue;
    if(attr === "__blocklength") continue;
    act = obj[attr];
    if(act instanceof Array) {
      htmlelement.innerHTML += spacer(depth) + "[" + attr + "]" + ": [Array]\n";
      showObject(htmlelement, act, depth+1);
    } else if(act instanceof Function) {
      htmlelement.innerHTML += spacer(depth) + "[" + attr + "]" + ": [Function]\n";
    } else if(act instanceof Object) {
      htmlelement.innerHTML += spacer(depth) + "[" + attr + "]" + ": [Object]\n";
      showObject(htmlelement, act, depth+1);
    } else {
      htmlelement.innerHTML += spacer(depth) + "[" + attr + "]" + ": " + act + "\n";
    }
  }
}

// get specification
var xhr = new XMLHttpRequest();
xhr.open('GET', 'OpenType.spec', false);
xhr.send(null);
var spec = xhr.responseText;
document.getElementById("specfile").innerHTML = spec;

// generate parser
var code = generateParser(spec);

// show parser code
document.getElementById("codeview").innerHTML = code;

// get font
var xhr = new XMLHttpRequest();
xhr.open('GET', '1502-f2sn.otf', false);
xhr.responseType = 'arraybuffer';
if(xhr.mozResponseType) { xhr.mozResponseType = xhr.responseType; }
xhr.send(null);

var fontData = {pointer: 0, data: new DataView(xhr.mozResponseArrayBuffer || xhr.mozResponse || xhr.responseArrayBuffer || xhr.response)};
var script = document.createElement("script");
script.type="text/javascript";
script.innerHTML = code + "\n" + 
                   "fontData.pointer = 0;\n" +
                   "var sfnt = readSFNT(fontData);\n" + 
                   "showObject(document.getElementById('fontobj'), sfnt, 0);";
document.head.appendChild(script);
