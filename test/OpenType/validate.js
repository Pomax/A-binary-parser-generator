function Parser() {
  this.readFunctions = {};
  this.instances = {};
  this.arrayReadQueued = false;
  this.delayedArrays = [];
  this.arithmeticArrayReadQueued = false;
  this.delayedArithmeticArrays = [];
};

Parser.prototype = {
readFunctions: {},

instances: {},

arrayReadQueued: false,

delayedArrays: [],

arithmeticArrayReadQueued: false,

delayedArithmeticArrays: [],

addReadFunction: function (name, reference) {
    this.readFunctions[name] = reference;
  },

getReadFunction: function (name) {
    return this.readFunctions[name];
  },

readArray: function (parser, data, array, type, readcount) {
    var readFunction = parser.getReadFunction(type);
    while(readcount-->0) {
      array.push(readFunction(data));
    }
  },

readBYTE: function (data) {
    if(debug) window.console.log('reading BYTE at '+data.pointer+'.');
    var val = data.bytecode.getUint8(data.pointer++);
    if(debug) window.console.log('value = '+val+'.');
    return val;
  },

readASCII: function (data, parser) {
    if(debug) window.console.log('reading ASCII character at '+data.pointer+'.');
    var val = String.fromCharCode(data.bytecode.getUint8(data.pointer++));
    if(debug) window.console.log('value = '+val+'.');
    return val;
  },

readUSHORT: function (data) {
    if(debug) window.console.log('reading USHORT at '+data.pointer+'.');
    var val = data.bytecode.getUint16(data.pointer);
    data.pointer += 2;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  },

readSHORT: function (data) {
    if(debug) window.console.log('reading SHORT at '+data.pointer+'.');
    var val = data.bytecode.getInt16(data.pointer);
    data.pointer += 2;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  },

readUINT24: function (data) {
    if(debug) window.console.log('reading UINT24 at '+data.pointer+'.');
    var val = data.bytecode.getUint16(data.pointer) * 256 + data.bytecode.getUint8(data.pointer+2);
    data.pointer += 3;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  },

readULONG: function (data) {
    if(debug) window.console.log('reading ULONG at '+data.pointer+'.');
    var val = data.bytecode.getUint32(data.pointer);
    data.pointer += 4;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  },

readLONG: function (data) {
    if(debug) window.console.log('reading LONG at '+data.pointer+'.');
    var val = data.bytecode.getInt32(data.pointer);
    data.pointer += 4;
    if(debug) window.console.log('value = '+val+'.');
    return val;
  },

readStructure: function (data, type, locality, struct, offset) {
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
  },

bindInstance: function (name, instance) {
    if(debug) window.console.log('binding an instance of '+name+'.');
    this.instances[name] = instance;
  },

getInstance: function (name) {
    if(debug) window.console.log('getting the instance for '+name+'.');
    return this.instances[name];
  },

delayArrayRead: function (parser, data, pointer, readFunction, struct, propertyName, tableName, tablePropertyName) {
    if(debug) window.console.log('delaying an array read for struct.'+propertyName+', based on '+tableName+'.'+tablePropertyName);
    parser.delayedArrays.push({parser:parser, data:data, pointer:pointer, readFunction:readFunction, struct:struct, propertyName:propertyName, tableName:tableName, tablePropertyName:tablePropertyName});
    if(!parser.arrayReadQueued) {
      parser.arrayReadQueued = true;
      setTimeout(function() { parser.processArrayRead(); },250);
    }
  },

processArrayRead: function () {
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
  },

delayArithmeticArrayRead: function (parser, data, pointer, readFunction, struct, propertyName, tableNames, tablePropertyNames, operator) {
    if(debug) window.console.log('delaying an array read for struct.'+propertyName+', based on ['+tableNames.join(',')+'].['+tablePropertyNames.join(',')+'] using ['+operator+']');
    parser.delayedArithmeticArrays.push({parser:parser, data:data, pointer:pointer, readFunction:readFunction, struct:struct, propertyName:propertyName, tableNames:tableNames, tablePropertyNames:tablePropertyNames, operator:operator});
    if(!parser.arithmeticArrayReadQueued) {
      parser.arithmeticArrayReadQueued = true;
      setTimeout(function() { parser.processArithmeticArrayRead(); }, 250);
    }
  },

getArrayCount: function (tableNames, tablePropertyNames, operator) {
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
  },

processArithmeticArrayRead: function () {
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
  },



parse: function(data) {
  parser = this;

  parser.addReadFunction('BYTE',  parser.readBYTE);
  parser.addReadFunction('ASCII', parser.readASCII);
  parser.addReadFunction('USHORT',parser.readUSHORT);
  parser.addReadFunction('SHORT', parser.readSHORT);
  parser.addReadFunction('UINT24',parser.readUINT24);
  parser.addReadFunction('ULONG', parser.readULONG);
  parser.addReadFunction('LONG',  parser.readLONG);

var readSFNT = function(data) {
  var struct = {};
  parser.bindInstance("SFNT", struct);
  struct.__pointer = data.pointer;
  var read_tableRecord = function(data) {
    var struct = {};
    parser.bindInstance("_tableRecord", struct);
    struct.__pointer = data.pointer;
    struct.tag = "";
    (function(data, readcount) {
      while(readcount-->0) {
        struct.tag += parser.readASCII(data);
      }
    }(data, 4));
    struct.checkSum = parser.readULONG(data);
    struct.offset = parser.getReadFunction("ULONG")(data);
    data.marks.push(data.pointer);
    struct.offsetData = parser.readStructure(data, (typeof struct.tag === 'undefined' ? parser.getReadFunction("struct.tag") : struct.tag), "GLOBAL", struct, struct.offset);
    data.pointer = data.marks.pop();
    struct.length = parser.readULONG(data);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_tableRecord",read_tableRecord);
  struct.version = parser.readLONG(data);
  struct.numTables = parser.readUSHORT(data);
  struct.searchRange = parser.readUSHORT(data);
  struct.entrySelector = parser.readUSHORT(data);
  struct.rangeShift = parser.readUSHORT(data);
  struct.tableRecords = [];
  parser.readArray(parser, data, struct.tableRecords, "_tableRecord", struct.numTables);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("SFNT",readSFNT);
var readcmap = function(data) {
  var struct = {};
  parser.bindInstance("cmap", struct);
  struct.__pointer = data.pointer;
  var read_subtable = function(data) {
    var struct = {};
    parser.bindInstance("_subtable", struct);
    struct.__pointer = data.pointer;
    struct.format = parser.readUSHORT(data);
    if(struct.format==0) {
      struct.length = parser.readUSHORT(data);
      struct.language = parser.readUSHORT(data);
      struct.glyphIdArray = [];
      parser.readArray(parser, data, struct.glyphIdArray, "BYTE", 256);
    }
    if(struct.format==2) {
      var read_subHeaders = function(data) {
        var struct = {};
        parser.bindInstance("_subHeaders", struct);
        struct.__pointer = data.pointer;
        struct.firstCode = parser.readUSHORT(data);
        struct.entryCount = parser.readUSHORT(data);
        struct.idDelta = parser.readSHORT(data);
        struct.idRangeOffset = parser.readUSHORT(data);
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_subHeaders",read_subHeaders);
      struct.length = parser.readUSHORT(data);
      struct.language = parser.readUSHORT(data);
      struct.subHeaderKeys = [];
      parser.readArray(parser, data, struct.subHeaderKeys, "USHORT", 256);
      struct.subHeaders = [];
      parser.readArray(parser, data, struct.subHeaders, "_subHeaders", 0);
      struct.glyphIndexArray = [];
      parser.readArray(parser, data, struct.glyphIndexArray, "USHORT", 0);
    }
    if(struct.format==4) {
      struct.length = parser.readUSHORT(data);
      struct.language = parser.readUSHORT(data);
      struct.segCountX2 = parser.readUSHORT(data);
      struct.searchRange = parser.readUSHORT(data);
      struct.entrySelector = parser.readUSHORT(data);
      struct.rangeShift = parser.readUSHORT(data);
      struct.endCount = [];
      parser.readArray(parser, data, struct.endCount, "USHORT", struct.segCountX2 / 2);
      parser.readUSHORT(data)
      struct.startCount = [];
      parser.readArray(parser, data, struct.startCount, "USHORT", struct.segCount);
      struct.idDelta = [];
      parser.readArray(parser, data, struct.idDelta, "SHORT", struct.segCount);
      struct.idRangeOffset = [];
      parser.readArray(parser, data, struct.idRangeOffset, "USHORT", struct.segCount);
      struct.glyphIdArray = [];
      parser.readArray(parser, data, struct.glyphIdArray, "USHORT", (struct.length - (data.pointer - struct.__pointer))/2);
    }
    if(struct.format==6) {
      struct.length = parser.readUSHORT(data);
      struct.language = parser.readUSHORT(data);
      struct.firstCode = parser.readUSHORT(data);
      struct.entryCount = parser.readUSHORT(data);
      struct.glyphIdArray = [];
      parser.readArray(parser, data, struct.glyphIdArray, "USHORT", struct.entryCount);
    }
    if(struct.format==8) {
      var read_group = function(data) {
        var struct = {};
        parser.bindInstance("_group", struct);
        struct.__pointer = data.pointer;
        struct.startCharCode = parser.readULONG(data);
        struct.endCharCode = parser.readULONG(data);
        struct.startGlyphID = parser.readULONG(data);
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_group",read_group);
      parser.readUSHORT(data)
      struct.length = parser.readULONG(data);
      struct.language = parser.readULONG(data);
      struct.is32 = [];
      parser.readArray(parser, data, struct.is32, "BYTE", 8192);
      struct.nGroups = parser.readULONG(data);
      struct.groups = [];
      parser.readArray(parser, data, struct.groups, "_group", struct.nGroups);
    }
    if(struct.format==10) {
      parser.readUSHORT(data)
      struct.length = parser.readULONG(data);
      struct.language = parser.readULONG(data);
      struct.startCharCode = parser.readULONG(data);
      struct.numChars = parser.readULONG(data);
      struct.glyphs = [];
      parser.readArray(parser, data, struct.glyphs, "USHORT", struct.numChars);
    }
    if(struct.format==12) {
      var read_group = function(data) {
        var struct = {};
        parser.bindInstance("_group", struct);
        struct.__pointer = data.pointer;
        struct.startCharCode = parser.readULONG(data);
        struct.endCharCode = parser.readULONG(data);
        struct.startGlyphID = parser.readULONG(data);
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_group",read_group);
      parser.readUSHORT(data)
      struct.length = parser.readULONG(data);
      struct.language = parser.readULONG(data);
      struct.nGroups = parser.readULONG(data);
      struct.groups = [];
      parser.readArray(parser, data, struct.groups, "_group", struct.nGroups);
    }
    if(struct.format==13) {
      var read_group = function(data) {
        var struct = {};
        parser.bindInstance("_group", struct);
        struct.__pointer = data.pointer;
        struct.startCharCode = parser.readULONG(data);
        struct.endCharCode = parser.readULONG(data);
        struct.startGlyphID = parser.readULONG(data);
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_group",read_group);
      parser.readUSHORT(data)
      struct.length = parser.readULONG(data);
      struct.language = parser.readULONG(data);
      struct.nGroups = parser.readULONG(data);
      struct.groups = [];
      parser.readArray(parser, data, struct.groups, "_group", struct.nGroups);
    }
    if(struct.format==14) {
      var read_unicodeValueRanges = function(data) {
        var struct = {};
        parser.bindInstance("_unicodeValueRanges", struct);
        struct.__pointer = data.pointer;
        struct.startUnicodeValue = parser.readUINT24(data);
        struct.additionalCount = parser.readBYTE(data);
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_unicodeValueRanges",read_unicodeValueRanges);
      var read_defaultUVSTable = function(data) {
        var struct = {};
        parser.bindInstance("_defaultUVSTable", struct);
        struct.__pointer = data.pointer;
        struct.numUnicodeValueRanges = parser.readULONG(data);
        struct.unicodeValueRanges = [];
        parser.readArray(parser, data, struct.unicodeValueRanges, "_unicodeValueRanges", struct.numUnicodeValueRanges);
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_defaultUVSTable",read_defaultUVSTable);
      var read_UVSMapping = function(data) {
        var struct = {};
        parser.bindInstance("_UVSMapping", struct);
        struct.__pointer = data.pointer;
        struct.unicodeValue = parser.readUINT24(data);
        struct.glyphID = parser.readUSHORT(data);
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_UVSMapping",read_UVSMapping);
      var read_nonDefaultUVSTable = function(data) {
        var struct = {};
        parser.bindInstance("_nonDefaultUVSTable", struct);
        struct.__pointer = data.pointer;
        struct.numUVSMappings = parser.readULONG(data);
        struct.UVSMappings = [];
        parser.readArray(parser, data, struct.UVSMappings, "_UVSMapping", struct.numUVSMappings);
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_nonDefaultUVSTable",read_nonDefaultUVSTable);
      var read_varSelectorRecord = function(data) {
        var struct = {};
        parser.bindInstance("_varSelectorRecord", struct);
        struct.__pointer = data.pointer;
        struct.varSelector = parser.readUINT24(data);
        struct.defaultUVSOffset = parser.getReadFunction("ULONG")(data);
        data.marks.push(data.pointer);
        struct.defaultUVSOffsetData = parser.readStructure(data, (typeof _defaultUVSTable === 'undefined' ? parser.getReadFunction("_defaultUVSTable") : _defaultUVSTable), "IMMEDIATE", struct, struct.defaultUVSOffset);
        data.pointer = data.marks.pop();
        struct.nonDefaultUVSOffset = parser.getReadFunction("ULONG")(data);
        data.marks.push(data.pointer);
        struct.nonDefaultUVSOffsetData = parser.readStructure(data, (typeof _nonDefaultUVSTable === 'undefined' ? parser.getReadFunction("_nonDefaultUVSTable") : _nonDefaultUVSTable), "IMMEDIATE", struct, struct.nonDefaultUVSOffset);
        data.pointer = data.marks.pop();
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_varSelectorRecord",read_varSelectorRecord);
      struct.length = parser.readULONG(data);
      struct.numVarSelectorRecords = parser.readULONG(data);
      struct.varSelectorRecords = [];
      parser.readArray(parser, data, struct.varSelectorRecords, "_varSelectorRecord", struct.numVarSelectorRecords);
    }
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_subtable",read_subtable);
  var read_encodingRecord = function(data) {
    var struct = {};
    parser.bindInstance("_encodingRecord", struct);
    struct.__pointer = data.pointer;
    struct.platformID = parser.readUSHORT(data);
    struct.encodingID = parser.readUSHORT(data);
    struct.offset = parser.getReadFunction("ULONG")(data);
    data.marks.push(data.pointer);
    struct.offsetData = parser.readStructure(data, (typeof _subtable === 'undefined' ? parser.getReadFunction("_subtable") : _subtable), "LOCAL", struct, struct.offset);
    data.pointer = data.marks.pop();
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_encodingRecord",read_encodingRecord);
  struct.version = parser.readUSHORT(data);
  struct.numTables = parser.readUSHORT(data);
  struct.encodingRecords = [];
  parser.readArray(parser, data, struct.encodingRecords, "_encodingRecord", struct.numTables);
  struct.subtables = [];
  parser.readArray(parser, data, struct.subtables, "_subtable", struct.numTables);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("cmap",readcmap);
var readhead = function(data) {
  var struct = {};
  parser.bindInstance("head", struct);
  struct.__pointer = data.pointer;
  struct.version = parser.readLONG(data);
  struct.fontRevision = parser.readLONG(data);
  struct.checkSumAdjustment = parser.readULONG(data);
  struct.magicNumber = parser.readULONG(data);
  if(struct.magicNumber!=0x5F0F3CF5) {
    throw "ERROR: magic number mismatch - this is not an OpenType font file, or at least not a legal one."
  }
  struct.flags = parser.readUSHORT(data);
  struct.unitsPerEm = parser.readUSHORT(data);
  struct.created = parser.readLONG(data);
  struct.modified = parser.readLONG(data);
  struct.xMin = parser.readSHORT(data);
  struct.yMin = parser.readSHORT(data);
  struct.xMax = parser.readSHORT(data);
  struct.yMax = parser.readSHORT(data);
  struct.macStyle = parser.readUSHORT(data);
  struct.lowestRecPPEM = parser.readUSHORT(data);
  struct.fontDirectionHint = parser.readSHORT(data);
  if(struct.fontDirectionHint!=2) {
    if(window.console) {
      window.console.log("WARNING: fontDirectionHint has the wrong value: this record has been deprecated and should be set to 2");
    }
  }
  struct.indexToLocFormat = parser.readSHORT(data);
  struct.glyphDataFormat = parser.readSHORT(data);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("head",readhead);
var readhhea = function(data) {
  var struct = {};
  parser.bindInstance("hhea", struct);
  struct.__pointer = data.pointer;
  struct.version = parser.readLONG(data);
  struct.Ascender = parser.readSHORT(data);
  struct.Descender = parser.readSHORT(data);
  struct.LineGap = parser.readSHORT(data);
  struct.advanceWidthMax = parser.readUSHORT(data);
  struct.minLeftSideBearing = parser.readSHORT(data);
  struct.minRightSideBearing = parser.readSHORT(data);
  struct.xMaxExtent = parser.readSHORT(data);
  struct.caretSlopeRise = parser.readSHORT(data);
  struct.caretSlopeRun = parser.readSHORT(data);
  struct.caretOffset = parser.readSHORT(data);
  parser.readSHORT(data)
  parser.readSHORT(data)
  parser.readSHORT(data)
  parser.readSHORT(data)
  struct.metricDataFormat = parser.readSHORT(data);
  struct.numberOfHMetrics = parser.readUSHORT(data);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("hhea",readhhea);
var readhmtx = function(data) {
  var struct = {};
  parser.bindInstance("hmtx", struct);
  struct.__pointer = data.pointer;
  var read_longHorMetric = function(data) {
    var struct = {};
    parser.bindInstance("_longHorMetric", struct);
    struct.__pointer = data.pointer;
    struct.advanceWidth = parser.readUSHORT(data);;
    struct.lsb = parser.readSHORT(data);;
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_longHorMetric",read_longHorMetric);
  struct.hMetrics = [];
  if(parser.getInstance("hhea")){
    parser.readArray(parser, data, struct.hMetrics, "_longHorMetric", parser.getInstance("hhea").numberOfHMetrics);
  } else {
    parser.delayArrayRead(parser, data, data.pointer, parser.getReadFunction("_longHorMetric"), struct, "hMetrics", "hhea", "numberOfHMetrics")
  }
  struct.leftSideBearing = [];
  if(parser.getInstance("maxp") && parser.getInstance("hhea")){
    parser.readArray(parser, data, struct.leftSideBearing, "SHORT", parser.getInstance("maxp").numGlyphs - parser.getInstance("hhea").numberOfHMetrics);
  } else {
    parser.delayArithmeticArrayRead(parser, data, data.pointer, parser.getReadFunction("SHORT"), struct, "leftSideBearing", ["maxp", "hhea"], [".numGlyphs",".numberOfHMetrics"], "-")
  }
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("hmtx",readhmtx);
var readmaxp = function(data) {
  var struct = {};
  parser.bindInstance("maxp", struct);
  struct.__pointer = data.pointer;
  struct.version = parser.readLONG(data);
  if(struct.version==0x00005000) {
    struct.numGlyphs = parser.readUSHORT(data);
  }
  if(struct.version==0x00010000) {
    struct.numGlyphs = parser.readUSHORT(data);
    struct.maxPoints = parser.readUSHORT(data);
    struct.maxContours = parser.readUSHORT(data);
    struct.maxCompositePoints = parser.readUSHORT(data);
    struct.maxCompositeContours = parser.readUSHORT(data);
    struct.maxZones = parser.readUSHORT(data);
    struct.maxTwilightPoints = parser.readUSHORT(data);
    struct.maxStorage = parser.readUSHORT(data);
    struct.maxFunctionDefs = parser.readUSHORT(data);
    struct.maxInstructionDefs = parser.readUSHORT(data);
    struct.maxStackElements = parser.readUSHORT(data);
    struct.maxSizeOfInstructions = parser.readUSHORT(data);
    struct.maxComponentElements = parser.readUSHORT(data);
    struct.maxComponentDepth = parser.readUSHORT(data);
  }
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("maxp",readmaxp);
var readname = function(data) {
  var struct = {};
  parser.bindInstance("name", struct);
  struct.__pointer = data.pointer;
  var read_nameRecord = function(data) {
    var struct = {};
    parser.bindInstance("_nameRecord", struct);
    struct.__pointer = data.pointer;
    struct.platformID = parser.readUSHORT(data);
    struct.encodingID = parser.readUSHORT(data);
    struct.languageID = parser.readUSHORT(data);
    struct.nameID = parser.readUSHORT(data);
    struct.length = parser.readUSHORT(data);
    struct.offset = parser.readUSHORT(data);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_nameRecord",read_nameRecord);
  var read_langTagRecord = function(data) {
    var struct = {};
    parser.bindInstance("_langTagRecord", struct);
    struct.__pointer = data.pointer;
    struct.length = parser.readUSHORT(data);
    struct.offset = parser.getReadFunction("USHORT")(data); // offset relative to name.stringOffset
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_langTagRecord",read_langTagRecord);
  struct.format = parser.readUSHORT(data);
  if(struct.format==0) {
    struct.count = parser.readUSHORT(data);
    struct.stringOffset = parser.readUSHORT(data);
    struct.nameRecords = [];
    parser.readArray(parser, data, struct.nameRecords, "_nameRecord", struct.count);
  }
  if(struct.format==1) {
    struct.count = parser.readUSHORT(data);
    struct.stringOffset = parser.readUSHORT(data);
    struct.nameRecord = [];
    parser.readArray(parser, data, struct.nameRecord, "_nameRecord", struct.count);
    struct.langTagCount = parser.readUSHORT(data);
    struct.langTagRecords = [];
    parser.readArray(parser, data, struct.langTagRecords, "_langTagRecord", struct.langTagCount);
  }
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("name",readname);
var readOS_2 = function(data) {
  var struct = {};
  parser.bindInstance("OS_2", struct);
  struct.__pointer = data.pointer;
  struct.version = parser.readUSHORT(data);
  if(struct.version==0x0000) {
    struct.xAvgCharWidth = parser.readSHORT(data);
    struct.usWeightClass = parser.readUSHORT(data);
    struct.usWidthClass = parser.readUSHORT(data);
    struct.fsType = parser.readUSHORT(data);
    struct.ySubscriptXSize = parser.readSHORT(data);
    struct.ySubscriptYSize = parser.readSHORT(data);
    struct.ySubscriptXOffset = parser.readSHORT(data);
    struct.ySubscriptYOffset = parser.readSHORT(data);
    struct.ySuperscriptXSize = parser.readSHORT(data);
    struct.ySuperscriptYSize = parser.readSHORT(data);
    struct.ySuperscriptXOffset = parser.readSHORT(data);
    struct.ySuperscriptYOffset = parser.readSHORT(data);
    struct.yStrikeoutSize = parser.readSHORT(data);
    struct.yStrikeoutPosition = parser.readSHORT(data);
    struct.sFamilyClass = parser.readSHORT(data);
    struct.panose = [];
    parser.readArray(parser, data, struct.panose, "BYTE", 10);
    struct.ulCharRange = [];
    parser.readArray(parser, data, struct.ulCharRange, "ULONG", 4);
    struct.achVendID = "";
    (function(data, readcount) {
      while(readcount-->0) {
        struct.achVendID += parser.readASCII(data);
      }
    }(data, 4));
    struct.fsSelection = parser.readUSHORT(data);
    struct.usFirstCharIndex = parser.readUSHORT(data);
    struct.usLastCharIndex = parser.readUSHORT(data);
    struct.sTypoAscender = parser.readSHORT(data);
    struct.sTypoDescender = parser.readSHORT(data);
    struct.sTypoLineGap = parser.readSHORT(data);
    struct.usWinAscent = parser.readUSHORT(data);
    struct.usWinDescent = parser.readUSHORT(data);
  }
  if(struct.version==0x0001) {
    struct.xAvgCharWidth = parser.readSHORT(data);
    struct.usWeightClass = parser.readUSHORT(data);
    struct.usWidthClass = parser.readUSHORT(data);
    struct.fsType = parser.readUSHORT(data);
    struct.ySubscriptXSize = parser.readSHORT(data);
    struct.ySubscriptYSize = parser.readSHORT(data);
    struct.ySubscriptXOffset = parser.readSHORT(data);
    struct.ySubscriptYOffset = parser.readSHORT(data);
    struct.ySuperscriptXSize = parser.readSHORT(data);
    struct.ySuperscriptYSize = parser.readSHORT(data);
    struct.ySuperscriptXOffset = parser.readSHORT(data);
    struct.ySuperscriptYOffset = parser.readSHORT(data);
    struct.yStrikeoutSize = parser.readSHORT(data);
    struct.yStrikeoutPosition = parser.readSHORT(data);
    struct.sFamilyClass = parser.readSHORT(data);
    struct.panose = [];
    parser.readArray(parser, data, struct.panose, "BYTE", 10);
    struct.ulUnicodeRange1 = parser.readULONG(data);
    struct.ulUnicodeRange2 = parser.readULONG(data);
    struct.ulUnicodeRange3 = parser.readULONG(data);
    struct.ulUnicodeRange4 = parser.readULONG(data);
    struct.achVendID = "";
    (function(data, readcount) {
      while(readcount-->0) {
        struct.achVendID += parser.readASCII(data);
      }
    }(data, 4));
    struct.fsSelection = parser.readUSHORT(data);
    struct.usFirstCharIndex = parser.readUSHORT(data);
    struct.usLastCharIndex = parser.readUSHORT(data);
    struct.sTypoAscender = parser.readSHORT(data);
    struct.sTypoDescender = parser.readSHORT(data);
    struct.sTypoLineGap = parser.readSHORT(data);
    struct.usWinAscent = parser.readUSHORT(data);
    struct.usWinDescent = parser.readUSHORT(data);
    struct.ulCodePageRange1 = parser.readULONG(data);
    struct.ulCodePageRange2 = parser.readULONG(data);
  }
  if(struct.version==0x0002) {
    struct.xAvgCharWidth = parser.readSHORT(data);
    struct.usWeightClass = parser.readUSHORT(data);
    struct.usWidthClass = parser.readUSHORT(data);
    struct.fsType = parser.readUSHORT(data);
    struct.ySubscriptXSize = parser.readSHORT(data);
    struct.ySubscriptYSize = parser.readSHORT(data);
    struct.ySubscriptXOffset = parser.readSHORT(data);
    struct.ySubscriptYOffset = parser.readSHORT(data);
    struct.ySuperscriptXSize = parser.readSHORT(data);
    struct.ySuperscriptYSize = parser.readSHORT(data);
    struct.ySuperscriptXOffset = parser.readSHORT(data);
    struct.ySuperscriptYOffset = parser.readSHORT(data);
    struct.yStrikeoutSize = parser.readSHORT(data);
    struct.yStrikeoutPosition = parser.readSHORT(data);
    struct.sFamilyClass = parser.readSHORT(data);
    struct.panose = [];
    parser.readArray(parser, data, struct.panose, "BYTE", 10);
    struct.ulUnicodeRange1 = parser.readULONG(data);
    struct.ulUnicodeRange2 = parser.readULONG(data);
    struct.ulUnicodeRange3 = parser.readULONG(data);
    struct.ulUnicodeRange4 = parser.readULONG(data);
    struct.achVendID = "";
    (function(data, readcount) {
      while(readcount-->0) {
        struct.achVendID += parser.readASCII(data);
      }
    }(data, 4));
    struct.fsSelection = parser.readUSHORT(data);
    struct.usFirstCharIndex = parser.readUSHORT(data);
    struct.usLastCharIndex = parser.readUSHORT(data);
    struct.sTypoAscender = parser.readSHORT(data);
    struct.sTypoDescender = parser.readSHORT(data);
    struct.sTypoLineGap = parser.readSHORT(data);
    struct.usWinAscent = parser.readUSHORT(data);
    struct.usWinDescent = parser.readUSHORT(data);
    struct.ulCodePageRange1 = parser.readULONG(data);
    struct.ulCodePageRange2 = parser.readULONG(data);
    struct.sxHeight = parser.readSHORT(data);
    struct.sCapHeight = parser.readSHORT(data);
    struct.usDefaultChar = parser.readUSHORT(data);
    struct.usBreakChar = parser.readUSHORT(data);
    struct.usMaxContext = parser.readUSHORT(data);
  }
  if(struct.version==0x0003) {
    struct.xAvgCharWidth = parser.readSHORT(data);
    struct.usWeightClass = parser.readUSHORT(data);
    struct.usWidthClass = parser.readUSHORT(data);
    struct.fsType = parser.readUSHORT(data);
    struct.ySubscriptXSize = parser.readSHORT(data);
    struct.ySubscriptYSize = parser.readSHORT(data);
    struct.ySubscriptXOffset = parser.readSHORT(data);
    struct.ySubscriptYOffset = parser.readSHORT(data);
    struct.ySuperscriptXSize = parser.readSHORT(data);
    struct.ySuperscriptYSize = parser.readSHORT(data);
    struct.ySuperscriptXOffset = parser.readSHORT(data);
    struct.ySuperscriptYOffset = parser.readSHORT(data);
    struct.yStrikeoutSize = parser.readSHORT(data);
    struct.yStrikeoutPosition = parser.readSHORT(data);
    struct.sFamilyClass = parser.readSHORT(data);
    struct.panose = [];
    parser.readArray(parser, data, struct.panose, "BYTE", 10);
    struct.ulUnicodeRange1 = parser.readULONG(data);
    struct.ulUnicodeRange2 = parser.readULONG(data);
    struct.ulUnicodeRange3 = parser.readULONG(data);
    struct.ulUnicodeRange4 = parser.readULONG(data);
    struct.achVendID = "";
    (function(data, readcount) {
      while(readcount-->0) {
        struct.achVendID += parser.readASCII(data);
      }
    }(data, 4));
    struct.fsSelection = parser.readUSHORT(data);
    struct.usFirstCharIndex = parser.readUSHORT(data);
    struct.usLastCharIndex = parser.readUSHORT(data);
    struct.sTypoAscender = parser.readSHORT(data);
    struct.sTypoDescender = parser.readSHORT(data);
    struct.sTypoLineGap = parser.readSHORT(data);
    struct.usWinAscent = parser.readUSHORT(data);
    struct.usWinDescent = parser.readUSHORT(data);
    struct.ulCodePageRange1 = parser.readULONG(data);
    struct.ulCodePageRange2 = parser.readULONG(data);
    struct.sxHeight = parser.readSHORT(data);
    struct.sCapHeight = parser.readSHORT(data);
    struct.usDefaultChar = parser.readUSHORT(data);
    struct.usBreakChar = parser.readUSHORT(data);
    struct.usMaxContext = parser.readUSHORT(data);
  }
  if(struct.version==0x0004) {
    struct.xAvgCharWidth = parser.readSHORT(data);
    struct.usWeightClass = parser.readUSHORT(data);
    struct.usWidthClass = parser.readUSHORT(data);
    struct.fsType = parser.readUSHORT(data);
    struct.ySubscriptXSize = parser.readSHORT(data);
    struct.ySubscriptYSize = parser.readSHORT(data);
    struct.ySubscriptXOffset = parser.readSHORT(data);
    struct.ySubscriptYOffset = parser.readSHORT(data);
    struct.ySuperscriptXSize = parser.readSHORT(data);
    struct.ySuperscriptYSize = parser.readSHORT(data);
    struct.ySuperscriptXOffset = parser.readSHORT(data);
    struct.ySuperscriptYOffset = parser.readSHORT(data);
    struct.yStrikeoutSize = parser.readSHORT(data);
    struct.yStrikeoutPosition = parser.readSHORT(data);
    struct.sFamilyClass = parser.readSHORT(data);
    struct.panose = [];
    parser.readArray(parser, data, struct.panose, "BYTE", 10);
    struct.ulUnicodeRange1 = parser.readULONG(data);
    struct.ulUnicodeRange2 = parser.readULONG(data);
    struct.ulUnicodeRange3 = parser.readULONG(data);
    struct.ulUnicodeRange4 = parser.readULONG(data);
    struct.achVendID = "";
    (function(data, readcount) {
      while(readcount-->0) {
        struct.achVendID += parser.readASCII(data);
      }
    }(data, 4));
    struct.fsSelection = parser.readUSHORT(data);
    struct.usFirstCharIndex = parser.readUSHORT(data);
    struct.usLastCharIndex = parser.readUSHORT(data);
    struct.sTypoAscender = parser.readSHORT(data);
    struct.sTypoDescender = parser.readSHORT(data);
    struct.sTypoLineGap = parser.readSHORT(data);
    struct.usWinAscent = parser.readUSHORT(data);
    struct.usWinDescent = parser.readUSHORT(data);
    struct.ulCodePageRange1 = parser.readULONG(data);
    struct.ulCodePageRange2 = parser.readULONG(data);
    struct.sxHeight = parser.readSHORT(data);
    struct.sCapHeight = parser.readSHORT(data);
    struct.usDefaultChar = parser.readUSHORT(data);
    struct.usBreakChar = parser.readUSHORT(data);
    struct.usMaxContext = parser.readUSHORT(data);
  }
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("OS_2",readOS_2);
var readpost = function(data) {
  var struct = {};
  parser.bindInstance("post", struct);
  struct.__pointer = data.pointer;
  struct.version = parser.readULONG(data);
  struct.italicAngle = parser.readULONG(data);
  struct.underlinePosition = parser.readSHORT(data);
  struct.underlineThickness = parser.readSHORT(data);
  struct.isFixedPitch = parser.readULONG(data);
  struct.minMemType42 = parser.readULONG(data);
  struct.maxMemType42 = parser.readULONG(data);
  struct.minMemType1 = parser.readULONG(data);
  struct.maxMemType1 = parser.readULONG(data);
  if(struct.version==0x00020000) {
    struct.numberOfGlyphs = parser.readUSHORT(data);
    struct.glyphNameIndex = [];
    parser.readArray(parser, data, struct.glyphNameIndex, "USHORT", struct.numberOfGlyphs);
    if(struct.numberOfGlyphs - 258 > 0) {
      struct.names = [];
      parser.readArray(parser, data, struct.names, "ASCII", struct.numberOfGlyphs - 258);
    }
  }
  if(struct.version==0x00025000) {
    struct.numberOfGlyphs = parser.readUSHORT(data);
    struct.offset = "";
    (function(data, readcount) {
      while(readcount-->0) {
        struct.offset += parser.readASCII(data);
      }
    }(data, numberOfGlyphs));
  }
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("post",readpost);
var readcvt_ = function(data) {
  var struct = {};
  parser.bindInstance("cvt_", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("cvt_",readcvt_);
var readfpgm = function(data) {
  var struct = {};
  parser.bindInstance("fpgm", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("fpgm",readfpgm);
var readglyf = function(data) {
  var struct = {};
  parser.bindInstance("glyf", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("glyf",readglyf);
var readloca = function(data) {
  var struct = {};
  parser.bindInstance("loca", struct);
  struct.__pointer = data.pointer;
  if(parser.getInstance("head").indexToLocFormat == 0) {
    struct.offsets = [];
    parser.readArray(parser, data, struct.offsets, "USHORT", maxp.numGlyphs+1);
  }
  if(parser.getInstance("head").indexToLocFormat == 1) {
    struct.offsets = [];
    parser.readArray(parser, data, struct.offsets, "ULONG", maxp.numGlyphs+1);
  }
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("loca",readloca);
var readprep = function(data) {
  var struct = {};
  parser.bindInstance("prep", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("prep",readprep);
var readCFF_ = function(data) {
  var struct = {};
  parser.bindInstance("CFF_", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("CFF_",readCFF_);
var readVORG = function(data) {
  var struct = {};
  parser.bindInstance("VORG", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("VORG",readVORG);
var readBASE = function(data) {
  var struct = {};
  parser.bindInstance("BASE", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("BASE",readBASE);
var readGDEF = function(data) {
  var struct = {};
  parser.bindInstance("GDEF", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("GDEF",readGDEF);
var readGPOS = function(data) {
  var struct = {};
  parser.bindInstance("GPOS", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("GPOS",readGPOS);
var readGSUB = function(data) {
  var struct = {};
  parser.bindInstance("GSUB", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("GSUB",readGSUB);
var readJSTF = function(data) {
  var struct = {};
  parser.bindInstance("JSTF", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("JSTF",readJSTF);
var readDSIG = function(data) {
  var struct = {};
  parser.bindInstance("DSIG", struct);
  struct.__pointer = data.pointer;
  var read_signature = function(data) {
    var struct = {};
    parser.bindInstance("_signature", struct);
    struct.__pointer = data.pointer;
    struct.ulFormat = parser.readULONG(data);
    struct.ulLength = parser.readULONG(data);
    struct.ulOffset = parser.readULONG(data);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_signature",read_signature);
  var read_signatureBlock = function(data) {
    var struct = {};
    parser.bindInstance("_signatureBlock", struct);
    struct.__pointer = data.pointer;
    struct.usReserved1 = parser.readUSHORT(data);
    struct.usReserved2 = parser.readUSHORT(data);
    struct.cbSignature = parser.readULONG(data);
    struct.bSignature = [];
    parser.readArray(parser, data, struct.bSignature, "BYTE", struct.cbSignature);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_signatureBlock",read_signatureBlock);
  struct.ulVersion = parser.readULONG(data);
  struct.usNumSigs = parser.readUSHORT(data);
  struct.usFlag = parser.readUSHORT(data);
  struct.signatures = [];
  parser.readArray(parser, data, struct.signatures, "_signature", struct.usNumSigs);
  struct.signatureBlocks = [];
  parser.readArray(parser, data, struct.signatureBlocks, "_signatureBlock", struct.usNumSigs);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("DSIG",readDSIG);
var readgasp = function(data) {
  var struct = {};
  parser.bindInstance("gasp", struct);
  struct.__pointer = data.pointer;
  var read_gaspRange = function(data) {
    var struct = {};
    parser.bindInstance("_gaspRange", struct);
    struct.__pointer = data.pointer;
    struct.rangeMaxPPEM = parser.readUSHORT(data);
    struct.rangeGaspBehavior = parser.readUSHORT(data);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_gaspRange",read_gaspRange);
  struct.version = parser.readUSHORT(data);
  struct.numRanges = parser.readUSHORT(data);
  struct.gaspRange = [];
  parser.readArray(parser, data, struct.gaspRange, "_gaspRange", struct.numRanges);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("gasp",readgasp);
var readhdmx = function(data) {
  var struct = {};
  parser.bindInstance("hdmx", struct);
  struct.__pointer = data.pointer;
  var read_DeviceRecord = function(data) {
    var struct = {};
    parser.bindInstance("_DeviceRecord", struct);
    struct.__pointer = data.pointer;
    struct.pixelSize = parser.readBYTE(data);
    struct.maxWidth = parser.readBYTE(data);
    struct.widths = [];
    if(parser.getInstance("maxp")){
      parser.readArray(parser, data, struct.widths, "BYTE", parser.getInstance("maxp").numGlyphs);
    } else {
      parser.delayArrayRead(parser, data, data.pointer, parser.getReadFunction("BYTE"), struct, "widths", "maxp", "numGlyphs")
    }
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_DeviceRecord",read_DeviceRecord);
  struct.version = parser.readUSHORT(data);
  struct.numRecords = parser.readSHORT(data);
  struct.sizeDeviceRecord = parser.readLONG(data);
  struct.records = [];
  parser.readArray(parser, data, struct.records, "_DeviceRecord", struct.numRecords);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("hdmx",readhdmx);
var readkern = function(data) {
  var struct = {};
  parser.bindInstance("kern", struct);
  struct.__pointer = data.pointer;
  var read_kerningPair = function(data) {
    var struct = {};
    parser.bindInstance("_kerningPair", struct);
    struct.__pointer = data.pointer;
    struct.left = parser.readUSHORT(data);
    struct.right = parser.readUSHORT(data);
    struct.value = parser.readSHORT(data);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_kerningPair",read_kerningPair);
  var read_table = function(data) {
    var struct = {};
    parser.bindInstance("_table", struct);
    struct.__pointer = data.pointer;
    struct.version = parser.readUSHORT(data);
    struct.length = parser.readUSHORT(data);
    struct.coverage = parser.readBYTE(data);
    struct.format = parser.readBYTE(data);
    if(struct.format==0) {
      struct.nPairs = parser.readUSHORT(data);
      struct.searchRange = parser.readUSHORT(data);
      struct.entrySelector = parser.readUSHORT(data);
      struct.rangeShift = parser.readUSHORT(data);
      struct.kerningPairs = [];
      parser.readArray(parser, data, struct.kerningPairs, "_kerningPair", struct.nPairs);
    }
    if(struct.format==2) {
      var read_classTable = function(data) {
        var struct = {};
        parser.bindInstance("_classTable", struct);
        struct.__pointer = data.pointer;
        struct.firstGlyph = parser.readUSHORT(data);
        struct.nGlyphs = parser.readUSHORT(data);
        struct.glyphs = [];
        parser.readArray(parser, data, struct.glyphs, "USHORT", struct.nGlyphs);
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_classTable",read_classTable);
      var read_tableValues = function(data) {
        var struct = {};
        parser.bindInstance("_tableValues", struct);
        struct.__pointer = data.pointer;
        struct.values = [];
        if(parser.getInstance("kern") && parser.getInstance("kern")){
          parser.readArray(parser, data, struct.values, "SHORT", parser.getInstance("kern").leftClassTable.nGlyphs * parser.getInstance("kern").rightClassTable.nGlyphs);
        } else {
          parser.delayArithmeticArrayRead(parser, data, data.pointer, parser.getReadFunction("SHORT"), struct, "values", ["kern", "kern"], [".leftClassTable.nGlyphs",".rightClassTable.nGlyphs"], "*")
        }
        struct.__blocklength = data.pointer - struct.__pointer;
        return struct;
      };
      parser.addReadFunction("_tableValues",read_tableValues);
      struct.rowWidth = parser.readUSHORT(data);
      struct.leftClassTable = parser.getReadFunction("USHORT")(data);
      data.marks.push(data.pointer);
      struct.leftClassTableData = parser.readStructure(data, (typeof _classTable === 'undefined' ? parser.getReadFunction("_classTable") : _classTable), "LOCAL", struct, struct.leftClassTable);
      data.pointer = data.marks.pop();
      struct.rightClassTable = parser.getReadFunction("USHORT")(data);
      data.marks.push(data.pointer);
      struct.rightClassTableData = parser.readStructure(data, (typeof _classTable === 'undefined' ? parser.getReadFunction("_classTable") : _classTable), "LOCAL", struct, struct.rightClassTable);
      data.pointer = data.marks.pop();
      struct.array = parser.getReadFunction("USHORT")(data);
      data.marks.push(data.pointer);
      struct.arrayData = parser.readStructure(data, (typeof _tableValues === 'undefined' ? parser.getReadFunction("_tableValues") : _tableValues), "LOCAL", struct, struct.array);
      data.pointer = data.marks.pop();
    }
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_table",read_table);
  struct.version = parser.readUSHORT(data);
  struct.nTables = parser.readUSHORT(data);
  struct.tables = [];
  parser.readArray(parser, data, struct.tables, "_table", struct.nTables);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("kern",readkern);
var readLTSH = function(data) {
  var struct = {};
  parser.bindInstance("LTSH", struct);
  struct.__pointer = data.pointer;
  struct.version = parser.readUSHORT(data);
  struct.numGlyphs = parser.readUSHORT(data);
  struct.yPels = [];
  parser.readArray(parser, data, struct.yPels, "BYTE", struct.numGlyphs);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("LTSH",readLTSH);
var readPCLT = function(data) {
  var struct = {};
  parser.bindInstance("PCLT", struct);
  struct.__pointer = data.pointer;
  struct.Version = parser.readUSHORT(data);
  struct.FontNumber = parser.readULONG(data);
  struct.Pitch = parser.readUSHORT(data);
  struct.xHeight = parser.readUSHORT(data);
  struct.Style = parser.readUSHORT(data);
  struct.TypeFamily = parser.readUSHORT(data);
  struct.CapHeight = parser.readUSHORT(data);
  struct.SymbolSet = parser.readUSHORT(data);
  struct.Typeface = "";
  (function(data, readcount) {
    while(readcount-->0) {
      struct.Typeface += parser.readASCII(data);
    }
  }(data, 16));
  struct.CharacterComplement = "";
  (function(data, readcount) {
    while(readcount-->0) {
      struct.CharacterComplement += parser.readASCII(data);
    }
  }(data, 8));
  struct.FileName = "";
  (function(data, readcount) {
    while(readcount-->0) {
      struct.FileName += parser.readASCII(data);
    }
  }(data, 6));
  struct.StrokeWeight = parser.readASCII(data);
  struct.WidthType = parser.readASCII(data);
  struct.SerifStyle = parser.readBYTE(data);
  parser.readBYTE(data)
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("PCLT",readPCLT);
var readVDMX = function(data) {
  var struct = {};
  parser.bindInstance("VDMX", struct);
  struct.__pointer = data.pointer;
  var read_ratio = function(data) {
    var struct = {};
    parser.bindInstance("_ratio", struct);
    struct.__pointer = data.pointer;
    struct.bCharSet = parser.readBYTE(data);
    struct.xRatio = parser.readBYTE(data);
    struct.yStartRatio = parser.readBYTE(data);
    struct.yEndRatio = parser.readBYTE(data);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_ratio",read_ratio);
  var read_vTable = function(data) {
    var struct = {};
    parser.bindInstance("_vTable", struct);
    struct.__pointer = data.pointer;
    struct.yPelHeight = parser.readUSHORT(data);
    struct.yMax = parser.readSHORT(data);
    struct.yMin = parser.readSHORT(data);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_vTable",read_vTable);
  var read_vdmx = function(data) {
    var struct = {};
    parser.bindInstance("_vdmx", struct);
    struct.__pointer = data.pointer;
    struct.recs = parser.readUSHORT(data);
    struct.startsz = parser.readBYTE(data);
    struct.endsz = parser.readBYTE(data);
    struct.entry = [];
    parser.readArray(parser, data, struct.entry, "_vTable", struct.recs);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_vdmx",read_vdmx);
  struct.version = parser.readUSHORT(data);
  struct.numRecs = parser.readUSHORT(data);
  struct.numRatios = parser.readUSHORT(data);
  struct.ratRange = [];
  parser.readArray(parser, data, struct.ratRange, "_ratio", struct.numRatios);
  struct.offset = [];
  parser.readArray(parser, data, struct.offset, "USHORT", struct.numRatios);
  struct.groups = [];
  parser.readArray(parser, data, struct.groups, "_vdmx", struct.numRecs);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("VDMX",readVDMX);
var readvhea = function(data) {
  var struct = {};
  parser.bindInstance("vhea", struct);
  struct.__pointer = data.pointer;
  struct.version = parser.readUSHORT(data);
  if(struct.version == 0x00010000) {
    struct.ascent = parser.readSHORT(data);
    struct.descent = parser.readSHORT(data);
    struct.lineGap = parser.readSHORT(data);
  }
  if(struct.version == 0x00011000) {
    struct.vertTypoAscender = parser.readSHORT(data);
    struct.vertTypoDescender = parser.readSHORT(data);
    struct.vertTypoLineGap = parser.readSHORT(data);
  }
  struct.advanceHeightMax = parser.readSHORT(data);
  struct.minTopSideBearing = parser.readSHORT(data);
  struct.minBottomSideBearing = parser.readSHORT(data);
  struct.yMaxExtent = parser.readSHORT(data);
  struct.caretSlopeRise = parser.readSHORT(data);
  struct.caretSlopeRun = parser.readSHORT(data);
  struct.caretOffset = parser.readSHORT(data);
  parser.readSHORT(data)
  parser.readSHORT(data)
  parser.readSHORT(data)
  parser.readSHORT(data)
  struct.metricDataFormat = parser.readSHORT(data);
  struct.numOfLongVerMetrics = parser.readUSHORT(data);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("vhea",readvhea);
var readvmtx = function(data) {
  var struct = {};
  parser.bindInstance("vmtx", struct);
  struct.__pointer = data.pointer;
  var read_vMetric = function(data) {
    var struct = {};
    parser.bindInstance("_vMetric", struct);
    struct.__pointer = data.pointer;
    struct.advanceHeight = parser.readUSHORT(data);
    struct.topSideBearing = parser.readSHORT(data);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("_vMetric",read_vMetric);
  struct.vMetrics = [];
  if(parser.getInstance("vhea")){
    parser.readArray(parser, data, struct.vMetrics, "_vMetric", parser.getInstance("vhea").numOfLongVerMetrics);
  } else {
    parser.delayArrayRead(parser, data, data.pointer, parser.getReadFunction("_vMetric"), struct, "vMetrics", "vhea", "numOfLongVerMetrics")
  }
  struct.topSideBearing = [];
  if(parser.getInstance("maxp") && parser.getInstance("vhea")){
    parser.readArray(parser, data, struct.topSideBearing, "SHORT", parser.getInstance("maxp").nuGlyphs - parser.getInstance("vhea").numOfLongVerMetrics);
  } else {
    parser.delayArithmeticArrayRead(parser, data, data.pointer, parser.getReadFunction("SHORT"), struct, "topSideBearing", ["maxp", "vhea"], [".nuGlyphs",".numOfLongVerMetrics"], "-")
  }
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("vmtx",readvmtx);
return parser.getReadFunction('SFNT')(data);
}
};

