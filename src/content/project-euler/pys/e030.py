from euler import timeit

ls = [n ** 5 for n in range(10)]

def mandoo(n: int) -> int:
    return sum(int(x)**5 for x in str(n))


@timeit
def main():
    print(sum(x for x in range(10, 9**5*5+1) if x == mandoo(x)))

if __name__ == '__main__':
    main()
