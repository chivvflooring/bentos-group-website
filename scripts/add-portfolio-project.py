"""Add an approved original-photo project to the gallery from a JSON manifest."""
import argparse
import html
import json
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / "gallery.html"
ASSETS = ROOT / "assets/images/projects/portfolio"
SERVICES = {
    "new-construction": {"new-construction", "site-development", "home-addition"},
    "renovation": {"flooring", "full-renovation", "kitchen", "bathroom", "painting", "decks", "basement", "roofing"},
}
STAGES = {"in progress": "Progress photos", "completed scope": "Completed scope", "before and after": "Before and after"}


def require_text(data, key, maximum):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
        raise ValueError(f"Provide {key} with 1–{maximum} characters")
    return html.escape(value.strip(), quote=True)


def optimize(source, directory, name):
    variants = []
    for width in (480, 960):
        target = directory / f"{name}-{width}.webp"
        subprocess.run(["magick", f"{source}[0]", "-auto-orient", "-colorspace", "sRGB",
                        "-resize", f"{width}x>", "-strip", "-quality", "82", str(target)], check=True)
        measure = subprocess.check_output(["magick", "identify", "-format", "%w %h", str(target)], text=True)
        actual_width, height = map(int, measure.split())
        variants.append((target.name, actual_width, height))
        if actual_width < width:
            break
    return variants


def render_photo(photo, manifest, directory, number):
    source = (manifest.parent / photo["file"]).resolve(strict=True)
    alt = require_text(photo, "alt", 200)
    caption = require_text(photo, "caption", 140)
    variants = optimize(source, directory, f"photo-{number}")
    largest, width, height = variants[-1]
    prefix = f"/assets/images/projects/portfolio/{directory.name}/"
    srcset = ", ".join(f"{prefix}{file} {size}w" for file, size, _ in variants)
    sizes = "(max-width: 640px) calc(100vw - 5rem), (max-width: 1120px) calc(50vw - 3rem), 510px"
    return (
        f'      <figure class="project-card">\n'
        f'        <img src="{prefix}{largest}" srcset="{srcset}" sizes="{sizes}"\n'
        f'          width="{width}" height="{height}" loading="lazy" decoding="async" alt="{alt}">\n'
        f'        <figcaption>{caption}</figcaption>\n'
        '      </figure>'
    )


def add_project(manifest, gallery, assets):
    data = json.loads(manifest.read_text())
    slug = data.get("slug", "")
    category = data.get("category")
    service = data.get("service")
    stage = STAGES.get(data.get("stage"))
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or len(slug) > 64:
        raise ValueError("Use a lowercase project slug of up to 64 characters")
    if service not in SERVICES.get(category, ()) or not stage:
        raise ValueError("Use a supported category, service and stage")
    if data.get("approved_originals") is not True:
        raise ValueError("Confirm that the selected project photos are original and approved")
    photos = data.get("photos")
    if not isinstance(photos, list) or not 1 <= len(photos) <= 12:
        raise ValueError("Provide between one and twelve project photos")
    title = require_text(data, "title", 120)
    scope = require_text(data, "scope", 500)
    estimate = require_text(data, "estimate_label", 90)
    existing = gallery.read_text()
    marker = f"  <!-- portfolio-projects:{category} -->"
    if existing.count(marker) != 1 or f'id="project-{slug}"' in existing or (assets / slug).exists():
        raise ValueError("Project already exists or its category marker is missing")
    with tempfile.TemporaryDirectory(dir=assets.parent) as scratch:
        directory = Path(scratch) / slug
        directory.mkdir()
        figures = "\n".join(render_photo(photo, manifest, directory, number) for number, photo in enumerate(photos, 1))
        markup = (
            f'  <details id="project-{slug}">\n'
            f'    <summary>{title} · {stage}</summary>\n'
            f'    <p>{scope}</p>\n'
            f'    <div class="project-grid">\n{figures}\n    </div>\n'
            f'    <p><a href="/free-quote?service={service}&amp;source=gallery">{estimate}</a></p>\n'
            f'  </details>\n'
        )
        candidate = Path(scratch) / "gallery.html"
        candidate.write_text(existing.replace(marker, markup + marker))
        directory.rename(assets / slug)
        try:
            candidate.replace(gallery)
        except OSError:
            (assets / slug).rename(directory)
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    try:
        add_project(args.manifest.resolve(), GALLERY, ASSETS)
    except (KeyError, TypeError, ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.error(str(error))
