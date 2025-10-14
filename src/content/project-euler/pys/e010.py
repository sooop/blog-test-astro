from euler import timeit, isprime
def g():
    k = 5
    while True:
        yield k
        yield k + 2
        k += 6

def isprime2(n):

    if n < 2:
        return False
    if n < 4:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    if n < 9:
        return True
    l = n ** 0.5
    for k in g():
        if n % k == 0:
            return False
        if k > l:
            return True



@timeit
def main():
    return sum(filter(isprime, range(200_0000)))
    # return 2 + sum(x for x in range(3, 200_0000, 2) if isprime2(x))

@timeit
def main2():
    # return sum(x for x in range(200_0000) if isprime(x))
    return 2 + sum(filter(isprime2, range(3, 200_0000, 2)))


def sieve(n: int) -> list[int]:
  s = [1] * (n + 1)
  s[:2] = [0, 0]   # 0, 1은 소수아님
  for i in range(2, int(n ** 0.5 + 1.5)):
    if s[i]:
      s[2*i::i] = [0] * ((n - i) // i)
  return [i for (i, x) in enumerate(s) if x]

@timeit
def main3():
    print(sum(sieve(200_0000)))

main3()
