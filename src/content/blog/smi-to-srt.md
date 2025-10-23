---
created_at: 2013-03-16T22:29:42.000Z
published_date: 2013-03-16T22:29:42.000Z
slug: 3933-2
status: draft
title: .smi 자막 파일을 .srt로 변환하기
modified_date: 2025-10-23T15:14:07.000Z
---
Handbrake같은 인코딩 도구를 사용하여 동영상을 인코딩할 때 자막을 영상에 포함하는 옵션이 있는데, 이 때 사용할 수 있는 자막 포맷은 .SRT 형식이다. 국내에서 유통되는 대부분의 자막 포맷은 .SMI 파일이라서, 이를 SRT로 컨버팅할 수 있는 도구를 작성했다. 예전에 해외 커뮤니티에서 돌아다니던 C 소스를 가져와서 수정해서 사용하다가, 아예 파이썬으로 새로 작성함. 

```python
import re
import sys
from pathlib import Path

pat_sync = re.compile(r"^.*sync start=\"?(\d+)", re.IGNORECASE)
pat_br = re.compile(r"(?:<br/?>/s*)+")
pat_tag = re.compile(r"<[^>]+>|&\S+;")

def remove_tags(line: str) -> str:
    temp = pat_br.sub("\n", line).splitlines()
    return "\n".join(re.sub(r"\S+", " ", pat_tag.sub("", x)) for x in temp)

def convert(t: int) -> str:
    q1, r = divmod(t, 3600_000)
    q2, r = divmod(r, 60000)
    q3, r = divmod(r, 1000)
    return f"{q1:02d}:{q2:02d}:{q3:02d}.{r:03d}"

def make_output(buf: list[str], line_n: int, start_t: int, end_t: int) -> str:
    temp = remove_tags("\n".join(buf))
    if re.search(r"\S", temp):
        return f"{line_n}\n{convert(start_t)} --> {convert(end_t)}\n{temp}\n"
    return ""

def process(content: str) -> str:
    buf: list[str] = []
    res: list[str] = []
    line_n = 1
    start_t, end_t = 0, 0
    flag = False

    for line in content.splitlines():
        m = pat_sync.search(line)
        match (m, flag):
            case (None, True):
                buf.append(line)
            case (mat, False) if mat is not None:
                start_t = int(mat.group(1))
                buf.append(line)
                flag = True
            case (mat, True) if mat is not None:
                end_t = int(mat.group(1))
                out = make_output(buf, line_n, start_t, end_t)
                if out:
                    res.append(out)
                start_t, line_n = end_t, line_n + 1
                buf[:] = [line]
            case _:
                continue
    return "\n".join(res)

def main():
    if len(sys.argv) > 1:
        fname = Path(sys.argv[1])
        res = process(fname.read_text())
        if res:
            with fname.with_suffix(".srt").open("w") as f:
                f.write(res)
    else:
        print("Usage: smi2srt.py filename.smi")

    if __name__ == "__main__":
        main()
```

