"""Convert stray .docx/.pptx to .pdf using MS Office COM automation."""
import os, glob, sys
import win32com.client as win32
import pythoncom

ROOT = r"C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\pitch_decks"

def convert_docx(src, dst):
    word = win32.DispatchEx("Word.Application")
    word.Visible = False
    try:
        doc = word.Documents.Open(src, ReadOnly=True)
        doc.SaveAs(dst, FileFormat=17)  # 17 = wdFormatPDF
        doc.Close(False)
    finally:
        word.Quit()

def convert_pptx(src, dst):
    ppt = win32.DispatchEx("PowerPoint.Application")
    # PowerPoint requires Visible = True on some versions
    try:
        ppt.Visible = 1
    except Exception:
        pass
    try:
        pres = ppt.Presentations.Open(src, WithWindow=False)
        pres.SaveAs(dst, 32)  # 32 = ppSaveAsPDF
        pres.Close()
    finally:
        ppt.Quit()

pythoncom.CoInitialize()
targets = []
for ext in ("*.docx", "*.doc", "*.pptx", "*.ppt"):
    targets += glob.glob(os.path.join(ROOT, "**", ext), recursive=True)

print(f"Found {len(targets)} Office files to convert.")
for src in targets:
    dst = os.path.splitext(src)[0] + ".pdf"
    print(f"  {os.path.basename(src)} -> {os.path.basename(dst)} ...", end=" ", flush=True)
    try:
        if src.lower().endswith((".docx", ".doc")):
            convert_docx(src, dst)
        else:
            convert_pptx(src, dst)
        sz = os.path.getsize(dst)
        os.remove(src)
        print(f"OK ({sz/1024:.0f} KB)")
    except Exception as e:
        print(f"FAIL: {e}")

print("Done.")
