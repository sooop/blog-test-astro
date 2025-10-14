from euler import timeit


def ispenta(p):
    n = ((24 * p + 1)**0.5 + 1) / 6
    return n == int(n)


@timeit
def main2():
    n = 2
    while True:
        k = n * ( 3 * n - 1) // 2
        for m in range(n - 1, 0, -1):
            j = m * (3 * m - 1) // 2
            if ispenta(j + k) and ispenta(k - j):
                print(k -j)
                return
        n += 1






def penta():
    k = 1
    while True:
        yield k * ( 3 * k - 1) // 2
        k += 1

@timeit
def main():
    g = penta()
    ws = [next(g) for _ in range(10)]
    ps = set(ws)
    res, done = -1, False

    while not done:
        p = next(g)
        for s in ws[::-1]:
            t = p - s
            if t in ps and abs(t - s) in ps:
                res = abs(t - s)
                done = True
                break
        else:
            ws.append(p)
            ps.add(p)

    print(res)


main()
main2()
