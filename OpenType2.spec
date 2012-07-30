/**
 * The OpenType specification
 *
 * This is the specification for OpenType fonts, based on the information
 * found at https://www.microsoft.com/typography/otspec/otff.htm and
 * linked pages for individual tables.
 *
 * [spec file compiled by Mike "Pomax" Kamermans]
 */


/**
 * required sub specs
 */
REQUIRES {
  cmap head hhea hmtx maxp name OS_2 post       // Required tables
  BASE GDEF GPOS GSUB JSTF                      // Advanced typographic tables
  DSIG gasp hdmx kern LTSH PCLT VDMX vhea vmtx  // Optional opentype tables
}

/**
 * SPLINE FONT HEADER AND INCLUDES
 */
Collection SFNT {
  LONG version                          // 0x00010000 for TTF , string 'OTTO' for CFF

  if(version != 0x001000 && version != 'OTTO') {
    TERMINATE Version mismatch: found [version] instead of 0x00010000 (TTF) or 'OTTO' (CFF)
  }

  USHORT numTables                      // Number of tables in this font
  USHORT searchRange                    // (Maximum power of 2 <= numTables) x 16.
  USHORT entrySelector                  // Log2(maximum power of 2 <= numTables).
  USHORT rangeShift                     // NumTables x 16-searchRange.

  Collection TableRecord {
    ASCII[4] tag                              // four byte table name
    ULONG checkSum                            // CheckSum for the table pointed to by this table record
    GLOBAL ULONG OFFSET offset TO VALUE(tag)  // Offset to the table, relative to the beginning of the file
    ULONG length                              // Length of the table in bytes
  }

  TableRecord[numTables] tableRecords  // 16 byte table records
}