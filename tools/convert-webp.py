"""Resize only images in the current Vite build; never write the original artwork."""
import argparse
import hashlib
import io
import json
from pathlib import Path
from PIL import Image, features

ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = ROOT / 'art/originals'
RUNTIME = ROOT / 'src/assets/images'
REPORT = ROOT / 'docs/webp-report.json'
DIMENSIONS = ROOT / 'src/assets/image-dimensions.json'
PROFILE = ROOT / 'tools/mobile-image-profile.json'
BASELINE = ROOT / 'docs/webp-fullsize-baseline.json'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(target, expected, metadata):
    with Image.open(target) as webp:
        if webp.format != 'WEBP' or webp.size != expected.size:
            raise ValueError(f'Format or dimensions differ: {target}')
        if webp.convert('RGBA').tobytes() != expected.tobytes():
            raise ValueError(f'WebP differs from the resized RGBA reference: {target}')
        for key, value in metadata.items():
            if webp.info.get(key) != value:
                raise ValueError(f'Metadata differs ({key}): {target}')


def build_images():
    # Match actual emitted bytes, including CSS assets, not guessed filenames/imports.
    by_hash = {}
    for path in RUNTIME.rglob('*.webp'):
        by_hash.setdefault(digest(path), []).append(path.relative_to(RUNTIME).as_posix())
    emitted = sorted((ROOT / 'dist').rglob('*.webp'))
    if not emitted:
        raise RuntimeError('Run npm run build before conversion/checking')
    selected = set()
    for path in emitted:
        matches = by_hash.get(digest(path), [])
        if len(matches) != 1:
            raise RuntimeError(f'Stale or ambiguous build asset: {path}; rebuild first')
        selected.add(matches[0])
    return selected


