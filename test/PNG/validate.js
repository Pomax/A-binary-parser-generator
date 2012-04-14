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

var readPNG = function(data) {
  var struct = {};
  parser.bindInstance("PNG", struct);
  struct.__pointer = data.pointer;
  var readCHUNK = function(data) {
    var struct = {};
    parser.bindInstance("CHUNK", struct);
    struct.__pointer = data.pointer;
    struct.Length = parser.readULONG(data);
    struct.ChunkType = "";
    (function(data, readcount) {
      while(readcount-->0) {
        struct.ChunkType += parser.readASCII(data);
      }
    }(data, 4));
    var fChunkType = parser.getReadFunction(struct.ChunkType);
    if(typeof fChunkType !== 'undefined') {
          struct.ChunkData = fChunkType(data);
    } else {
          struct.ChunkData = [];
      if(debug) window.console.log('reading '+struct.ChunkType+' as '+BYTE+'['+struct.Length+'] of raw data');
      parser.readArray(parser, data, struct.ChunkData, "BYTE", struct.Length);
    }
    struct.CRC = parser.readULONG(data);
    struct.__blocklength = data.pointer - struct.__pointer;
    return struct;
  };
  parser.addReadFunction("CHUNK",readCHUNK);
  struct.signature_1 = parser.readULONG(data);
  if(struct.signature_1 != 0x89504E47) {
    throw "ERROR: No valid PNG file signature found"
  }
  struct.signature_2 = parser.readULONG(data);
  if(struct.signature_2 != 0x0D0A1A0A) {
    throw "ERROR: No valid PNG file signature found"
  }
  struct.chunks = [];
  (function(data, arr) {
    var read = parser.getReadFunction("CHUNK");
    while(data.pointer < data.bytecode.size()) {
      arr.push(read(data));
    }
  }(data, struct.chunks));
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("PNG",readPNG);
var readIHDR = function(data) {
  var struct = {};
  parser.bindInstance("IHDR", struct);
  struct.__pointer = data.pointer;
  struct.Width = parser.readULONG(data);
  struct.Height = parser.readULONG(data);
  struct.BitDepth = parser.readBYTE(data);
  struct.ColorYype = parser.readBYTE(data);
  struct.CompressionMethod = parser.readBYTE(data);
  struct.FilterMethod = parser.readBYTE(data);
  struct.InterlaceMethod = parser.readBYTE(data);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("IHDR",readIHDR);
var readIEND = function(data) {
  var struct = {};
  parser.bindInstance("IEND", struct);
  struct.__pointer = data.pointer;
  struct.__blocklength = 0;
  return struct;
};
parser.addReadFunction("IEND",readIEND);
var readpHYs = function(data) {
  var struct = {};
  parser.bindInstance("pHYs", struct);
  struct.__pointer = data.pointer;
  struct.PixelsPerUnitXaxis = parser.readULONG(data);
  struct.PixelsPerUnitYaxis = parser.readULONG(data);
  struct.UnitSpecifier = parser.readBYTE(data);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("pHYs",readpHYs);
var readcHRM = function(data) {
  var struct = {};
  parser.bindInstance("cHRM", struct);
  struct.__pointer = data.pointer;
  struct.WhitePointC = parser.readULONG(data);
  struct.WhitePointY = parser.readULONG(data);
  struct.RedX = parser.readULONG(data);
  struct.RedY = parser.readULONG(data);
  struct.GreenX = parser.readULONG(data);
  struct.GreenY = parser.readULONG(data);
  struct.BlueX = parser.readULONG(data);
  struct.BlueY = parser.readULONG(data);
  struct.__blocklength = data.pointer - struct.__pointer;
  return struct;
};
parser.addReadFunction("cHRM",readcHRM);
return parser.getReadFunction('PNG')(data);
}
};

