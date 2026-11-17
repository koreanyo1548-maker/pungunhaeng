"""Create committed, lossless runtime images without altering the PNG originals."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, features

ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = ROOT / "art/originals"
RUNTIME = ROOT / "src/assets/images"
REPORT = ROOT / "docs/webp-report.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def convert(source, check):
    relative = source.relative_to(ORIGINALS)
    target = RUNTIME / relative.with_suffix(".webp")
    with Image.open(source) as original:
        if getattr(original, "n_frames", 1) != 1:
            raise ValueError(f"Animated input requires explicit handling: {relative}")
        if original.mode not in ("RGB", "RGBA", "P", "L", "LA", "1"):
            raise ValueError(f"Refusing to reduce source bit depth: {relative} ({original.mode})")
        rgba = original.convert("RGBA")
        metadata = {key: original.info[key] for key in ("icc_profile", "exif", "xmp") if key in original.info}
        if not check:
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(".webp.tmp")
            try:
                rgba.save(temporary, format="WEBP", lossless=True, quality=100, method=6, exact=True, **metadata)
                verify(temporary, rgba, metadata)
                temporary.replace(target)
            finally:
                temporary.unlink(missing_ok=True)
        verify(target, rgba, metadata)
        row = {
            "source": source.relative_to(ROOT).as_posix(),
            "runtime": target.relative_to(ROOT).as_posix(),
            "width": rgba.width,
            "height": rgba.height,
            "originalBytes": source.stat().st_size,
            "webpBytes": target.stat().st_size,
            "sourceSha256": digest(source),
            "webpSha256": digest(target),
        }
    print(f"{relative}: {row['originalBytes']} -> {row['webpBytes']} bytes", flush=True)
    return row


def verify(target, rgba, metadata):
    with Image.open(target) as webp:
        if webp.format != "WEBP" or webp.size != rgba.size:
            raise ValueError(f"Format or dimensions changed: {target}")
        if webp.convert("RGBA").tobytes() != rgba.tobytes():
            raise ValueError(f"RGBA pixels changed (including alpha): {target}")
        for key, value in metadata.items():
            if webp.info.get(key) != value:
                raise ValueError(f"Color/metadata changed ({key}): {target}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify committed WebP without writing files")
    args = parser.parse_args()
    if not features.check("webp"):
        raise RuntimeError("Pillow must include WebP support")
    sources = sorted(ORIGINALS.rglob("*.png"))
    if not sources:
        raise RuntimeError("No original PNG files found")
    expected = {RUNTIME / source.relative_to(ORIGINALS).with_suffix(".webp") for source in sources}
    unexpected = set(RUNTIME.rglob("*.webp")) - expected
    if unexpected:
        raise RuntimeError(f"Runtime WebP has no original: {sorted(map(str, unexpected))}")
    if list(RUNTIME.rglob("*.png")):
        raise RuntimeError("Runtime folder still contains PNG originals")
    rows = [convert(source, args.check) for source in sources]
    original_bytes = sum(row["originalBytes"] for row in rows)
    webp_bytes = sum(row["webpBytes"] for row in rows)
    report = {
        "encoding": {"format": "webp", "lossless": True, "quality": 100, "method": 6, "exact": True},
        "fileCount": len(rows),
        "originalBytes": original_bytes,
        "webpBytes": webp_bytes,
        "savedBytes": original_bytes - webp_bytes,
        "reductionPercent": round(100 * (1 - webp_bytes / original_bytes), 2),
        "files": rows,
    }
    if args.check:
        if json.loads(REPORT.read_text(encoding="utf-8")) != report:
            raise RuntimeError("Committed WebP report is stale; regenerate resources")
    else:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {len(rows)} images: {original_bytes} -> {webp_bytes} bytes; "
          f"{report['reductionPercent']}% smaller. Dimensions, RGBA and profiles preserved.")


if __name__ == "__main__":
    main()
