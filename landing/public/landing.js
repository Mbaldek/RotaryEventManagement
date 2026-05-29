// landing.js — comportements client de la landing apex rotary-startup.org.
//
// Servi en /landing.js (Astro public/ → racine du déploiement). Charge externe
// avec <script src="/landing.js" defer>, compatible avec la CSP stricte
// (script-src 'self', pas de 'unsafe-inline') du vercel.json.
//
// Deux responsabilités :
//   1. Accordéon des sessions qualificatives (palmarès).
//   2. Switch i18n FR/EN/DE — le toggle existant (.rsa-lang-tg) bascule
//      réellement les copies via data-{en|de}-* attrs sur les <a> et <h2>.

(function () {
  // ─── Accordéon sessions qualificatives ───
  document.querySelectorAll(".rsa-acc-h").forEach((h) => {
    h.addEventListener("click", () => {
      h.parentElement && h.parentElement.classList.toggle("open");
    });
  });

  // ─── i18n FR/EN/DE switch ───
  // Snapshot FR au mount (le DOM démarre en FR). On stocke le texte initial
  // dans data-fr-{slot} la première fois qu'on bascule, pour pouvoir restaurer.
  //
  // Slots couverts :
  //   - nav-link  : .rsa-nav-link-label (data-en / data-de sur le <a> parent)
  //   - banner    : .rsa-banner-tag-label / .rsa-banner-title / .rsa-banner-cta-label
  //                 (data-{en|de}-tag / -title / -cta sur le <a class="rsa-banner-2027">)
  //   - cta head  : .rsa-cta-kicker (data-en / data-de), h2.rsa-cta-h-1 / .rsa-cta-h-2
  //                 (data-en-1/-2 / data-de-1/-2 sur le <h2>), .rsa-cta-lede
  //   - cta cards : .rsa-cta-card-tag / -tit / -desc / -arr-label
  //                 (data-{en|de}-tag / -tit / -desc / -cta sur le <a.rsa-cta-card>)
  function applyLang(lang) {
    var setText = function (el, val) {
      if (el && val != null) el.textContent = val;
    };

    // Helper : pour chaque [container], lit container.dataset[`${lang}${suffix}`]
    // (ou data-fr-{slot} si lang=fr) et écrit dans le sélecteur enfant.
    // Snapshot FR à la 1re utilisation pour pouvoir restaurer.
    var swap = function (container, suffix, childSelector) {
      if (!container) return;
      var child = container.querySelector(childSelector);
      if (!child) return;
      var frKey = "fr" + suffix;
      if (!container.dataset[frKey]) container.dataset[frKey] = child.textContent;
      var value =
        lang === "fr"
          ? container.dataset[frKey]
          : container.dataset[lang + suffix];
      setText(child, value);
    };

    // Nav link
    document.querySelectorAll(".rsa-nav-link").forEach(function (a) {
      swap(a, "", ".rsa-nav-link-label");
    });

    // Banner 2027
    document.querySelectorAll(".rsa-banner-2027").forEach(function (a) {
      swap(a, "Tag", ".rsa-banner-tag-label");
      swap(a, "Title", ".rsa-banner-title");
      swap(a, "Cta", ".rsa-banner-cta-label");
    });

    // CTA head
    document.querySelectorAll(".rsa-cta-kicker").forEach(function (el) {
      // Le kicker porte lui-même les data-en/data-de, pas un parent.
      if (!el.dataset.fr) el.dataset.fr = el.textContent.trim();
      var v = lang === "fr" ? el.dataset.fr : el.dataset[lang];
      if (v) el.textContent = v;
    });
    document.querySelectorAll(".rsa-cta-sec h2").forEach(function (h2) {
      var h1el = h2.querySelector(".rsa-cta-h-1");
      var h2el = h2.querySelector(".rsa-cta-h-2");
      if (h1el && !h2.dataset.fr1) h2.dataset.fr1 = h1el.textContent;
      if (h2el && !h2.dataset.fr2) h2.dataset.fr2 = h2el.textContent;
      setText(h1el, lang === "fr" ? h2.dataset.fr1 : h2.dataset[lang + "1"]);
      setText(h2el, lang === "fr" ? h2.dataset.fr2 : h2.dataset[lang + "2"]);
    });
    document.querySelectorAll(".rsa-cta-lede").forEach(function (p) {
      if (!p.dataset.fr) p.dataset.fr = p.textContent.trim();
      var v = lang === "fr" ? p.dataset.fr : p.dataset[lang];
      if (v) p.textContent = v;
    });

    // CTA cards
    document.querySelectorAll(".rsa-cta-card").forEach(function (a) {
      swap(a, "Tag", ".rsa-cta-card-tag");
      swap(a, "Tit", ".rsa-cta-card-tit");
      swap(a, "Desc", ".rsa-cta-card-desc");
      swap(a, "Cta", ".rsa-cta-card-arr-label");
    });

    document.documentElement.setAttribute("lang", lang);
  }

  document.querySelectorAll(".rsa-lang-tg button").forEach(function (b) {
    b.addEventListener("click", function () {
      document
        .querySelectorAll(".rsa-lang-tg button")
        .forEach(function (x) {
          x.classList.remove("act");
        });
      b.classList.add("act");
      var lang = b.getAttribute("data-l") || "fr";
      applyLang(lang);
    });
  });
})();
