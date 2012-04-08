// test.js debugging
var rdebug = true;

// font debugging
var debug = false;

function spacer(n) {
  var r = "";
  while(n-->0) { r += "&nbsp;"; }
  return r;
}

function showObject(title, htmlelement, obj) {
  var content = __showObject(obj, 0);
  htmlelement.innerHTML = "<b style='display: inline-block; margin-bottom: 1em; text-decoration: underline;'>"+title.toUpperCase()+"</b>\n" + content;
}

function __showObject(obj, depth) {
  var attr, act, string = "";
  for(attr in obj) {
    if(attr === "__proto__") continue;
    if(attr === "__pointer") continue;
    if(attr === "__blocklength") continue;
    act = obj[attr];
    if(act instanceof Array) {
      string += spacer(depth) + "[" + attr + "]" + ": [Array("+act.length+")]\n";
      string += __showObject(act, depth+1);
    } else if(act instanceof Function) {
      string += spacer(depth) + "[" + attr + "]" + ": [Function]\n";
    } else if(act instanceof Object) {
      string += spacer(depth) + "[" + attr + "]" + ": [Object]\n";
      string += __showObject(act, depth+1);
    } else {
      string += spacer(depth) + "[" + attr + "]" + ": " + act + "\n";
    }
  }
  return string;
}

// get specification
if(rdebug) window.console.log("getting specification file");
var xhr = new XMLHttpRequest();
xhr.open('GET', 'OpenType.spec', false);
xhr.send(null);
var spec = xhr.responseText;
document.getElementById("specfile").innerHTML = spec.replace(/</g,"&lt;").replace(/>/g,"&gt;");

// generate parser
if(rdebug) window.console.log("generating parser");
var code = generateParser(spec);

// show parser code
if(rdebug) window.console.log("showing parser code");
document.getElementById("codeview").innerHTML = code.replace(/</g,"&lt;").replace(/>/g,"&gt;");

// get a ttf font
if(rdebug) window.console.log("getting TTF font file");
var ttf_font = 'lvnmbd.ttf';
var xhr = new XMLHttpRequest();
xhr.open('GET', ttf_font, false);
xhr.responseType = 'arraybuffer';
if(xhr.mozResponseType) { xhr.mozResponseType = xhr.responseType; }
xhr.send(null);
if(rdebug) window.console.log("setting up TTF font data object");
var fontDataTTF = {pointer: 0, marks: [], bytecode: new DataView(xhr.mozResponseArrayBuffer || xhr.mozResponse || xhr.responseArrayBuffer || xhr.response)};

if(rdebug) window.console.log("getting CFF font file");
var cff_font = 'LithosPro-Regular.otf';
xhr = new XMLHttpRequest();
xhr.open('GET', cff_font, false);
xhr.responseType = 'arraybuffer';
if(xhr.mozResponseType) { xhr.mozResponseType = xhr.responseType; }
xhr.send(null);
if(rdebug) window.console.log("setting up CFF font data object");
var fontDataCFF = {pointer: 0, marks: [], bytecode: new DataView(xhr.mozResponseArrayBuffer || xhr.mozResponse || xhr.responseArrayBuffer || xhr.response)};

if(rdebug) window.console.log("creating trigger script");
var script = document.createElement("script");
script.type="text/javascript";
script.innerHTML = code + "\n" + 
                   "if(rdebug) window.console.log('scheduling a 1000ms timeout before parse run.')\n" +
                   "setTimeout(function(){\n" +
                   "  fontDataTTF.pointer = 0;\n" +
                   "  if(rdebug) window.console.log('starting TTF parse run...')\n" +
                   "  readSFNT(fontDataTTF);\n" + 
                   "  if(rdebug) window.console.log('completed, serializing to string')\n" +
                   "  showObject('"+ttf_font+"', document.getElementById('fontobj_ttf'), getInstance('SFNT'), 0);\n"+
                   "  fontDataCFF.pointer = 0;\n" +
                   "  if(rdebug) window.console.log('starting CFF parse run...')\n" +
                   "  readSFNT(fontDataCFF);\n" + 
                   "  if(rdebug) window.console.log('completed, serializing to string')\n" +
                   "  showObject('"+cff_font+"', document.getElementById('fontobj_cff'), getInstance('SFNT'), 0);\n"+
                   "}, 1000);";

document.head.appendChild(script);
