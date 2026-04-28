"""Tests for PNG tEXt chunk utilities (Python port of pngEmbed.ts)."""
import struct
import zlib

import pytest

from schematic.png_utils import extract_text_chunk, inject_text_chunk

# ---------------------------------------------------------------------------
# Minimal valid PNG builder for tests
# ---------------------------------------------------------------------------

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def make_minimal_png() -> bytes:
    ihdr_data = struct.pack(">IIBBBBB", 1, 1, 8, 0, 0, 0, 0)
    raw_pixel = b"\x00\xff"  # filter=none, 1 white grayscale pixel
    idat_data = zlib.compress(raw_pixel)
    return (
        PNG_SIGNATURE
        + _make_chunk(b"IHDR", ihdr_data)
        + _make_chunk(b"IDAT", idat_data)
        + _make_chunk(b"IEND", b"")
    )


# ---------------------------------------------------------------------------
# extract_text_chunk
# ---------------------------------------------------------------------------


def test_extract_returns_none_when_no_text_chunk():
    png = make_minimal_png()
    assert extract_text_chunk(png, "schematic") is None


def test_extract_returns_none_for_wrong_keyword():
    png = inject_text_chunk(make_minimal_png(), "other", "some data")
    assert extract_text_chunk(png, "schematic") is None


def test_extract_returns_text_for_matching_keyword():
    expected = '{"version": 2, "visibleNodeIds": ["auth.User"]}'
    png = inject_text_chunk(make_minimal_png(), "schematic", expected)
    assert extract_text_chunk(png, "schematic") == expected


# ---------------------------------------------------------------------------
# inject_text_chunk
# ---------------------------------------------------------------------------


def test_inject_preserves_png_signature():
    png = inject_text_chunk(make_minimal_png(), "schematic", "test")
    assert png[:8] == PNG_SIGNATURE


def test_inject_places_iend_last():
    png = inject_text_chunk(make_minimal_png(), "schematic", "test")
    assert png[-8:-4] == b"IEND"
    assert png[-12:-8] == b"\x00\x00\x00\x00"  # IEND length = 0


def test_inject_increases_size_by_exact_chunk_size():
    base = make_minimal_png()
    keyword = "schematic"
    text = "hello"
    result = inject_text_chunk(base, keyword, text)
    keyword_len = len(keyword.encode("utf-8"))
    text_len = len(text.encode("utf-8"))
    # chunk = 4 (length) + 4 (type) + keyword + 1 (NUL) + text + 4 (CRC)
    expected_increase = 4 + 4 + keyword_len + 1 + text_len + 4
    assert len(result) == len(base) + expected_increase


# ---------------------------------------------------------------------------
# Round-trip
# ---------------------------------------------------------------------------


def test_round_trip_simple_text():
    text = "hello world"
    png = inject_text_chunk(make_minimal_png(), "schematic", text)
    assert extract_text_chunk(png, "schematic") == text


def test_round_trip_json_config():
    config = '{"version": 2, "visibleNodeIds": ["auth.User", "account.EmailAddress"], "pinnedPositions": {}}'
    png = inject_text_chunk(make_minimal_png(), "schematic", config)
    assert extract_text_chunk(png, "schematic") == config


def test_round_trip_large_text():
    text = "x" * 50_000
    png = inject_text_chunk(make_minimal_png(), "schematic", text)
    assert extract_text_chunk(png, "schematic") == text
