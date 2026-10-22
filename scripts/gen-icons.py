import struct, zlib, os

def make_chunk(chunk_type, data):
    crc_data = chunk_type + data
    return struct.pack('>I', len(data)) + crc_data + struct.pack('>I', zlib.crc32(crc_data) & 0xffffffff)

def create_green_png(filename, size):
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = make_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    r, g, b = 22, 163, 74  # green-600 #16a34a
    row = bytes([r, g, b]) * size
    raw = (b'\x00' + row) * size
    idat = make_chunk(b'IDAT', zlib.compress(raw, 6))
    iend = make_chunk(b'IEND', b'')
    with open(filename, 'wb') as f:
        f.write(sig + ihdr + idat + iend)
    print(f'Created {filename}')

base = os.path.join(os.path.dirname(__file__), '..', 'public')
create_green_png(os.path.join(base, 'pwa-192x192.png'), 192)
create_green_png(os.path.join(base, 'pwa-512x512.png'), 512)
create_green_png(os.path.join(base, 'apple-touch-icon.png'), 180)
print('Done!')
