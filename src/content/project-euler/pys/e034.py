from euler import timeit

fs = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880]

def orange(n):
    return sum(fs[int(c)] for c in str(n))

@timeit
def main():
    sum(x for x in range(1, 1819441) if orange(x) == x)

if __name__ == '__main__':
    main()

for x in range(1, 1819441):
    if x == orange(x):
        print(x)
