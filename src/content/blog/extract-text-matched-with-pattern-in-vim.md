---
created_at: '2024-08-03T06:31:00.000Z'
feature_image: https://images.unsplash.com/photo-1649127473471-6c6b78919415?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDJ8fGV4dHJhY3R8ZW58MHx8fHwxNzI5NjA3MTk1fDA&ixlib=rb-4.0.3&q=80&w=2000
published_date: '2024-08-03T06:31:00.000Z'
slug: extract-text-matched-with-pattern-in-vim
status: published
title: vim에서 패턴에 매칭되는 영역을 추출하기
modified_date: '2024-10-26T09:41:53.000Z'
---

이전 글에서는 notepad++에서 Mark 기능을 사용해서 특정 패턴에 매치되는 부분만을 추출하는 방법을 소개했습니다. 그렇다면 vim에서도 동일하게 특정한 정규식 패턴에 부합하는 부분만 추출하는 것이 가능할까요?

## :substitute의 고급 기능, `\=` 치환 패턴

:s 명령은 버퍼 내에서 특정한 패턴에 매칭하는 부분들을 치환하여 변경하는 명령입니다. 특정 패턴을 다른 고정된 단어나, 혹은 패턴 내 그룹의 배치를 변경하는 식으로 포맷을 바꿀 수 있죠. 

치환 명령에서 '바꿀 패턴'에 해당하는 부분은 고정된 문자열이거나, 패턴 내에 그룹이 포함된다면 그룹을 가리키는 패턴이 들어가는 정도입니다. 

치환 패턴부분이 \=로 시작하게 되면 vim은 치환 패턴을 표현식으로 평가합니다. 그래서 매칭된 단어를 패턴 그대로 사용하는 것이 아니라 다른 변환을 줄 수 있습니다. 예를 들어, "m"으로 끝나는 모든 단어를 대문자로 변환하는 것을 `:s` 명령을 사용해서 다음과 같이 수행할 수 있습니다. 

표현식 내에서 `submatch()`를 사용하면 앞에서 매치한 부분에서 특정한 그룹을 추출할 수 있습니다. 

```
:%s/\v\s(\w+m)\s/\=' ' .. toupper(submatch(1)) .. ' '/g

:%s/                   범위 전체에 치환을 적용
    \v\s(\w+m)\s/      좌우로 공백이 있는 단어를 그룹1로 선택
    \=                 치환대상을 표현식으로 정의
    ' ' .. toupper(submatch(1)) .. ' ' 
        공백 + 1번 그룹을 대문자로 변환한 값 + 공백 
    /g                 각 행에서 모든 매치에 대해 적용
```

그렇다면 특정한 저장공간에 매치된 모든 단어들을 추가해두고, 나중에 이 값을 사용하면 결국 패턴에 맞는 단어를 추출할 수 있을 것 같습니다. 저장 공간은 레지스터를 사용하면 될 것 같습니다. 'a' 레지스터에 단어를 추가하기 위해서는 `setreg()`를 사용할 수 있습니다. 


참고로  `:s` 명령의 옵션에 `n`을 추가하면 실제 치환을 하지 않고 매치 개수만 카운트합니다. 추출할 텍스트를 제거하면 안되니, `n` 옵션도 사용해야 합니다. 

### 내용을 레지스터로 복사하기 : setreg()

* `setreg({reg}, {text}, {option})`의 형태로 호출할 수 있습니다. 
* 레지스터 이름을 대문자로 지정하면 replace가 아닌 append로 작동합니다. 
* 옵션을 `l`로 지정하면 line-wise의 의미이고, 이는 추가되는 각각의 내용이 라인별로 들어간다는 뜻입니다. 

```
:call setreg('A', 'hello world', 'l')
```

따라서 특정 패턴의 내용을 모두 찾아서 a 레지스터에 한 줄에 하나씩 추가하기 위해서는 다음과 같은 명령을 사용할 수 있습니다.

```
:%s/\v\s(\w+m)\s/\=setreg('A', submatch(1), 'l')/gn |\
    new | put! A
```

이 때, 레지스터 a에 기존 내용이 있으면 그 내용까지 추출됩니다. 따라서 이 값을 백업/복원하는 과정을 추가하여 함수로 작성하고, 이를 명령으로 사용할 수 있도록 합니다. 별도의 패턴을 입력받는 것보다는 직전에 검색한 결과를 참조할 수 있도록 마지막으로 검색한 패턴을 그대로 사용하도록 합니다. `:s` 명령에서 검색 패턴을 생략하면 직전에 검색한 패턴을 그대로 사용하니 이 점을 활용하면 좋겠습니다.

```
vim9script

command -nargs=0 ExtractSearch ExtractSearchPattern()

def ExtractSearchPattern()
	if @/ == ''
		return
	endif
	var temp = @a # 레지스터 a의 내용을 백업
	@a = ''

	silent :%s//\=setreg('A', submatch(0), 'al')/gn
	if @a == ''
		return
	endif
	new
	put! a
	nohls
	@a = temp
enddef
```