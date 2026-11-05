# Synthetic credit-card screenshot fixtures (1.3.107). Look-alikes only: invented amounts, invented last-4, no real data.
# python3 make.py  → paypal-dark.png, wf-light.png, es-card.png, other-bank.png (1.3.107), paypal-stacked.png, rewards-crop.png (1.3.109)
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

# 1.3.109: PayPal-like dark screen with the rewards block stacked: big values with their caption UNDER each one.
def stacked(name):
    im = Image.new("RGB", (1080, 1500), (14, 14, 16)); d = ImageDraw.Draw(im); fg, sub = (240, 240, 240), (170, 170, 175)
    d.text((60, 70), "PayPal Cashback World Masterca...", font=f(46), fill=fg)
    d.text((60, 200), "Current balance", font=f(36, True), fill=fg); d.text((60, 260), "$432.10", font=f(78, True), fill=fg)
    for y, a, b in [(420, "Available credit", "$4,567.90"), (520, "Min payment due", "$35.00")]:
        d.text((60, y), a, font=f(38), fill=fg); w = d.textlength(b, font=f(38)); d.text((1020 - w, y), b, font=f(38), fill=fg)
    d.text((60, 900), "Rewards", font=f(44, True), fill=fg)
    d.text((60, 1030), "Cash back", font=f(60, True), fill=fg)
    d.text((60, 1150), "$12.34", font=f(84, True), fill=fg); d.text((60, 1260), "Current", font=f(34), fill=sub)
    d.text((540, 1150), "$98.76", font=f(84, True), fill=fg); d.text((540, 1260), "Year to Date", font=f(34), fill=sub)
    im.save(name, optimize=True)
stacked("paypal-stacked.png")
# 1.3.109: a crop showing only the rewards strip (no card name): the reader guesses the card and asks.
im = Image.new("RGB", (1080, 230), (255, 255, 255)); d = ImageDraw.Draw(im)
d.text((90, 30), "Outstanding balance", font=f(36), fill=(30, 30, 30)); d.rectangle((40, 110, 1040, 220), fill=(240, 238, 250))
d.text((180, 140), "$58.20 cash rewards", font=f(40, True), fill=(30, 30, 30)); im.save("rewards-crop.png", optimize=True)
