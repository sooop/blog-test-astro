from euler import factorize, timeit, prod

def cf(n):
    xs = factorize(n)
    if not xs:
        return 1
    return prod(x[1]+1 for x in xs)


@timeit
def main():
    n = 2
    while True:
        p = n * (n + 1) // 2
        if cf(p) >= 500:
            print(p)
            return
        n += 1

main()
