/* =========================================================================
   MAIN.JS
   -------------------------------------------------------------------------
   Lógica JS del sitio. Todo vanilla — sin dependencias externas.
     1. Scroll reveal: anima secciones con clase .reveal al entrar al viewport
     2. Marquee loop: duplica el contenido de cada .marquee-track para que
        la animación CSS se vea infinita sin saltos
   ========================================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     1. SCROLL REVEAL
     Observa los elementos con clase .reveal y les añade .visible cuando
     entran al viewport. Los estilos viven en base.css.
     --------------------------------------------------------------------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -80px 0px",
    }
  );

  document.querySelectorAll(".reveal").forEach((el) => {
    revealObserver.observe(el);
  });

  /* ---------------------------------------------------------------------
     2. MARQUEE LOOP
     Para que el marquee se vea infinito, el contenido se duplica en JS.
     La animación CSS mueve el track un -50%, que equivale justo a una
     repetición completa del contenido original.
     --------------------------------------------------------------------- */
  document.querySelectorAll(".marquee-track").forEach((track) => {
    track.innerHTML = track.innerHTML + track.innerHTML;
  });
})();
