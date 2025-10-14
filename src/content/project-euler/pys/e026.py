

def divs(d: int) -> tuple[int, int, list[int]]:
    ''' 1/d를 계산하여 순환마디의 길이와 순환마디를 구합니다.'''
    A = 1
    rs = []
    ns = []
    while True:
        x, y = divmod(A, d)

        if y == 0:
            # 나머지가 0이면 순환마디 없음
            return (0, d, [])

        if y in rs:
            # 중복된 나머지가 나타났다면,
            # 이전까지의 나머지 목록을 버리고 반환
            begin = rs.index(y)
            end = len(rs)
            return (end - begin, d, rs[begin:end])

        ns.append(x)
        rs.append(y)

        A = y * 10

print(max(divs(i+1)[:2] for i in range(1000)))
