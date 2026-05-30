// Post-R1 (2026-05-30) — Lunch app extracted vers ../rotary-event-lunch/.
// Le STANDALONE_PAGES set et le chrome lunch (top bar Rotary + NotificationProvider)
// ont été retirés : toutes les pages restantes sont plateforme RSA et rendent leur
// propre layout. Cette fonction reste juste pour conserver le contrat de l'App
// (LayoutWrapper l'appelle si elle existe).
export default function Layout({ children }) {
  return <>{children}</>;
}
