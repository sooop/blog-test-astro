from math import hypot, gcd
from euler import timeit

@timeit
def g():
    limit = 1000
    res = [0] * (limit + 1)
    for b in range(2, limit // 2):
        for a in range(1, b):
            c = int(hypot(a, b))
            d = a + b + c
            if d < limit and c * c == a * a + b * b:
                res[d] += 1
    print(max(list(enumerate(res)), key=lambda x: x[1]))


@timeit
def h():
    limit = 1000
    res = [0] * (limit + 1)
    for m in range(2, int((limit / 2)**0.5)):
        for n in range(1, m):
            if m * n % 2 == 0 and gcd(m, n) == 1:
                p = 2 * m * (m + n)
                for q in range(p, limit, p):
                    res[q] += 1
    print(max(list(enumerate(res)), key=lambda x: x[1]))
