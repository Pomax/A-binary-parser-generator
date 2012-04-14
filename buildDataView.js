/**
 * build a data object for parsing
 */
(function(global) {
  global.buildDataView = function(data) {
    var reader = new global.jDataView(data, 0, data.length, false);
    return {
      getInt8:   function(offset) { return reader.getInt8(offset,    false); },
      getUint8:  function(offset) { return reader.getUint8(offset,   false); },
      getInt16:  function(offset) { return reader.getInt16(offset,   false); },
      getUint16: function(offset) { return reader.getUint16(offset,  false); },
      getInt32:  function(offset) { return reader.getInt32(offset,   false); },
      getUint32: function(offset) { return reader.getUint32(offset,  false); },
      getFloat:  function(offset) { return reader.getFloat32(offset, false); },
      getDouble: function(offset) { return reader.getFloat64(offset, false); },
      size:      (typeof reader.buffer.length !== "undefined" ?
                   function() { return reader.buffer.length; } :
                   function() { return reader.buffer.byteLength; })
    }
  };
}(typeof dataViewBlock === "undefined" ? this : dataViewBlock));
