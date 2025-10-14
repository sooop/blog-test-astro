from math import log10
from euler import timeit


def shift(n: int) -> set[int]:
    "n의 숫자를 순환시킨 수들의 집합"
    l = int(log10(n)) + 1
    s = f"{n}{n}"
    return set(int(s[i : l + i]) for i in range(l))


def seive(n: int) -> list[int]:
    s = [True] * (n + 1)
    s[:2] = [False, False]
    for i in range(2, int(n**0.5) + 1):
        if s[i]:
            s[i * 2 :: i] = [False] * ((n - i) // i)
    return [i for (i, x) in enumerate(s) if x]


@timeit
def main():
    s = seive(100_0000)
    x = set(s)
    res = 0
    for p in s:
        ps = shift(p)
        if ps < x:
            res += 1
    print(res)


if __name__ == "__main__":
    main()
