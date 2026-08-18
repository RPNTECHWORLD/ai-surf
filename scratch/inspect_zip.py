import zipfile

z = zipfile.ZipFile('aisurf-backend.zip')
code = z.read('main.py').decode('utf-8')
lines = code.split('\n')
for i, l in enumerate(lines):
    if 'class Student(Base):' in l or 'def student_to_dict' in l:
        print(f"Found match at line {i+1}")
        for j in range(max(0, i-2), min(len(lines), i+25)):
            clean_line = lines[j].encode('ascii', 'ignore').decode('ascii')
            print(f"{j+1}: {clean_line}")
