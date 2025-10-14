from euler import timeit

def check(n):
    s = str(n)
    b = bin(n)[2:]
    return s == s[::-1] and b == b[::-1]

@timeit
def main():
    print(sum(x for x in range(1, 100_0000, 2) if check(x)))

if __name__ == '__main__':
    main()
