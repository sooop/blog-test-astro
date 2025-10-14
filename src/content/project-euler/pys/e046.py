from euler import timeit, factorize

@timeit
def main():
    n = 2 * 3 * 5 * 7
    j = 0
    while j < 4:
        j = (j + 1) if len(factorize(n)) == 4 else 0
        n += 1
    print(n-4, factorize(n-4))

main()