def target_size(size, profile):
    if not profile or profile['scale'] == 1:
        return size
    scale = profile['scale']
    if not 0 < scale < 1:
        raise ValueError('Scale must be greater than zero and at most one')
    # Round to whole atlas cells. Per-axis ratios handle the small integer rounding.
    return tuple(max(step, round(side * scale / step) * step)
                 for side, step in zip(size, profile['grid']))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify without writing files')
    parser.add_argument('--bootstrap-new', action='store_true', help='Encode missing, explicitly profiled new assets before the first Vite build')
    args = parser.parse_args()
    if not features.check('webp'):
        raise RuntimeError('Pillow must include WebP support')
    profiles = json.loads(PROFILE.read_text(encoding='utf-8'))['images']
    if args.bootstrap_new:
        if args.check:
            parser.error('--bootstrap-new cannot be combined with --check')
        for key, profile in profiles.items():
            target = RUNTIME / key
            if target.exists():
                continue
            source = ORIGINALS / Path(key).with_suffix('.png')
            with Image.open(source) as original:
                rgba = original.convert('RGBA')
                size = target_size(rgba.size, profile)
                reference = rgba if size == rgba.size else rgba.resize(size, Image.Resampling.LANCZOS)
                metadata = {k: original.info[k] for k in ('icc_profile', 'exif', 'xmp') if k in original.info}
                target.parent.mkdir(parents=True, exist_ok=True)
                reference.save(target, format='WEBP', lossless=True, quality=100, method=6, exact=True, **metadata)
                verify(target, reference, metadata)
                print(f'BOOTSTRAP: {key}', flush=True)
        print('Run npm run build, then run this converter without --bootstrap-new to generate reports.')
        return
    included = build_images()
    if included != set(profiles):
        raise RuntimeError(f'Build/profile mismatch; add explicit decisions for new assets: '
                           f'build-only={sorted(included - set(profiles))}, '
                           f'profile-only={sorted(set(profiles) - included)}')
    baseline = json.loads(BASELINE.read_text(encoding='utf-8'))
    baseline_rows = {row['runtime']: row for row in baseline['files']}
    sources = sorted(ORIGINALS.rglob('*.png'))
    if not sources:
        raise RuntimeError('No original PNG files found')
    expected_paths = {RUNTIME / source.relative_to(ORIGINALS).with_suffix('.webp') for source in sources}
    if set(RUNTIME.rglob('*.webp')) != expected_paths or list(RUNTIME.rglob('*.png')):
        raise RuntimeError('Original/runtime file sets differ')
    rows, dimensions = [], {}
    for source in sources:
        relative = source.relative_to(ORIGINALS)
        key = relative.with_suffix('.webp').as_posix()
        target = RUNTIME / key
        runtime_path = target.relative_to(ROOT).as_posix()
        with Image.open(source) as original:
            if getattr(original, 'n_frames', 1) != 1 or original.mode not in ('RGB', 'RGBA', 'P', 'L', 'LA', '1'):
                raise ValueError(f'Unsupported image mode/animation: {relative}')
            rgba = original.convert('RGBA')
            size = target_size(rgba.size, profiles.get(key))
            metadata = {k: original.info[k] for k in ('icc_profile', 'exif', 'xmp') if k in original.info}
            # Pillow resamples RGBA using premultiplied alpha to avoid transparent-edge fringes.
            reference = rgba if size == rgba.size else rgba.resize(size, Image.Resampling.LANCZOS)
            if not args.check and key in included:
                try:
                    verify(target, reference, metadata)
                except (OSError, ValueError):
                    temporary = target.with_suffix('.webp.tmp')
                    try:
                        reference.save(temporary, format='WEBP', lossless=True, quality=100,
                                       method=6, exact=True, **metadata)
                        verify(temporary, reference, metadata)
                        temporary.replace(target)
                    finally:
                        temporary.unlink(missing_ok=True)
            verify(target, reference, metadata)
            previous = baseline_rows.get(runtime_path)
            if previous is None:
                if key not in included:
                    raise ValueError(f'New asset must be explicitly profiled and included in the build: {key}')
                # New artwork has no historical full-size baseline. Compute that comparison deterministically.
                fullsize = io.BytesIO()
                rgba.save(fullsize, format='WEBP', lossless=True, quality=100, method=6, exact=True, **metadata)
                previous = {'webpBytes': len(fullsize.getvalue())}
            if key not in included and digest(target) != previous['webpSha256']:
                raise ValueError(f'Out-of-build image changed: {key}')
            row = {
                'source': source.relative_to(ROOT).as_posix(), 'runtime': runtime_path,
                'sourceWidth': rgba.width, 'sourceHeight': rgba.height,
                'width': size[0], 'height': size[1], 'includedInBuild': key in included,
                'resized': size != rgba.size,
                'originalBytes': source.stat().st_size, 'webpBytes': target.stat().st_size,
                'fullsizeWebpBytes': previous['webpBytes'],
                'sourceSha256': digest(source), 'webpSha256': digest(target),
            }
            dimensions[key] = {'source': [rgba.width, rgba.height], 'runtime': list(size)}
            rows.append(row)
            print(f"{key}: {rgba.size} -> {size}, {row['webpBytes']} bytes", flush=True)
    shipped = [row for row in rows if row['includedInBuild']]
    before = sum(row['fullsizeWebpBytes'] for row in shipped)
    after = sum(row['webpBytes'] for row in shipped)
    original_bytes = sum(row['originalBytes'] for row in rows)
    webp_bytes = sum(row['webpBytes'] for row in rows)
    report = {
        'encoding': {'format': 'webp', 'lossless': True, 'quality': 100, 'method': 6, 'exact': True,
                     'resampling': 'LANCZOS; lossless encoding relative to the resized image'},
        'fileCount': len(rows), 'originalBytes': original_bytes, 'webpBytes': webp_bytes,
        'savedBytes': original_bytes - webp_bytes,
        'reductionPercent': round(100 * (1 - webp_bytes / original_bytes), 2),
        'build': {
            'fileCount': len(shipped), 'resizedCount': sum(row['resized'] for row in shipped),
            'originalPngBytes': sum(row['originalBytes'] for row in shipped),
            'fullsizeWebpBytes': before, 'mobileWebpBytes': after,
            'savedBytes': before - after, 'reductionPercent': round(100 * (1 - after / before), 2),
            'decodedPixelsBefore': sum(row['sourceWidth'] * row['sourceHeight'] for row in shipped),
            'decodedPixelsAfter': sum(row['width'] * row['height'] for row in shipped),
        },
        'files': rows,
    }
    for path, data in [(REPORT, report), (DIMENSIONS, dimensions)]:
        if args.check:
            if json.loads(path.read_text(encoding='utf-8')) != data:
                raise RuntimeError(f'Stale generated data: {path}')
        else:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"BUILD: {len(shipped)} images, {before} -> {after} bytes "
          f"({report['build']['reductionPercent']}% below full-size WebP). "
          'Originals and out-of-build WebP unchanged.')


if __name__ == '__main__':
    main()
