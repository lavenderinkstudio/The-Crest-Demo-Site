#!/bin/sh
# Turns photos in the-crest/photos/ into the web-sized images the site uses.
#
#   1. Name each photo after its slot, e.g. photos/hero.jpg, photos/gallery-3.png
#   2. Run:  sh tools/process-photos.sh
#
# Each photo is saved as images/<slot>-1000.jpg and images/<slot>-2200.jpg (gallery photos
# also get -600), plus an .avif copy of each that supporting browsers load instead
# (about a third of the size).
# Slots without a photo keep their current placeholder. Uses macOS `sips` (AVIF needs macOS 13+).

set -e
cd "$(dirname "$0")/.."

SLOTS="hero exterior intro living bath bedroom deck coast final gallery-1 gallery-2 gallery-3 gallery-4 gallery-5 gallery-6 gallery-7 gallery-8 gallery-9"
EXTS="jpg jpeg png heic webp tif tiff JPG JPEG PNG HEIC WEBP TIF TIFF"
QUALITY=78
AVIF_QUALITY=55   # below about 50, smooth walls and skies start to band
found=0
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

for slot in $SLOTS; do
  src=""
  for ext in $EXTS; do
    if [ -f "photos/$slot.$ext" ]; then src="photos/$slot.$ext"; break; fi
  done
  [ -z "$src" ] && continue

  width=$(sips -g pixelWidth "$src" | awk '/pixelWidth/ { print $2 }')
  # Gallery tiles are small on phones, so they also get a 600px version
  sizes="1000 2200"
  case $slot in gallery-*) sizes="600 1000 2200" ;; esac
  for size in $sizes; do
    out="images/$slot-$size.jpg"
    if [ "$width" -gt "$size" ]; then
      sips -s format jpeg -s formatOptions "$QUALITY" --resampleWidth "$size" "$src" --out "$out" >/dev/null
    else
      # Never upscale: smaller originals are just converted
      sips -s format jpeg -s formatOptions "$QUALITY" "$src" --out "$out" >/dev/null
    fi
    # Browsers draw AVIFs with an odd width or height as blank, so trim to even sizes first
    w=$(sips -g pixelWidth "$out" | awk '/pixelWidth/ { print $2 }')
    h=$(sips -g pixelHeight "$out" | awk '/pixelHeight/ { print $2 }')
    even="$tmp/$slot-$size.jpg"
    sips -c $((h - h % 2)) $((w - w % 2)) "$out" --out "$even" >/dev/null
    sips -s format avif -s formatOptions "$AVIF_QUALITY" "$even" --out "images/$slot-$size.avif" >/dev/null
  done
  echo "  $slot  <-  $src"
  found=$((found + 1))
done

if [ "$found" -eq 0 ]; then
  echo "No photos found. Add files such as photos/hero.jpg, then run this again."
else
  echo "Processed $found photo(s) into images/."
fi
