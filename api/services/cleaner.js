import re

file_path = "C:/Users/NINIO/.gemini/antigravity/brain/67abcded-7810-4056-b9b1-ce15e5339eae/scratch/repomix-output.xml"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Look for patterns of files
# Typically repomix formats as:
# <file path="relative/path/to/file">
# contents
# </file>
matches = re.findall(r'<file\s+path="([^"]+)">', content)
print(f"Found {len(matches)} files:")
for m in matches:
    print(f" - {m}")

# Let's extract them into a temporary folder so we can easily read them!
import os
out_dir = "C:/Users/NINIO/.gemini/antigravity/brain/67abcded-7810-4056-b9b1-ce15e5339eae/scratch/extracted/"
os.makedirs(out_dir, exist_ok=True)

# Let's parse and write them
pattern = r'<file\s+path="([^"]+)">\n?(.*?)\n?</file>'
file_blocks = re.findall(pattern, content, re.DOTALL)
print(f"\nExtracting {len(file_blocks)} files...")
for path, file_content in file_blocks:
    # Clean path to write safely
    clean_path = path.replace('\\', '/').lstrip('/')
    target_path = os.path.join(out_dir, clean_path)
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, 'w', encoding='utf-8', errors='ignore') as out_f:
        out_f.write(file_content)
    print(f"Extracted: {clean_path} ({len(file_content)} chars)")
