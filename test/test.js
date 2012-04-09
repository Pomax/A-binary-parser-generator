// test.js debugging
var rdebug = true;

// font debugging
var debug = false;

// ttf and otf test fonts - modify these to match whichever font you're using for testing
var ttf_font = 'Sansation_Regular.ttf';
var cff_font = 'StMarie-thin.otf';

/**
 * helper function to showObject
 */
function spacer(n) {
  var r = "";
  while(n-->0) { r += "&nbsp;"; }
  return r;
}

/**
 * Show what is inside an abitrary JS object,
 * by writing it's propertly/values to a specific
 * HTML element like <p> or <pre>
 */
function showObject(title, htmlelement, obj) {
  var content = __showObject(obj, 0);
  htmlelement.innerHTML = "<b style='display: inline-block; margin-bottom: 1em; text-decoration: underline;'>"+title.toUpperCase()+"</b>\n" + content;
}

/**
 * Wrapped by showObject, this is the function
 * that actually does the recursive string building
 * to show what's inside of a JS object.
 */
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

// ========== RELEVANT CODE STARTS HERE =============

// STEP 1: get our OpenType specification file
if(rdebug) window.console.log("getting specification file");
var xhr = new XMLHttpRequest();
xhr.open('GET', '../OpenType.spec', false);
xhr.send(null);
var spec = xhr.responseText;
document.getElementById("specfile").innerHTML = spec.replace(/</g,"&lt;").replace(/>/g,"&gt;");

// STEP 2: generate a JS parser, as source code, from this spec
if(rdebug) window.console.log("generating parser");
var code = generateParser(spec);

// show the source code on the page
if(rdebug) window.console.log("showing parser code");
document.getElementById("codeview").innerHTML = code.replace(/</g,"&lt;").replace(/>/g,"&gt;");


/**
 * This function wraps a byte stream with an object that
 * gives use byte sequence reading functions. This is particulary
 * important because our files are always big endian, but not every
 * system will load them as such!
 */
function buildDataView(data) {
  // rely on jDataView (https://github.com/vjeux/jDataView)
  // to supply the correct byte reading functions. Make sure
  // to set it up so that it read Big Endian byte ordering.
  var reader = new jDataView(data, 0, data.length, false);
  return {
    getInt8:   function(offset) { return reader.getInt8(offset,   false); },
    getUint8:  function(offset) { return reader.getUint8(offset,  false); },
    getInt16:  function(offset) { return reader.getInt16(offset,  false); },
    getUint16: function(offset) { return reader.getUint16(offset, false); },
    getInt32:  function(offset) { return reader.getInt32(offset,  false); },
    getUint32: function(offset) { return reader.getUint32(offset, false); }
  }
}

// STEP 3a: get a ttf font
if(rdebug) window.console.log("getting TTF font file");
var xhr_ttf = new XMLHttpRequest();
xhr_ttf.open('GET', ttf_font, true);
xhr_ttf.responseType = 'arraybuffer';
if(xhr_ttf.mozResponseType) { xhr_ttf.mozResponseType = xhr_ttf.responseType; }
var fontDataTTF = false;
xhr_ttf.onreadystatechange = function() {
  if(xhr_ttf.readyState==4 && xhr_ttf.status==200) {
    if(rdebug) window.console.log("setting up TTF font data object");
    fontDataTTF = {pointer: 0, marks: [], bytecode: buildDataView(xhr_ttf.mozResponseArrayBuffer || xhr_ttf.mozResponse || xhr_ttf.responseArrayBuffer || xhr_ttf.response)};
  }
}
xhr_ttf.send(null);

// STEP 3b: get a cff font
if(rdebug) window.console.log("getting CFF font file");
var xhr_cff = new XMLHttpRequest();
xhr_cff.open('GET', cff_font, true);
xhr_cff.responseType = 'arraybuffer';
if(xhr_cff.mozResponseType) { xhr_cff.mozResponseType = xhr_cff.responseType; }
var fontDataCFF = false;
xhr_cff.onreadystatechange = function() {
  if(xhr_cff.readyState==4 && xhr_cff.status==200) {
    if(rdebug) window.console.log("setting up CFF font data object");
    fontDataCFF = {pointer: 0, marks: [], bytecode: buildDataView(xhr_cff.mozResponseArrayBuffer || xhr_cff.mozResponse || xhr_cff.responseArrayBuffer || xhr_cff.response)};
  }
}
xhr_cff.send(null);


/**
 * This function waits for both the TTF and CFF font to finish
 * loading before it will let us continue with our work.
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
 * When both fonts have been loaded, we parse them, to see what they're made of!
 */
function loadFonts() {
  var fontObject;
  
  // STEP 4a: parse TTF, then print the object that is generated
  // to the page in a readable fashion.
  fontDataTTF.pointer = 0;
  if(rdebug) window.console.log('starting TTF parse run...');
  fontObject = readSFNT(fontDataTTF); 
  if(rdebug) window.console.log('completed, serializing to string');
  showObject(ttf_font, document.getElementById('fontobj_ttf'), fontObject, 0);

  // STEP 4b: parse CFF. While we could do the same fontObject = readSFNT, we can
  // also use the "get last bound instance for ...." function:
  fontDataCFF.pointer = 0;
  if(rdebug) window.console.log('starting CFF parse run...');
  readSFNT(fontDataCFF); 
  fontObject = getInstance("SFNT");
  if(rdebug) window.console.log('completed, serializing to string');
  showObject(cff_font, document.getElementById('fontobj_cff'), fontObject, 0);
}


// And finally, in order to kickstart the whole
// loading process, we need to make sure to inject 
// our JS font parser that we generated as a new
// script element, and then trigger the "wait for
// fonts to load" function.
var script = document.createElement("script");
script.type="text/javascript";
script.innerHTML = code;
document.head.appendChild(script);
tryLoadFonts();
