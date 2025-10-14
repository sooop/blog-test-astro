from euler import timeit, isprime, memoize

from math import log10

isprime2 = memoize(isprime)

def parts(n: int) -> list[int]:
    l = int(log10(n)) + 1
    res = [divmod(n, 10**i) for i in range(1, l)]
    res = [n] + list(sum(res, ()))
    return [] if any(x > 3 and (x % 2 == 0 or x % 3 == 0) for x in res) else res


@timeit
def main():
    s = set()
    k = 23
    while len(s) < 11:
        for i in (4, 6):
            xs = parts(k)
            if xs and all(isprime2(x) for x in xs):
                s.add(k)
            k += i
    print(sum(s), s)

if __name__ == '__main__':
    main()
