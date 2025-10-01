
import os

files_to_process = []
base_path = "D:/project/blog/src/content/project-euler"
for i in range(8, 57): # From 008 to 056
    filename = f"0{i}.md" if i < 10 else f"{i}.md"
    filepath = os.path.join(base_path, filename)
    print(f"Checking: {filepath}")
    if os.path.exists(filepath):
        files_to_process.append(filepath)
    else:
        print(f"Does not exist: {filepath}")

print(f"Found {len(files_to_process)} files.")
