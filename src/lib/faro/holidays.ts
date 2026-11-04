// Public holidays for the month calendar. Pure, no dates from the clock.
// Spanish UI → Nicaragua (feriados + festividades); English UI → US federal holidays.
export type Holiday = { day: number; name: string; kind: "holiday" | "fest" };

/** Western (Gregorian) Easter Sunday, anonymous algorithm. Returns [month 1-12, day]. */
export function easter(year: number): [number, number] {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

/** n-th weekday (0=Sun) of a month; n = -1 means last. */
function nth(year: number, month: number, weekday: number, n: number): number {
  if (n > 0) {
    const first = new Date(year, month - 1, 1).getDay();
    return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  }
  const lastDay = new Date(year, month, 0).getDate();
  const last = new Date(year, month - 1, lastDay).getDay();
  return lastDay - ((last - weekday + 7) % 7);
}

function shift(year: number, month: number, day: number, by: number): [number, number] {
  const d = new Date(year, month - 1, day + by);
  return [d.getMonth() + 1, d.getDate()];
}

/** Holidays of one month (month 1-12) for the app language. Sorted by day. */
export function holidaysFor(lang: "es" | "en", year: number, month: number): Holiday[] {
  const out: Holiday[] = [];
  const add = (m: number, day: number, name: string, kind: Holiday["kind"] = "holiday") => {
    if (m === month) out.push({ day, name, kind });
  };
  if (lang === "es") {
    const [em, ed] = easter(year);
    const [tm, td] = shift(year, em, ed, -3);
    const [fm, fd] = shift(year, em, ed, -2);
    add(1, 1, "Año Nuevo");
    add(tm, td, "Jueves Santo");
    add(fm, fd, "Viernes Santo");
    add(5, 1, "Día del Trabajo");
    add(5, 30, "Día de las Madres");
    add(7, 19, "Revolución");
    add(8, 1, "Santo Domingo (Managua)", "fest");
    add(8, 10, "Santo Domingo (Managua)", "fest");
    add(9, 14, "Batalla de San Jacinto");
    add(9, 15, "Independencia");
    add(12, 7, "La Gritería", "fest");
    add(12, 8, "Purísima Concepción");
    add(12, 25, "Navidad");
  } else {
    add(1, 1, "New Year's Day");
    add(1, nth(year, 1, 1, 3), "Martin Luther King Jr. Day");
    add(2, nth(year, 2, 1, 3), "Presidents' Day");
    add(5, nth(year, 5, 1, -1), "Memorial Day");
    add(6, 19, "Juneteenth");
    add(7, 4, "Independence Day");
    add(9, nth(year, 9, 1, 1), "Labor Day");
    add(10, nth(year, 10, 1, 2), "Columbus / Indigenous Peoples' Day");
    add(11, 11, "Veterans Day");
    add(11, nth(year, 11, 4, 4), "Thanksgiving");
    add(12, 25, "Christmas Day");
  }
  return out.sort((a, b) => a.day - b.day);
}
