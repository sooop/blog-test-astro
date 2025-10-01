import re
import os

def clean_markdown_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern 1: Remove the problem section
    # Starts with '### 문제' and includes the link and the paragraph after '### 문제'
    # It ends before '## 풀이' or the end of the file if '## 풀이' is not present
    problem_pattern = re.compile(r'### 문제.*?\(https://euler\.synap\.co\.kr/problem=\d+\).*?(?=\n## 풀이|\Z)', re.DOTALL)
    content = problem_pattern.sub('', content, 1) # Only replace the first occurrence

    # Pattern 2: Remove the solution section's introductory paragraph
    # Starts with '## 풀이' and ends before the python code block
    solution_intro_pattern = re.compile(r'(## 풀이\s*\n\n.*?)(?=```python)', re.DOTALL)
    content = solution_intro_pattern.sub('## 풀이\n\n', content, 1) # Keep '## 풀이' and '```python'

    # Pattern 3: Remove the Wireframe subscription section
    # Starts with '## Wireframe 구독하기' and goes to the end of the file
    wireframe_pattern = re.compile(r'## Wireframe 구독하기.*', re.DOTALL)
    content = wireframe_pattern.sub('', content, 1) # Only replace the first occurrence

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Get all markdown files from 008.md to 056.md
# This will be a list of absolute paths
files_to_process = []
for i in range(8, 57): # From 008 to 056
    filename = f"0{i}.md" if i < 10 else f"{i}.md"
    filepath = os.path.join("D:/project/blog/src/content/project-euler", filename)
    if os.path.exists(filepath):
        files_to_process.append(filepath)

for file_path in files_to_process:
    clean_markdown_file(file_path)

print(f"Processed {len(files_to_process)} files.")