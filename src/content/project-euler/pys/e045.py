from euler import timeit, isprime


def test(m: int) -> bool:
    if isprime(m):
        return False
    l = int(((m - 2) / 2) ** 0.5 + 1.5)
    for i in range(1, l):
        p = m - (i * i) * 2
        if isprime(p):
            return False
    return True


@timeit
def main():
    m = 9
    while True:
        if test(m):
            print(m)
            break
        m += 2


if __name__ == '__main__':
    main()
