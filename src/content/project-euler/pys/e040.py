from euler import timeit
from math import log10

def champ():
    i, j = 1, 1
    while True:
        for c in str(i):
            yield (j, int(c))
            j += 1
        i += 1

@timeit
def main():
    k = 0
    res = 1
    for (x, y) in champ():
        if x == 10**k:
            res *= y
            k += 1
            if k > 6:
                break
    print(res)

@timeit
def main2():
    res, idx, n, step = 1, 0, 1, 0
    while step < 6:
        idx += int(log10(n) + 1)
        if idx >= 10**step:
            res *= int(str(n)[10**step - idx - 1])
            step += 1
        n += 1
    print(res)


main()
main2()
