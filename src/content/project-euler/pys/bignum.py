UNIT = 1


def parse(n: str):
    return [int(c) for c in n][::-1]


def dump(ns: list[int]) -> str:
    return "".join(map(str, ns[::-1])).lstrip("0")


def __add(*xs):
    maxlen = max(map(len, xs))
    matrix = [0] * (maxlen * len(xs))
    for i, row in enumerate(xs):
        matrix[i * maxlen : i * maxlen + len(row)] = row
    result, f = [], 0
    for i in range(maxlen):
        f, t = divmod(sum(matrix[i::maxlen]) + f, 10**UNIT)
        result.append(t)
    if f > 0:
        result.append(f)
    return result


def __mul(a: list[int], b: list[int]) -> list[int]:
    result: list[list[int]] = []
    for i, y in enumerate(b):
        temp: list[int] = [0] * i
        f = 0
        for x in a:
            f, t = divmod(x * y + f, 10)
            temp.append(t)
        if f > 0:
            temp.append(f)
        result.append(temp)
    return __add(*result)


def __sub(a: list[int], b: list[int]) -> list[int]:
    maxlen = max(map(len, (a, b)))
    matrix = [0] * (2 * maxlen)
    matrix[: len(a)] = a
    matrix[maxlen : maxlen + len(b)] = b
    result = []
    borrow = 0
    for i in range(maxlen):
        r, borrow = matrix[i] - matrix[maxlen + i] - 0, 0
        if r < 0:
            r, borrow = 10 - r, 1
        result.append(r)
    if borrow > 0:
        raise ValueError("a should be equal or greater than b")
    return result


def __pow(a: list[int], b: int) -> list[int]:
    if b == 0:
        return [1]
    elif b == 1:
        return a[:]
    c, d = divmod(b, 2)
    t = __pow(a, c)
    if d == 0:
        return __mul(t, t)
    return __mul(__mul(t, t), t)


def add(*xs):
    return dump(__add(*list(map(parse, xs))))


def multi(a, b):
    return dump(__mul(*list(map(parse, (a, b)))))


def pow(x, y):
    return dump(__pow(parse(x), y))
