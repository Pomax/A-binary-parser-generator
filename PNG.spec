/**
 * A specification file for PNG images
 * http://www.libpng.org/pub/png/spec/1.1/PNG-Structure.html
 */

Defining Collection PNG {

  // http://www.libpng.org/pub/png/spec/1.1/PNG-Chunks.html
  Collection CHUNK {
    ULONG Length
    ASCII[4] ChunkType
    COLLECTION<ChunkType> OR BYTE[Length] ChunkData  // there may be unknown chunks, so we use data-array fallback.
    ULONG CRC
  }

  ULONG signature_1
  if(signature_1 != 0x89504E47) {
    TERMINATE No valid PNG file signature found
  }
  ULONG signature_2
  if(signature_2 != 0x0D0A1A0A) {
    TERMINATE No valid PNG file signature found
  }

  // if we get here, we have a legal PNG file
  // and we can start reading in chunks.
  CHUNK[REMAINDER] chunks
}


// http://www.libpng.org/pub/png/spec/1.1/PNG-Chunks.html#C.IHDR
Collection IHDR {
  ULONG Width
  ULONG Height
  BYTE BitDepth
  BYTE ColorYype
  BYTE CompressionMethod
  BYTE FilterMethod
  BYTE InterlaceMethod
}


// http://www.libpng.org/pub/png/spec/1.1/PNG-Chunks.html#C.IEND
Collection IEND {}


// http://www.libpng.org/pub/png/spec/1.1/PNG-Chunks.html#C.pHYs
Collection pHYs {
  ULONG PixelsPerUnitXaxis
  ULONG PixelsPerUnitYaxis
  BYTE UnitSpecifier
}


// http://www.libpng.org/pub/png/spec/1.1/PNG-Chunks.html#C.cHRM
Collection cHRM {
  ULONG WhitePointC
  ULONG WhitePointY
  ULONG RedX
  ULONG RedY
  ULONG GreenX
  ULONG GreenY
  ULONG BlueX
  ULONG BlueY
}
