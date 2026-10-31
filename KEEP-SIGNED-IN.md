# "Mantener sesión abierta / Keep me signed in" — reference (Faro 1.3.36, Brizna 1.2.8)
Read-only reference; copy the pattern into your own app with your own key names.
Faro files: /workspace/work/faro/src/spa/cloud.ts (KEEP flag, box(), authStorage, rememberUser/lastUser via box(), sessionGone/setSessionGone/askSignInAgain),
src/spa/login.tsx (checkbox under password on sign-in + sign-up; setKeepSignedIn(keep) before signInWithPassword/signUp),
src/spa/gate.css (.gate-keep), spa/main.tsx Gate (softExpired = expired && keepSignedIn() && !relogin → keep app open with local data),
src/spa/gates.tsx (account card shows "Entrar de nuevo" when sessionGone()), src/spa/words.ts (login.keep, acct.gone, acct.again).
Test: /workspace/work/browser-test/keep.mjs (routes the github.io URL to the local build through the proxy; signs up a throwaway user, checks kept/not kept/soft-expire). Delete throwaway users afterwards.
