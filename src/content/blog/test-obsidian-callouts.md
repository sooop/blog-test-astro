---
title: Obsidian Callout 테스트
slug: test-obsidian-callouts
published_date: 2025-11-05
modified_date: 2025-11-06T09:47:05.000Z
status: published
tags:
  - test
  - obsidian
  - callout
description: Obsidian callout plugin test page
created_at: 2025-11-06T09:47:05.000Z
---

이 페이지는 옵시디언 콜아웃 플러그인의 모든 기능을 테스트하기 위한 페이지입니다.

## 기본 콜아웃 (토글 없음)

> [!note]
> 이것은 기본 note 콜아웃입니다. 토글 기호가 없으므로 항상 펼쳐진 상태로 유지됩니다.
> 여러 줄을 지원하며, **마크다운** 문법도 `사용할 수 있습니다`.

> [!tip] 유용한 팁
> 이 콜아웃은 커스텀 제목을 가지고 있습니다.
> 제목을 지정하지 않으면 타입명이 제목으로 사용됩니다.

## 접기 가능한 콜아웃 (기본 펼침)

> [!info]+ 기본으로 펼쳐진 콜아웃
> `+` 기호를 사용하면 기본적으로 펼쳐진 상태로 표시되지만,
> 사용자가 접을 수 있습니다.

> [!success]+ 성공 메시지
> 작업이 성공적으로 완료되었습니다!
> - 항목 1
> - 항목 2
> - 항목 3

## 접기 가능한 콜아웃 (기본 접힌 상태)

> [!warning]- 경고 메시지
> `-` 기호를 사용하면 기본적으로 접힌 상태로 표시됩니다.
> 클릭하면 내용을 볼 수 있습니다.

> [!danger]- 위험
> 이 작업은 위험할 수 있습니다.
> 신중하게 진행하세요.

## 모든 타입 테스트

### Note

> [!note]
> 기본 노트 콜아웃입니다.

### Abstract, Summary, TLDR

> [!abstract]
> Abstract 콜아웃입니다.

> [!summary]
> Summary 콜아웃입니다 (abstract의 별칭).

> [!tldr]
> TLDR 콜아웃입니다 (abstract의 별칭).

### Info, Todo

> [!info]
> 정보를 제공하는 콜아웃입니다.

> [!todo]
> 할 일 목록입니다 (info의 별칭).

### Tip, Hint, Important

> [!tip]
> 유용한 팁입니다.

> [!hint]
> 힌트입니다 (tip의 별칭).

> [!important]
> 중요한 정보입니다 (tip의 별칭).

### Success, Check, Done

> [!success]
> 성공적으로 완료되었습니다.

> [!check]
> 체크 완료 (success의 별칭).

> [!done]
> 완료되었습니다 (success의 별칭).

### Question, Help, FAQ

> [!question]
> 질문이 있으신가요?

> [!help]
> 도움말입니다 (question의 별칭).

> [!faq]
> 자주 묻는 질문입니다 (question의 별칭).

### Warning, Caution, Attention

> [!warning]
> 주의가 필요합니다.

> [!caution]
> 주의하세요 (warning의 별칭).

> [!attention]
> 주목해주세요 (warning의 별칭).

### Failure, Fail, Missing

> [!failure]
> 실패했습니다.

> [!fail]
> 실패 (failure의 별칭).

> [!missing]
> 누락되었습니다 (failure의 별칭).

### Danger, Error

> [!danger]
> 위험합니다!

> [!error]
> 오류가 발생했습니다 (danger의 별칭).

### Bug

> [!bug]
> 버그가 발견되었습니다.

### Example

> [!example]
> 예제 코드입니다.

### Quote, Cite

> [!quote]
> 인용문입니다.

> [!cite]
> 출처 (quote의 별칭).

## 복잡한 콘텐츠 테스트

> [!example]+ 코드 블록 포함
> 콜아웃 안에 코드 블록을 넣을 수 있습니다:
>
> ```python
> def fibonacci(n):
>     if n <= 1:
>         return n
>     return fibonacci(n-1) + fibonacci(n-2)
> ```
>
> 이렇게 코드 하이라이팅도 정상적으로 작동합니다.

> [!note]+ 리스트 포함
> 콜아웃 안에 리스트를 넣을 수 있습니다:
>
> 1. 첫 번째 항목
> 2. 두 번째 항목
>    - 중첩된 항목 1
>    - 중첩된 항목 2
> 3. 세 번째 항목
>
> 순서 없는 리스트도 가능합니다:
>
> - 항목 A
> - 항목 B
> - 항목 C

> [!info]+ 블록쿼트 포함
> 콜아웃 안에 일반 블록쿼트를 넣을 수 있습니다:
>
> > 이것은 일반 블록쿼트입니다.
> > 콜아웃 내부에서도 렌더링됩니다.
>
> 중첩된 콜아웃은 지원하지 않습니다.

> [!tip]+ 제목에 **마크다운** 사용
> 제목에 마크다운 문법을 사용할 수 있습니다.
> 내용도 물론 **강조**, *기울임*, `코드`를 모두 지원합니다.

## 커스텀 타입 테스트

> [!custom-type]
> 정의되지 않은 타입은 자동으로 note 타입으로 폴백됩니다.

> [!unknown]+ 알 수 없는 타입
> 이것도 note 스타일로 렌더링됩니다.

## 연속된 콜아웃

> [!note]
> 첫 번째 콜아웃

> [!warning]
> 두 번째 콜아웃

> [!tip]
> 세 번째 콜아웃

콜아웃 사이에 일반 텍스트가 없어도 정상적으로 렌더링됩니다.

## 수학 공식과 함께

> [!example] 수학 공식
> 피보나치 수열의 일반항은 다음과 같습니다:
>
> $$F_n = \frac{\phi^n - \psi^n}{\sqrt{5}}$$
>
> 여기서 $\phi = \frac{1+\sqrt{5}}{2}$는 황금비입니다.
