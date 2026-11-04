// 1.3.88: mounts the Tron Grid floor once (outside React's root). Shown only by [data-theme="tron"] CSS.
import "./tron-floor.css";
export function mountTronFloor() {
  if (typeof document === "undefined") return;
  const mount = () => {
    if (document.querySelector(".tron-floor")) return;
    const d = document.createElement("div");
    d.className = "tron-floor"; d.setAttribute("aria-hidden", "true");
    d.appendChild(document.createElement("i"));
    document.body.prepend(d);
  };
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount, { once: true });
  // Hidden tab: spa/main.tsx sets html[data-hidden]; tron-floor.css pauses the stream on it.
}
