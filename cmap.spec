/**
 * https://www.microsoft.com/typography/otspec/cmap.htm
 */
Collection cmap {
  USHORT version
  USHORT numTables
  EncodingRecord[numTables] encodingRecords

  Collection EncodingRecord {
    USHORT platformID
    USHORT encodingID
    LOCAL ULONG OFFSET offset TO Subtable // offset from beginning of table to the subtable for this encoding.
  }

  Subtable[numTables] subtables

  Collection Subtable {
    USHORT format

    if(format==0) {
      USHORT length
      USHORT language
      BYTE[256] glyphIdArray
    }

    if(format==2) {

      // "private" collection
      Collection SubHeaders {
        USHORT firstCode
        USHORT entryCount
        SHORT idDelta
        USHORT idRangeOffset
      }

      USHORT length
      USHORT language
      USHORT[256] subHeaderKeys

      /* What is the value for these lengths? I don't understand the description in the official specification */
      SubHeaders[0] subHeaders // Variable-length array of subHeader structures.
      USHORT[0] glyphIndexArray // Variable-length array containing subarrays used for mapping the low byte of 2-byte characters.
    }

    if(format==4) {
      USHORT length
      USHORT language
      USHORT segCountX2
      USHORT searchRange
      USHORT entrySelector
      USHORT rangeShift
      USHORT[segCountX2 / 2] endCount // the table encodes segCount as twice the value it really is...
      RESERVED USHORT
      USHORT[segCount] startCount
      SHORT[segCount] idDelta
      USHORT[segCount] idRangeOffset

      // FIXME: ideally I don't want to see struct.length
      //        in the following array. It's in there right
      //        now as temporary solution to the problem
      //        of not having an AST =)
      //
      USHORT[(struct.length - (HERE - START))/2] glyphIdArray // this array runs until the end of the data block
    }

    if(format==6) {
      USHORT length
      USHORT language
      USHORT firstCode
      USHORT entryCount
      USHORT[entryCount] glyphIdArray
    }

    if(format==8) {
      // "private" collection
      Collection _group {
        ULONG startCharCode
        ULONG endCharCode
        ULONG startGlyphID
      }

      RESERVED USHORT
      ULONG length
      ULONG language
      BYTE[8192] is32
      ULONG nGroups
      _group[nGroups] groups
    }

    if(format==10) {
      RESERVED USHORT
      ULONG length
      ULONG language
      ULONG startCharCode
      ULONG numChars
      USHORT[numChars] glyphs
    }
    if(format==12) {
      // "private" collection
      Collection _group {
        ULONG startCharCode
        ULONG endCharCode
        ULONG startGlyphID
      }

      RESERVED USHORT
      ULONG length
      ULONG language
      ULONG nGroups
      _group[nGroups] groups
    }

    if(format==13) {
      // "private" collection
      Collection _group {
        ULONG startCharCode
        ULONG endCharCode
        ULONG startGlyphID
      }

      RESERVED USHORT
      ULONG length
      ULONG language
      ULONG nGroups
      _group[nGroups] groups
    }

    if(format==14) {
      // "private" collections
      Collection _unicodeValueRanges {
        UINT24 startUnicodeValue
        BYTE additionalCount
      }

      Collection _defaultUVSTable {
        ULONG	numUnicodeValueRanges
        _unicodeValueRanges[numUnicodeValueRanges] unicodeValueRanges
      }

      Collection _UVSMapping {
        UINT24 unicodeValue
        USHORT glyphID
      }

      Collection _nonDefaultUVSTable {
        ULONG	numUVSMappings
        _UVSMapping[numUVSMappings] UVSMappings
      }

      Collection _varSelectorRecord {
        UINT24 varSelector
        IMMEDIATE ULONG OFFSET defaultUVSOffset TO _defaultUVSTable        // Offset to Default UVS Table, from here. May be 0.
        IMMEDIATE ULONG OFFSET nonDefaultUVSOffset TO _nonDefaultUVSTable  // Offset to Non-Default UVS Table, from here. May be 0.

        /* I don't actually know what happens here. The documentation is not clear enough */
      }

      ULONG length
      ULONG numVarSelectorRecords
      _varSelectorRecord[numVarSelectorRecords] varSelectorRecords
    }
  }



}