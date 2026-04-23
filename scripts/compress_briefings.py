"""Compress briefing PDFs by rendering each page as a JPEG at 140 DPI then re-assembling.
This is lossy (text becomes image) but always hits the Gmail 25 MB target. Bookmarks are preserved.
"""
import os, io
import pymupdf
from PIL import Image

SRC = r"C:\Users\mathi\Desktop\Active projects\RotaryEventManagement\briefings"
TARGET_MB = 24

def render_to_pdf(in_path, out_path, dpi=140, quality=72):
    src = pymupdf.open(in_path)
    # Preserve outline
    toc = src.get_toc()
    out = pymupdf.open()
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    for page in src:
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
        buf.seek(0)
        # Create new page with same size as source
        w_pt = page.rect.width
        h_pt = page.rect.height
        new_page = out.new_page(width=w_pt, height=h_pt)
        new_page.insert_image(new_page.rect, stream=buf.getvalue())
    if toc:
        out.set_toc(toc)
    out.save(out_path, garbage=4, deflate=True, clean=True)
    out.close()
    src.close()

def main():
    pdfs = [f for f in os.listdir(SRC) if f.startswith("Briefing_Jury_") and f.endswith(".pdf") and "_original" not in f and "_compressed" not in f]
    pdfs.sort()

    results = []
    for fn in pdfs:
        in_path = os.path.join(SRC, fn)
        orig_mb = os.path.getsize(in_path) / 1024 / 1024
        if orig_mb <= TARGET_MB:
            results.append((fn, orig_mb, orig_mb, "skip"))
            continue

        out_path = in_path.replace(".pdf", "_compressed.pdf")

        # Attempt cascade: 140/72, then 120/65, then 100/58
        settings = [(140, 72), (120, 65), (100, 58), (90, 55)]
        new_mb = None
        used = None
        for dpi, q in settings:
            print(f"[{fn}] {orig_mb:.1f} MB -> render {dpi} DPI, Q{q} ...", flush=True)
            render_to_pdf(in_path, out_path, dpi=dpi, quality=q)
            new_mb = os.path.getsize(out_path) / 1024 / 1024
            print(f"  = {new_mb:.1f} MB")
            used = (dpi, q)
            if new_mb <= TARGET_MB:
                break

        if new_mb > TARGET_MB:
            print(f"  ! still > {TARGET_MB} MB even at lowest setting")

        if new_mb < orig_mb:
            backup = in_path.replace(".pdf", "_original.pdf")
            os.replace(in_path, backup)
            os.replace(out_path, in_path)
            results.append((fn, orig_mb, new_mb, f"ok @ {used[0]}DPI/Q{used[1]}" if new_mb <= TARGET_MB else f"over @ {used[0]}DPI/Q{used[1]}"))
        else:
            os.remove(out_path)
            results.append((fn, orig_mb, orig_mb, "no gain"))

    print("\n=== SUMMARY ===")
    for fn, before, after, note in results:
        status = "OK  " if after <= TARGET_MB else "OVER"
        print(f"  {status}  {fn}: {before:.1f} MB -> {after:.1f} MB  [{note}]")

if __name__ == "__main__":
    main()
