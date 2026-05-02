from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
ICON_DIR = ROOT / "icons"


def create_icon(size: int) -> None:
    img = Image.new("RGB", (size, size), "#7F77DD")
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    text = "TL"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) / 2
    y = (size - text_height) / 2 - 1
    draw.text((x, y), text, fill="white", font=font)
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    img.save(ICON_DIR / f"icon{size}.png")


create_icon(16)
create_icon(48)
create_icon(128)
print("Icons created successfully")
