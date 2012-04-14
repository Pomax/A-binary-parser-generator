/**
 * This function generates a parser for a binary data file
 * that conforms fo the specification as described in the
 * specfilecontent text variable.
 *
 * How do I run this?
 *
 *   You can either run it through a browser, by <script>
 *   including this file, and then adding your own code for:
 *
 *     - loading a .spec file
 *     - calling generateParser(file_content)
 *     - injecting the generated code (don't use eval,
 *       do use <script> injectionn into <head>)
 *     - loading your data file
 *     - calling (new Parser()).parse(data)
 *     - voila, data file representation
 *
 *   Or you can use it in a terminal/command box using node.
 *   The provided generate.js will get this job done for you:
 *
 *     $>node generate.js SpecFile.spec
 *
 *   This will simply generate the parser code. To immediately
 *   apply this to a binary data file, too, modify the end
 *   of generate.js and then call it as:
 *
 *     $>node generate.js SpecFile.spec file.in
 *
 *
 * How it works:
 *
 *   The generator uses regular expression to iteratively
 *   replace the specification with JavaScript instructions
 *   for reading each record. The resultant source code
 *   is then embedded in a JavaScript object called "Parser"
 *   as its Parser.parse(data) function. This allows you
 *   to simply import the resultant JavaScript code and call
 *
 *     var data = getDataFile(...);
 *     var parser = new Parser();
 *     var objectRepresentation = parser.parse(data);
 *
 *   And now you have an object that you can apply your own
 *   query and traversal code to.
 *
 *
 * Why don't I just write a tool that's both parser and
 * interpreter at the same time?
 *
 *   Because if the spec ever changes, you're screwed.
 *   And specs change all the time. So you want to keep
 *   your data representation and your 'business logic'
 *   separated. When the spec changes, you just generate
 *   a new parser and plug that into your tool chain.
 *
 *   You're still writing the interpreter code, but you
 *   no longer have to write the parser side of it. This
 *   saves you dev time, and also means you no longer
 *   need to become an expert in the spec you're trying
 *   to work with. Just find out where the data you need
 *   is located, and target that. Simplify, simplify.
 *
 *   Bottom line: write modular software, win.
 *
 *
 * (c) 2012 Mike "Pomax" Kamermans
 */
