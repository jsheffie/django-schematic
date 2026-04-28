"""
Python port of pngEmbed.ts — inject/extract tEXt chunks in PNG files.

Uses the same UTF-8 encoding and chunk placement logic as the TypeScript
original so that files written by one side are readable by the other.
"""
from __future__ import annotations

import struct
import zlib


def _crc32(data: bytes) -> int:
    return zlib.crc32(data) & 0xFFFFFFFF


def extract_text_chunk(png_bytes: bytes, keyword: str) -> str | None:
    """Scan PNG chunks for a tEXt chunk matching keyword. Returns text or None."""
    offset = 8  # skip 8-byte PNG signature
    while offset + 12 <= len(png_bytes):
        (length,) = struct.unpack_from(">I", png_bytes, offset)
        chunk_type = png_bytes[offset + 4 : offset + 8]

        if chunk_type == b"tEXt":
            data = png_bytes[offset + 8 : offset + 8 + length]
            null_idx = data.find(b"\x00")
            if null_idx != -1:
                kw = data[:null_idx].decode("utf-8")
                if kw == keyword:
                    return data[null_idx + 1 :].decode("utf-8")

        if chunk_type == b"IEND":
            break

        offset += 12 + length

    return None


def inject_text_chunk(png_bytes: bytes, keyword: str, text: str) -> bytes:
    """Return new PNG bytes with a tEXt chunk injected before the IEND chunk."""
    kw_bytes = keyword.encode("utf-8")
    text_bytes = text.encode("utf-8")

    data = kw_bytes + b"\x00" + text_bytes
    chunk_type = b"tEXt"
    crc_value = _crc32(chunk_type + data)
    chunk = struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc_value)

    # IEND is always the last 12 bytes of a valid PNG
    iend_offset = len(png_bytes) - 12
    is_iend = png_bytes[iend_offset + 4 : iend_offset + 8] == b"IEND"
    insert_at = iend_offset if is_iend else len(png_bytes)

    return png_bytes[:insert_at] + chunk + png_bytes[insert_at:]
