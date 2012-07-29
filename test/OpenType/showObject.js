/**
 * helper function to showObject
 */
function spacer(n) {
  var r = "";
  while(n-->0) { r += "&nbsp;"; }
  return r;
}

/**
 * Show what is inside an abitrary JS object,
 * by writing it's propertly/values to a specific
 * HTML element like <p> or <pre>
 */
function showObject(title, htmlelement, obj) {
  var content = __showObject({obj: obj}, 0);
  htmlelement.innerHTML = "<span onclick='$(\"details\").removeAttr(\"open\")'>collapse all</span> - <span onclick='$(\"details\").attr(\"open\",\"true\")'>expand all</span><br>\n"+
                          "<b style='display: inline-block; margin-bottom: 1em; text-decoration: underline;'>"+title.toUpperCase()+"</b>\n" + content;

  // Polyfill a given set of elements
  jQuery('details', htmlelement).details();
}

// Polyfill the website
$('html').addClass($.fn.details.support ? 'details' : 'no-details');

/**
 * Wrapped by showObject, this is the function
 * that actually does the recursive string building
 * to show what's inside of a JS object.
 */
function __showObject(obj, depth) {
  var typeLength = function(type) {
    switch(type) {
      case "BYTE"   : return 2;
      case "ASCII"  : return 2;
      case "SHORT"  : return 4;
      case "USHORT" : return 4;
      case "UINT24" : return 6;
      case "LONG"   : return 8;
      case "ULONG"  : return 8;
      default : return 0;
    }
  }

  var hexval = function(val, type) {
    if(!type) return '';
    if (parseInt(val)===val) {
      var hv = val.toString(16).toUpperCase();
      while(hv.length < typeLength(type)) { hv = "0" + hv; }
      return " ("+type+")";
    }
    return '';
  }

  var attr, act, string = "", hv;
  for(attr in obj) {
    // hide supposedly hidden attributes
    if(attr.substring(0,2) === "__") continue;
    // display everything else
    act = obj[attr];
    if(act instanceof Array) {
      string += spacer(depth) + "[" + attr + "]" + ": <details><summary>[Array("+act.length+")]</summary><div>";
      string += __showObject(act, depth+1) + "</div></details><br>";
    } else if(act instanceof Function) {
      string += spacer(depth) + "[" + attr + "]" + ": [Function]\n";
    } else if(act instanceof Object) {
      string += spacer(depth) + "[" + attr + "]" + " <details><summary onmouseover='mapToHex("+act.__pointer+","+(act.__pointer+act.__blocklength)+")'>[" + act["__typeName"] + "]</summary><div>";
      string += __showObject(act, depth+1) + "</div></details><br>";
    } else {
      hv = '';
      if (typeof obj.push === 'undefined') {
        mouseover = (typeof obj.__startMarks[attr] !== 'undefined' ? "onmouseover='mapToHex("+obj.__startMarks[attr]+","+obj.__endMarks[attr]+")'" : '');
        hv = "<span class='typeinfo' "+mouseover+">"+hexval(act, (obj.__typeTable ? obj.__typeTable[attr] : false))+"</span>";
      }
      string += spacer(depth) + "[" + attr + "]" + ": " + act + hv + "\n";
    }
  }
  return string
}
