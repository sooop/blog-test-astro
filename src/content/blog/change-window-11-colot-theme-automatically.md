---
created_at: 2026-03-21T14:27:58.533Z
published_date: 2026-03-21T14:27:58.533Z
slug: change-window-11-colot-theme-automatically
status: published
title: 윈도11 테마색상 자동 변경하기
modified_date: 2026-03-23T15:10:55.186Z
custom_excerpt: 윈도 다크모드를 시간대에 따라 자동 전환되도록 하는 방법
updated: 2026-03-21T07:11:05.000Z
---

macOS에는 일출/일몰 시간대에 맞춰서 다크 모드로 자동으로 변경하는 기능이 있는데, 윈도에는 이런 기능이 없음. 해가 뜨고 지는 시간을 정확히 맞춰서 변경하는 건 좀 어렵겠지만, 대략 특정 시간 사이에 변경해주는 기능은 작업 스케줄러를 사용해서 구현할 수 있다. 

| 참고로 작업 스케줄러는 윈도 11 Pro 버전 이상에서만 지원된다. Home 버전 사용자는 별도로 나와있는 앱을 이용하자.

우선, 시스템 색상 테마를 변경하는 파워쉘 스크립트를 작성한다. 저장 위치는 홈 디렉토리 아래에, 다음 위치에 스크립트 파일을 저장한다. 

```
C:\Users\사용자이름\AppData\Local\Scripts\theme-change.ps1
```

아니면 탐색기의 주소 표시줄에 `%LOCALAPPDATA%` 라고 입력하고 엔터키를 눌러도 바로 이동할 수 있다. 

아래 파일을 위 폴더에 바로 만들거나, 다른 곳에 만들어서 해당 위치로 옮겨둔다. (이 코드는 Claude를 통해서 제작함)

```powershell
# Windows API P/Invoke 선언
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class WindowsTheme {
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr hWnd,
        uint Msg,
        IntPtr wParam,
        string lParam,
        uint fuFlags,
        uint uTimeout,
        out IntPtr lpdwResult
    );

    public const uint WM_SETTINGCHANGE = 0x001A;
    public const uint SMTO_ABORTIFHUNG = 0x0002;
    public static readonly IntPtr HWND_BROADCAST = (IntPtr)0xffff;
}
"@

function Broadcast-ThemeChange {
    <#
    .SYNOPSIS
    모든 앱과 시스템 UI에 테마 변경을 알립니다.
    #>
    try {
        $result = [IntPtr]::Zero
        [WindowsTheme]::SendMessageTimeout(
            [WindowsTheme]::HWND_BROADCAST,
            [WindowsTheme]::WM_SETTINGCHANGE,
            [IntPtr]::Zero,
            "ImmersiveColorSet",
            [WindowsTheme]::SMTO_ABORTIFHUNG,
            1000,
            [ref]$result
        ) | Out-Null
        
        Write-Host "Theme change broadcasted to all windows"
    }
    catch {
        Write-Host "Warning: Could not broadcast theme change: $_" -ForegroundColor Yellow
    }
}

# 다크 테마로 전환
function Set-DarkTheme {
    $RegistryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
    
    try {
        Set-ItemProperty -Path $RegistryPath -Name "AppsUseLightTheme" -Value 0 -Type DWord -ErrorAction Stop
        Set-ItemProperty -Path $RegistryPath -Name "SystemUsesLightTheme" -Value 0 -Type DWord -ErrorAction Stop
        
        # 작업 표시줄 테마도 함께 변경 (Windows 10/11)
        $AccentPath = "HKCU:\Software\Microsoft\Windows\DWM"
        if (Test-Path $AccentPath) {
            Set-ItemProperty -Path $AccentPath -Name "ColorPrevalence" -Value 1 -Type DWord -ErrorAction SilentlyContinue
        }
        
        Write-Host "System theme switched to dark mode" -ForegroundColor Green
        Broadcast-ThemeChange
    }
    catch {
        Write-Host "Error setting dark theme: $_" -ForegroundColor Red
    }
}

# 라이트 테마로 전환
function Set-LightTheme {
    $RegistryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
    
    try {
        Set-ItemProperty -Path $RegistryPath -Name "AppsUseLightTheme" -Value 1 -Type DWord -ErrorAction Stop
        Set-ItemProperty -Path $RegistryPath -Name "SystemUsesLightTheme" -Value 1 -Type DWord -ErrorAction Stop
        
        # 작업 표시줄 테마도 함께 변경 (Windows 10/11)
        $AccentPath = "HKCU:\Software\Microsoft\Windows\DWM"
        if (Test-Path $AccentPath) {
            Set-ItemProperty -Path $AccentPath -Name "ColorPrevalence" -Value 1 -Type DWord -ErrorAction SilentlyContinue
        }
        
        Write-Host "System theme switched to light mode" -ForegroundColor Green
        Broadcast-ThemeChange
    }
    catch {
        Write-Host "Error setting light theme: $_" -ForegroundColor Red
    }
}

# 현재 시간에 따라 테마 자동 선택
$CurrentHour = (Get-Date).Hour

# 10시~19시는 라이트 테마, 그 외에는 다크 테마
if ($CurrentHour -ge 09 -and $CurrentHour -lt 19) {
    Set-LightTheme
} else {
    Set-DarkTheme
}

```

