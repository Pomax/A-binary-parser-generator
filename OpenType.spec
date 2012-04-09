/**

  This is the specification for OpenType fonts, based on the information
  found at https://www.microsoft.com/typography/otspec/otff.htm and
  linked pages for individual tables.

**/

Collection SFNT {

  // "private" collection
  Collection _tableRecord {
    ASCII[4] tag                             // four byte table name
    ULONG checkSum                           // CheckSum for this table.
    GLOBAL ULONG OFFSET offset TO VALUE(tag) // Offset from beginning of TrueType font file.
    ULONG length                             // Length of this table.
  }

  LONG version                         // 0x00010000 for TTF , string 'OTTO' for CFF
  USHORT numTables                     // Number of tables in this font
  USHORT searchRange                   // (Maximum power of 2 <= numTables) x 16.
  USHORT entrySelector                 // Log2(maximum power of 2 <= numTables).
  USHORT rangeShift                    // NumTables x 16-searchRange.
  _tableRecord[numTables] tableRecords // 16 byte table records
}

/**

  Required tables:

    cmap - Character to glyph mapping
    head - Font header
    hhea - Horizontal header
    hmtx - Horizontal metrics
    maxp - Maximum profile
    name - Naming table
    OS/2 - OS/2 and Windows specific metrics
    post - PostScript information

**/


/**
 * https://www.microsoft.com/typography/otspec/cmap.htm
 */
