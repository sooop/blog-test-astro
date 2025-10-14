from functools import reduce


def _parse(s: str) -> list[int]:
    return [int(c) for c in s[::-1]]

def _dump(xs: list[int]) -> str:
    return ''.join(str(n) for n in xs[::-1]).lstrip('0')

def _add(*xs: list[int]) -> list[int]:
    h = len(xs)
    w = max(map(len, xs))
    res = []
    temp = [0] * (w * h)
    for i in range(h):
        temp[i*w:i*w+len(xs[i])] = xs[i]
    f = 0
    for i in range(w):
        f, e = divmod(sum(temp[i::w]) + f, 10)
        res.append(e)
    if f > 0:
        res.append(f)
    return res


def _mul(a: list[int], b: list[int]) -> list[int]:
    ws: list[list[int]] = []
    for (i, y) in enumerate(b):
        temp = [0] * i
        f = 0
        for x in a:
            f, e = divmod(x * y + f, 10)
            temp.append(e)
        if f > 0:
            temp.append(f)
        ws.append(temp)
    return _add(*ws)


def add(*ws: str) -> str:
    xs = [_parse(w) for w in ws]
    return _dump(_add(*xs))


def mul(a: str, b: str) -> str:
    x, y = _parse(a), _parse(b)
    return _dump(_mul(x, y))

a = "1231412314"
b = "2345236234"
print(int(a) * int(b))
print(mul(a, b))
