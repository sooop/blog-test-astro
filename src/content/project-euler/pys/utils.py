from io import IOBase
from typing import Generator

__newline = "\n".encode("utf8")



def streamReader(
    f: IOBase, delim: bytes | str = __newline
    ) -> Generator[bytearray | bytes, None, None]:

    if isinstance(delim, str):
        delim = delim.encode("utf8")
    buffer = bytearray()
    dellen = len(delim)
    chunk_size = 1024

    while True:
        chunk = f.read(chunk_size)
        if not chunk:
            if buffer:
                yield buffer
            return
        buffer.extend(chunk)

        while True:
            try:
                idx = buffer.index(delim)
                yield buffer[:idx]
                buffer[: idx + dellen] = []
            except ValueError:
                break