Collection cmap {

  // "private" collection
  Collection _subtable {
    USHORT format
    if(format==0) {
      USHORT length
      USHORT language
      BYTE[256] glyphIdArray
    }
    if(format==2) {

      // "private" collection
      Collection _subHeaders {
        USHORT firstCode
        USHORT entryCount
        SHORT idDelta
        USHORT idRangeOffset
      }

      USHORT length
      USHORT language
      USHORT[256] subHeaderKeys
      
      /* What is the value for these lengths? I don't understand the description in the official specification */
      _subHeaders[0] subHeaders // Variable-length array of subHeader structures.
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
      USHORT[(length - (HERE - START))/2] glyphIdArray // this array runs until the end of the data block
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

  Collection _encodingRecord {
    USHORT platformID
    USHORT encodingID
    LOCAL ULONG OFFSET offset TO _subtable // offset from beginning of table to the subtable for this encoding.
  }

  USHORT version
  USHORT numTables
  _encodingRecord[numTables] encodingRecords
  _subtable[numTables] subtables
}

/**
 * https://www.microsoft.com/typography/otspec/head.htm
 */
Collection head {
  LONG version
  LONG fontRevision
  ULONG checkSumAdjustment
  ULONG magicNumber
  if(magicNumber!=0x5F0F3CF5) {
    TERMINATE magic number mismatch - this is not an OpenType font file, or at least not a legal one.
  }
  USHORT flags
  USHORT unitsPerEm
  LONG created
  LONG modified
  SHORT xMin
  SHORT yMin
  SHORT xMax
  SHORT yMax
  USHORT macStyle
  USHORT lowestRecPPEM
  SHORT fontDirectionHint // Deprecated, must be 2.
  if(fontDirectionHint!=2) {
    WARN fontDirectionHint has the wrong value: this record has been deprecated and should be set to 2
  }
  SHORT indexToLocFormat  // 0 for USHORT offsets, 1 for ULONG offsets
  SHORT glyphDataFormat
}

/**
 * https://www.microsoft.com/typography/otspec/hhea.htm
 */
Collection hhea {
  LONG version
  SHORT Ascender
  SHORT Descender
  SHORT LineGap
  USHORT advanceWidthMax
  SHORT minLeftSideBearing
  SHORT minRightSideBearing
  SHORT xMaxExtent
  SHORT caretSlopeRise
  SHORT caretSlopeRun
  SHORT caretOffset
  RESERVED SHORT
  RESERVED SHORT
  RESERVED SHORT
  RESERVED SHORT
  SHORT metricDataFormat
  USHORT numberOfHMetrics
}

/**
 * https://www.microsoft.com/typography/otspec/hmtx.htm
 */
Collection hmtx {

  // "private" collection
  Collection _longHorMetric  {
    USHORT advanceWidth;
    SHORT lsb;
  }

  _longHorMetric[hhea.numberOfHMetrics] hMetrics
  SHORT[maxp.numGlyphs - hhea.numberOfHMetrics] leftSideBearing
}

/**
 * https://www.microsoft.com/typography/otspec/maxp.htm
 */
Collection maxp {
  LONG version
  if(version==0x00005000) { // CFF
    USHORT numGlyphs
  }
  if(version==0x00010000) { // TTF
    USHORT numGlyphs
    USHORT maxPoints
    USHORT maxContours
    USHORT maxCompositePoints
    USHORT maxCompositeContours
    USHORT maxZones
    USHORT maxTwilightPoints
    USHORT maxStorage
    USHORT maxFunctionDefs
    USHORT maxInstructionDefs
    USHORT maxStackElements
    USHORT maxSizeOfInstructions
    USHORT maxComponentElements
    USHORT maxComponentDepth
  }
}

/**
 * https://www.microsoft.com/typography/otspec/name.htm
 */
Collection name {

  // "private" collections
  Collection _nameRecord {
    USHORT platformID
    USHORT encodingID
    USHORT languageID
    USHORT nameID
    USHORT length
    USHORT offset // String offset from start of storage area (in bytes)
    //  USHORT OFFSET offset RELATIVE TO name.stringOffset
  }

  Collection _langTagRecord {
    USHORT length
    USHORT OFFSET offset RELATIVE TO name.stringOffset // String offset from start of storage area (in bytes)
  }

  USHORT format
  if(format==0) {
    USHORT count
    USHORT stringOffset
    //  LOCAL USHORT OFFSET stringOffset  // Offset to start of string storage, from start of table
    _nameRecord[count] nameRecords
  }
  if(format==1) {
    USHORT count
    USHORT stringOffset
    //  LOCAL USHORT OFFSET stringOffset  // Offset to start of string storage, from start of table.
    _nameRecord[count] nameRecord
    USHORT langTagCount
    _langTagRecord[langTagCount] langTagRecords
  }

  // Start of storage area. Not decided on how to do the referencing here yet...
}

/**
 * https://www.microsoft.com/typography/otspec/os2.htm
 */
Collection OS_2 {
  USHORT version

  // https://www.microsoft.com/typography/otspec/os2ver0.htm
  if(version==0x0000) {
    SHORT xAvgCharWidth
    USHORT usWeightClass
    USHORT usWidthClass
    USHORT fsType
    SHORT ySubscriptXSize
    SHORT ySubscriptYSize
    SHORT ySubscriptXOffset
    SHORT ySubscriptYOffset
    SHORT ySuperscriptXSize
    SHORT ySuperscriptYSize
    SHORT ySuperscriptXOffset
    SHORT ySuperscriptYOffset
    SHORT yStrikeoutSize
    SHORT yStrikeoutPosition
    SHORT sFamilyClass
    BYTE[10] panose
    ULONG[4] ulCharRange //Bits 0-31
    ASCII[4] achVendID
    USHORT fsSelection
    USHORT usFirstCharIndex
    USHORT usLastCharIndex
    SHORT sTypoAscender
    SHORT sTypoDescender
    SHORT sTypoLineGap
    USHORT usWinAscent
    USHORT usWinDescent
  }

  //https://www.microsoft.com/typography/otspec/os2ver1.htm
  if(version==0x0001) {
    SHORT xAvgCharWidth
    USHORT usWeightClass
    USHORT usWidthClass
    USHORT fsType
    SHORT ySubscriptXSize
    SHORT ySubscriptYSize
    SHORT ySubscriptXOffset
    SHORT ySubscriptYOffset
    SHORT ySuperscriptXSize
    SHORT ySuperscriptYSize
    SHORT ySuperscriptXOffset
    SHORT ySuperscriptYOffset
    SHORT yStrikeoutSize
    SHORT yStrikeoutPosition
    SHORT sFamilyClass
    BYTE[10] panose
    ULONG ulUnicodeRange1 // Bits 0-31
    ULONG ulUnicodeRange2 // Bits 32-63
    ULONG ulUnicodeRange3 // Bits 64-95
    ULONG ulUnicodeRange4 // Bits 96-127
    ASCII[4] achVendID
    USHORT fsSelection
    USHORT usFirstCharIndex
    USHORT usLastCharIndex
    SHORT sTypoAscender
    SHORT sTypoDescender
    SHORT sTypoLineGap
    USHORT usWinAscent
    USHORT usWinDescent
    ULONG ulCodePageRange1 // Bits 0-31
    ULONG ulCodePageRange2 // Bits 32-63
  }

  // https://www.microsoft.com/typography/otspec/os2ver2.htm
  if(version==0x0002) {
    SHORT xAvgCharWidth
    USHORT usWeightClass
    USHORT usWidthClass
    USHORT fsType
    SHORT ySubscriptXSize
    SHORT ySubscriptYSize
    SHORT ySubscriptXOffset
    SHORT ySubscriptYOffset
    SHORT ySuperscriptXSize
    SHORT ySuperscriptYSize
    SHORT ySuperscriptXOffset
    SHORT ySuperscriptYOffset
    SHORT yStrikeoutSize
    SHORT yStrikeoutPosition
    SHORT sFamilyClass
    BYTE[10] panose
    ULONG ulUnicodeRange1 // Bits 0-31
    ULONG ulUnicodeRange2 // Bits 32-63
    ULONG ulUnicodeRange3 // Bits 64-95
    ULONG ulUnicodeRange4 // Bits 96-127
    ASCII[4] achVendID
    USHORT fsSelection
    USHORT usFirstCharIndex
    USHORT usLastCharIndex
    SHORT sTypoAscender
    SHORT sTypoDescender
    SHORT sTypoLineGap
    USHORT usWinAscent
    USHORT usWinDescent
    ULONG ulCodePageRange1 // Bits 0-31
    ULONG ulCodePageRange2 // Bits 32-63
    SHORT sxHeight
    SHORT sCapHeight
    USHORT usDefaultChar
    USHORT usBreakChar
    USHORT usMaxContext
  }

  // https://www.microsoft.com/typography/otspec/os2ver3.htm
  if(version==0x0003) {
    SHORT xAvgCharWidth
    USHORT usWeightClass
    USHORT usWidthClass
    USHORT fsType
    SHORT ySubscriptXSize
    SHORT ySubscriptYSize
    SHORT ySubscriptXOffset
    SHORT ySubscriptYOffset
    SHORT ySuperscriptXSize
    SHORT ySuperscriptYSize
    SHORT ySuperscriptXOffset
    SHORT ySuperscriptYOffset
    SHORT yStrikeoutSize
    SHORT yStrikeoutPosition
    SHORT sFamilyClass
    BYTE[10] panose
    ULONG ulUnicodeRange1 // Bits 0-31
    ULONG ulUnicodeRange2 // Bits 32-63
    ULONG ulUnicodeRange3 // Bits 64-95
    ULONG ulUnicodeRange4 // Bits 96-127
    ASCII[4] achVendID
    USHORT fsSelection
    USHORT usFirstCharIndex
    USHORT usLastCharIndex
    SHORT sTypoAscender
    SHORT sTypoDescender
    SHORT sTypoLineGap
    USHORT usWinAscent
    USHORT usWinDescent
    ULONG ulCodePageRange1 // Bits 0-31
    ULONG ulCodePageRange2 // Bits 32-63
    SHORT sxHeight
    SHORT sCapHeight
    USHORT usDefaultChar
    USHORT usBreakChar
    USHORT usMaxContext
  }
  if(version==0x0004) {
    SHORT xAvgCharWidth
    USHORT usWeightClass
    USHORT usWidthClass
    USHORT fsType
    SHORT ySubscriptXSize
    SHORT ySubscriptYSize
    SHORT ySubscriptXOffset
    SHORT ySubscriptYOffset
    SHORT ySuperscriptXSize
    SHORT ySuperscriptYSize
    SHORT ySuperscriptXOffset
    SHORT ySuperscriptYOffset
    SHORT yStrikeoutSize
    SHORT yStrikeoutPosition
    SHORT sFamilyClass
    BYTE[10] panose
    ULONG ulUnicodeRange1 // Bits 0-31
    ULONG ulUnicodeRange2 // Bits 32-63
    ULONG ulUnicodeRange3 // Bits 64-95
    ULONG ulUnicodeRange4 // Bits 96-127
    ASCII[4] achVendID
    USHORT fsSelection
    USHORT usFirstCharIndex
    USHORT usLastCharIndex
    SHORT sTypoAscender
    SHORT sTypoDescender
    SHORT sTypoLineGap
    USHORT usWinAscent
    USHORT usWinDescent
    ULONG ulCodePageRange1 // Bits 0-31
    ULONG ulCodePageRange2 // Bits 32-63
    SHORT sxHeight
    SHORT sCapHeight
    USHORT usDefaultChar
    USHORT usBreakChar
    USHORT usMaxContext
  }
}

// https://www.microsoft.com/typography/otspec/post.htm
Collection post {
  ULONG version
//  _fixed italicAngle
  ULONG italicAngle
  SHORT underlinePosition
  SHORT underlineThickness
  ULONG isFixedPitch
  ULONG minMemType42
  ULONG maxMemType42
  ULONG minMemType1
  ULONG maxMemType1

  if(version==0x00020000) {
    USHORT numberOfGlyphs
    //
    //  This is commented off because there is no transform for resolving RHS table.values 
    //
    //  if(numberOfGlyphs!=maxp.numGlyphs) {
    //    WARN post.numberOfGlyphs should be equal to maxp.numGlyphs, but this is not the case.
    //  }
    //
    USHORT[numberOfGlyphs] glyphNameIndex
    if(numberOfGlyphs - 258 > 0) {
      ASCII[numberOfGlyphs - 258] names
    }
  }
  if(version==0x00025000) {
    USHORT numberOfGlyphs
    ASCII[numberOfGlyphs] offset
  }
}

/**

  Optional tables: TTF:

    cvt	 - Control Value Table
    fpgm - Font program
    glyf - Glyph data
    loca - Index to location
    prep - CVT Program

**/

Collection cvt_ {}
Collection fpgm {}
Collection glyf {}
Collection loca {}
Collection prep {}

/**

  Optional tables: CFF:

    CFF  - PostScript font program (compact font format)
    VORG - Vertical Origin

**/

Collection CFF_ {}
Collection VORG {}

/**

  Advanced typographic tables:

    BASE - Baseline data
    GDEF - Glyph definition data
    GPOS - Glyph positioning data
    GSUB - Glyph substitution data
    JSTF - Justification data

**/

Collection BASE {}
Collection GDEF {}
Collection GPOS {}
Collection GSUB {}
Collection JSTF {}

/**

  Other opentype tables:

    DSIG - Digital signature
    gasp - Grid-fitting/Scan-conversion
    hdmx - Horizontal device metrics
    kern - Kerning
    LTSH - Linear threshold data
    PCLT - PCL 5 data
    VDMX - Vertical device metrics
    vhea - Vertical Metrics header
    vmtx - Vertical Metrics

**/

Collection DSIG {}
Collection gasp {}
Collection hdmx {}
Collection kern {}
Collection LTSH {}
Collection PCLT {}
Collection VDMX {}
Collection vhea {}
Collection vmtx {}
