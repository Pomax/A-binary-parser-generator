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
var xhr_ttf = new XMLHttpRequest();
xhr_ttf.open('GET', ttf_font, true);
xhr_ttf.responseType = 'arraybuffer';
if(xhr_ttf.mozResponseType) { xhr_ttf.mozResponseType = xhr_ttf.responseType; }
var fontDataTTF = false;
xhr_ttf.onreadystatechange = function() {
  if(xhr_ttf.readyState==4 && xhr_ttf.status==200) {
    if(rdebug) window.console.log("setting up TTF font data object");
    fontDataTTF = {pointer: 0, marks: [], bytecode: new DataView(xhr_ttf.mozResponseArrayBuffer || xhr_ttf.mozResponse || xhr_ttf.responseArrayBuffer || xhr_ttf.response)};
  }
}
xhr_ttf.send(null);

// get a cff font
if(rdebug) window.console.log("getting CFF font file");
var cff_font = 'LithosPro-Regular.otf';
var xhr_cff = new XMLHttpRequest();
xhr_cff.open('GET', cff_font, true);
xhr_cff.responseType = 'arraybuffer';
if(xhr_cff.mozResponseType) { xhr_cff.mozResponseType = xhr_cff.responseType; }
var fontDataCFF = false;
xhr_cff.onreadystatechange = function() {
  if(xhr_cff.readyState==4 && xhr_cff.status==200) {
    if(rdebug) window.console.log("setting up CFF font data object");
    fontDataCFF = {pointer: 0, marks: [], bytecode: new DataView(xhr_cff.mozResponseArrayBuffer || xhr_cff.mozResponse || xhr_cff.responseArrayBuffer || xhr_cff.response)};
  }
}
xhr_cff.send(null);


/**
 *
 */
function tryLoadFonts() {
  if(fontDataTTF===false || fontDataCFF===false) {
    if(rdebug) window.console.log('scheduling a 250ms timeout before checking load states.')
    setTimeout(tryLoadFonts, 250); }
  else { 
    if(rdebug) window.console.log('scheduling a 1000ms timeout before parse run.')  
    setTimeout(loadFonts, 1000); }
}

/**
 *
 */
function loadFonts() {
  // loading done - parse TTF
  fontDataTTF.pointer = 0;
  if(rdebug) window.console.log('starting TTF parse run...')
  readSFNT(fontDataTTF); 
  if(rdebug) window.console.log('completed, serializing to string')
  showObject(ttf_font, document.getElementById('fontobj_ttf'), getInstance('SFNT'), 0);

  // parse CFF
  fontDataCFF.pointer = 0;
  if(rdebug) window.console.log('starting CFF parse run...')
  readSFNT(fontDataCFF); 
  if(rdebug) window.console.log('completed, serializing to string')
  showObject(cff_font, document.getElementById('fontobj_cff'), getInstance('SFNT'), 0);
}

// kickstart
var script = document.createElement("script");
script.type="text/javascript";
script.innerHTML = code;
document.head.appendChild(script);
tryLoadFonts();
