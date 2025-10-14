from itertools import permutations
from euler import isprime, timeit

def check(n=7):
    for xs in permutations(f'{c}' for c in range(n, 0, -1)):
        x = int(''.join(xs))
        if isprime(x):
            print(x)
            return True
    return False


@timeit
def main():
    for k in (7, 4):
        if check(k):
            return


if __name__ == '__main__':
    main()
