"use strict";

const Help = (() => {
  // ── Contenu visiteur ─────────────────────────────────────────────────────

  const _manettes = `
    <h3>Pivoter sur place <span class="help-note">(par cran de 15°)</span></h3>
    <table>
      <tr><td>Joystick gauche ← →</td><td>Tourner à gauche / droite</td></tr>
      <tr><td>Bouton <strong>X</strong></td><td>Tourner à gauche</td></tr>
      <tr><td>Bouton <strong>Y</strong></td><td>Tourner à droite</td></tr>
    </table>
    <h3>Monter / Descendre <span class="help-note">(par cran de 2 m)</span></h3>
    <table>
      <tr><td>Joystick gauche ↑</td><td>Monter</td></tr>
      <tr><td>Joystick gauche ↓</td><td>Descendre</td></tr>
    </table>
    <h3>Se téléporter <span class="help-note">(si activé par le médiateur)</span></h3>
    <p>Pointez avec la <strong>manette droite</strong> vers votre destination,
       puis appuyez sur la <strong>gâchette index droit</strong> pour vous y rendre.</p>
    <h3>Consulter une annotation</h3>
    <p>Pointez une zone qui s'illumine avec votre manette — un panneau d'information apparaît.
       Pointez ailleurs pour le refermer.</p>`;

  const _mainsNues = `
    <p class="help-intro">Le casque reconnaît vos mains directement.
       Gardez-les dans votre champ de vision pour que les gestes soient bien détectés.</p>
    <h3>Pivoter sur place <span class="help-note">(par cran de 15°)</span></h3>
    <table>
      <tr><td>Balayer la main gauche → droite</td><td>Tourner à droite</td></tr>
      <tr><td>Balayer la main gauche → gauche</td><td>Tourner à gauche</td></tr>
    </table>
    <h3>Monter / Descendre <span class="help-note">(par cran de 2 m)</span></h3>
    <table>
      <tr><td>Balayer la main gauche ↑</td><td>Monter</td></tr>
      <tr><td>Balayer la main gauche ↓</td><td>Descendre</td></tr>
    </table>
    <h3>Se téléporter <span class="help-note">(si activé par le médiateur)</span></h3>
    <p>Dirigez la <strong>main droite</strong> vers votre destination,
       puis <strong>pincez</strong> l'index et le pouce pour vous y rendre.</p>
    <h3>Consulter une annotation</h3>
    <p>Approchez votre main d'une zone qui s'illumine — un panneau d'information apparaît.
       Éloignez-vous pour le refermer.</p>`;

  const _desktop = `
    <table>
      <tr><td>Clic gauche + glisser</td><td>Faire pivoter la vue</td></tr>
      <tr><td>Clic droit + glisser</td><td>Déplacer latéralement</td></tr>
      <tr><td>Molette</td><td>Zoom avant / arrière</td></tr>
      <tr><td>Survoler une zone lumineuse</td><td>Afficher les informations</td></tr>
    </table>`;

  // ── Contenu médiateur 3D ─────────────────────────────────────────────────

  const _medNav = `
    <p class="help-intro">Mêmes contrôles que les visiteurs, avec la téléportation
       <strong>toujours active</strong> quelle que soit la navigation des visiteurs.</p>
    <h3>Partager ma vue</h3>
    <p>Le bouton <strong>📍 Partager ma vue</strong> dans le panneau envoie exactement
       votre point de vue actuel à tous les visiteurs — utile pour attirer l'attention
       sur un détail précis.</p>
    <h3>Panneau de contrôle</h3>
    <p>Ouvrez-le avec le bouton <strong>🎛</strong> sur le côté droit de l'écran. Fermez-le de la
       même façon pour retrouver la vue complète.</p>`;

  const _medPanel = `
    <h3>Points de vue</h3>
    <p>Chaque bouton emmène <strong>tous les visiteurs</strong> vers un emplacement
       prédéfini de la visite.</p>
    <h3>Calques</h3>
    <p>Active ou masque une couche dans tous les casques :
       état actuel du site, restitution XIIIe s., photos d'archives.</p>
    <h3>Navigation des visiteurs</h3>
    <p>Bascule entre <strong>visite guidée</strong> (téléportation bloquée — défaut)
       et <strong>visite libre</strong> (déplacement autonome autorisé).</p>
    <h3>Exploration des calques</h3>
    <p>Autorise les visiteurs à activer eux-mêmes les calques depuis leur casque.
       À utiliser lors des phases d'exploration autonome.</p>
    <h3>Message à tous</h3>
    <p>Le texte saisi s'affiche en surimpression dans tous les casques connectés.</p>`;

  // ── Définition des sections par interface ────────────────────────────────

  const VISITOR_SECTIONS = [
    { label: "VR — Mains nues", html: _mainsNues },
    { label: "VR — Manettes", html: _manettes },
    { label: "Navigateur", html: _desktop },
  ];

  const MEDIATOR_SECTIONS = [
    { label: "Navigation 3D", html: _medNav },
    { label: "Panneau de contrôle", html: _medPanel },
  ];

  // ── Construction de l'UI ─────────────────────────────────────────────────

  let _overlay = null;

  function init(sections) {
    _buildButton();
    _buildModal(sections);
  }

  function _buildButton() {
    const btn = document.createElement("button");
    btn.id = "help-btn";
    btn.className = "ctrl-btn";
    btn.title = "Aide";
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
         <circle cx="12" cy="12" r="10"/>
         <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
         <line x1="12" y1="17" x2="12.01" y2="17"/>
       </svg>
       Aide`;
    btn.addEventListener("click", open);

    const target =
      document.getElementById("controls-bar") ||
      document.getElementById("ui-overlay") ||
      document.body;
    target.appendChild(btn);
  }

  function _buildModal(sections) {
    _overlay = document.createElement("div");
    _overlay.id = "help-overlay";
    _overlay.addEventListener("click", (e) => {
      if (e.target === _overlay) close();
    });

    const modal = document.createElement("div");
    modal.id = "help-modal";

    // Header
    const header = document.createElement("div");
    header.className = "help-header";
    header.innerHTML = `<span class="help-title">Aide</span>
       <button class="help-close" title="Fermer">✕</button>`;
    header.querySelector(".help-close").addEventListener("click", close);
    modal.appendChild(header);

    // Tabs
    const tabBar = document.createElement("div");
    tabBar.className = "help-tabs";

    const content = document.createElement("div");
    content.className = "help-content";
    content.innerHTML = sections[0].html;

    sections.forEach((s, i) => {
      const tab = document.createElement("button");
      tab.className = "help-tab" + (i === 0 ? " active" : "");
      tab.textContent = s.label;
      tab.addEventListener("click", () => {
        tabBar
          .querySelectorAll(".help-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        content.innerHTML = s.html;
      });
      tabBar.appendChild(tab);
    });

    modal.appendChild(tabBar);
    modal.appendChild(content);
    _overlay.appendChild(modal);
    document.body.appendChild(_overlay);

    // Mesure la hauteur de chaque onglet pour figer le contenu à la plus grande
    _overlay.style.visibility = "hidden";
    _overlay.style.display = "flex";
    let maxH = 0;
    sections.forEach((s) => {
      content.innerHTML = s.html;
      maxH = Math.max(maxH, content.scrollHeight);
    });
    content.style.height = maxH + "px";
    content.innerHTML = sections[0].html;
    _overlay.style.display = "";
    _overlay.style.visibility = "";
  }

  function open() {
    _overlay?.classList.add("open");
  }
  function close() {
    _overlay?.classList.remove("open");
  }

  return { init, open, close, VISITOR_SECTIONS, MEDIATOR_SECTIONS };
})();
