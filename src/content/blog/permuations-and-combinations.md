---
created_at: 2021-04-24T10:57:00.000Z
feature_image: https://images.unsplash.com/photo-1673245886349-6b0cae152c50?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDR8fGJhbGxzfGVufDB8fHx8MTczMDUxODI1Mnww&ixlib=rb-4.0.3&q=80&w=2000
published_date: 2024-11-02T12:00:50.000Z
slug: permuations-and-combinations
status: published
title: 순열 조합 생성하기
modified_date: 2025-10-23T15:14:15.000Z
custom_excerpt: 순열, 조합 등 itertools 패키지의 도구들을 간단하게 직접 구현해보기
updated: 2025-10-23T15:11:05.000Z
---

파이썬의 `itertools` 모듈은 효율적인 반복작업을 위한 도구들을 제공합니다. 여러 연속열을 합쳐주는 `chain(*xs)`, 같은 연속열을 계속 반복할 수 있는 `cycle(*xs)` 등의 여러 유용한 함수들과 더불어 특정한 집합의 요소들로 만들 수 있는 모든 순열과 조합을 생성하는 `permutations()`, `combinations()`도 있습니다. 파이썬의 표준 라이브러리가 제공하는 이러한 도구들은 매우 효율적으로 구현되어 빠르게 작동합니다. 

`itertools` 모듈에 포함된 함수들을 사용하면 순열, 조합, 중복조합이나 중복순열을 쉽게 구할 수 있습니다. 그런데 중복을 포함하는 집합에서 고유한 순열을 구하는 기능은 itertools에서 제공하지 않습니다. 그래서 순열 및 조합을 생성하는 제너레이터를 파이썬으로 직접 구현해보고 중복된 원소를 포함하는 집합에 대한 순열 생성 기능까지 작성해보도록 하겠습니다. 

## 순열 생성기

우리가 경우의 수를 따질 때 생각해보는 방식은 떠올려 봅시다. A, B, C를 줄 세우는 방법을 모두 구한다고 생각해 보겠습니다. 셋 중에 하나를 맨 첫번째 원소로 정합니다. 각각의 경우에 대해 다시 남은 두 개로 줄을 만드는 모든 방법들을 구해서, 각 방법에 이미 뽑아 놓은 요소를 맨 앞에 붙입니다. 이렇게 각 단계에서 해야 할 일이 여러 단계를 거쳐 반복되는 구조는 재귀를 통해서 구현하기가 쉽습니다. 

대신에 '남은 요소로 만드는 모든 경우에 대해 앞 원소를 붙이는 방식'이 아니라, '지금까지 결정된 줄의 앞부분'을 계속 아래 단계로 전달해서 뒷 요소를 붙여 나가는 방식을 사용하겠습니다. 이렇게하면 재귀를 통해 가장 낮은 레벨까지 내려간 후에 다시 위쪽 레벨로 거슬러 올라갈 필요 없이, 가장 낮은 레벨에서 완성된 경우를 리턴하도록 하는 것이 좋습니다. `yield from` 구문을 사용하면 제너레이터를 재귀적으로 구현할 수 있기에 이 구문을 사용할 것입니다. 

1. 제너레이터 함수는 `(acc, remains, k)`의 세 가지 인자를 받습니다. `acc`는 지금까지 뽑힌 요소들의 집합입니다. `remains`는 원래의 집합에서 아직 선택되지 않은 요소들의 집합입니다. `k`는 더 뽑아야할 요소의 수를 말합니다. 
2. k가 0이 되면 더 이상 뽑을 것이 없습니다. `acc`를 `yield`하고 리턴합니다. 
3. `remains`에서 순서대로 하나씩 뽑고, 그것을 `acc`의 맨 뒤에 추가한 다음, 제너레이터를 재귀적으로 호출합니다. 

이런 제너레이터를 헬퍼 함수로 만든 다음, `(빈 리스트, 원래의 집합, 뽑을 개수)`를 전달하면 됩니다. 너무 간단해서 약간 속는 기분인데, 코드는 다음과 같습니다. 

```python
from typing import Generator

def permutations[T](xs: list[T], k: int=0) -> Generator[list[T], None, None]:
    """모든 순열을 생성하는 제너레이터"""
    def helper(acc: list[T], remains: list[T], k: int) -> Generator[T, None, None]:
        if k == 0:
            yield acc
            return
        for (i, x) in enumerate(remains):
            yield from helper([*acc, x], [*remains[:i], *remains[i+1:]], k - 1)
            
    yield from helper([], xs, k if k > 0 else len(xs))
```


## 조합 생성기

