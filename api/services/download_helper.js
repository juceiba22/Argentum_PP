import urllib.request

url = "https://drive.usercontent.google.com/download?id=1aESdD0zgPpj-eWCVg5pXdyYqvtRO-L6g&export=download&confirm=t"
output_file = "C:/Users/NINIO/.gemini/antigravity/brain/67abcded-7810-4056-b9b1-ce15e5339eae/scratch/repomix-output.xml"

print(f"Downloading from {url}...")
try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        data = response.read()
            
    with open(output_file, 'wb') as f:
        f.write(data)
    print(f"Downloaded successfully to {output_file}. Size: {len(data)} bytes")
except Exception as e:
    print(f"Error downloading: {e}")
