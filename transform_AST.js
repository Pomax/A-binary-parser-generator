function generateParser(specification) {
  var search, replace, re;
  
  var regExpReplace = function(data, search, replace) {
    var newString = data.replace(new RegExp(search, "gm"), replace);
    if(debug && newString === data) {
      window.console.log("NOTE: "+search+" -> "+replace+" did not modify the string.");
    }
    return newString;
  };

  /**
   * We build an AST for transling the spec to parse code
   */
  var AST_Node = function(n){
    this.name = n;
  }

  AST_Node.prototype = {
    name: ""
  };

  // Strip line comments
  search = "//.*";
  replace = "";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  // Strip block comments (see http://ostermiller.org/findcomment.html)
  search = "(?:/\\*(?:[^*]|(?:\\*+[^*/]))*\\*+/)|(?://.*)\\n";
  replace = "";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  

}