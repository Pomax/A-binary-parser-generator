// font debugging
var debug = false;
var xhr_file = 'myimage.png';
var filetype = "PNG Image";


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



var xhr = new XMLHttpRequest();
var xhrData = false;
xhr.open('GET', xhr_file, true);
xhr.responseType = 'arraybuffer';
if(xhr.mozResponseType) { xhr.mozResponseType = xhr.responseType; }
xhr.onreadystatechange = function() {
  if(xhr.readyState==4 && xhr.status==200) {
    var dataResponse = xhr.mozResponseArrayBuffer || xhr.mozResponse || xhr.responseArrayBuffer || xhr.response;
    xhrData = {pointer: 0, marks: [], bytecode: buildDataView(dataResponse)};
  }
}
xhr.send(null);


function tryLoad() {
  if(xhrData===false) { setTimeout(tryLoad, 250); }
  else { setTimeout(load, 1000); }
}

/**
 * When both fonts have been loaded, we parse them, to see what they're made of!
 */
function load() {
  var dataObject, parser = new Parser();

  // STEP 4a: parse TTF, then print the object that is generated
  // to the page in a readable fashion.
  xhrData.pointer = 0;
  dataObject = parser.parse(xhrData);
  showObject(filetype, document.getElementById('data_obj'), dataObject, 0);
}

tryLoad();