function generateParser(specfilecontent) {

  var search, replace, re, regExpReplace = function(data, search, replace) {
    var newString = data.replace(new RegExp(search, "gm"), replace);
    if(debug && newString === data) { window.console.log("NOTE: "+search+" -> "+replace+" did not modify the string."); }
    return newString; }


  // Strip line comments
  search = "//.*";
  replace = "";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Strip block comments (see http://ostermiller.org/findcomment.html)
  search = "(?:/\\*(?:[^*]|(?:\\*+[^*/]))*\\*+/)|(?://.*)\\n";
  replace = "";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  // Get the defining collection
  var masterFunction = specfilecontent.match(/Defining\s+Collection\s+(\S+)/);
  if(masterFunction === null) {
    window.console.log("No Defining Collection found, resultant parser code will lack a call to the relevant read function at the end of Parser.parse(data)!");
  } else {
    masterFunction = masterFunction[1];
    search = "Defining\\s+Collection";
    replace = "Collection";
    specfilecontent = regExpReplace(specfilecontent, search, replace);
  }

  // Convert empty collections
  search = "(^[ \\t]*)Collection[\\W]*(\\w+)\\s*\\{\\s*\\}";
  replace = "$1var read$2 = function(data) {\n"+
            "$1  var struct = {};\n"+
            "$1  parser.bindInstance(\"$2\", struct);\n" +
            "$1  struct.__pointer = data.pointer;\n"+
            "$1  struct.__blocklength = 0;\n"+
            "$1  return struct;\n"+
            "$1};\n"+
            "$1parser.addReadFunction(\"$2\",read$2);\n";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert collections into object generator functions
  search = "^([ \\t]*)Collection[\\W]*(\\S+)\\s*{([\\w\\W]+?)^\\1}";  // note the +?, for non-greedy selection.
  replace = "$1var read$2 = function(data) {\n"+
            "$1  var struct = {};\n"+
            "$1  parser.bindInstance(\"$2\", struct);\n"+
            "$1  struct.__pointer = data.pointer;"+
            "$3"+
            "$1  struct.__blocklength = data.pointer - struct.__pointer;\n"+
            "$1  return struct;\n"+
            "$1};\n"+
            "$1parser.addReadFunction(\"$2\",read$2);\n";
  // Keep rewriting until rewriting does nothing
  var crewrite = regExpReplace(specfilecontent, search, replace);
  while(crewrite!==specfilecontent) {
    specfilecontent = crewrite;
    crewrite = regExpReplace(specfilecontent, search, replace); }


  // Convert conditional statements (note that the left operand is presumed to be the record, not the match value)
  search = "^([ \\t]*)if\\((\\w+)\\.(.*?)\\)";
  replace = "$1if(parser.getInstance(\"$2\").$3)";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  search = "^([ \\t]*)if\\(([^\\.)]+)\\)";
  replace = "$1if(struct.$2)";
  specfilecontent = regExpReplace(specfilecontent, search, replace);



  // Skip over any reserved records (i.e. read-and-forget)
  search = "([ \\t]*)RESERVED\\s*(\\w+)";
  replace = "$1parser.read$2(data)";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Deal with offsets to specific structs
  search = "([ \\t]*)(GLOBAL|LOCAL|IMMEDIATE) ([\\w_]+) OFFSET (\\w+)\\s*TO ([^\\s]+)";
  replace = "$1struct.$4 = parser.getReadFunction(\"$3\")(data);\n"+
            "$1data.marks.push(data.pointer);\n"+
            "$1struct.$4Data = parser.readStructure(data, (typeof $5 === 'undefined' ? parser.getReadFunction(\"$5\") : $5), \"$2\", struct, struct.$4);\n"+
            "$1data.pointer = data.marks.pop();\n";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // offsets that are relative to some other offset
  search = "([ \\t]*)(BYTE|ASCII|SHORT|USHORT|UINT24|LONG|ULONG)\\s*OFFSET\\s*(\\S+)\\s*RELATIVE TO\\s*(\\w+)\\.(\\w+)";
  replace = "$1struct.$3 = parser.getReadFunction(\"$2\")(data); // offset relative to $4.$5\n";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Read typed records
  search = "([ \\t]*)(BYTE|ASCII|SHORT|USHORT|UINT24|LONG|ULONG)\\s*(\\w+)";
  replace = "$1struct.$3 = parser.read$2(data);";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Read a self-descriptive record
  search = "([ \\t]*)COLLECTION<(\\w+)>\\s*(OR \\s*(\\w+)\\[(\\w+)\\]\\s*)(\\w+)";
  replace = "$1var f$2 = parser.getReadFunction(struct.$2);\n"+
            "$1if(typeof f$2 !== 'undefined') {\n"+
            "$1  $1struct.$6 = f$2(data);\n"+
            "$1} else {\n"+
            "$1  $1struct.$6 = [];\n"+
            "$1  if(debug) window.console.log('reading '+struct.$2+' as '+$4+'['+struct.$5+'] of raw data');\n"+
            "$1  parser.readArray(parser, data, struct.$6, \"$4\", struct.$5); \n"+
            "$1}";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Read ASCII arrays as strings
  search = "([ \\t]*)ASCII\\[([\\d\\w]+)\\]\\s*(\\w+)";
  replace = "$1struct.$3 = \"\";\n"+
            "$1(function(data, readcount) {\n"+
            "$1  while(readcount-->0) {\n"+
            "$1    struct.$3 += parser.readASCII(data);\n"+
            "$1  }\n"+
            "$1}(data, $2));";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  search = "HERE";
  replace = "data.pointer";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  search = "START";
  replace = "struct.__pointer";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert typed array records with REMAINDER size
  search = "([ \\t]*)([\\w_]+)\\[REMAINDER\\]\\s*(\\w+)";
  replace = "$1struct.$3 = [];\n"+
            "$1(function(data, arr) {\n"+
            "$1  var read = parser.getReadFunction(\"$2\");\n"+
            "$1  while(data.pointer < data.bytecode.size()) {\n"+
            "$1    arr.push(read(data));\n"+
            "$1  }\n"+
            "$1}(data, struct.$3));";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert typed array records that use a numerical size indicator
  search = "([ \\t]*)([\\w_]+)\\[(\\d+)\\]\\s*(\\w+)";
  replace = "$1struct.$4 = [];\n"+
            //"$1(function(data, arr, readcount) {\n"+
            //"$1  while(readcount-->0) {\n"+
            //"$1    arr.push(read$2(data));\n"+
            //"$1  }\n"+
            //"$1}(data, struct.$4, $3));";
            "$1parser.readArray(parser, data, struct.$4, \"$2\", $3);";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert typed array records that use a local symbolic size indicator
  search = "([ \\t]*)([\\w_]+)\\[([^\\.\\s]+(\\s*[\\+\\-\\*\\/]\\s*[^)]+)*)\\]\\s*(\\w+)";
  replace = "$1struct.$5 = [];\n"+
            //"$1(function(data, arr, readcount) {\n"+
            //"$1  while(readcount-->0) {\n"+
            //"$1    arr.push(read$2(data));\n"+
            //"$1  }\n"+
            //"$1}(data, struct.$5, struct.$3));";
            "$1parser.readArray(parser, data, struct.$5, \"$2\", struct.$3);";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert typed array records that have a remote symbolic size indicator.
  //
  // NOTE: the remote location may not have been read in yet, so this read
  //       may be delayed to 'some later moment in time'.
  search = "([ \\t]*)([\\w_]+)\\[(\\w+)\\.(\\w+)\\]\\s*(\\w+)";
  replace = "$1struct.$5 = [];\n"+
            "$1if(parser.getInstance(\"$3\")){\n"+
            //"$1  (function(data, arr, readcount) {\n"+
            //"$1    while(readcount-->0) {\n"+
            //"$1      arr.push(read$2(data));\n"+
            //"$1    }\n"+
            //"$1  }(data, struct.$5, getInstance(\"$3\").$4));\n"+
            "$1  parser.readArray(parser, data, struct.$5, \"$2\", parser.getInstance(\"$3\").$4);\n"+
            "$1} else {\n"+
            "$1  parser.delayArrayRead(parser, data, data.pointer, parser.getReadFunction(\"$2\"), struct, \"$5\", \"$3\", \"$4\")\n"+
            "$1}";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert typed array records that have a size indicator based on an
  // arithmetic expression of two remote symbols.
  //
  // NOTE: the remote location may not have been read in yet, so this read
  //       may be delayed to 'some later moment in time'.
  search = "([ \\t]*)([\\w_]+)\\[(\\w+)((\\.\\w+)+)?\\s+([+\\-*])\\s+(\\w+)((\\.\\w+)+)?\\]\\s*(\\w+)";
  replace = "$1struct.$10 = [];\n"+
            "$1if(parser.getInstance(\"$3\") && parser.getInstance(\"$7\")){\n"+
            //"$1  (function(data, arr, readcount) {\n"+
            //"$1    while(readcount-->0) {\n"+
            //"$1      arr.push(read$2(data));\n"+
            //"$1    }\n"+
            //"$1  }(data, struct.$10, getInstance(\"$3\")$4 $6 getInstance(\"$7\")$8));"+
            "$1  parser.readArray(parser, data, struct.$10, \"$2\", parser.getInstance(\"$3\")$4 $6 parser.getInstance(\"$7\")$8);\n"+

            "$1} else {\n"+
            "$1  parser.delayArithmeticArrayRead(parser, data, data.pointer, parser.getReadFunction(\"$2\"), struct, \"$10\", [\"$3\", \"$7\"], [\"$4\",\"$8\"], \"$6\")\n"+
            "$1}";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert remaining arrays based on 'the spec knows best'.
  // i.e. USHORT[(struct.length - (data.pointer - struct.__pointer))/2] glyphIdArray
  // becomes (function(...) { ... }(data, struct.$4, $3))
  search = "([ \\t]*)([\\w_]+)\\[([^\\]]+)\\]\\s*(\\w+)";
  replace = "$1struct.$4 = [];\n"+
            //"$1(function(data, arr, readcount) {\n"+
            //"$1  while(readcount-->0) {\n"+
            //"$1    arr.push(read$2(data));\n"+
            //"$1  }\n"+
            //"$1}(data, struct.$4, $3));";
            "$1parser.readArray(parser, data, struct.$4, \"$2\", $3);";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert special functions. Right now, that's only the VALUE(<name>) function
  search = "VALUE\\((\\w+)\\)";
  replace = "struct.$1";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert termination message
  search = "(^[ \\t]*)TERMINATE (.*)";
  replace = "$1throw \"ERROR: $2\"";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert warning message
  search = "(^[ \\t]*)WARN (.*)";
  replace = "$1if(window.console) {\n"+
            "$1  window.console.log(\"WARNING: $2\");\n"+
            "$1}";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  // Run a final correction for the readStructure(...) code, so that
  // private collections are correctly resolved.
  search = "= readStructure\\(data, (_\\w+),";
  replace = "= readStructure(data, read$1,";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // cleanup
  search = "\\s+$";
  replace = "";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  search = "\\n\\n+";
  replace = "\\n\\n";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  /** And then the various predefined functions, like readers and administrative functions. **/

  var predefined = ["readFunctions: {}",
                    "instances: {}",
                    "arrayReadQueued: false",
                    "delayedArrays: []",
                    "arithmeticArrayReadQueued: false",
                    "delayedArithmeticArrays: []"];

  /**
   * add a read function to the list of known read functions
   */
  var addReadFunction = function(name, reference) {
    this.readFunctions[name] = reference;
  };
  predefined.push("addReadFunction: "+addReadFunction.toString());


  /**
   * get a read function from the list of known read functions
   */
  var getReadFunction = function(name) {
    return this.readFunctions[name];
  };
  predefined.push("getReadFunction: "+getReadFunction.toString());


  /**
   * generic array filling function, using whatever
   * reader can deal with type <type>.
   */
  var readArray = function(parser, data, array, type, readcount) {
    var readFunction = parser.getReadFunction(type);
    while(readcount-->0) {
      array.push(readFunction(data));
    }
  };
  predefined.push("readArray: "+readArray.toString());

  /**
   * read a single byte numerical value from the data object, moving the pointer forward by 1 byte
   */
  var readBYTE = function(data) {
    if(debug) window.console.log('reading BYTE at '+data.pointer+'.');
    var val = data.bytecode.getUint8(data.pointer++);
    if(debug) window.console.log('value = '+val+'.');
    return val;
  };
  predefined.push("readBYTE: "+readBYTE.toString());

  /**
   * read a byte from the data object and convert it to an ascii letter
   */
  var readASCII = function(data, parser) {
    if(debug) window.console.log('reading ASCII character at '+data.pointer+'.');
    var val = String.fromCharCode(data.bytecode.getUint8(data.pointer++));
    if(debug) window.console.log('value = '+val+'.');
    return val;
  };
  predefined.push("readASCII: "+readASCII.toString());

  /**
   * read an unsigned two byte numerical value from the data object, moving the pointer forward by 2 bytes
   */
  var readUSHORT = function(data) {
    if(debug) window.console.log('reading USHORT at '+data.pointer+'.');
    var val = data.bytecode.getUint16(data.pointer);
    data.pointer += 2;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  };
  predefined.push("readUSHORT: "+readUSHORT.toString());

  /**
   * read a signed two byte numerical value from the data object, moving the pointer forward by 2 bytes
   */
  var readSHORT = function(data) {
    if(debug) window.console.log('reading SHORT at '+data.pointer+'.');
    var val = data.bytecode.getInt16(data.pointer);
    data.pointer += 2;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  };
  predefined.push("readSHORT: "+readSHORT.toString());

  /**
   * read an unsigned three byte numerical value from the data object, moving the pointer forward by 3 bytes
   */
  var readUINT24 = function(data) {
    if(debug) window.console.log('reading UINT24 at '+data.pointer+'.');
    var val = data.bytecode.getUint16(data.pointer) * 256 + data.bytecode.getUint8(data.pointer+2);
    data.pointer += 3;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  };
  predefined.push("readUINT24: "+readUINT24.toString());

  /**
   * read an unsigned four byte numerical value from the data object, moving the pointer forward by 4 bytes
   */
  var readULONG = function(data) {
    if(debug) window.console.log('reading ULONG at '+data.pointer+'.');
    var val = data.bytecode.getUint32(data.pointer);
    data.pointer += 4;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  };
  predefined.push("readULONG: "+readULONG.toString());

  /**
   * read a signed four byte numerical value from the data object, moving the pointer forward by 4 bytes
   */
  var readLONG = function(data) {
    if(debug) window.console.log('reading LONG at '+data.pointer+'.');
    var val = data.bytecode.getInt32(data.pointer);
    data.pointer += 4;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  };
  predefined.push("readLONG: "+readLONG.toString());

  /**
   * read a compound structure from the data object, moving the pointer forward by however many bytes it comprises
   */
  var readStructure = function(data, type, locality, struct, offset) {
    if(debug) window.console.log('reading '+(typeof type === 'function' ? 'function' : type) +' structure at '+locality+' offset '+offset+'.');
    var curptr = data.pointer;
    if(locality==="GLOBAL") {
      data.pointer = offset;
    } else if(locality==="LOCAL") {
      data.pointer = struct.__pointer + offset;
    }  // note that IMMEDIATE doesn't require pointer reassignment
    var f = type;
    if(typeof type === "string") {
      f = new Function("data","parser", ""+
                       "if(typeof parser.getReadFunction('"+type.replace(/\W/,'_')+"') !== 'undefined') { "+
                       "  return parser.getReadFunction('"+type.replace(/\W/,'_')+"')(data); "+
                       "} else {"+
                       "  window.console.log('WARNING = read"+type+"() does not exist - Collection ["+type+"] missing from .spec file?');"+
                       "  return false; }");
    }
    var structure = f(data,this);
    data.pointer = curptr;
    return structure;
  };
  predefined.push("readStructure: "+readStructure.toString());

  /**
   * whenever a collection instance is built, treat it as represenative of that collection set
   */
  var bindInstance = function(name, instance) {
    if(debug) window.console.log('binding an instance of '+name+'.');
    this.instances[name] = instance;
  };
  predefined.push("bindInstance: "+bindInstance.toString());

  /**
   * get a representative collection
   */
  var getInstance = function(name) {
    if(debug) window.console.log('getting the instance for '+name+'.');
    return this.instances[name];
  };
  predefined.push("getInstance: "+getInstance.toString());

  /**
   * queue a delayed array read
   */
  var delayArrayRead = function(parser, data, pointer, readFunction, struct, propertyName, tableName, tablePropertyName) {
    if(debug) window.console.log('delaying an array read for struct.'+propertyName+', based on '+tableName+'.'+tablePropertyName);
    parser.delayedArrays.push({parser:parser, data:data, pointer:pointer, readFunction:readFunction, struct:struct, propertyName:propertyName, tableName:tableName, tablePropertyName:tablePropertyName});
    if(!parser.arrayReadQueued) {
      parser.arrayReadQueued = true;
      setTimeout(function() { parser.processArrayRead(); },250);
    }
  };
  predefined.push("delayArrayRead: "+delayArrayRead.toString());

  /**
   * process the list of delayed arrays
   */
  var processArrayRead = function() {
    if(debug) window.console.log('trying to process all entries in the array queue');
    var i, last, e, tbl;
    for(i=0, last=this.delayedArrays.length; i<last; i++) {
      e = this.delayedArrays[i];
      tbl = this.getInstance(e.tableName);
      if(tbl && tbl[e.tablePropertyName]) {
        var ptr = e.data.pointer;
        e.data.pointer = e.pointer;
        (function(data, arr, readFunction, readcount) {
          while(readcount-->0) {
            arr.push(readFunction(data));
          }
        }(e.data, e.struct[e.propertyName], e.readFunction, tbl[e.tablePropertyName]));
        e.data.pointer = ptr;
        this.delayedArrays.splice(i, 1); i--; last--;
      } else {
        this.delayArrayRead(e.parser, e.data, e.pointer, e.readFunction, e.struct, e.propertyName, e.tableName, e.tablePropertyName);
      }
    }
    if(this.delayedArrays.length===0) { this.arrayReadQueued = false; }
    else { setTimeout(function() { this.processArrayRead(); }, 250); }
  };
  predefined.push("processArrayRead: "+processArrayRead.toString());

  /**
   * queue a delayed array read
   */
  var delayArithmeticArrayRead = function(parser, data, pointer, readFunction, struct, propertyName, tableNames, tablePropertyNames, operator) {
    if(debug) window.console.log('delaying an array read for struct.'+propertyName+', based on ['+tableNames.join(',')+'].['+tablePropertyNames.join(',')+'] using ['+operator+']');
    parser.delayedArithmeticArrays.push({parser:parser, data:data, pointer:pointer, readFunction:readFunction, struct:struct, propertyName:propertyName, tableNames:tableNames, tablePropertyNames:tablePropertyNames, operator:operator});
    if(!parser.arithmeticArrayReadQueued) {
      parser.arithmeticArrayReadQueued = true;
      setTimeout(function() { parser.processArithmeticArrayRead(); }, 250);
    }
  };
  predefined.push("delayArithmeticArrayRead: "+delayArithmeticArrayRead.toString());

  /**
   * determine the array count for an array that uses arithmetic in their count field
   */
  var getArrayCount = function(tableNames, tablePropertyNames, operator) {
    var i, len = tableNames.length, tbl, prop, terms, values = []
    for(i=0; i<len; i++) {
      obj = this.getInstance(tableNames[i]);
      prop = tablePropertyNames[i];
      // ensure that something.prop1.prop2.prop3 etc. will resolve correctly
      terms = prop.split('.');
      if(terms[0]==='') {
        terms.splice(0,1);
      }
      // cycle thought obj[prop1][prop2][prop3][...] until we reach the value
      while(obj && terms.length>0 && obj[terms[0]]) {
        obj = obj[terms[0]];
        terms.splice(0,1);
      }
      // if prop[] has length 0, we resolved to a value.
      if(terms.length === 0) { values.push(obj); } else { return false; }
      var f = new Function('return '+values.join(operator)+';')
      return f();
    }
  };
  predefined.push("getArrayCount: "+getArrayCount.toString());

  /**
   * process the list of delayed arrays
   */
  var processArithmeticArrayRead = function() {
    if(debug) window.console.log('trying to process all entries in the arithmetic array queue');
    var i, last, e, count;
    for(i=0, last=this.delayedArithmeticArrays.length; i<last; i++) {
      e = this.delayedArithmeticArrays[i];
      count = this.getArrayCount(e.tableNames, e.tablePropertyNames, e.operator);
      if(count !== false) {
        var ptr = e.data.pointer;
        e.data.pointer = e.pointer;
        (function(data, arr, readFunction, readcount) {
          while(readcount-->0) {
            arr.push(readFunction(data));
          }
        }(e.data, e.struct[e.propertyName], e.readFunction, count));
        e.data.pointer = ptr;
        this.delayedArithmeticArrays.splice(i, 1); i--; last--;
      } else {
        this,delayArithmeticArrayRead(e.parser, e.data, e.pointer, e.readFunction, e.struct, e.propertyName, e.tableNames, e.tablePropertyNames, e.operator);
      }
    }
    if(this.delayedArithmeticArrays.length===0) { this.arithmeticArrayReadQueued = false; }
    else { setTimeout(function() { this.processArithmeticArrayRead(); }, 250); }
  };
  predefined.push("processArithmeticArrayRead: "+processArithmeticArrayRead.toString());

  // finalise the list of predefined functions
  predefined.push("");

  /**
   * also set up the binding block for injection into the Parser.parse(data) function
   */
  var bindings = "  parser.addReadFunction('BYTE',  parser.readBYTE);\n" +
                 "  parser.addReadFunction('ASCII', parser.readASCII);\n" +
                 "  parser.addReadFunction('USHORT',parser.readUSHORT);\n" +
                 "  parser.addReadFunction('SHORT', parser.readSHORT);\n" +
                 "  parser.addReadFunction('UINT24',parser.readUINT24);\n" +
                 "  parser.addReadFunction('ULONG', parser.readULONG);\n" +
                 "  parser.addReadFunction('LONG',  parser.readLONG);\n";

  /**
   * The final result is the predefined code + the converted specification parsing code
   */
  return "function Parser() {\n"+
         "  this.readFunctions = {};\n"+
         "  this.instances = {};\n"+
         "  this.arrayReadQueued = false;\n"+
         "  this.delayedArrays = [];\n"+
         "  this.arithmeticArrayReadQueued = false;\n"+
         "  this.delayedArithmeticArrays = [];\n"+
         "};\n"+
         "\n"+
         "Parser.prototype = {\n" +
         predefined.join(",\n\n") + "\n\n" +
         "parse: function(data) {\n" +
         "  parser = this;\n\n" +
         bindings + specfilecontent + "\n" +
         (masterFunction!==null ? "return parser.getReadFunction('" + masterFunction + "')(data);": "") + "\n" +
         "}\n};\n"+
         //"var parser = new Parser();\n"+
         "";
}