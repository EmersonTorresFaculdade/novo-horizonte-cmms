
import os

path = r'c:\Users\Emerson\Downloads\novo-horizonte-cmms\pages\WorkOrderDetails.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines[1210:1225]):
    print(f"{1211+i}: {repr(line)}")
