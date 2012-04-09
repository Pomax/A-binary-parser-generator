/**
 * This function generates a parser for a binary data file
 * that conforms fo the specification as described in the
 * specfilecontent text variable.
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


  // Convert collections into object generator functions
  search = "^([ \\t]*)Collection[\\W]*(\\S+)\\s*{([\\w\\W]+?)^\\1}";  // note the +?, for non-greedy selection.
  replace = "$1var read$2 = function(data) {\n"+
            "$1  var struct = {};\n"+
            "$1  bindInstance(\"$2\", struct);\n" +
            "$1  struct.__pointer = data.pointer;"+
            "$3"+
            "$1  struct.__blocklength = data.pointer - struct.__pointer;\n"+
            "$1  return struct;\n"+
            "$1}";
  // Keep rewriting until rewriting does nothing
  var crewrite = regExpReplace(specfilecontent, search, replace);
  while(crewrite!==specfilecontent) {
    specfilecontent = crewrite;
    crewrite = regExpReplace(specfilecontent, search, replace); }


  // Convert empty collections
  search = "(^[ \\t]*)Collection[\\W]*(\\w+)\\s*\\{\\}";
  replace = "$1var read$2 = function(data) {\n"+
            "$1  var struct = {};\n"+
            "$1  bindInstance(\"$2\", struct);\n" +
            "$1  struct.__pointer = data.pointer;\n"+
            "$1  struct.__blocklength = 0;\n"+
            "$1  return struct;\n"+
            "$1}";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert conditional statements (note that the left operand is presumed to be the record, not the match value)
  search = "^([ \\t]*)if\\(([^)]+)\\)";
  replace = "$1if(struct.$2)";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Skip over any reserved records (i.e. read-and-forget)
  search = "([ \\t]*)RESERVED\\s*(\\w+)";
  replace = "$1read$2(data)";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Deal with offsets to specific structs
  search = "([ \\t]*)(GLOBAL|LOCAL|IMMEDIATE) ([\\w_]+) OFFSET (\\w+)\\s*TO ([^\\s]+)";
  replace = "$1struct.$4 = read$3(data);\n"+
            "$1data.marks.push(data.pointer);\n"+
            "$1struct.$4Data = readStructure(data, $5, \"$2\", struct, struct.$4);\n"+
            "$1data.pointer = data.marks.pop();\n";
  specfilecontent = regExpReplace(specfilecontent, search, replace);  


  // offsets that are relative to some other offset
  search = "([ \\t]*)(BYTE|ASCII|SHORT|USHORT|UINT24|LONG|ULONG)\\s*OFFSET\\s*(\\S+)\\s*RELATIVE TO\\s*(\\w+)\\.(\\w+)";
  replace = "$1struct.$3 = read$2(data); // offset relative to $4.$5\n";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Read typed records
  search = "([ \\t]*)(BYTE|ASCII|SHORT|USHORT|UINT24|LONG|ULONG)\\s*(\\w+)";
  replace = "$1struct.$3 = read$2(data);";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Read ASCII arrays as strings
  search = "([ \\t]*)ASCII\\[([\\d\\w]+)\\]\\s*(\\w+)";
  replace = "$1struct.$3 = \"\";\n"+
            "$1(function(data, readcount) {\n"+
            "$1  while(readcount-->0) {\n"+
            "$1    struct.$3 += readASCII(data);\n"+
            "$1  }\n"+
            "$1}(data, $2));";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  search = "HERE";
  replace = "data.pointer";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  search = "START";
  replace = "struct.__pointer";
  specfilecontent = regExpReplace(specfilecontent, search, replace);



  // Convert typed array records that use a numerical size indicator
  search = "([ \\t]*)([\\w_]+)\\[(\\d+)\\]\\s*(\\w+)";
  replace = "$1struct.$4 = [];\n"+
            "$1(function(data, arr, readcount) {\n"+
            "$1  while(readcount-->0) {\n"+
            "$1    arr.push(read$2(data));\n"+
            "$1  }\n"+
            "$1}(data, struct.$4, $3));";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert typed array records that use a local symbolic size indicator
  search = "([ \\t]*)([\\w_]+)\\[([^\\.\\s]+(\\s*[\\+\\-\\*\\/]\\s*[^)]+)*)\\]\\s*(\\w+)";
  replace = "$1struct.$5 = [];\n"+
            "$1(function(data, arr, readcount) {\n"+
            "$1  while(readcount-->0) {\n"+
            "$1    arr.push(read$2(data));\n"+
            "$1  }\n"+
            "$1}(data, struct.$5, struct.$3));";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert typed array records that have a remote symbolic size indicator.
  //
  // NOTE: the remote location may not have been read in yet, so this read
  //       may be delayed to 'some later moment in time'.
  search = "([ \\t]*)([\\w_]+)\\[(\\w+)\\.(\\w+)\\]\\s*(\\w+)";
  replace = "$1struct.$5 = [];\n"+
            "$1if(getInstance(\"$3\")){\n"+
            "$1  (function(data, arr, readcount) {\n"+
            "$1    while(readcount-->0) {\n"+
            "$1      arr.push(read$2(data));\n"+
            "$1    }\n"+
            "$1  }(data, struct.$5, getInstance(\"$3\").$4));\n"+
            "$1} else {\n"+
            "$1  delayArrayRead(data, data.pointer, read$2, struct, \"$5\", \"$3\", \"$4\")\n"+
            "$1}";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert typed array records that have a size indicator based on an 
  // arithmetic expression of two remote symbols.
  //
  // NOTE: the remote location may not have been read in yet, so this read
  //       may be delayed to 'some later moment in time'.
  search = "([ \\t]*)([\\w_]+)\\[(\\w+)\\.(\\w+) ([+-]) (\\w+)\\.(\\w+)\\]\\s*(\\w+)";
  replace = "$1struct.$8 = [];\n"+
            "$1if(getInstance(\"$3\") && getInstance(\"$6\")){\n"+
            "$1  (function(data, arr, readcount) {\n"+
            "$1    while(readcount-->0) {\n"+
            "$1      arr.push(read$2(data));\n"+
            "$1    }\n"+
            "$1  }(data, struct.$8, getInstance(\"$3\").$4 $5 getInstance(\"$6\").$7));"+
            "$1} else {\n"+
            "$1  delayArithmeticArrayRead(data, data.pointer, read$2, struct, \"$8\", [\"$3\", \"$6\"], [\"$4\",\"$7\"], \"$5\")\n"+
            "$1}";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Convert remaining arrays based on 'the spec knows best'. 
  // i.e. USHORT[(struct.length - (data.pointer - struct.__pointer))/2] glyphIdArray 
  // becomes (function(...) { ... }(data, struct.$4, $3)) 
  search = "([ \\t]*)([\\w_]+)\\[([^\\]]+)\\]\\s*(\\w+)";
  replace = "$1struct.$4 = [];\n"+
            "$1(function(data, arr, readcount) {\n"+
            "$1  while(readcount-->0) {\n"+
            "$1    arr.push(read$2(data));\n"+
            "$1  }\n"+
            "$1}(data, struct.$4, $3));";
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

  /**

    And then the various predefined functions, like readers and administrative functions.

  **/

  var predefined = [
                    /**
                     * read a single byte numerical value from the data object, moving the pointer forward by 1 byte
                     */
                    "function readBYTE(data) {\n"+
                    "  if(debug) window.console.log('reading BYTE at '+data.pointer+'.');\n"+
                    "  var val = data.bytecode.getUint8(data.pointer++);\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    /**
                     * read a byte from the data object and convert it to an ascii letter
                     */
                    "function readASCII(data) {\n"+
                    "  if(debug) window.console.log('reading ASCII character at '+data.pointer+'.');\n"+
                    "  var val = String.fromCharCode(readBYTE(data));\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    /**
                     * read an unsigned two byte numerical value from the data object, moving the pointer forward by 2 bytes
                     */
                    "function readUSHORT(data) {\n"+
                    "  if(debug) window.console.log('reading USHORT at '+data.pointer+'.');\n"+
                    "  var val  = data.bytecode.getUint16(data.pointer);\n"+
                    "  data.pointer += 2;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    /**
                     * read a signed two byte numerical value from the data object, moving the pointer forward by 2 bytes
                     */
                    "function readSHORT(data) {\n"+
                    "  if(debug) window.console.log('reading SHORT at '+data.pointer+'.');\n"+
                    "  var val  = data.bytecode.getInt16(data.pointer);\n"+
                    "  data.pointer += 2;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    /**
                     * read an unsigned three byte numerical value from the data object, moving the pointer forward by 3 bytes
                     */
                    "function readUINT24(data) {\n"+
                    "  if(debug) window.console.log('reading UINT24 at '+data.pointer+'.');\n"+
                    "  var val  = data.bytecode.getUint16(data.pointer) * 256 + data.bytecode.getUint8(data.pointer+2);\n"+
                    "  data.pointer += 3;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    /**
                     * read an unsigned four byte numerical value from the data object, moving the pointer forward by 4 bytes
                     */
                    "function readULONG(data) {\n"+
                    "  if(debug) window.console.log('reading ULONG at '+data.pointer+'.');\n"+
                    "  var val  = data.bytecode.getUint32(data.pointer);\n"+
                    "  data.pointer += 4;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    /**
                     * read a signed four byte numerical value from the data object, moving the pointer forward by 4 bytes
                     */
                    "function readLONG(data) {\n"+
                    "  if(debug) window.console.log('reading LONG at '+data.pointer+'.');\n"+
                    "  var val  = data.bytecode.getInt32(data.pointer);\n"+
                    "  data.pointer += 4;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    /**
                     * read a compound structure from the data object, moving the pointer forward by however many bytes it comprises
                     */
                    "function readStructure(data, type, locality, struct, offset) {\n"+
                    "  if(debug) window.console.log('reading '+(typeof type === 'function' ? 'function' : type) +' structure at '+locality+' offset '+offset+'.');\n"+
                    "  var curptr = data.pointer;\n"+
                    "  if(locality===\"GLOBAL\") {\n"+
                    "    data.pointer = offset;\n"+
                    "  } else if(locality===\"LOCAL\") {\n"+
                    "    data.pointer = struct.__pointer + offset;\n"+
                    "  }  // note that IMMEDIATE doesn't require pointer reassignment\n"+
                    "  var f = type;\n"+
                    "  if(typeof type === \"string\") {\n"+
                    "    f = new Function('data', "+
                    "                     'if(typeof read'+type.replace(/\\W/,'_')+' !== \"undefined\") { "+
                    "                        return read'+type.replace(/\\W/,'_')+'(data); "+
                    "                      } else { window.console.log(\"WARNING: spec does not know about ['+type+']\"); return false; }');\n"+
                    "  }\n"+
                    "  var structure = f(data);\n"+
                    "  data.pointer = curptr;\n"+
                    "  return structure;\n"+
                    "}",
                    
                    /**
                     * a list of "Collection" instances.
                     */
                    "var instances = {};",

                    /**
                     * whenever a collection instance is built, treat it as represenative of that collection set
                     */
                    "function bindInstance(name, instance) {\n"+
                    "  if(debug) window.console.log('binding an instance of '+name+'.');\n"+
                    "  instances[name] = instance;\n"+
                    "}",

                    /**
                     * get a representative collection
                     */
                    "function getInstance(name) {\n"+
                    "  if(debug) window.console.log('getting the instance for '+name+'.');\n"+
                    "  return instances[name];\n"+
                    "}",

                    /**
                     * delayed array reading variables
                     */
                    "var arrayReadQueued = false;",
                    "var delayedArrays = [];",
                    
                    /**
                     * queue a delayed array read
                     */
                    "function delayArrayRead(data, pointer, readFunction, struct, propertyName, tableName, tablePropertyName) {\n"+
                    "  if(debug) window.console.log('delaying an array read for struct.'+propertyName+', based on '+tableName+'.'+tablePropertyName);\n"+
                    "  delayedArrays.push({data:data, pointer:pointer, readFunction:readFunction, struct:struct, propertyName:propertyName, tableName:tableName, tablePropertyName:tablePropertyName});\n"+
                    "  if(!arrayReadQueued) { arrayReadQueued = true; setTimeout(processArrayRead,250); }\n"+
                    "}",

                    /**
                     * process the list of delayed arrays
                     */
                    "function processArrayRead() {\n"+
                    "  if(debug) window.console.log('trying to process all entries in the array queue');\n"+
                    "  var i, last, e, tbl;\n"+
                    "  for(i=0, last=delayedArrays.length; i<last; i++) {\n"+
                    "    e = delayedArrays[i];\n"+
                    "    tbl = getInstance(e.tableName);\n"+
                    "    if(tbl && tbl[e.tablePropertyName]) {\n"+
                    "      var ptr = e.data.pointer;\n"+
                    "      e.data.pointer = e.pointer;\n"+
                    "      (function(data, arr, readFunction, readcount) {\n"+
                    "        while(readcount-->0) {\n"+
                    "          arr.push(readFunction(data));\n"+
                    "        }\n"+
                    "      }(e.data, e.struct[e.propertyName], e.readFunction, tbl[e.tablePropertyName]));\n"+
                    "      e.data.pointer = ptr;\n"+
                    "      delayedArrays.splice(i, 1); i--; last--; \n"+
                    "    } else {\n"+
                    "      delayArrayRead(e.data, e.pointer, e.readFunction, e.struct, e.propertyName, e.tableName, e.tablePropertyName);\n"+
                    "    }\n"+
                    "  }\n"+
                    "  if(delayedArrays.length===0) { arrayReadQueued = false; }\n"+
                    "  else { setTimeout(processArrayRead,250); }\n"+
                    "}",

                    /**
                     * delayed array reading for arrays that use arithmetic in their count field
                     */
                    "var arithmeticArrayReadQueued = false;",
                    "var delayedArithmeticArrays = [];",

                    /**
                     * queue a delayed array read
                     */
                    "function delayArithmeticArrayRead(data, pointer, readFunction, struct, propertyName, tableNames, tablePropertyNames, operator) {\n"+
                    "  if(debug) window.console.log('delaying an array read for struct.'+propertyName+', based on ['+tableNames.join(',')+'].['+tablePropertyNames.join(',')+'] using ['+operator+']');\n"+
                    "  delayedArithmeticArrays.push({data:data, pointer:pointer, readFunction:readFunction, struct:struct, propertyName:propertyName, tableNames:tableNames, tablePropertyNames:tablePropertyNames, operator:operator});\n"+
                    "  if(!arithmeticArrayReadQueued) { arithmeticArrayReadQueued = true; setTimeout(processArithmeticArrayRead,250); }\n"+
                    "}",
                    
                    /**
                     * determine the array count for an array that uses arithmetic in their count field
                     */
                    "function getArrayCount(tableNames, tablePropertyNames, operator) {\n"+
                    "  var i, len = tableNames.length, tbl, prop, values = []\n"+
                    "  for(i=0; i<len; i++) {\n"+
                    "    tbl = getInstance(tableNames[i]);\n"+
                    "    prop = tablePropertyNames[i];\n"+
                    "    if(tbl && tbl[prop]) {\n"+
                    "      values.push(tbl[prop]);"+
                    "    } else { return false; }\n"+
                    "    var f = new Function('return '+values.join(operator)+';')\n"+
                    "    return f();\n"+
                    "  }\n"+
                    "}",

                    /**
                     * process the list of delayed arrays
                     */
                    "function processArithmeticArrayRead() {\n"+
                    "  if(debug) window.console.log('trying to process all entries in the arithmetic array queue');\n"+
                    "  var i, last, e, count;\n"+
                    "  for(i=0, last=delayedArithmeticArrays.length; i<last; i++) {\n"+
                    "    e = delayedArithmeticArrays[i];\n"+
                    "    count = getArrayCount(e.tableNames, e.tablePropertyNames, e.operator);\n"+
                    "    if(count !== false) {\n"+
                    "      var ptr = e.data.pointer;\n"+
                    "      e.data.pointer = e.pointer;\n"+
                    "      (function(data, arr, readFunction, readcount) {\n"+
                    "        while(readcount-->0) {\n"+
                    "          arr.push(readFunction(data));\n"+
                    "        }\n"+
                    "      }(e.data, e.struct[e.propertyName], e.readFunction, count));\n"+
                    "      e.data.pointer = ptr;\n"+
                    "      delayedArithmeticArrays.splice(i, 1); i--; last--; \n"+
                    "    } else {\n"+
                    "      delayArithmeticArrayRead(e.data, e.pointer, e.readFunction, e.struct, e.propertyName, e.tableNames, e.tablePropertyNames, e.operator);\n"+
                    "    }\n"+
                    "  }\n"+
                    "  if(delayedArithmeticArrays.length===0) { arithmeticArrayReadQueued = false; }\n"+
                    "  else { setTimeout(processArithmeticArrayRead,250); }\n"+
                    "}",

                    ""];

  // The result is the predefined code + the converted specification parsing code
  return predefined.join("\n\n") + specfilecontent;
}