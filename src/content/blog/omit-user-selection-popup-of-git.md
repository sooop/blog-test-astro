---
created_at: 2024-10-03T11:37:00.000Z
feature_image: https://images.unsplash.com/photo-1647166545674-ce28ce93bdca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDh8fGdpdHxlbnwwfHx8fDE3Mjk1NTc5MTR8MA&ixlib=rb-4.0.3&q=80&w=2000
published_date: 2024-10-03T11:37:00.000Z
slug: omit-user-selection-popup-of-git
status: published
title: git 사용자 선택 팝업 생략하기
modified_date: 2024-10-26T09:40:43.000Z
custom_excerpt: fetch, pull, push 시에 github 사용자 선택 화면이 표시되는 문제 해결
---

명령줄에서 git을 사용해서 github에 있는 저장소에 접근하려고 하면 git 사용자를 선택하라는 GUI 창이 표시되는 경우가 있는데, 이게 제법 성가십니다. 처음에는 github 사용자 인증 정보가 저장이 안돼서 생기는 문제라고 생각했었는데, 이미 저장되어 있는 github 사용자가 2개가 되면서, 어떤 사용자로 접근할 것인지를 묻는 내용이었네요.

매번 이렇게 계정을 선택하라고 묻는 이유는 git 이라는 계정이 자동으로 등록되었기 때문인데요, 이 외에도 늘 하나의 사용자 계정만 사용한다면 간단히 이 계정 선택 팝업은 생략할 수 있습니다.

```
git config --global credential.https://github.com.username my_username
```

위 명령에서 당연히 my_username은 본인의 github 계정을 기입하면 됩니다.