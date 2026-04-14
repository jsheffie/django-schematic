/**
 * PNG tEXt chunk utilities for embedding/extracting JSON metadata.
 *
 * Follows the same technique used by Excalidraw: inject a tEXt chunk
 * immediately before the IEND chunk so the PNG remains valid and the
 * embedded data survives any conformant PNG reader.
 */

// ---------------------------------------------------------------------------
// CRC32 (required for valid PNG chunks)
// ---------------------------------------------------------------------------

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Big-endian helpers
// ---------------------------------------------------------------------------

function readUint32(b: Uint8Array, offset: number): number {
  return (
    ((b[offset] << 24) | (b[offset + 1] << 16) | (b[offset + 2] << 8) | b[offset + 3]) >>> 0
  );
}

function writeUint32(b: Uint8Array, offset: number, val: number): void {
  b[offset] = (val >>> 24) & 0xff;
  b[offset + 1] = (val >>> 16) & 0xff;
  b[offset + 2] = (val >>> 8) & 0xff;
  b[offset + 3] = val & 0xff;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const TEXT_ENC = new TextEncoder();
const TEXT_DEC = new TextDecoder();

/**
 * Scan PNG chunks for a tEXt chunk matching `keyword`.
 * Returns the text value, or null if not found.
 */
export function extractTextChunk(pngBytes: Uint8Array, keyword: string): string | null {
  let offset = 8; // skip PNG signature
  while (offset + 12 <= pngBytes.length) {
    const length = readUint32(pngBytes, offset);
    const type =
      String.fromCharCode(pngBytes[offset + 4]) +
      String.fromCharCode(pngBytes[offset + 5]) +
      String.fromCharCode(pngBytes[offset + 6]) +
      String.fromCharCode(pngBytes[offset + 7]);

    if (type === "tEXt") {
      const data = pngBytes.subarray(offset + 8, offset + 8 + length);
      const nullIdx = data.indexOf(0);
      if (nullIdx !== -1) {
        const kw = TEXT_DEC.decode(data.subarray(0, nullIdx));
        if (kw === keyword) {
          return TEXT_DEC.decode(data.subarray(nullIdx + 1));
        }
      }
    }

    if (type === "IEND") break;
    offset += 12 + length; // 4 length + 4 type + data + 4 CRC
  }
  return null;
}

/**
 * Return a new PNG Uint8Array with a tEXt chunk carrying `keyword`/`text`
 * injected immediately before the IEND chunk.
 */
export function injectTextChunk(
  pngBytes: Uint8Array,
  keyword: string,
  text: string,
): Uint8Array {
  const kwBytes = TEXT_ENC.encode(keyword);
  const textBytes = TEXT_ENC.encode(text);

  // tEXt chunk data: keyword + NUL + text
  const data = new Uint8Array(kwBytes.length + 1 + textBytes.length);
  data.set(kwBytes, 0);
  data[kwBytes.length] = 0;
  data.set(textBytes, kwBytes.length + 1);

  // Build chunk: [length][tEXt][data][CRC]
  const typeBytes = new Uint8Array([116, 69, 88, 116]); // "tEXt"
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  const crcValue = crc32(crcInput);

  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeUint32(chunk, 8 + data.length, crcValue);

  // Locate IEND: it is always the last 12 bytes of a valid PNG
  const iendOffset = pngBytes.length - 12;
  const isIend =
    pngBytes[iendOffset + 4] === 73 && // I
    pngBytes[iendOffset + 5] === 69 && // E
    pngBytes[iendOffset + 6] === 78 && // N
    pngBytes[iendOffset + 7] === 68; // D

  const insertAt = isIend ? iendOffset : pngBytes.length;
  const result = new Uint8Array(pngBytes.length + chunk.length);
  result.set(pngBytes.subarray(0, insertAt), 0);
  result.set(chunk, insertAt);
  result.set(pngBytes.subarray(insertAt), insertAt + chunk.length);
  return result;
}
