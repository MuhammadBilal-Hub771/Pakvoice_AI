import os
import tempfile
from typing import Optional

from loguru import logger


def parse_pdf(file_path: str) -> Optional[str]:
    try:
        import fitz

        text_parts = []
        with fitz.open(file_path) as doc:
            for page in doc:
                text_parts.append(page.get_text())
        return "\n".join(text_parts)
    except ImportError:
        logger.error("PyMuPDF (fitz) is not installed")
        return None
    except Exception as e:
        logger.error(f"Failed to parse PDF {file_path}: {e}")
        return None


def parse_docx(file_path: str) -> Optional[str]:
    try:
        from docx import Document

        doc = Document(file_path)
        text_parts = []
        for para in doc.paragraphs:
            text_parts.append(para.text)
        return "\n".join(text_parts)
    except ImportError:
        logger.error("python-docx is not installed")
        return None
    except Exception as e:
        logger.error(f"Failed to parse DOCX {file_path}: {e}")
        return None


def parse_txt(file_path: str) -> Optional[str]:
    try:
        encodings = ["utf-8", "cp1252", "latin-1", "utf-16"]
        for enc in encodings:
            try:
                with open(file_path, "r", encoding=enc) as f:
                    return f.read()
            except (UnicodeDecodeError, UnicodeError):
                continue
        logger.error(f"Could not decode text file: {file_path}")
        return None
    except Exception as e:
        logger.error(f"Failed to parse TXT {file_path}: {e}")
        return None


def parse_md(file_path: str) -> Optional[str]:
    content = parse_txt(file_path)
    if content:
        return content
    return None


def parse_file(file_path: str) -> Optional[str]:
    ext = os.path.splitext(file_path)[1].lower()
    parsers = {
        ".pdf": parse_pdf,
        ".docx": parse_docx,
        ".txt": parse_txt,
        ".md": parse_md,
    }
    parser = parsers.get(ext)
    if parser is None:
        logger.warning(f"No parser available for extension: {ext}")
        return None
    logger.info(f"Parsing file: {file_path} (type: {ext})")
    return parser(file_path)


def parse_uploaded_file(file_bytes: bytes, filename: str) -> Optional[str]:
    ext = os.path.splitext(filename)[1].lower()
    with tempfile.NamedTemporaryFile(
        suffix=ext, delete=False
    ) as tmp_file:
        tmp_file.write(file_bytes)
        tmp_path = tmp_file.name

    try:
        content = parse_file(tmp_path)
        return content
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
