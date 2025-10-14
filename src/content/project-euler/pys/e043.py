from functools import reduce
from typing import Generator, TypeVar

T = TypeVar('T')

dump = lambda xs: reduce(lambda x, y: x * 10 + y, xs)

def test():
    res = []
    for d1 in range(1, 10):
        for d2 in range(10):
            if d1 == d2:
                continue
            for d3 in range(10):
                if d3 in (d1, d2):
                    continue
                for d4 in range(10):
                    if d4 in (d1, d2, d3):
                        continue
                    if d4 % 2 > 0:
                        continue
                    for d5 in range(10):
                        if d5 in (d1, d2, d3, d4):
                            continue
                        if (d5 + d4 + d3) % 3 > 0:
                            continue
                        for d6 in range(10):
                            if d6 in (d1, d2, d3, d4, d5):
                                continue
                            if d6 not in (0, 5):
                                continue
                            for d7 in range(10):
                                if d7 in (d1, d2, d3, d4, d5, d6):
                                    continue
                                k = d7 + d6 * 10 + d5 * 100
                                if k % 7 > 0:
                                    continue
                                for d8 in range(10):
                                    if d8 in (d1, d2, d3, d4, d5, d6, d7):
                                        continue
                                    k = d8 + d7 * 10 + d6 * 100
                                    if k % 11 > 0:
                                        continue
                                    for d9 in range(10):
                                        if d9 in (d1, d2, d3, d4, d5, d6, d7, d8):
                                            continue
                                        k = d9 + d8 * 10 + d7 * 100
                                        if k % 13 > 0:
                                            continue
                                        for d10 in range(10):
                                            if d10 in (d1, d2, d3, d4, d5, d6, d7, d8, d9):
                                                continue
                                            k = d10 + d9*10 + d8*100
                                            if k % 17 > 0:
                                                continue
                                            res.append(dump([d1, d2, d3, d4, d5, d6, d7, d8, d9, d10]))
                                            break
    print(sum(res))
    print(res)

def maker():
    ks = [1, 1, 1, 1, 2, 3, 5, 7, 11, 13, 17]
    def helper(head: list[int], tail:list[int], k:int) -> Generator[int, None, None]:
        if k == 1:
            if head[0] == 0:
                return
        if k >= 3:
            a, b, c = head[-3:]
            if (a * 100 + b * 10 + c) % ks[k] > 0:
                return
            if k == 10:
                yield dump(head)
                return

        for (i, x) in enumerate(tail):
            yield from helper([*head, x], [*tail[:i], *tail[i+1:]], k+1)

    yield from helper([], list(range(10)), 0)

print(sum(maker()))


def perms[R](xs: list[R], k:int=0) -> Generator[list[R], None, None]:
    def helper(head: list[R], tail: list[R], k: int = 0):
        if k == 0:
            yield head
            return
        for (i, x) in enumerate(tail):
            yield from helper([*head, x], [*tail[:i], *tail[i+1:]], k - 1)

    if k == 0:
        k = len(xs)
    yield from helper([], xs, k)
