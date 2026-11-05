# Synthetic Escanear fixtures (no real personal data). python3 make.py
from PIL import Image, ImageDraw, ImageFont
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FM = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
f = lambda s, b=False: ImageFont.truetype(FB if b else F, s)

def tile(d, x, y, bg, glyph, fg, s=158):
    d.rounded_rectangle([x, y, x + s, y + s], 26, fill=bg)
    ft = f(84, True); w = d.textlength(glyph, font=ft)
    d.text((x + (s - w) / 2, y + 30), glyph, font=ft, fill=fg)

def play(name, rows, dark, header=None, benefits=None, cue="Next payment"):
    bg, fg, sub, sep = ((20, 20, 20), (236, 236, 236), (200, 200, 200), (70, 70, 70)) if dark else ((255, 255, 255), (32, 33, 36), (95, 99, 104), (218, 220, 224))
    H = 120 + len(rows) * 251 + (330 if benefits else 40)
    im = Image.new("RGB", (1080, H), bg); d = ImageDraw.Draw(im); y = 60
    if header: d.text((68, 20), header, font=f(44, True), fill=fg); y = 100
    for r in rows:
        d.line([68, y, 1012, y], fill=sep, width=3); y += 48
        d.text((68, y), r[0], font=f(38), fill=fg)
        if r[1]: d.text((68, y + 56), r[1], font=f(32), fill=sub)
        d.text((68, y + (100 if r[1] else 56)), r[2], font=f(32), fill=sub)
        tile(d, 854, y, *r[3]); y += 203
    if benefits:
        y += 10; d.text((68, y), benefits[0], font=f(38), fill=fg); y += 76
        for b in benefits[1:]: d.text((68, y), "✓ " + b, font=f(32), fill=sub); y += 62
    im.save(name)

play("play-dark-en.png", [
    ("Notefold - AI Notes Assistant", "Premium Yearly", "Next payment: $49.99 on Jan 18, 2027", ((255, 255, 255), "N", (0, 0, 0))),
    ("Readwise Lite: Books Aloud", "Ultra Plan", "Next payment: $89.00 on Feb 9, 2027", ((255, 255, 255), "R", (40, 40, 40))),
    ("Google One", "Google AI Plus (2 TB)", "Next payment: $99.99 on Oct 20, 2027", ((255, 255, 255), "1", (26, 115, 232))),
], True, benefits=["Your plan includes", "Expanded storage across Drive, Gmail, and Photos", "Direct support from Google experts"])

play("play-es-3apps.png", [
    ("YouTube Premium", "", "$13.99/mes · Se renueva el 12 nov", ((255, 0, 51), "▶", (255, 255, 255))),
    ("Duolingo Super", "", "$12.99/mes · Se renueva el 3 dic", ((88, 204, 2), "D", (255, 255, 255))),
    ("Spotify Premium", "", "$11.99/mes · Se renueva el 20 nov", ((30, 215, 96), "S", (0, 0, 0))),
], False, header="Suscripciones")

def receipt(name, lines, w=720):
    ft = ImageFont.truetype(FM, 30); H = 80 + 46 * len(lines)
    im = Image.new("RGB", (w, H), (250, 249, 245)); d = ImageDraw.Draw(im); y = 40
    for l in lines:
        if isinstance(l, tuple): d.text((40, y), l[0], font=ft, fill=(20, 20, 20)); tw = d.textlength(l[1], font=ft); d.text((w - 40 - tw, y), l[1], font=ft, fill=(20, 20, 20))
        else: tw = d.textlength(l, font=ft); d.text(((w - tw) / 2, y), l, font=ft, fill=(20, 20, 20))
        y += 46
    im.save(name)

receipt("receipt-publix.png", ["PUBLIX SUPER MARKETS", "1234 Example Rd", "Miami, FL 33157", "", ("BANANAS", "1.29"), ("MILK WHOLE GAL", "4.59"), ("BREAD WHEAT", "3.49"), ("SUBTOTAL", "9.37"), ("SALES TAX", "0.00"), ("GRAND TOTAL", "9.37"), ("CASH", "20.00"), ("CHANGE", "10.63"), "", "10/30/2026 14:22", "Thank you for shopping"])
receipt("receipt-en.png", ["Corner Coffee Co.", "Receipt #4411", "", ("Latte", "4.75"), ("Croissant", "3.25"), ("Subtotal", "8.00"), ("Tax", "0.56"), ("Tip", "1.50"), ("TOTAL", "$10.06"), "", "Date: Nov 2, 2026"])
