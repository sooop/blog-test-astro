from time import monotonic
from functools import reduce, wraps
from typing import Generator, Callable, TypeVar, ParamSpec

P = ParamSpec('P')
R = TypeVar('R')


def memoize(f: Callable[P, R]) -> Callable[P, R]:
    cache: dict[tuple, R] = {}
    @wraps(f)
    def inner(*args: P.args, **kwargs: P.kwargs) -> R:
        key = args + tuple(sorted(kwargs.items()))
        if key in cache:
            return cache[key]
        res = f(*args, **kwargs)
        cache[key] = res
        return res
    return inner



def timeit(f: Callable) -> Callable:
    @wraps(f)
    def inner(*a, **b):
        _e = monotonic()
        r = f(*a, **b)
        print(f"elapsed: {monotonic() - _e:0.3f}sec")
        return r
    return inner

def gcd(a, b):
    if a < b:
        return gcd(b, a)
    _, r = divmod(a, b)
    if r == 0:
        return b
    return gcd(b, r)


def lcm(a, b):
    g = gcd(a, b)
    return a // g * b


def prod(xs):
    return reduce(lambda x, y: x * y, xs)


def isprime(n: int) -> bool:
    if n < 2:
        return False
    if n < 4:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    if n < 9:
        return True
    k, l = 5, n ** 0.5 + 1
    while k < l:
        if n % k == 0 or n % (k + 2) == 0:
            return False
        k += 6
    return True


def seive(n: int) -> list[int]:
    s = [True] * (n + 1)
    s[:2] = [False, False]
    for i in range(2, n+1):
        if s[i]:
            s[i*2::i] = [False] * ((n - i) // i)
    return [i for (i, x) in enumerate(s) if x]


def num_of_divisors(n: int) -> int:
    s = 2
    l = int(n ** 0.5)
    for i in range(2, l + 1):
        if n % i == 0:
            s += 1
    if l * l == n:
        s -= 1
    return s


def sum_of_divisors(n: int) -> int:
    s = n + 1
    l = int(n ** 0.5)
    for i in range(2, l + 1):
        if n % i == 0:
            s = s + i + n // i
    if l * l == 0:
        s -= l
    return s


def factorize(n: int) -> list[tuple[int, int]]:
    def helper():
        yield 2
        yield 3
        k = 5
        while k <= n:
            yield k
            yield k + 2
            k += 6
    res: list[tuple[int, int]] = []
    for k in helper():
        if k >= n**.5:
            res.append((n, 1))
            break
        e = 0
        while n % k == 0:
            e, n = e + 1, n // k
        if e > 0:
            res.append((k, e))
    return res


if __name__ == '__main__':
    print(factorize(120))
