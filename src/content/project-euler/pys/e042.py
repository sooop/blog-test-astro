import requests
from typing import Generator


ks = set(n * (n + 1) // 2 for n in range(1, 50))


def reader(url: str, delimiter:str=',') -> Generator[str, None, None]:
    d = delimiter.encode()
    buffer = bytearray()
    res = requests.get(url, stream=True)
    if res.status_code != 200:
        raise ValueError(f'invalid response: code={res.status_code}')
    for chunk in res.iter_content(chunk_size=1024):
        buffer.extend(chunk)
        while d in buffer:
            yield buffer[:buffer.index(d)].decode('utf-8')
            buffer[:buffer.index(d)+1] = []
    yield buffer.decode()

def main():
    res = 0
    for word in reader('https://euler.synap.co.kr/files/words.txt'):
        score = sum(ord(c) - 64 for c in word if c.isalpha())
        if score in ks:
            res += 1
    print(res)

if __name__ == '__main__':
    main()
