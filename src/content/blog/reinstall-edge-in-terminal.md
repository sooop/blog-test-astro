---
created_at: 2024-10-30T14:11:57.000Z
feature_image: https://images.unsplash.com/photo-1655196601100-8bfb26cf99e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDd8fGJyb3dzZXJ8ZW58MHx8fHwxNzMwMjk4NDg3fDA&ixlib=rb-4.0.3&q=80&w=2000
published_date: 2024-10-30T19:00:34.000Z
slug: reinstall-edge-in-terminal
status: published
title: 윈도 초기화 후 Edge가 없어질 때
modified_date: 2024-10-30T19:00:34.000Z
custom_excerpt: Edge는 나름 쓸만한 브라우저라는 걸 깨닫자마자 무슨 일이 있어나게 되는데...
---

최근 노트북이 갑자기 상태가 안 좋아져서 초기화를 한 번 했습니다.  손수 포맷하고 클린 설치를 한 것은 아니었고 초기화 기능을 사용해서 윈도가 설치된 드라이브만 삭제하고 재설치를 했더랬죠.

![[Pasted image 20251022180254.png]]

재설치는 무탈하게 잘 끝났습니다만, 어쩐지 웹브라우저가 하나도 없는 상태가 되었습니다. 분명 처음 윈도11을 설치할 때에도 클린 설치를 했던 거 같은데, 그 때는 이렇지 않았는데...라고 생각했습니다. 뭔가 웹 도움말 같은 걸 열려고 하다가 자동으로 MS스토어로 연결됐고, 그곳에서 Edge를 설치했습니다. 

문제는 그때부터였습니다. MS스토어에서는 설치가 됐다고는 나오는데, "열기" 버튼이 나오지 않습니다. 다른 앱도 그런가 해서 윈도 터미널 같은 앱들도 다 찾아봤는데, 유독 Edge만 그렇더군요. 시작 메뉴에서 앱을 검색해도 나오지 않고...

그 때는 어찌어찌 윈도 터미널에서 C:\Program FIles (x86)\Microsoft\Edge\Application 디렉토리에서 edge.exe를 실행해서 곧장 파이어폭스를 설치했습니다. 근데 이렇게 한 번 설치해도 edge는 꽁꽁 숨겨져만 있고 삭제도 되지 않더군요. 

### 해결책

그래서 파이어폭스로 엣지 다운로드 페이지로 가서(?!) 설치 패키지를 받아서 설치해봤지만 효과는 없었습니다. (살다살자 이럴 일이...) 이 상태로는 svg파일 같은 걸 열 때에도 앱 목록에 Edge가 뜨지 않는 상태가 됩니다. 가뜩이나 마음에 들지 않는데, 더 마음에 들지 않습니다. 

해결은 결국 터미널에서 했습니다.  아래 명령으로 MS스토어에서 Edge를 다시 설치합니다. 

```
winget install "Microsoft Edge" -s msstore
```

명령을 실행하면 몇 가지 질문을 하는데, 모든 질문에 Y로 답하면 설치 패키지를 다운로드 받아서 설치를 시작합니다. 이 설치 작업이 끝나고 나면 정상적으로 Edge가 시작메뉴의 앱 검색에서 나타나기 시작하고, 설정에서 기본 프로그램 선택지에도 표시가 되기 시작합니다.