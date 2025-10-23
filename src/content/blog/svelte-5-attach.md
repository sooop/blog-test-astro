---
created_at: 2025-06-06T09:54:12.000Z
published_date: 2025-06-13T21:00:20.000Z
slug: svelte-5-attach
status: published
title: Svelte 5 Attachment
modified_date: 2025-10-23T15:14:07.000Z
custom_excerpt: 이전에 `use:`로 사용되던 기능이 반응성 블럭으로 업그레이드 되었습니다.
updated: 2025-10-23T15:11:05.000Z
---
`use:`는 특정한 HTML 요소가 마운트될 때 지정된 함수(액션이라고 부릅니다)를 호출하여 해당 요소에 어떤 기능을 부여하거나 외부 라이브러리를 적용할 수 있는 기능입니다. 이는 Svelte용으로 따로 배포되지 않은 외부 라이브러리를 그대로 사용할 수 있도록 해주는 매력적인 기능입니다.

Svelte 5에서는 기존의 `use:` 지시어 사용의 불편한 점을 해소하고 더욱 유연하고 강력한 기능을 제공할 수 있도록 attachment라는 기능을 소개하고 있습니다. 이는 `{@attach }` 블록을 통해 사용할 수 있습니다. `{@attach}`는 기존 `use:` 지시어와 유사한 기능을 제공하지만 몇 가지 측면에서 완전히 새로운 차이가 있습니다.

먼저 `{@attach }` 블록은 이펙트(`$effect`) 내에서 실행되며, 함수로 전달하는 인자가 상태 변수인 경우 그 변화를 감지하여 재실행될 수 있습니다.

1. `{@attach }` 블록을 적용한 요소는 DOM에 마운트될 때 어태치먼트 함수를 호출합니다.
2. 해당 요소가 마운트 해제될 때 어태치먼트 함수가 반환한 정리 함수가 호출됩니다.
3. attach 블록 내의 반응형 상태가 변경되면 이펙트와 유사하게 정리 함수가 호출된 후 어태치먼트 함수가 자동으로 재호출됩니다.

이러한 과정을 통해 `use:`를 사용할 때처럼 `update()` 함수를 반환해야 하거나, 액션 내에서 별도의 이펙트를 제어해야 하는 번거로움을 제거합니다.

## use: 지시어와의 비교

아래 코드는 `use:` 지시어를 사용해서 버튼 요소에 외부 라이브러리인 "Tippy"를 사용하여 툴팁 메시지를 추가하는 예입니다.

```javascript
<script>
import tippy from 'tippy.js';

function tooltip(node, message) {
	const tp = tippy(node, {content: message});
	return {
		destroy() {
			tp.destroy();
		}
	};
}

let message = 'hello world!';
</script>

<button use:tooltip={message}>hover me</button>
```

아래는 동일한 기능을 `@attach`를 사용하여 구현하는 예입니다. 어태치먼트 함수는 인자를 직접 받는 형태로 작성하기 때문에, 어태치먼트 함수를 작성하는 패턴이 `use:`를 사용할 때와 약간 달라집니다. 그리고 `greet` 상태값이 변경될 때 자동으로 감지됩니다.

```javascript
<script>
import tippy from 'tippy.js';

function tooltip(content) {
	return (node) => {
		const tp = tippy(node, {content});
		return tp.destroy;
	};
}

let greet = $state("hello");
</script>

<input bind:value={greet} />
<button {@attach tooltip(greet)}>hover me!</button>
```

tippy와 같은 외부 라이브러리를 사용할 때 `use:`를 사용하던 것은 거의 그대로 대체가 됩니다. 다만 어태치먼트 함수는 인자를 하나밖에 받지 못하기 때문에 위와 같은 팩토리 패턴으로 함수를 작성해야 합니다.

만약 기존에 `use:`를 사용하여 적용한 액션을 어태치먼트로 변경하려는 경우, `svelte/attachments` 라이브러리의 `fromAction()` 유틸리티 함수를 사용하면 자동으로 변환할 수 있습니다.

## 컴포넌트에 적용하기

`use:`는 DOM 요소에 대해서만 액션을 적용할 수 있는 한계가 있습니다. 그렇지만 어태치먼트는 Svelte 컴포넌트에도 적용하는 것이 가능합니다. 어태치먼트를 적용받을 자식 컴포넌트 내에서 이 액션을 적용받을 노드가 지정되어야 합니다. 어태치먼트는 자식 컴포넌트에게 props로 전달되므로, 해당 속성을 그대로 넘겨주면 됩니다.

