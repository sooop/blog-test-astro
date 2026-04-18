---
title: "svelte에서 use: 사용하기"
slug: using-use-in-svelte
published_date: 2026-04-18T12:44:00
---
>[!info] 새로운 기능
> 5.29에서부터 `attachment`가 도입되었고, 이 기능은 더 유연하고 반응성을 도입하기가 좋습니다.

수많은 프론트엔드용 라이브러리들은 대체로 페이지 내에 특정한 노드를 마운트하는 코드(HTML)의 근처에, 배포되는 js 라이브러리 파일을 로드하고, 초기화하는 함수를 호출합니다. 이 때 해당 라이브러리의 UI가 표시되어야 하거나, 관련되어야 하는 DOM 노드를 전달하는 방식입니다. 

예를 들어 툴팁을 동적으로 추가해주는 [tippy.js](https://atomiks.github.io/tippyjs/v6/getting-started/)도 대략 이런 방식입니다. `tippy` 라는 함수에 HTML 노드나 노드를 지정할 수 있는 CSS 선택자를 전달하게 됩니다. 

```html
<html>
    <head>
        <title>Tippy</title>
    </head>
    <body>
        <button id="myButton">My button</button>
        <script src="https://unpkg.com/@popperjs/core@2"/>
        <script src="https://unpkg.com/tippy.js@6"/>
        <script>       
        // With the above scripts loaded, you can call `tippy()` with a CSS
        // selector and a `content` prop:       
	        tippy('#myButton', {
	                 content: 'My tooltip!'
	            });     
        </script>
    </body>
</html>
```

Svelte에서 페이지에 추가하는 모든 노드들은 가상 DOM이 아니라 실제 DOM이기 때문에, 노드가 마운트된 직후에 해당 함수를 호출해준다면 svelte용 tippy 라이브러리가 따로 개발되지 않더라도 그대로 사용할 수 있게 됩니다. 

HTML 요소가 마운트 될 때 호출되는 함수를 Svelte에서는 **액션**이라고 부릅니다. 액션은 `use:` 지시어를 사용하여 지정되며, 보통 내부에서는 요소가 언마운트될 때 상태를 정리하기 위해서 이팩트(`$effect()`)를 사용합니다. 

```js
/** @type {import('svelte/action').Action} */
function myaction(node) {
	$effect(() => {
		// 셋업 작업 코드
		
		return () => {
			// 노드제거시 호출될 정리 코드
		}
	});
}
```

내부에서는 반드시 이펙트를 사용하지 않아도 됩니다. `update`, `destroy` 메소드를 가지고 있는 객체를 리턴해주면, 값이 변경될 때 update가 호출될 것이고, 노드가 제거될 때 destory가 호출될 겁니다. 

