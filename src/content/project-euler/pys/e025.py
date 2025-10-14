from euler import timeit
from math import log10

@timeit
def main():
    a, b, c = 1, 1, 1
    while log10(a) < 999:
        a, b, c = b, a + b, c + 1
    print(c)

if __name__ == '__main__':
    main()
