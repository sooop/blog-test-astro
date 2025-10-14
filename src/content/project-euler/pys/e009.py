from euler import timeit, gcd

@timeit
def solve_a():
    for b in range(1, 1000):
        for c in range(b + 1, 999 - b):
            a = 1000 - b - c
            if a < 1:
                break
            if a * a + b * b == c * c:
                return a * b * c


@timeit
def solve_b():
    limit = int(500 ** 0.5)
    for m in range(1, limit):
        for n in range(1, m):
            if m * n % 2 > 0 or gcd(m, n) > 1:
                break
            a = m * m - n * n
            b = 2 * m * n
            c = m * m + n * n
            q, r =  divmod(1000, (a + b + c))
            if r == 0:
                return a * b * c * q**3


if __name__ == '__main__':
    print(solve_a())
    print(solve_b())
