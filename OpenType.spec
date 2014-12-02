/**

  This is the specification for OpenType fonts, based on the information
  found at https://www.microsoft.com/typography/otspec/otff.htm and
  linked pages for individual tables.

**/

Defining Collection SFNT {

  // "private" collection
  Collection _tableRecord {
    ASCII[4] tag                              // four byte table name
    ULONG checkSum                            // CheckSum for this table.
    GLOBAL ULONG OFFSET offset TO VALUE(tag)  // Offset from beginning of TrueType font file.
    ULONG length                              // Length of this table.
  }

  LONG version                          // 0x00010000 for TTF , string 'OTTO' for CFF
  USHORT numTables                      // Number of tables in this font
  USHORT searchRange                    // (Maximum power of 2 <= numTables) x 16.
  USHORT entrySelector                  // Log2(maximum power of 2 <= numTables).
  USHORT rangeShift                     // NumTables x 16-searchRange.
  _tableRecord[numTables] tableRecords  // 16 byte table records
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
      USHORT[segCountX2/2] endCount // the table encodes segCount as twice the value it really is...
      RESERVED USHORT
      USHORT[segCountX2/2] startCount
      SHORT[segCountX2/2] idDelta
      USHORT[segCountX2/2] idRangeOffset

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

  Collection _encodingRecord {
    USHORT platformID
    USHORT encodingID
    RELATIVE ULONG OFFSET offset TO _subtable FROM OWNER.START // offset from beginning of table to the subtable for this encoding.
  }

  USHORT version
  USHORT numTables
  _encodingRecord[numTables] encodingRecords
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

  USHORT format
  USHORT count
  USHORT stringOffset

  Collection _nameString {
    ASCII[OWNER.length] nameString
  }
  Collection _nameRecord {
    USHORT platformID
    USHORT encodingID
    USHORT languageID
    USHORT nameID
    USHORT length
    RELATIVE USHORT OFFSET offset TO _nameString FROM OWNER.START+owner.stringOffset
  }

  _nameRecord[count] nameRecord

  Collection _langTagRecord {
    USHORT length
    USHORT OFFSET offset RELATIVE TO OWNER.stringOffset // String offset from start of storage area (in bytes)
  }

  if(format==1) {
    USHORT langTagCount
    _langTagRecord[langTagCount] langTagRecord
  }
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
    //  FIXME
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


// http://www.microsoft.com/typography/otspec/cvt.htm
Collection cvt_ {
  // FWORD[n] List of n values referenceable by instructions. n is the number of FWORD items that fit in the size of the table.

  /**
    Can this be done easily? how do we access the table record in the font header to find out the length of this table?
  **/
}


// http://www.microsoft.com/typography/otspec/fpgm.htm
Collection fpgm {
  // BYTE[n] Instructions // n is the number of BYTE items that fit in the size of the table.

  /**
    Can this be done easily? how do we access the table record in the font header to find out the length of this table?
  **/
}


// http://www.microsoft.com/typography/otspec/glyf.htm
Collection glyf {
/*
  Collection _glyfHeader {
    SHORT numberOfContours
    SHORT xMin
    SHORT yMin
    SHORT xMax
    SHORT yMax
    if(numberOfContours >= 0) {
      USHORT[numberOfContours] endPtsOfContours
      USHORT instructionLength
      BYTE[instructionLength] instructions
      BYTE	flags[n]
      BYTE or SHORT	xCoordinates[ ]	First coordinates relative to (0,0); others are relative to previous point.
      BYTE or SHORT	yCoordinates[ ]
    }
    if(numberOfContours < 0) {
    }
  }

  // we probably do not want to read all this data in immediately
  // _glyfHeader[maxp.numGlyphs] glyphs
*/
}


// http://www.microsoft.com/typography/otspec/loca.htm
Collection loca {
  if(head.indexToLocFormat == 0) {
    USHORT[maxp.numGlyphs+1] offsets
  }
  if(head.indexToLocFormat == 1) {
    ULONG[maxp.numGlyphs+1] offsets
  }
}


// http://www.microsoft.com/typography/otspec/prep.htm
Collection prep {
  //BYTE[n] Set of instructions executed whenever point size or font or transformation change. n is the number of BYTE items that fit in the size of the table.

  /**
    Can this be done easily? how do we access the table record in the font header to find out the length of this table?
  **/
}

/**

  Optional tables: CFF and VORG

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

  See https://www.microsoft.com/typography/otspec/chapter2.htm

**/

Collection BASE {}

Collection GDEF {}

Collection GPOS {}

// global substitution table
Collection GSUB {
  LONG Version

  if(Version!=0x00010000) {
    TERMINATE Unknown GSUB table version
  }

  Collection _ScriptList {
    USHORT ScriptCount

    Collection _ScriptRecord {
      ASCII[4] ScriptTag

      Collection _ScriptTable {
        USHORT DefaultLangSys                    // Offset to DefaultLangSys table-from beginning of Script table-may be NULL
        USHORT LangSysCount

        Collection _LangSysRecord {
          ASCII[4] LangSysTag

          Collection _LangSysTable {
            RESERVED USHORT                      // OFFSET LookupOrder NULL (reserved for an offset to a reordering table)
            USHORT ReqFeatureIndex               // Index of a feature required for this language system - if no required features = 0xFFFF
            USHORT FeatureCount                  // Number of FeatureIndex values for this language system - excludes the required feature
            USHORT[FeatureCount] FeatureIndex    // Array of indices into the FeatureList - in arbitrary order
          }

          // Offset to LangSys table, relative to the beginning of the Script table
          RELATIVE USHORT OFFSET LangSys TO _LangSysTable FROM OWNER.START
        }

        _LangSysRecord[LangSysCount] LangSysRecords
      }

      // Offset to Script table, relative to the beginning of the ScriptList
      RELATIVE USHORT OFFSET Script TO _ScriptTable FROM (OWNER.OWNER.START + OWNER.OWNER.ScriptList)
    }

    _ScriptRecord[ScriptCount] ScriptRecords
  }

  LOCAL USHORT OFFSET ScriptList TO _ScriptList

  Collection _FeatureList {
    USHORT FeatureCount                          // Number of FeatureRecords in this table

    Collection _FeatureRecord {
      ASCII[4] FeatureTag                        // 4-byte feature identification tag

      Collection _FeatureTable {
        RESERVED USHORT                          // OFFSET FeatureParams = NULL (reserved for offset to FeatureParams)
        USHORT LookupCount                       // Number of LookupList indices for this feature
        USHORT[LookupCount] LookupListIndex      // Array of LookupList indices for this feature - zero-based (first lookup is LookupListIndex = 0)
      }

      // Offset to Feature table, relative to the beginning of the FeatureList
      RELATIVE USHORT OFFSET Feature TO _FeatureTable FROM (OWNER.OWNER.START + OWNER.OWNER.FeatureList)
    }

    _FeatureRecord[FeatureCount] FeatureRecords  // Array of FeatureRecords - zero-based (first feature has FeatureIndex = 0) - listed alphabetically by FeatureTag
  }

  LOCAL USHORT OFFSET FeatureList TO _FeatureList

  Collection _LookupList {
    USHORT LookupCount                           // Number of lookups in this table
    USHORT[LookupCount] Lookup                   // Array of offsets to Lookup tables -from beginning of LookupList - zero based (first lookup is Lookup index = 0)

    Collection _Lookuptable {
      USHORT LookupType                          // GSUB-specific lookup types, explained below
      USHORT LookupFlag                          // Lookup qualifiers
      USHORT SubTableCount                       // Number of SubTables for this lookup
      USHORT[SubTableCount] SubTable             // Array of offsets to SubTables - from beginning of Lookup table

      Collection _SubTable {
        // shared by all subtables
        USHORT SubstFormat

        // used in almost every subtable format
        Collection _CoverageTable {
          USHORT CoverageFormat
          if(CoverageFormat==1) {
            USHORT GlyphCount
            USHORT[GlyphCount] GlyphArray
          }
          if(CoverageFormat==2) {
            USHORT RangeCount
            Collection _RangeRecord {
              USHORT Start
              USHORT End
              USHORT StartCoverageIndex
            }
            _RangeRecord[RangeCount] RangeRecords
          }
        }
        
        // ==========================================
        // LookupType 1: Single Substitution Subtable
        // ==========================================
        if(OWNER.LookupType==1) {
          // Offset to Coverage table, relative to the beginning of the Substitution table
          RELATIVE USHORT OFFSET Coverage TO _CoverageTable FROM START
          if(SubstFormat==1) {
            // Add to original GlyphID to get substitute GlyphID
            SHORT DeltaGlyphID
          }
          if(SubstFormat==2) {
            //Number of GlyphIDs in the Substitute array
            USHORT GlyphCount
            // Array of substitute GlyphIDs-ordered by Coverage Index
            USHORT[GlyphCount] Substitute
          }
        }

        // ============================================
        // LookupType 2: Multiple Substitution Subtable
        // ============================================
        if(OWNER.LookupType==2) {
          RELATIVE USHORT OFFSET Coverage TO _CoverageTable FROM START
          USHORT SequenceCount
          USHORT[SequenceCount] Sequence

          Collection _SequenceTable {
            USHORT GlyphCount
            USHORT[GlyphCount] Substitute
          }

          // Array of offsets to Sequence tables, relative to the beginning of the Substitution table
          _SequenceTable[SequenceCount] SequenceTables OFFSET BY Sequence RELATIVE TO START
        }

        // =============================================
        // LookupType 3: Alternate Substitution Subtable
        // =============================================
        if(OWNER.LookupType==3) {
          RELATIVE USHORT OFFSET Coverage TO _CoverageTable FROM START
          USHORT AlternateSetCount
          USHORT[AlternateSetCount] AlternateSet

          Collection _AlternateSetTable {
            USHORT GlyphCount
            USHORT[GlyphCount] Alternate
          }

          // Array of offsets to Sequence tables, relative to the beginning of the Substitution table
          _AlternateSetTable[AlternateSetCount] AlternateSetTables OFFSET BY AlternateSet RELATIVE TO START
        }

        // ============================================
        // LookupType 4: Ligature Substitution Subtable
        // ============================================
        if(OWNER.LookupType==4) {
          RELATIVE USHORT OFFSET Coverage TO _CoverageTable FROM START
          USHORT LigSetCount
          USHORT[LigSetCount] LigatureSet

          Collection _LigatureSetTable {
            USHORT LigatureCount
            USHORT[LigatureCount] Ligature

            Collection _LigatureTable {
              USHORT LigGlyph
              USHORT CompCount
              USHORT[CompCount-1] Component
            }

            // Array of offsets to Ligature tables, relative to the beginning of the LigatureSet table
            _LigatureTable[LigatureCount] LigatureTables OFFSET BY Ligature RELATIVE TO START
          }

          // AArray of offsets to LigatureSet tables, relative to the beginning of the Substitution table
          _LigatureSetTable[LigSetCount] LigatureSetTables OFFSET BY LigatureSet RELATIVE TO START
        }

        // ===============================================================================
        // LookupType 5: Contextual Substitution Subtable - This one is properly messed up
        // ===============================================================================
        if(OWNER.LookupType==5) {

          Collection _SubstLookupRecord {
            USHORT SequenceIndex
            USHORT LookupListIndex
          }

          // =============================
          // Context Substitution Format 1
          // =============================
          if(SubstFormat==1) {
            RELATIVE USHORT OFFSET Coverage TO _CoverageTable FROM START
            USHORT SubRuleSetCount
            USHORT[SubRuleSetCount] SubRuleSet

            Collection _SubRuleSetTable {
              USHORT SubRuleCount
              USHORT[SubRuleCount] SubRule

              Collection _SubRuleTable {
                USHORT GlyphCount
                USHORT SubstCount
                USHORT[GlyphCount-1] Input
                _SubstLookupRecord[SubstCount] SubstLookupRecord
              }

              // Array of offsets to SubRule tables, relative to the beginning of the SubRuleSet table
              _SubRuleTable[SubRuleCount] SubRuleTables OFFSET BY SubRule RELATIVE TO START
            }

            // Array of offsets to SubRuleSet tables, relative to the beginning of Substitution table
            _SubRuleSetTable[SubRuleSetCount] SubRuleSetTables OFFSET BY SubRuleSet RELATIVE TO START
          }

          // =============================
          // Context Substitution Format 2
          // =============================
          if(SubstFormat==2) {

            Collection _ClassDefTable {
              USHORT ClassFormat
              if(ClassFormat==1) {
                USHORT StartGlyph
                USHORT GlyphCount
                USHORT[GlyphCount] ClassValueArray
              }
              if(ClassFormat==2) {
                USHORT ClassRangeCount
                Collection _ClassRangeRecord {
                  USHORT Start
                  USHORT End
                  USHORT Class
                }
                _ClassRangeRecord[RangeCount] ClassRangeRecord
              }
            }

            RELATIVE USHORT OFFSET Coverage TO _CoverageTable FROM START
            RELATIVE USHORT OFFSET ClassDef TO _ClassDefTable FROM START
            USHORT SubClassSetCnt
            USHORT[SubClassSetCnt] SubClassSet

            Collection _SubClassSetTable {
              USHORT SubClassRuleCnt
              USHORT[SubClassRuleCnt] SubClassRule

              Collection _SubClassRuleTable {
                USHORT GlyphCount
                USHORT SubstCount
                USHORT[GlyphCount-1] Class
                _SubstLookupRecord[SubstCount] SubstLookupRecord
              }

              // Array of offsets to SubClassRule tables, relative to the beginning of the SubClassSet
              _SubClassRuleTable[SubClassRuleCnt] SubClassRuleTables OFFSET BY SubClassRule RELATIVE TO START
            }

            // Array of offsets to SubClassSet tables, relative to the beginning of the Substitution table
            _SubClassSetTable[GlyphCount] SubClassSetTables OFFSET BY SubClassSet RELATIVE TO START
          }

          // =============================
          // Context Substitution Format 3
          // =============================
          if(SubstFormat==3) {
            USHORT GlyphCount
            USHORT SubstCount
            USHORT[GlyphCount] Coverage
            // Array of offsets to Coverage table-from beginning of Substitution table-in glyph sequence order
            _CoverageTable[GlyphCount] CoverageTables OFFSET BY Coverage RELATIVE TO START
            _SubstLookupRecord[SubstCount] SubstLookupRecord
          }
        }

        // =======================================================
        // LookupType 6: Chaining Contextual Substitution Subtable
        // =======================================================
        if(OWNER.LookupType==6) {
          // ... CONTINUE SPEC HERE...
        }

        // ====================================
        // LookupType 7: Extension Substitution
        // ====================================
        if(OWNER.LookupType==7) {
        }

        // ======================================================================
        // LookupType 8: Reverse Chaining Contextual Single Substitution Subtable
        // ======================================================================
        if(OWNER.LookupType==8) {
        }
      }

      _SubTable[SubTableCount] SubTables OFFSET BY SubTable RELATIVE TO START

      // Index (base 0) into GDEF mark glyph sets structure. This field is only 
      // present if bit UseMarkFilteringSet (0x0010) of lookup flags is set.
      if(LookupFlag&0x0010) {
        USHORT MarkFilteringSet
      }        
    }

    // now this one is interesting. It's an array of Lookup Table structs,
    // each struct beginning at an offset indicated by the Lookup array.
    _Lookuptable[LookupCount] Lookuptables OFFSET BY Lookup RELATIVE TO START
  }

  LOCAL USHORT OFFSET LookupList TO _LookupList
}

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

// http://www.microsoft.com/typography/otspec/dsig.htm
Collection DSIG {
  Collection _signature {
    ULONG	ulFormat      	        // format of the signature
    ULONG	ulLength	              // Length of signature in bytes
    ULONG	ulOffset  	            // Offset to the signature block from the beginning of the table
  }

  Collection _signatureBlock {
    USHORT	usReserved1	          // Reserved for later; use 0 for now
    USHORT	usReserved2	          // Reserved for later; use 0 for now
    ULONG	cbSignature	            // Length (in bytes) of the PKCS#7 packet in pbSignature
    BYTE[cbSignature]	pbSignature	// PKCS#7 packet
  }

  ULONG	  ulVersion
  USHORT	usNumSigs
  USHORT	usFlag
  _signature[usNumSigs] signatures
  _signatureBlock[usNumSigs] signatureBlocks
}


// http://www.microsoft.com/typography/otspec/gasp.htm
Collection gasp {

  // "private" collection
  Collection _gaspRange {
    USHORT rangeMaxPPEM	      // Upper limit of range, in PPEM
    USHORT rangeGaspBehavior	// Flags describing desired rasterizer behavior.
  }

  USHORT version
  USHORT numRanges
  _gaspRange[numRanges] gaspRange	// Sorted by ppem
}


// http://www.microsoft.com/typography/otspec/hdmx.htm
Collection hdmx {
  // "private" collection
  Collection _DeviceRecord {
    BYTE pixelSize
    BYTE maxWidth
    BYTE[maxp.numGlyphs] widths
  }

  USHORT version
  SHORT	numRecords
  LONG sizeDeviceRecord
  _DeviceRecord[numRecords] records
}


// http://www.microsoft.com/typography/otspec/kern.htm (mostly superceded by GPOS)
Collection kern {

  // "private" collections
  Collection _kerningPair {
    USHORT left  // The glyph index for the left-hand glyph in the kerning pair.
    USHORT right // The glyph index for the right-hand glyph in the kerning pair.
    SHORT value  // officially: FWord
  }

  Collection _table {
    USHORT version
    USHORT length

    // 16 bit coverage flags, where bits 8-15 actually encode the format as BYTE
    BYTE coverage // horizontal, minimum, cross-stream, override (3), reserved
    BYTE format   // read separately
    if(format==0) {
      USHORT nPairs
      USHORT searchRange
      USHORT entrySelector
      USHORT rangeShift
      _kerningPair[nPairs] kerningPairs
    }
    if(format==2) {
      Collection _classTable {
        USHORT firstGlyph // First glyph in class range.
        USHORT nGlyphs
        USHORT[nGlyphs] glyphs
      }
      Collection _tableValues {
        SHORT[kern.leftClassTable.nGlyphs * kern.rightClassTable.nGlyphs] values
      }
      USHORT rowWidth	                                     // The width, in bytes, of a row in the table.
      LOCAL USHORT OFFSET leftClassTable TO _classTable    // Offset from beginning of this subtable to left-hand class table.
      LOCAL USHORT OFFSET rightClassTable TO _classTable   // Offset from beginning of this subtable to right-hand class table.
      LOCAL USHORT OFFSET array TO _tableValues            // Offset from beginning of this subtable to the start of the kerning array.
    }
  }

  USHORT version
  USHORT nTables
  _table[nTables] tables
}


// http://www.microsoft.com/typography/otspec/ltsh.htm
Collection LTSH {
  USHORT version
  USHORT numGlyphs
  BYTE[numGlyphs] yPels
}


// http://www.microsoft.com/typography/otspec/pclt.htm
// NOTE: The 'PCLT' table is strongly discouraged for ttf
Collection PCLT {
  USHORT Version
  ULONG FontNumber
  USHORT Pitch
  USHORT xHeight
  USHORT Style
  USHORT TypeFamily
  USHORT CapHeight
  USHORT SymbolSet
  ASCII[16] Typeface
  ASCII[8] CharacterComplement
  ASCII[6] FileName
  ASCII StrokeWeight
  ASCII WidthType
  BYTE SerifStyle
  RESERVED BYTE
}


// http://www.microsoft.com/typography/otspec/vdmx.htm
Collection VDMX {
  Collection _ratio {
    BYTE bCharSet
    BYTE xRatio
    BYTE yStartRatio
    BYTE yEndRatio
  }

  Collection _vTable {
    USHORT yPelHeight
    SHORT yMax
    SHORT yMin
  }

  Collection _vdmx {
    USHORT recs
    BYTE startsz
    BYTE endsz
    _vTable[recs] entry
  }

  USHORT version
  USHORT numRecs
  USHORT numRatios
  _ratio[numRatios] ratRange
  USHORT[numRatios] offset   // Offset from start of this table to the VDMX group for this ratio range.
  _vdmx[numRecs] groups
}


// http://www.microsoft.com/typography/otspec/vhea.htm
Collection vhea {
  USHORT version
  if(version == 0x00010000) {
    SHORT ascent
    SHORT descent
    SHORT lineGap
  }
  if(version == 0x00011000) {
    SHORT vertTypoAscender
    SHORT vertTypoDescender
    SHORT vertTypoLineGap
  }
  SHORT advanceHeightMax
  SHORT minTopSideBearing
  SHORT minBottomSideBearing
  SHORT yMaxExtent
  SHORT caretSlopeRise
  SHORT caretSlopeRun
  SHORT caretOffset
  RESERVED SHORT
  RESERVED SHORT
  RESERVED SHORT
  RESERVED SHORT
  SHORT metricDataFormat
  USHORT numOfLongVerMetrics
}


// http://www.microsoft.com/typography/otspec/vmtx.htm
Collection vmtx {
  Collection _vMetric {
    USHORT advanceHeight
    SHORT topSideBearing
  }

  _vMetric[vhea.numOfLongVerMetrics] vMetrics
  SHORT[maxp.numGlyphs - vhea.numOfLongVerMetrics] topSideBearing
}
