---
created_at: 2019-04-13T05:56:54.000Z
feature_image: https://images.unsplash.com/photo-1652643105908-d1e6eea8c147?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDE2fHxsZXR0ZXJ8ZW58MHx8fHwxNzMzNzEyODkxfDA&ixlib=rb-4.0.3&q=80&w=2000
published_date: 2024-12-14T21:00:04.000Z
slug: scan-text-by-a-character-from-file
status: published
title: 파일에서 한 글자씩 스캔하는 방법
modified_date: 2025-10-23T15:14:08.000Z
custom_excerpt: 파이썬에서 줄 단위로 구분할 수 없는 텍스트 데이터를 글자단위로 스트리밍하는 방법
updated: 2025-10-23T15:11:05.000Z
---
일전에 특정한 구분자 단위로 파일을 읽는 방식으로 대용량 파일 전체를 메모리에 올리지 않고 읽어들여서 처리하는 방법에 대한 글을 발행한 적이 있습니다. 이후에 네이버 지식인에서 조금 다른 대용량 파일 처리에 대한 문제를 발견했습니다.

한글과 영문, 기호가 섞여 있는 대형 텍스트 파일이 있는데, 여기서 세 글자씩 가져와서 처리하고 싶다는 내용이었습니다. 파일로부터 한 글자씩 읽어들이기 위해서는 해당 파일이 어떤 인코딩이 적용되어 있는지를 알 필요가 있습니다.

## UTF-8

UTF-8은 인터넷에서 가장 널리 쓰이는 인코딩 방식 중 하나이며, 파일로 기록되는 텍스트 역시 이 인코딩을 사용하는 경우가 많습니다. UTF-8은 가변 길이 인코딩으로 원래 문자의 코드 범위에 따라 1바이트 ~ 4바이트까지의 데이터로 인코딩됩니다. 각 글자의 첫 바이트의 시작 비트는 해당 문자가 몇 바이트로 이루어져 있는지를 결정합니다. 또한 2바이트 이상으로 구성되는 문자의 후속 바이트들은 모두 10으로 시작합니다.

1. 시작 비트가 `0`으로 시작하는 경우, 1바이트입니다. 이때 첫 바이트는 `0x00` ~ `0x7f`의 범위를 갖습니다.
2. 시작 비트가 `110`으로 시작하는 경우 2바이트 문자입니다.
3. 시작 비트가 `1110`으로 시작하는 경우 3바이트 문자입니다. 대부분의 한글 문자는 3바이트가 됩니다.
4. 시작 비트가 `11110`으로 시작하는 경우 4바이트 문자입니다. 이모지 등이 여기에 해당됩니다.

따라서 버퍼에서 한 바이트를 읽은 후 위 조건을 검사하면 몇 바이트를 추가로 더 읽어야 하는지를 알 수 있습니다.

만약 버퍼의 끝부분이 특정 문자의 바이트 시퀀스 중간에 걸려 있다면 추가적으로 더 읽어들여야 합니다. 만약 이때 더 읽어들일 데이터가 없다면, 해당 파일의 마지막 문자가 깨진 것으로 판단할 수 있습니다.

```python
from io import IOBase

class ScanError(Exception):
    pass

def scan(f: IOBase):
    chunk_size = 16
    buffer = bytearray()
    cookie, l = 0, 1
    # cookie : 버퍼 내의 마지막 문자가 끊긴 바이트인지 체크
    # l : 한 글자가 몇 바이트인지
    preds = (0b_1111_0000, 0b_1110_0000, 0b_1100_0000)
    
    while True:
        chunk = f.read(chunk_size)
        match (len(chunk), cookie):
            case (0, 0):
                return
            case (0, _):
                raise ScanError("Incomplete byte sequence error")
            case (_, _):
                pass
        
        buffer.extend(chunk)
        cookie = len(buffer)
        
        while cookie > 0:
            c = buffer[0]
            if 0x00 <= c <= 0x7F:
                l = 1
            else:
                for i, p in enumerate(preds):
                    if p & c == p:
                        l = 4 - i
                        break
                else:
                    raise ScanError("Incorrect multibyte sequence.")
            
            cookie -= l
            if cookie < 0:
                break
            
            yield buffer[:l].decode("utf8")
            buffer[:l] = []

if __name__ == "__main__":
    with open("chars.txt", "rb") as f:
        for char in scan(f):
            print(char)
```