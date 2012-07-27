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
  var content = __showObject(obj, 0);
  htmlelement.innerHTML = "<span onclick='$(\"details\").removeAttr(\"open\")'>collapse all</span> - <span onclick='$(\"details\").attr(\"open\",\"true\")'>expand all</span><br>\n"+
                          "<b style='display: inline-block; margin-bottom: 1em; text-decoration: underline;'>"+title.toUpperCase()+"</b>\n" + content;
  // Polyfill a given set of elements
  jQuery('details', htmlelement).details();
  $('html').addClass($.fn.details.support ? 'details' : 'no-details');
}

/**
 * Wrapped by showObject, this is the function
 * that actually does the recursive string building
 * to show what's inside of a JS object.
 */
function __showObject(obj, depth) {
  var attr, act, string = "";
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
      string += spacer(depth) + "[" + attr + "]" + " <details><summary>[" + act["__typeName"] + "]</summary><div>";
      string += __showObject(act, depth+1) + "</div></details><br>";
    } else {
      string += spacer(depth) + "[" + attr + "]" + ": " + act + "\n";
    }
  }
  return string
}
