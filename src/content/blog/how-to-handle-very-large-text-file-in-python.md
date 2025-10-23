---
created_at: 2017-04-15T10:42:39.000Z
feature_image: https://images.unsplash.com/photo-1645967732161-db5c711e9e61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDh8fG1hc3NpdmV8ZW58MHx8fHwxNzMzNDcxMDQ0fDA&ixlib=rb-4.0.3&q=80&w=2000
published_date: 2024-12-13T21:00:11.000Z
slug: how-to-handle-very-large-text-file-in-python
status: published
title: 대용량 파일을 끊어서 읽는 방법
modified_date: 2025-10-23T15:13:02.000Z
---
주로 텍스트 형식으로 된 파일을 읽어서 사용할 때에는 파일의 내용을 읽어들인 다음, 구분자를 기준으로 나누어서 처리합니다. 많은 경우 이 구분자는 개행문자인 경우가 많고, 문자열 객체의 `splitlines()`를 사용할 수 있고, 혹은 파일 객체를 반복자처럼 취급하여 `for line in f:` 와 같이 반복구문을 사용하는 방법이 있습니다. 

그런데 전자의 경우에는 파일의 전체 내용을 메모리에 로드하는 과정이 포함됩니다. 만약 파일이 무식하게 큰 대용량 파일인 경우, 전체를 메모리에 로드하면 메모리 부족으로 앱이 죽는 문제가 발생할 수 있습니다. 그리고 때로는 파일을 라인단위로 읽기 힘든 경우가 있습니다. 데이터의 구분이 개행이 아니라 콜론이나 세미콜론 등의 다른 구분자를 사용하는 경우도 있을 수 있거든요. 

따라서 특정한 구분자를 기준으로 조금씩 파일의 내용을 읽어서 처리해야 하는 경우가 있습니다. 프로젝트 오일러의 몇몇 문제들은 파일을 읽어와서 그 내용을 분석하는 것인데, 그 중에는 콤마로 구분된 이름들을 처리하는 경우가 있습니다.  파일의 크기는 물론 그리 크지 않지만, 임의의 파일을 처리하는 상황을 가정하면 안전하게 처리하기 위해서는 콤마를 구분자로 하여 내용을 끊는 처리가 필요합니다.  

아래와 같이 작성할 수 있습니다. 

```python
from io import IOBase
from typing import Generator

def reader(f: IOBase, /, delimiter:str|bytes='\n', chunk_size:int=8192) -> Geneator[bytes, None, None]:
	delim = delimiter if isinstance(delimiter, bytes) else delimiter.encode()
	buffer = bytearray()
	dellen = len(delim)
	while True:
		chunk = f.read(chunk_size)
		if not chunk:
			yield buffer
			return
		buffer.extend(chunk)
		while True:
			try:
				idx = buffer.index(delim)
				yield buffer[:idx].decode()
				buffer[:idx + dellen] = []
			except ValueError:
				break
```

파라미터 f는 파일처럼 read(amt) 를 지원하는 모든 타입을 사용할 수 있는 IOBase 타입기반의 객체는 모두 사용할 수 있습니다. 즉 `StringIO`나 파일, `urlopen()` 함수의 응답객체 등을 모두 사용할 수 있습니다. (`read()`, `open()`메소드를 가지고 있는 모든 객체에 적용 가능합니다.)

---

## 네트워크 스트리밍

`urllib.request.urlopen()`을 호출하여 반환된 응답 객체는 그 자체로 file-like 객체이기 때문에 위 방법을 그대로 사용할 수 있습니다. 만약 `requests`나 `httpx`와 같은 서드파티 네트워크 라이브러리를 사용한다면 그에 맞게 별도의 구현이 필요합니다.

### requests를 사용하기

최근에는 urllib.request 외에 `requests`도 많이 쓰입니다. 거의 표준 라이브러리보다 더 많이 사용되는 것 같으니, `requests`를 사용하여 대용량 파일을 구분자 단위로 스트리밍하는 방법도 살펴봅시다. 버퍼를 사용하여 처리하는 방식은 동일하며, `iter_content()`를 사용하여 특정한 바이트 수 이내로 반복하여 읽어들이는 방법만 다릅니다.  

```python
from typing import Generator
import requests

def stream_reader(url, /, delimiter:str|bytes=',', chunk_size: int=1024) -> Generator[bytes, None, None]:
	res = requests.get(url, stream=True)
	if res.status_code != 200:
		raise Exception("HTTP response is not valid")
	buffer = bytearray()
	delim = delimiter if isinstance(delimiter, bytes) else delimiter.encode()
	dellen = len(delim)
	for chunk in res.iter_content(chunk_size=chunk_size):
		buffer.extend(chunk)
		while:
			try:
				idx = buffer.index(delim)
				yield bytes(buffer[:idx])
				buffer[:idx+dellen] = []
			except ValueError:
				# .index에서 인덱스를 찾지 못하면 ValueError가 발생
				break
	if buffer:
		yield bytes(buffer)
```

### httpx를 사용하기

개인적으로는 requests보다는 httpx를 더 선호하는 편입니다. httpx는 requests의 API와 호환되는 부분이 많지만, 스트리밍 수신의 경우에는 블럭으로 처리하도록 디자인되어 있습니다. 따라서 블럭외부에서 예외 등으로 블럭을 빠져나가면 HTTP 연결은 자동으로 끊어지게 됩니다.

```python

def stream_reader(url, /, delimiter:str|bytes=',', chunk_size: int=1024) -> Generator[bytes, None, None]:
	with httpx.stream("GET", url) as res:
		# 응답코드가 2XX이 아니면 예외 던짐
		res.raise_for_status()
		buffer = bytearray()
		delim = delimiter if isinstance(delimiter, bytes) else delimiter.encode()
		dellen = len(delim)
		for chunk in res.iter_bytes(chunk_size=chunk_size):
			buffer.extend(chunk)
			while:
				try:
					idx = buffer.index(delim)
					yield bytes(buffer[:idx])
					buffer[:idx+dellen] = []
				except ValueError:
					# .index에서 인덱스를 찾지 못하면 ValueError가 발생
					break
		if buffer:
			yield bytes(buffer)
```

httpx를 사용하면 거의 동일한 방식으로 비동기 코드로 전환할 수 있습니다. 

```python
async def stream_reader_async(url: str, 
	/, 
	delimiter:str|bytes=',', 
	chunk_size: int=1024) -> AsyncGenerator[bytes, None]:
	
	client = httpx.AsyncClient()
	async with client.stream("GET", url) as res:
		res.raise_for_status()
		buffer = bytearray()
		delim = delimiter if isinstance(delimiter, bytes) else delimiter.encode()
		dellen = len(delim)
		async for chunk in res.iter_bytes(chunk_size=chunk_size):
			buffer.extend(chunk)
			while True:
				try:
					idx = buffer.index(delim)
					yield bytes(buffer[:idx])
					buffer[:idx+dellen] = []
				except ValueError:
					break
			if buffer:
				yield bytes(buffer)
```

### 기타

물론 이 코드도 완벽하지 않습니다. 예를 들어 구분자가 계속해서 나타나지 않으면 버퍼의 크기가 무한정 커지게 되는데, 이를 검사하는 로직도 필요합니다. (물론 chunk의 크기가 일정하므로 간단히 계산할 수 있습니다.)