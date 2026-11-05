# Synthetic credit-card screenshot fixtures (1.3.107). Look-alikes only: invented amounts, invented last-4, no real data.
# python3 make.py  → paypal-dark.png, wf-light.png, es-card.png, other-bank.png
from PIL import Image, ImageDraw, ImageFont
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
f = lambda s, b=False: ImageFont.truetype(FB if b else F, s)

def shot(name, rows, dark, H=1500):
    bg, fg, sub = ((14, 14, 16), (240, 240, 240), (170, 170, 175)) if dark else ((246, 246, 246), (30, 30, 30), (95, 95, 95))
    im = Image.new("RGB", (1080, H), bg); d = ImageDraw.Draw(im); y = 70
    for kind, a, b in rows:
        if kind == "gap": y += a; continue
        if kind == "title": d.text((60, y), a, font=f(46, True), fill=fg); y += 90; continue
        if kind == "big": d.text((60, y), a, font=f(78, True), fill=fg); y += 110; continue
        if kind == "label": d.text((60, y), a, font=f(36), fill=sub); y += 64; continue
        if kind == "pair":
            d.text((60, y), a, font=f(38), fill=fg); w = d.textlength(b, font=f(38, True)); d.text((1020 - w, y), b, font=f(38, True), fill=fg); y += 80; continue
        if kind == "text": d.text((60, y), a, font=f(36), fill=sub); y += 70; continue
    im.save(name, optimize=True)

# PayPal-like, dark: title cut with an ellipsis, balance under its label, rewards to ignore.
shot("paypal-dark.png", [
    ("title", "PayPal Cashback World Masterca...", ""), ("gap", 30, ""),
    ("label", "Current balance", ""), ("big", "$432.10", ""), ("gap", 20, ""),
    ("pair", "Available credit", "$4,567.90"), ("pair", "Min payment due", "$35.00"), ("pair", "Autopay", "On"),
    ("gap", 40, ""), ("title", "Rewards", ""), ("pair", "Cash back", "$12.34"), ("text", "Current Year to Date", ""),
], True)

# Wells Fargo-like, light home screen: amount ABOVE its label, cash rewards, FICO and offers to ignore.
shot("wf-light.png", [
    ("text", "Good morning", ""), ("title", "WELLS FARGO ACTIVE CASH VISA®", ""), ("text", "CARD ...9021", ""),
    ("big", "$2,045.67", ""), ("label", "Outstanding balance", ""), ("text", "$58.20 cash rewards", ""), ("gap", 40, ""),
    ("text", "Your FICO® Score did not change", ""), ("big", "731", ""), ("text", "Updated 11/01/2026", ""),
    ("title", "Offers", ""), ("text", "Enjoy $300 with a new checking account", ""),
], False)

# Spanish wording, another bank, with limit, due date and APR.
shot("es-card.png", [
    ("title", "Tarjeta Capital One Quicksilver ••••5530", ""), ("gap", 20, ""),
    ("pair", "Saldo actual", "$1.250,40"), ("pair", "Crédito disponible", "$3.749,60"), ("pair", "Límite de crédito", "$5.000,00"),
    ("pair", "Pago mínimo", "$40,00"), ("pair", "Fecha de pago", "28 nov 2026"), ("pair", "Tasa de interés anual", "27,24%"),
    ("text", "Recompensas: 1,5% en todo", ""),
], False, H=1000)

# A bank Faro has no preset for (for "Añadir tarjeta" prefilled).
shot("other-bank.png", [
    ("title", "Discover it® Card ending in 4417", ""), ("gap", 20, ""),
    ("pair", "Current Balance", "$310.00"), ("pair", "Credit Line", "$2,500.00"), ("pair", "Minimum Payment Due", "$29.00"),
    ("pair", "Payment Due Date", "Dec 3, 2026"), ("pair", "Purchase APR", "18.24%"),
], False, H=900)
