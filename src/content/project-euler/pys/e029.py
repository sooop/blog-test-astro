from math import log

def lower_base(a: int, b: int) -> tuple[int, int]:
    """a의 b거듭제곱을 더 작은 밑을 가진 지수 표현으로 변환"""
    for i in range(2, a):
        j = int(log(a, i))
        if i ** j == a:
            return (i, b * j)
    return (a, b)


print(len(set(lower_base(x, y) for x in range(2, 101) for y in range(2, 101))))