```svelte
<!-- 어태치먼트를 적용받을 컴포넌트 -->

<script lang="ts">
import type {HTMLButtonAttributes} from 'svelte/elements';

let {children, ...props}: HTMLButtonAttributes = $props();
</script>

<!-- `props`에 어태치먼트가 포함되어 있음 -->
<button {...props}>
	{@render children?.()}
</button>
```

```svelte
<script lang="ts">
import tippy from 'tippy.js';
import Button from './Button.svelte';
import type { Attachment } from 'svelte/attachment';

let content = $state('hello');

function tooltip(content: string): Attachment {
	return (element) => {
		const tp = tippy(element, { content });
		return tp.destroy;
	};
}
</script>

<input bind:value={content} />
<Button {@attach tooltip(content)}>Hover me</Button>
```

이펙트 및 다른 라이프사이클 메서드들의 호출 순서는 다음과 같습니다. 부모 요소에서 지정한 어태치먼트는 자식 컴포넌트의 `onMount`보다 앞서 호출됩니다.

1. `$effect.root`: 라이프사이클과 무관하게 컴포넌트 로드 시 호출
2. `$effect.pre`: DOM 업데이트 이전에 호출
3. `attachment`: attachment는 onMount에 앞서서 호출됩니다.
4. `onMount`
5. `$effect`: `onMount`와 `$effect`는 컴포넌트 코드 내 순서에 따라서 이펙트가 먼저 호출될 수도 있습니다.

## 외부 라이브러리 사용해보기

대부분의 외부 라이브러리는 특정한 DOM 노드를 선택하여 해당 노드 내부에 특정한 변경을 가하는 것들이 많습니다. highlight.js 같은 코드 하이라이트 라이브러리나, AG Grid 같은 데이터 그리드 라이브러리가 이런 식으로 작동하며, `use:`나 `@attach`는 그러한 라이브러리 인터페이스에 대응할 수 있는 형태로 설계되어 있습니다.

위 tippy 예제는 tippy를 프로젝트에 추가하여 사용하는 것을 전제로 하고 있습니다. 프로젝트에 함께 패킹하지 않는 라이브러리를 사용하는 것도 가능합니다. 컴포넌트 상단에서 `<svelte:head>` 태그를 사용하면 문서의 HEAD 영역에 스크립트나 스타일시트 파일을 연결할 수 있습니다.

이 태그를 사용하여 CDN을 통해서 서비스되는 스크립트 파일을 연결하고, 액션이나 어태치먼트를 사용할 수 있습니다. 단, 외부 라이브러리의 로딩이 완료된 후에 호출되어야 하기에 약간의 조정은 필요합니다.

```svelte
<!-- 외부 라이브러리 연결. <svelte:head> 내부에서도 반응형 속성을 접근할 수 있음. -->
<svelte:head>
	<script src="https://unpkg.com/@popperjs/core@2"></script>
	<script src="https://unpkg.com/tippy.js@6" onload={() => { tp_ready = true; }}></script>
</svelte:head>

<script>
	let tp_ready = $state(false);
	let name = $state('hello');
	function tooltip(content) {
		return (node) => {
			const tp = tippy(node, {content});
			return tp.destroy;
		};
	}
</script>

<input bind:value={name} />
<button {@attach tp_ready ? tooltip(name) : null}>hover me</button>
```

위 예제에서는 로딩이 완료되어 `tp_ready` 값이 변경되면, 이 값은 반응형 상태이므로 `{@attach}` 블록이 재실행됩니다. 그리고 재실행되면서 그 시점부터 툴팁 기능이 작동하게 됩니다.

## 수동으로 업데이트 시점을 변경하기

`{@attach foo(bar)}`를 사용하면 `bar`의 값이 변경되는 경우마다 어태치먼트가 재실행됩니다. 그런데 전체 어태치먼트를 실행하는 비용이 큰 경우에는 `bar`가 변경될 때마다 재실행되는 것은 비효율적이고 때로는 문제가 될 수 있습니다.

```javascript
function foo(bar) {
	return node => {
		veryExpensiveSetupTask(node);
		update(node, bar);
	};
}
```

이 경우에는 `bar`에 대한 처리를 내부적으로 이펙트를 선언하여 적용되도록 할 수 있습니다. 즉 `bar`가 변경될 때 어태치먼트가 재실행되는 것이 아니라, 그 내부의 이펙트만 재실행되도록 하는 것이죠. 이를 위해서는 어태치먼트 블록에 `bar`를 노출하지 않고 해당 상태값을 읽어오는 함수를 전달하여, `bar`의 상태가 변경되더라도 반응형 블록이 이를 감지하지 않도록 합니다.

```javascript
function foo(getBar) {
	return node => {
		veryExpensiveSetupTask(node);
		$effect(() => {
			update(node, getBar());
		});
	};
}
```