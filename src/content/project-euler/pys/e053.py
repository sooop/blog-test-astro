
from functools import reduce

prod = lambda xs: reduce(lambda x, y: x * y, xs, 1)
factorial = lambda n: 1 if n < 2 else prod(range(1, n + 1))

def nCr1(n: int, r: int) -> int:
    return reduce(lambda x, y: x // y, map(factorial, (n, r, (n - r))))


def nCr2(n: int, r: int) -> int:
    return (prod(range(n - r+1, n+1)) // prod(range(1, r+1)))


def gcd(a, b):
    if b > a:
        return gcd(b, a)
    r = a % b
    if r == 0:
        return b
    return gcd(b, r)


def nCr3(n: int, r: int) -> int:
    # 1,000,000 보다 큰 경우에는 0을 리턴
    xs = list(range(n - r + 1, n + 1))
    ys = list(range(1, r + 1))
    for i in range(r):
        if all(y == 1 for y in ys):
            break
        for j in range(r):
            g = gcd(xs[i], ys[j])
            if g > 1:
                xs[i], ys[j] = xs[i] // g, ys[j] // g
    res = 1
    for x in sorted(xs):
        res = res * x
        assert x < 2**31
        if res >= 100_0000:
            return 100_0000
    return res



def main():
    res = 0
    for n in range(1, 101):
        for r in range(1, n + 1):
            if nCr3(n, r) >= 100_0000:
                res += 1
    print(res)


if __name__ == '__main__':
    main()
