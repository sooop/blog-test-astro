from io import IOBase
from urllib.request import urlopen
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


# 숫자를 비교할 수 있도록 정수로 변환하기 위한 테이블
__labels = "XY23456789TJQKA"
__kinds = dict(zip(__labels, range(15)))


def evaluate(cards: list[str]) -> tuple[int, list[int]]:

    score = 0
    num_table, shape_table = {}, {}
    for card in cards:
        num, shape = card
        num = __kinds[num]
        num_table[num] = num_table.get(num, 0) + 1
        shape_table[shape] = shape_table.get(shape, 0) + 1

    # 계급체크 및 점수 계산

    # 1. four of a kind
    if 4 in num_table.values():
        score += 110

    # 2. Flush
    if 5 in shape_table.values():
        score += 100

    # 3. Straight
    # straight 여부를 검사하기 위함
    needle = "".join(sorted([x[0] for x in cards], key=lambda item: __kinds[item]))
    if len(needle) == 5 and needle in __labels:
        score += 90
    if needle == "TJQKA":
        score += 5

    # 4. Three of a Kind
    if 4 in num_table.values():
        score += 80

    # 5. Pairs
    score += sum(25 for v in num_table.values() if v == 2)

    ## 하이카드 비교를 위한 튜플 리턴
    high_cards = [
        ([k] * v)
        for (k, v) in sorted(num_table.items(), key=lambda x: (x[1], x), reverse=True)
    ]
    high_cards = sum(high_cards, [])

    return score, high_cards


if __name__ == "__main__":
    res = urlopen("https://euler.synap.co.kr/files/poker.txt")
    result = 0
    for data in streamReader(res):
        cards = data.decode("utf8").strip().split(" ")
        a, b = map(evaluate, (cards[:5], cards[5:]))
        if a > b:
            result += 1
            print(f'승리=A: A({''.join(cards[:5])}) - B({''.join(cards[5:])}), (누적: {result})')
        else:
            print(f'승리=B: A({''.join(cards[:5])}) - B({''.join(cards[5:])})')
    print(result)
