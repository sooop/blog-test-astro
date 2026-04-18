---
title: 디자인 쇼케이스
slug: design-showcase
order: 1
published_date: 2026-04-18
custom_excerpt: 신규 UI 기능들을 한 곳에 모아 확인하는 테스트 포스트.
---

## 코드 블록 (Shiki 듀얼 테마 + 복사 버튼)

```typescript
interface User {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}
```

```python
def fibonacci(n: int) -> int:
    """피보나치 수를 메모이제이션으로 계산."""
    memo: dict[int, int] = {}
    
    def fib(k: int) -> int:
        if k <= 1:
            return k
        if k not in memo:
            memo[k] = fib(k - 1) + fib(k - 2)
        return memo[k]
    
    return fib(n)
```

## 인라인 코드 & 키 표현

`API_KEY`, `user_name`, `__init__` 같은 식별자는 `_` 가 있어도 em으로 변환되지 않습니다.

단축키 예시: ++Ctrl+S++ 저장, ++Ctrl+Shift+P++ 명령 팔레트, ++Alt+F4++ 종료, ++Cmd+Z++ 실행 취소.

`const x = 42;` 인라인 코드는 기존보다 차분한 스타일.

## Obsidian 스타일 콜아웃

> [!note] 일반 노트
> CommonMark 표준 blockquote는 영향받지 않으며, Obsidian `> [!type]` 문법만 콜아웃으로 변환됩니다.

> [!tip]+ 팁 (접기 가능)
> `++Ctrl+/++` 를 누르면 현재 줄이 주석 처리됩니다.

> [!warning] 주의사항
> 프로덕션 환경에서는 `DEBUG_MODE`를 반드시 `false`로 설정하세요.

> [!danger] 위험
> 이 API는 되돌릴 수 없는 데이터 삭제를 수행합니다.

> [!success] 완료
> 모든 테스트가 통과되었습니다.

> [!info] 정보
> 자세한 내용은 공식 문서를 참고하세요.

> [!question] 질문
> `async`/`await`와 Promise의 차이는 무엇인가요?

> [!failure] 실패
> 연결에 실패했습니다. 네트워크를 확인하세요.

> [!bug] 버그
> `__proto__` 접근 시 예상치 못한 동작이 발생합니다.

> [!example] 예시
> 아래 코드는 함수형 패턴의 전형적인 예시입니다.

> [!quote] 인용
> "복잡성은 적의 한 형태다." — 라이너스 토르발즈

> [!abstract] 요약
> 이 논문은 transformer 아키텍처의 self-attention 메커니즘을 분석합니다.

## :::note 디렉티브 문법

:::info[새로운 콜아웃 문법]
`:::type[Title]` ... `:::` 형식으로도 콜아웃을 작성할 수 있습니다. Obsidian 문법과 동일한 HTML 구조로 변환됩니다.
:::

:::warning[호환성 참고]
기존 `> [!note]` 문법과 `:::note[title]` 문법은 완전히 동등합니다. 선호하는 방식을 사용하세요.
:::

:::tip[접기 가능한 팁]{open}
`:::tip[title]{open}` 처럼 `{open}` 속성을 붙이면 기본 펼침 접기 가능한 콜아웃이 됩니다.
:::

:::danger[기본 접힘]{closed}
`{closed}` 속성을 붙이면 기본적으로 접혀 있는 콜아웃이 됩니다.
:::

## 언더스코어 보호 테스트

- `API_KEY`, `user_name`, `__init__`, `_private`, `__dunder__` — 인라인 코드 내 식별자
- 본문에서도: API_KEY, user_name, __init__ 는 em/strong으로 변환되지 않아야 합니다.
- *별표 이탤릭*과 **별표 볼드**는 정상 작동해야 합니다.

## 이미지 (라이트박스 테스트)

이미지를 클릭하면 라이트박스가 열립니다.

## 블록쿼트 (일반)

> 이것은 일반 blockquote입니다. 콜아웃이 아닙니다.
> 여러 줄에 걸쳐 작성할 수 있습니다.

## 표

### 범용 표 (텍스트)

| 언어 | 패러다임 | 타입 시스템 |
|------|---------|------------|
| TypeScript | 다중 패러다임 | 정적 |
| Python | 다중 패러다임 | 동적 |
| Haskell | 함수형 | 정적 |
| Clojure | 함수형/Lisp | 동적 |

### 데이터 표 (숫자 우측 정렬 → monospace)

| 알고리즘 | 시간 복잡도 | 공간 복잡도 | 비고 |
|---------|----------:|----------:|------|
| 버블 정렬 | O(n²) | O(1) | 안정 |
| 합병 정렬 | O(n log n) | O(n) | 안정 |
| 퀵 정렬 | O(n log n) | O(log n) | 불안정 |
| 힙 정렬 | O(n log n) | O(1) | 불안정 |

### 벤치마크 (숫자 비교)

| 라이브러리 | 번들 크기 (gzip) | 초기 로딩 | 업데이트 |
|-----------|----------------:|----------:|---------:|
| React 18 | 45.2 KB | 12.4 ms | 3.1 ms |
| Svelte 5 | 9.8 KB | 4.7 ms | 1.2 ms |
| Vue 3 | 22.1 KB | 7.9 ms | 2.3 ms |
| Solid | 7.3 KB | 3.8 ms | 0.8 ms |
