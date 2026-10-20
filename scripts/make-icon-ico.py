# genera icon.ico (multi-size BMP entries) desde PNG RGBA de chrome — stdlib puro
import zlib, struct, sys

def decode_png(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos = 8
    width = height = bitdepth = ctype = None
    idat = b""
    palette = None
    trns = b""
    while pos < len(data):
        ln = struct.unpack(">I", data[pos:pos+4])[0]
        typ = data[pos+4:pos+8]
        chunk = data[pos+8:pos+8+ln]
        if typ == b"IHDR":
            width, height, bitdepth, ctype = struct.unpack(">IIBB", chunk[:10])
        elif typ == b"IDAT":
            idat += chunk
        elif typ == b"PLTE":
            palette = chunk
        elif typ == b"tRNS":
            trns = chunk
        elif typ == b"IEND":
            break
        pos += 12 + ln
    assert bitdepth == 8, f"bitdepth {bitdepth}"
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    raw = zlib.decompress(idat)
    stride = width * channels
    out = bytearray(height * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(height):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:  # sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif f == 2:  # up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif f == 3:  # average
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif f == 4:  # paeth
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                b = prev[i]
                c = prev[i - channels] if i >= channels else 0
                pa = abs(b - c); pb = abs(a - c); pc = abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 0xFF
        out[y*stride:(y+1)*stride] = line
        prev = line

    if ctype == 6:
        rgba = bytes(out)
    elif ctype == 2:  # RGB → RGBA
        rgba = bytearray(height * width * 4)
        for i in range(width * height):
            s = i * 3; d = i * 4
            rgba[d:d+3] = out[s:s+3]; rgba[d+3] = 255
        rgba = bytes(rgba)
    elif ctype == 3:  # indexed + tRNS
        rgba = bytearray(height * width * 4)
        for i in range(width * height):
            idx = out[i]; r, g, b = palette[idx*3:idx*3+3]
            rgba[i*4:i*4+4] = bytes((r, g, b, trns[idx] if idx < len(trns) else 255))
        rgba = bytes(rgba)
    else:
        raise SystemExit(f"color type {ctype} no soportado")
    return width, height, rgba

def ico_entry(w, h, rgba, png=None):
    # devuelve bytes del recurso + directorio parcial
    if png is not None:
        return (w, h, png)
    # BMP: header 40, alto x2 (XOR+AND), pixeles BGRA bottom-up, máscara 1bpp
    and_stride = ((w + 31) // 32) * 4
    bmp = bytearray()
    bmp += struct.pack("<IiiHHIIiiII", 40, w, h * 2, 1, 32, 0,
                       w * h * 4 + and_stride * h, 0, 0, 0, 0)
    for y in range(h - 1, -1, -1):
        row = rgba[y * w * 4:(y + 1) * w * 4]
        for i in range(0, w * 4, 4):
            bmp += bytes((row[i+2], row[i+1], row[i], row[i+3]))  # BGRA
    bmp += b"\x00" * (and_stride * h)
    return (w, h, bytes(bmp))

def build_ico(sources, out_path):
    # sources: [(size, png_path)] — todos RGBA; ≤128 BMP entries, 256 PNG entry
    entries = []
    for size, path in sources:
        w, h, rgba = decode_png(path)
        assert (w, h) == (size, size), f"{path} es {w}x{h}"
        if size <= 128:
            entries.append(ico_entry(size, size, rgba))
        else:
            entries.append((0, 0, open(path, "rb").read()))  # entrada PNG (Vista+)
    head = struct.pack("<HHH", 0, 1, len(entries))
    offset = 6 + 16 * len(entries)
    body = b""
    for (w, h, data) in entries:
        size_byte = 0 if w == 0 else w
        head += struct.pack("<BBBBHHII", size_byte, size_byte, 0, 0, 1, 32, len(data), offset)
        body += data
        offset += len(data)
    open(out_path, "wb").write(head + body)
    print(f"ico: {out_path} ({len(entries)} entradas, {offset} bytes)")

if __name__ == "__main__":
    build_ico([
        (16,  "/tmp/opencode/icon/icon-16.png"),
        (24,  "/tmp/opencode/icon/icon-24.png"),
        (32,  "/tmp/opencode/icon/icon-32.png"),
        (48,  "/tmp/opencode/icon/icon-48.png"),
        (64,  "/tmp/opencode/icon/icon-64.png"),
        (128, "/tmp/opencode/icon/icon-128.png"),
        (256, "/tmp/opencode/icon/icon-256.png"),
    ], sys.argv[1])
