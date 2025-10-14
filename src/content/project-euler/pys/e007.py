from euler import isprime, timeit

@timeit
def main():
    i, j = 1, 1
    while i < 10001:
        j += 2
        if isprime(j):
            i += 1
    print(j)


if __name__ == '__main__':
    main()