이제 터미널에서 powershell을 열고, 다음 명령어를 한 번 실행해준다.  터미널에 붙여넣는 방법은 ctrl + shift + v 를 누르면 됨.

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```


한 번 실행해본다.

파워쉘에서 `cd ~\appdata\local` 까지 입력하고 `<tab>`키를 누르면 경로가 자동완성되는데 여기서 엔터 한 번 누르고,  파일명을 입력하고 엔터치면 된다. (파일명도 중간 몇 자만 입력한 후에 탭 키로 자동완성할 수 있다.)

```powershell

.\theme-change.ps1

```

### 작업 스케줄러 등록하기

작업 스케줄러는 특정한 시간이나 어떤 일이 벌어질 때, 미리 정해진 일을 수행하도록 하는 기능이다. 구글 크롬 브라우저의 자동 업데이트 기능 같은 것들이 설치 시에 작업 스케줄러에 자동으로 등록돼서 처리된다. 

작업 스케줄러를 실행하고,  왼쪽 트리 탐색기에서 "작업 스케줄러 라이브러리"를 찾아서 마우스 우클릭 > 새폴더를 만든다. 폴더 이름은 뭐 아무거나 원하는 걸로 정하면 된다. 

![작업 스케줄러 기본 작업 만들기](./Pasted%20image%2020260321162730.png)

폴더를 선택한 상태에서, 이번에는 맨 오른쪽에서 "**기본 작업 만들기**"를 선택한다. 

1. 작업 이름은 뭐 적절히 아무거나 정한다.
2. 작업은 '매일' 실행되게 한다.
3. 오늘날짜의 오전 12시 00분 00초로 실행 시간을 정한다.
4. 무슨 일을 하냐면 "프로그램 실행"을 선택한다.
5. 실행할 프로그램과 인수, 시작 디렉토리는 다음과 같이 쓴다.
	1.  프로그램 : powershell.exe
	2. 인수 : `-NoProfile -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\Scripts\theme-switcher.ps1"
	3. 시작디렉토리 : `%LOCALAPPDATA%\Scripts`
6. '마침을 선택할 때 작업의 속성 대화상자 열기'에 체크하고 마침을 누르면 등록이 완료된다.

이제 주기적으로 이 스크립트를 실행하여 특정 시간이 되면 테마가 변경되도록 한다.

![작업 스케줄러 트리거 설정](./Pasted%20image%2020260321163451.png)

- 트리거 탭에서 해당 트리거를 더블 클릭하여 상세 대화상자를 연다.
- 고급 설정에서 작업 반복 간격을 1시간, 기간을 무기한으로 설정한다.
- 사용에 체크하고 확인 버튼 클릭

그리고 트리거 화면에서 '새로 만들기...'를 클릭해서 새로운 트리거를 하나 추가한다. 

* 로그온 할 때
* 모든 사용자

이렇게하면 PC에 사용자 로그온할 때마다 실행되어 현재 시간에 맞는 색상 테마가 되도록 할 수 있다.
