---
created_at: '2025-10-20T09:54:12.000Z'
published_date: '2025-06-13T21:00:20.000Z'
slug: svelte-5-await
status: published
title: Svelte 5 - await directive
modified_date: '2025-06-13T21:00:20.000Z'
---

Svelte 5.36부터 컴포넌트 내부에서 `await` 키워드를 사용할 수 있습니다. 이 키워드가 허용되는 위치는 아래와 같습니다.

* `<script>` 요소 내부의 최상위 레벨
* `$derived(...)` 룬 내부
* 마크업 내부

이 기능은 현재(2025년 10월) 실험적 기능이며, `svelte.config.js` 파일에서 `experimental.async` 옵션을 설정해야 합니다. 

## 업데이트 동기화

`await` 구문이 특정한 상태값에 의존하고 있다면, 이 비동기 작업이 완료되어야 UI 업데이트가 일어나게 됩니다. 

```html
<script>
let a = $state(1);
let b = $state(2);

async function add(a, b) {
	await new Promise((f) => setTimeout(f, 500));
	return a + b;
}
</script>

<input type="number" bind:value={a}/>
<input type="number" bind:value={b}/>

<p>{a} + {b} = {await add(a, b)}</p>
```

위 코드에서 `await` 구문은 상태 `a`, `b`에 모두 의존하고 있어서 `add(a, b)`가 완료되기 전까지는 `{a}`, `{b}`의 UI 업데이트도 즉시 이루어지지 않고 지연됩니다. 이를 통해 "2 + 2 = 3"과 같은 불일치를 피할 수 있습니다. 

## 동시성

마크업에서 `await`를 사용하면 여러 작업을 동시에 진행할 수 있습니다. 순차적으로 사용된 `await` 구문은 각각이 독립적인 표현식이라면 시각적으로는 순차작업처럼 보이지만 실제로는 동시에 실행됩니다. (아마도 먼저 완료된 값의 업데이트가 먼저 일어나기 때문에 동시에 실행된다고 보는 것 같습니다.)

`<script>` 범위 내에서는 비동기 코드는 일반적인 `async` 함수와 동일하게 작동합니다. 다만 `$derived()`는 처음 생성됐을 때를 제외하고는 독립적으로 업데이트됩니다.

## 로딩 상태를 표시하기

플레이스 홀더 UI를 표시하기 위해서는 콘텐츠를 `<svelte:boundary>`로 감싸고 `pending` 스니펫을 사용할 수 있습니다. 

```svelte
<script>
let name = $state('world');
let count = $state(0);
async function getGreet() {
	await new Promise((g) => setTimeout(g, 1500));
	return 'hello, world'
}
</script>

<h1>Hello {name}!</h1>

<svelte:boundary>
	<p>{await getGreet()}</p>
	{#snippet pending()}
		<span>loading...</span>
	{/snippet}
</svelte:boundary>
```
### `<svelte:boundary>`의 용도

원래 이 기능의 용도는 특정 지점에서 발생한 에러를 잡아서 앱 전체가 크래시되지 않도록 하는데 있습니다. `<svelte:boundary>` 태그 내부에서 `{#snippet pending()} ... {/snippet}`을 작성하면 표현식 내부에서 아직 resolve 되지 않은 Promise를 참조했을 때, 단 한 번만 임시 UI를 표현할 수 있습니다. 사실 동적으로 로드되는 UI에 대해 스켈레톤 UI를 표시하고 싶다면 `<svelte:boundary>`보다는 `{#await}` 블럭을 사용하는 것이 더 적합하다 하겠습니다. 