순열은 선택된 원소들의 순서가 중요하지만, 조합은 순서를 고려하지 않습니다. 만약 모든 순열의 경우를 가지고 있다면, 모든 경우를 정렬하여 중복을 제거하면 조합이 됩니다. 즉, 이전 경우에서 한 번 사용된 요소를 다시 사용하지 않도록 하면 됩니다. 이것은 사용여부에 대한 정보를 따로 가지고 있어야 하는 것처럼 생각되지만, 위 코드를 보면 보다 명확한 해결책이 보입니다. 아랫 단계의 `helper`를 호출할 때, `remains`에서 이전 요소들을 제외하고 넘겨주는 것입니다. 그렇게하면 조합 생성기는 항상 정렬된 결과만을 리턴할 것입니다. 


```python
from typing import Generator

def combinations[T](xs: list[T], k: int=0) -> Generator[list[T], None, None]:
    """모든 조합을 생성하는 제너레이터"""
    def helper(acc: list[T], remains: list[T], k: int) -> Generator[T, None, None]:
        if k == 0:
            yield acc
            return
        for (i, x) in enumerate(remains):
            yield from helper([*acc, x], remains[i+1:], k - 1)
            
    yield from helper([], xs, k if k > 0 else len(xs))
```

## 중복된 조합 생성기는

중복된 조합 생성기는 요소를 중복으로 선택할 수 있는 조합을 말합니다. `['A', 'B', 'C', 'D', 'E']`에서 중복을 허용하여 2개씩 조합을 만든다면 "AA"나 "BB" 같은 것을 허용한다는 것입니다. 이 때에도 여전히 조합이어서 모든 결과물은 정렬되어 있지만, 직전에 선택했던 요소가 한 번 더 선택될 수 있다는 차이점이 있습니다, 즉 조합 생성기 코드와 거의 유사하고 딱 한 부분만 다른 코드가 됩니다.


```python
from typing import Generator

def combinations_with_replacement[T](xs: list[T], k: int=0) -> Generator[list[T], None, None]:
    """모든 중복 조합을 생성하는 제너레이터"""
    def helper(acc: list[T], remains: list[T], k: int) -> Generator[T, None, None]:
        if k == 0:
            yield acc
            return
        for (i, x) in enumerate(remains):
            yield from helper([*acc, x], remains[i+1:], k - 1)
            
    yield from helper([], xs, k if k > 0 else len(xs))
```

## 중복 순열 생성하기 

중복 순열은 "AAB", "ABA", "BAA" 등과 같이 주어진 요소를 한 번 이상 뽑을 수 있습니다. 이는 모든 요소의 뽑아야 하는 원소 개수 만큼의 데카르트 곱으로 구할 수 있습니다. 사실 i 번째에 뽑을 수 있는 요소는 계속해서 n개이기 때문에 순열의 코드에서 약간만 수정하면 됩니다.

```python
from typing import Generator

def permutations_with_replacement[T](xs: list[T], k: int=0) -> Generator[list[T], None, None]:
    """모든 중복 순열을 생성하는 제너레이터"""
    def helper(acc: list[T], remains: list[T], k: int) -> Generator[T, None, None]:
        if k == 0:
            yield acc
            return
        for (i, x) in enumerate(remains):
            yield from helper([*acc, x], remains, k - 1)
            
    yield from helper([], xs, k if k > 0 else len(xs))
```

## 중복을 포함하는 집합의 순열

`[A, A, A, B, B]`와 같이 중복된 원소가 일정한 개수만큼만 포함되어 있는 경우의 순열은 어떻게 구할까요? 중복을 방지하지만, 다른 요소와의 차이를 생각해야하기 때문에 상당히 복잡하고 까다롭게 여겨집니다. 그러나 앞서 구현했던 코드들이 모두 "남아있는 것 중 하나의 원소를 정하고, 나머지 목록에서 이후 분기들을 만든다"는 개념으로 접근하면 간단합니다. A 3개, B 2개에서 A를 하나 선택했다면 남은 목록은 A 2개, B 2개가 됩니다. 이렇게 각 원소와 개수의 정보를 만들어야 하니, `collections.Counter`를 사용하면 간단하게 해결할 수 있습니다. 

```python
def permutations_with_duplicates[T](
    xs: Sequence[T],
) -> Generator[tuple[T, ...], None, None]:
    def helper(
        acc: tuple[T, ...], remains: dict[T, int], k: int = 0
    ) -> Generator[tuple[T, ...], None, None]:
        if k == 0:
            yield acc
            return
        for key, cnt in remains.items():
            yield from helper((*acc, key), {**remains, key: cnt - 1}, k - 1)

    yield from helper((), Counter(xs), len(xs))
```
