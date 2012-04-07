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
  search = "\\(([^=]+[=!]=[^\\)]+)\\)";
  replace = "(struct.$1)";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Skip over any reserved records (i.e. read-and-forget)
  search = "([ \\t]*)RESERVED\\s*(\\w+)";
  replace = "$1read$2(data)";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Deal with offsets to specific structs
  search = "([ \\t]*)(GLOBAL|LOCAL|IMMEDIATE) ([\\w_]+) OFFSET (\\w+)\\s*TO ([^\\s]+)";
  replace = "$1struct.$4 = read$3(data);\n"+
            "$1struct.$4Data = readStructure(data, $5, \"$2\", struct, struct.$4);\n";
  specfilecontent = regExpReplace(specfilecontent, search, replace);  

//USHORT OFFSET offset RELATIVE TO name.stringOffset

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


  // Convert arrays that have a size "REMAINDER" to the correct size
  search = "REMAINDER";
  // FIXME: this should NOT be zero =)
  replace = "0";
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
  search = "([ \\t]*)([\\w_]+)\\[(\\w+)\\]\\s*(\\w+)";
  replace = "$1struct.$4 = [];\n"+
            "$1(function(data, arr, readcount) {\n"+
            "$1  while(readcount-->0) {\n"+
            "$1    arr.push(read$2(data));\n"+
            "$1  }\n"+
            "$1}(data, struct.$4, struct.$3));";
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


  // Convert special functions. Right now, that's only the VALUE(<name>) function
  search = "VALUE\\((\\w+)\\)";
  replace = "struct.$1";
  specfilecontent = regExpReplace(specfilecontent, search, replace);


  // Run a final correction for the readStructure(...) code, so that
  // private collections are correctly resolved.
  search = "= readStructure\\(data, (_\\w+),";
  replace = "= readStructure(data, read$1,";
  specfilecontent = regExpReplace(specfilecontent, search, replace);

  /**

    And then the various predefined functions, like readers and administrative functions.

  **/

  var predefined = ["function readBYTE(data) {\n"+
                    "  if(debug) window.console.log('reading BYTE at '+data.pointer+'.');\n"+
                    "  var val = data.data.getInt8(data.pointer++);\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    "function readASCII(data) {\n"+
                    "  if(debug) window.console.log('reading ASCII character at '+data.pointer+'.');\n"+
                    "  var val = String.fromCharCode(readBYTE(data));\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    "function readUSHORT(data) {\n"+
                    "  if(debug) window.console.log('reading USHORT at '+data.pointer+'.');\n"+
                    "  var val  = data.data.getUint16(data.pointer);\n"+
                    "  data.pointer += 2;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    "function readSHORT(data) {\n"+
                    "  if(debug) window.console.log('reading SHORT at '+data.pointer+'.');\n"+
                    "  var val  = data.data.getInt16(data.pointer);\n"+
                    "  data.pointer += 2;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    "function readUINT24(data) {\n"+
                    "  if(debug) window.console.log('reading UINT24 at '+data.pointer+'.');\n"+
                    "  var val  = data.data.getUint16(data.pointer) * 256 + data.data.getUint8(data.pointer+2);\n"+
                    "  data.pointer += 3;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    "function readULONG(data) {\n"+
                    "  if(debug) window.console.log('reading ULONG at '+data.pointer+'.');\n"+
                    "  var val  = data.data.getUint32(data.pointer);\n"+
                    "  data.pointer += 4;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

                    "function readLONG(data) {\n"+
                    "  if(debug) window.console.log('reading LONG at '+data.pointer+'.');\n"+
                    "  var val  = data.data.getInt32(data.pointer);\n"+
                    "  data.pointer += 4;\n"+
                    "  if(debug) window.console.log('value: '+val+'.');\n"+
                    "  return val;\n"+
                    "}",

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
                    "    f = new Function('data', 'return read'+type.replace(/\\W/,'_')+'(data)');\n"+
                    "  }\n"+
                    "  var structure = f(data);\n"+
                    "  data.pointer = curptr;\n"+
                    "  return structure;\n"+
                    "}",
                    
                    "var instances = {};",

                    "function bindInstance(name, instance) {\n"+
                    "  if(debug) window.console.log('binding an instance of '+name+'.');\n"+
                    "  instances[name] = instance;\n"+
                    "}",

                    "function getInstance(name) {\n"+
                    "  if(debug) window.console.log('getting the instance for '+name+'.');\n"+
                    "  return instances[name];\n"+
                    "}",
                    
                    "function delayArrayRead(data, pointer, readFunction, struct, propertyName, tableName, tablePropertyName) {\n"+
                    "  if(debug) window.console.log('delaying an array read for struct.'+propertyName+', based on '+tableName+'.'+tablePropertyName);\n"+
                    "}",

                    "function delayArithmeticArrayRead(data, pointer, readFunction, struct, propertyName, tableNames, tablePropertyNames, operator) {\n"+
                    "  if(debug) window.console.log('delaying an array read for struct.'+propertyName+', based on ['+tableNames.join(',')+'].['+tablePropertyNames.join(',')+'] using ['+operator+']');\n"+
                    "}",

                    ""];

  // The result is the predefined code + the converted specification parsing code
  return predefined.join("\n") + specfilecontent;
}