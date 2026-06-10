import sys

import fitz
from PIL import Image


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: extract_pdf_cover.py input.pdf output.jpg", file=sys.stderr)
        return 2

    pdf_path, output_path = sys.argv[1], sys.argv[2]
    doc = fitz.open(pdf_path)
    try:
        if doc.page_count < 1:
            print("PDF has no pages", file=sys.stderr)
            return 1

        page = doc.load_page(0)
        pix = page.get_pixmap(matrix=fitz.Matrix(150 / 72, 150 / 72), alpha=False)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        image.thumbnail((600, 800))
        image.save(output_path, "JPEG", quality=85, optimize=True)
        return 0
    finally:
        doc.close()


if __name__ == "__main__":
    raise SystemExit(main())
