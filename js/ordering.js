/* =========================================================================
   ORDERING.JS
   -------------------------------------------------------------------------
   Lógica de la página order.html:
     - Lee selecciones del DOM (data-* atributos del HTML)
     - Renderiza el sidebar dinámicamente (empty state → items + totales)
     - Calcula subtotal, servicio (8%) y total en vivo
     - Habilita el botón "Pagar" solo cuando hay pizza + tamaño
     - Botón "Limpiar" resetea la orden
     - Al pagar: genera el ticket con número de orden, barcode y detalle
     - Maneja el modal (cerrar con Esc o backdrop, imprimir, nueva orden)

   Los precios viven en el HTML como data-price — single source of truth.
   ========================================================================= */

(function () {
  "use strict";

  // -------------------------------------------------------------------------
  // CONFIG
  // -------------------------------------------------------------------------
  const SERVICE_RATE = 0.08; // 8% de servicio/propina

  // -------------------------------------------------------------------------
  // FORMATEO COP
  // -------------------------------------------------------------------------
  function formatCOP(amount) {
    return "$" + Math.round(amount).toLocaleString("es-CO");
  }

  // -------------------------------------------------------------------------
  // ESTADO (lee siempre del DOM — no duplicamos datos)
  // -------------------------------------------------------------------------
  function getState() {
    const pizzaInput  = document.querySelector('input[name="pizza"]:checked');
    const sizeInput   = document.querySelector('input[name="size"]:checked');
    const extraInputs = document.querySelectorAll('input[name="extra"]:checked');

    const pizza = pizzaInput ? {
      id:    pizzaInput.closest(".pizza-card").dataset.id,
      name:  pizzaInput.closest(".pizza-card").dataset.name,
      price: Number(pizzaInput.closest(".pizza-card").dataset.price),
    } : null;

    const size = sizeInput ? {
      id:         sizeInput.closest(".size-option").dataset.size,
      name:       sizeInput.closest(".size-option").dataset.name,
      multiplier: Number(sizeInput.closest(".size-option").dataset.multiplier),
    } : null;

    const extras = Array.from(extraInputs).map((input) => ({
      id:    input.closest(".extra-chip").dataset.id,
      name:  input.closest(".extra-chip").dataset.name,
      price: Number(input.closest(".extra-chip").dataset.price),
    }));

    const pizzaPrice  = pizza && size ? pizza.price * size.multiplier : 0;
    const extrasPrice = extras.reduce((sum, e) => sum + e.price, 0);
    const subtotal    = pizzaPrice + extrasPrice;
    const service     = subtotal * SERVICE_RATE;
    const total       = subtotal + service;

    return {
      pizza, size, extras,
      pizzaPrice, extrasPrice,
      subtotal, service, total,
      isValid: !!(pizza && size),
      hasAnySelection: !!(pizza || size || extras.length > 0),
    };
  }

  // -------------------------------------------------------------------------
  // RENDER DEL SIDEBAR
  // -------------------------------------------------------------------------
  function renderSidebar() {
    const s = getState();

    const elEmpty   = document.getElementById("sidebar-empty");
    const elItems   = document.getElementById("sidebar-items");
    const elTotals  = document.getElementById("sidebar-totals");
    const elClear   = document.getElementById("btn-clear-order");
    const btn       = document.getElementById("btn-pagar");

    // Mostrar/ocultar empty state vs items
    if (!s.hasAnySelection) {
      elEmpty.hidden  = false;
      elItems.hidden  = true;
      elTotals.hidden = true;
      elClear.hidden  = true;
    } else {
      elEmpty.hidden  = true;
      elItems.hidden  = false;
      elTotals.hidden = false;
      elClear.hidden  = false;
    }

    // Renderizar items
    let itemsHTML = "";

    // La pizza con su tamaño (solo si ambos están)
    if (s.pizza && s.size) {
      itemsHTML += `
        <li class="sidebar-item">
          <div class="sidebar-item-info">
            <div class="sidebar-item-name">${s.pizza.name}</div>
            <div class="sidebar-item-meta">Tamaño ${s.size.name} · ${s.size.multiplier}×</div>
          </div>
          <div class="sidebar-item-price">${formatCOP(s.pizzaPrice)}</div>
        </li>
      `;
    } else if (s.pizza) {
      // Solo pizza, falta tamaño
      itemsHTML += `
        <li class="sidebar-item">
          <div class="sidebar-item-info">
            <div class="sidebar-item-name">${s.pizza.name}</div>
            <div class="sidebar-item-meta" style="color: var(--red)">⚠ Falta elegir el tamaño</div>
          </div>
          <div class="sidebar-item-price">—</div>
        </li>
      `;
    } else if (s.size) {
      // Solo tamaño, falta pizza
      itemsHTML += `
        <li class="sidebar-item">
          <div class="sidebar-item-info">
            <div class="sidebar-item-name" style="color: var(--red)">⚠ Elige una base</div>
            <div class="sidebar-item-meta">Tamaño ${s.size.name} seleccionado</div>
          </div>
          <div class="sidebar-item-price">—</div>
        </li>
      `;
    }

    // Extras
    s.extras.forEach((e) => {
      itemsHTML += `
        <li class="sidebar-item sidebar-item--extra">
          <div class="sidebar-item-info">
            <div class="sidebar-item-name">${e.name}</div>
          </div>
          <div class="sidebar-item-price">${formatCOP(e.price)}</div>
        </li>
      `;
    });

    elItems.innerHTML = itemsHTML;

    // Totales
    document.getElementById("total-subtotal").textContent = formatCOP(s.subtotal);
    document.getElementById("total-service").textContent  = formatCOP(s.service);
    document.getElementById("total-final").textContent    = formatCOP(s.total);

    // Botón habilitado solo si hay pizza + tamaño
    btn.disabled = !s.isValid;
  }

  // -------------------------------------------------------------------------
  // LIMPIAR ORDEN
  // -------------------------------------------------------------------------
  function clearOrder() {
    document.querySelectorAll('input[name="pizza"], input[name="size"], input[name="extra"]')
      .forEach((input) => { input.checked = false; });
    renderSidebar();
  }

  // -------------------------------------------------------------------------
  // GENERADOR DE TICKET
  // -------------------------------------------------------------------------
  function generateOrderNumber() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const date = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
    const rand = Math.floor(1000 + Math.random() * 9000);
    return "CT-" + date + "-" + rand;
  }

  function formatDateTime() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return {
      date: pad(now.getDate()) + "/" + pad(now.getMonth() + 1) + "/" + now.getFullYear(),
      time: pad(now.getHours()) + ":" + pad(now.getMinutes()),
    };
  }

  function generateBarcode(orderNum) {
    const chars = orderNum.replace(/[^0-9]/g, "");
    let html = "";
    for (let i = 0; i < 40; i++) {
      const digit = Number(chars[i % chars.length] || 0);
      const widths  = [1, 2, 3, 2, 1, 2, 3, 1, 2, 1];
      const heights = [100, 85, 100, 90, 100];
      const w = widths[digit] || 1;
      const h = heights[(digit + i) % heights.length];
      html += `<span style="width:${w}px;height:${h}%"></span>`;
    }
    return html;
  }

  function renderTicket() {
    const s = getState();
    const { date, time } = formatDateTime();
    const orderNum = generateOrderNumber();

    let itemsHTML = "";
    if (s.pizza && s.size) {
      itemsHTML += `
        <div class="ticket-item">
          <div class="ticket-item-name">
            ${s.pizza.name}
            <em>Tamaño ${s.size.name}</em>
          </div>
          <div class="ticket-item-price">${formatCOP(s.pizzaPrice)}</div>
        </div>
      `;
    }
    s.extras.forEach((e) => {
      itemsHTML += `
        <div class="ticket-item">
          <div class="ticket-item-name">+ ${e.name}</div>
          <div class="ticket-item-price">${formatCOP(e.price)}</div>
        </div>
      `;
    });

    const ticketHTML = `
      <div class="ticket-header">
        <div class="ticket-logo">COTESS <em>Pizza</em></div>
        <div class="ticket-sub">El Club de la Pizza</div>
      </div>

      <div class="ticket-meta">
        <div><strong>Orden</strong><br>${orderNum}</div>
        <div style="text-align:right"><strong>${date}</strong><br>${time} hrs</div>
      </div>

      <div class="ticket-items">${itemsHTML}</div>

      <div class="ticket-totals">
        <div class="ticket-total-line">
          <span>Subtotal</span>
          <span>${formatCOP(s.subtotal)}</span>
        </div>
        <div class="ticket-total-line">
          <span>Servicio 8%</span>
          <span>${formatCOP(s.service)}</span>
        </div>
        <div class="ticket-total-line is-total">
          <span>Total</span>
          <span>${formatCOP(s.total)}</span>
        </div>
      </div>

      <div class="ticket-barcode">
        <div class="ticket-barcode-bars">${generateBarcode(orderNum)}</div>
        <div class="ticket-barcode-num">${orderNum}</div>
      </div>

      <div class="ticket-footer">
        <strong>★ Gracias por ser miembro ★</strong>
        Conserva este ticket<br>
        Es tu prueba de pertenencia
      </div>
    `;

    document.getElementById("ticket-paper").innerHTML = ticketHTML;
  }

  // -------------------------------------------------------------------------
  // MODAL: OPEN / CLOSE
  // -------------------------------------------------------------------------
  function openTicket() {
    renderTicket();
    const modal = document.getElementById("ticket-modal");
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeTicket() {
    const modal = document.getElementById("ticket-modal");
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function newOrder() {
    clearOrder();
    closeTicket();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // -------------------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------------------
  function init() {
    // Listener general: cualquier cambio en radios/checkboxes recalcula
    document.addEventListener("change", (e) => {
      if (e.target.matches('input[name="pizza"], input[name="size"], input[name="extra"]')) {
        renderSidebar();
      }
    });

    // Botón Limpiar
    const btnClear = document.getElementById("btn-clear-order");
    if (btnClear) btnClear.addEventListener("click", clearOrder);

    // Botón Pagar
    const btnPagar = document.getElementById("btn-pagar");
    if (btnPagar) btnPagar.addEventListener("click", openTicket);

    // Cerrar modal con backdrop
    const backdrop = document.querySelector(".ticket-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeTicket);

    // Cerrar con Esc
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTicket();
    });

    // Botones del ticket
    const btnPrint = document.getElementById("btn-ticket-print");
    const btnNueva = document.getElementById("btn-ticket-new");
    const btnClose = document.getElementById("btn-ticket-close");

    if (btnPrint) btnPrint.addEventListener("click", () => window.print());
    if (btnNueva) btnNueva.addEventListener("click", newOrder);
    if (btnClose) btnClose.addEventListener("click", closeTicket);

    // Render inicial
    renderSidebar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
