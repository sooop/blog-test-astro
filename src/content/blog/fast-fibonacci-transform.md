---
created_at: '2015-10-10T06:00:13.000Z'
feature_image: https://images.unsplash.com/photo-1711075781376-bc5107736730?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDh8fGZpYm9uYWNjaXxlbnwwfHx8fDE3MzAwMTE4NTl8MA&ixlib=rb-4.0.3&q=80&w=2000
published_at: '2024-10-27T12:00:21.000Z'
slug: fast-fibonacci-transform
status: published
title: 빠른 피보나치 변환
modified_date: '2024-10-27T12:00:20.000Z'
---

아주 큰 N에 대한 피보나치 일반항 찾기

피보나치 수열의 일반항에 대한 프로젝트 오일러 문제가 몇 개 있었고, 해당 문제를 다루는 포스트에서 이미 재귀로 구현하는 경우 시간복잡도가 커서 성능이 매우 좋지 못하고, 따라서 메모이제이션이나, 혹은 앞에서부터 루프를 돌면서 구하는 방법을 사용해서 문제를 풀었습니다.

그런데 순차적으로 계산하여 N번째 항을 찾아내더라도, N이 충분히 크다면, 예를 들어 4백만 이하의 피보나치 수가 아니라, 4백만 번째 피보나치 수를 찾아야 할 때, 이를 빠르게 구할 수 있는 방법이 있을까요?

루프를 진행하면서 다음 항을 찾아나가는 수식에서 a, b = b, a + b 가 있습니다. 이 식을 행렬을 사용해서 표현하면 아래와 같습니다. 

$$ \begin{bmatrix} a \ b \end{bmatrix} \times \begin{bmatrix} 0 & 1 \\ 1 & 1 \end{bmatrix} = \begin{bmatrix} b & a + b \end{bmatrix} $$

여기서 [b, a + b] 에 대해서도 동일한 행렬을 곱하면 그 다음 항을 얻을 수 있죠.  

$$ \begin{bmatrix} 0 & 1 \end{bmatrix} \times \begin{bmatrix} 0 & 1 \\ 1 & 1 \end{bmatrix} \times \begin{bmatrix} 0 & 1 \\ 1 & 1 \end{bmatrix}\times \cdots \times \begin{bmatrix} 0 & 1 \\ 1 & 1 \end{bmatrix} = \begin{bmatrix} fib(n-1) & fib(n) \end{bmatrix} $$

2 x 2 행렬을 거듭제곱하여 [a, b]에 곱해주면 n-1, n 번째 피보나치 항을 알 수 있습니다. 행렬의 거듭제곱을 빠르게 계산해내면 그만큼 간단한 식을 만들 수 있습니다. 

$$ \begin{bmatrix}a & b \end{bmatrix} \times \begin{bmatrix} 0 & 1 \\ 1 & 1\end{bmatrix}^{(n-1)} = \begin{bmatrix} F_{n-1} & F_n \end{bmatrix} $$

위 등식의 원리를 이용해서, 피보나치 수열의 관계식을 정의하는 행렬의 곱 및 거듭제곱을 계산하는 함수를 만들어 빠른 피보나치 일반항 함수를 완성할 수 있습니다. 

이 함수를 활용하면 백 만 번째 피보나치 수열의 항을 구할 수 있습니다만, 사실 구하더라도 정상적으로 출력이 되지 않을 수 있습니다. 파이썬은 '큰 수'에 대한 연산을 자동으로 지원하고는 있지만, 기본적으로 하나의 정수가 출력될 수 있는 자리수는 4300자리 정도 됩니다. 백 만 번째 피보나치 수는 20만 자리가 넘는 거대한 수이기 때문에, 웹페이지 하나에 출력하는 것도 벅찰 수 있습니다.