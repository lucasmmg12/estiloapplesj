import subprocess
import os

html_path = os.path.abspath('scratch_test.html')
pdf_path = os.path.abspath('scratch_test.pdf')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write('<!DOCTYPE html><html><body><h1>Test Edge PDF</h1><p>Funciona perfectamente!</p></body></html>')

edge_bin = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

cmd = [
    edge_bin,
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    f'--print-to-pdf={pdf_path}',
    f'file:///{html_path.replace(os.sep, "/")}'
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("Exit code:", res.returncode)
print("PDF exists:", os.path.exists(pdf_path))
if os.path.exists(pdf_path):
    print("PDF size:", os.path.getsize(pdf_path))
    os.remove(pdf_path)
if os.path.exists(html_path):
    os.remove(html_path)
