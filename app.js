(() => {
  'use strict';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const plans = {
    developer: { name: 'Developer', price: 15, specs: '2 GB RAM · 25 GB SSD' },
    growth: { name: 'Enterprise', price: 45, specs: '8 GB RAM · 100 GB NVMe' },
    enterprise: { name: 'Enterprise Plus', price: 120, specs: '32 GB RAM · 500 GB NVMe' }
  };

  function scrollToElement(element) {
    element?.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  }

  const menuToggle = $('#menu-toggle');
  const mobileNav = $('#mobile-nav');
  function closeMenu(restoreFocus = false) {
    if (!menuToggle || !mobileNav) return;
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú de navegación');
    if (restoreFocus) menuToggle.focus();
  }
  menuToggle?.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    mobileNav.hidden = isOpen;
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Abrir menú de navegación' : 'Cerrar menú de navegación');
  });
  mobileNav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  window.matchMedia('(min-width: 769px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });

  const tabs = $$('[data-product-tab]');
  function activateTab(tab, moveFocus = false) {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      item.classList.toggle('active', active);
    });
    $$('[data-product-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.productPanel !== tab.dataset.productTab;
    });
    if (moveFocus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex !== undefined) {
        event.preventDefault();
        activateTab(tabs[nextIndex], true);
      }
    });
  });
  $('.storage-card')?.addEventListener('click', (event) => {
    const storageTab = tabs.find((tab) => tab.dataset.productTab === 'storage');
    if (!storageTab) return;
    event.preventDefault();
    activateTab(storageTab);
    scrollToElement($('#storage-info'));
  });

  const calcForm = $('#calculator-form');
  const planInput = $('#calc-plan');
  const quantityInput = $('#calc-quantity');
  const rangeInput = $('#calc-range');
  const calcError = $('#calc-error');
  const requestPlan = $('#request-plan');

  function getQuantity() {
    if (!quantityInput) return null;
    const value = Number(quantityInput.value);
    return quantityInput.value.trim() !== '' && Number.isInteger(value) && value >= 1 && value <= 100 ? value : null;
  }

  function updateCalculator() {
    if (!planInput || !quantityInput) return;
    const plan = plans[planInput.value];
    const quantity = getQuantity();
    const valid = quantity !== null;
    quantityInput.setCustomValidity(valid ? '' : 'Ingresa una cantidad entera entre 1 y 100 servidores.');
    quantityInput.setAttribute('aria-invalid', String(!valid));
    if (calcError) {
      calcError.hidden = valid;
      calcError.textContent = valid ? '' : 'Ingresa una cantidad entera entre 1 y 100 servidores.';
    }
    if (!plan) return;
    if ($('#calc-price')) $('#calc-price').textContent = money.format(plan.price);
    if ($('#calc-spec')) $('#calc-spec').textContent = plan.specs;
    if (!valid) {
      if ($('#calc-total')) $('#calc-total').textContent = '—';
      if ($('#calc-equation')) $('#calc-equation').textContent = 'Revisa la cantidad para calcular tu estimación.';
      if ($('#calc-summary')) $('#calc-summary').textContent = 'Cantidad pendiente de corregir';
      return;
    }
    if (rangeInput) rangeInput.value = String(Math.min(quantity, Number(rangeInput.max) || 20));
    if ($('#calc-total')) $('#calc-total').textContent = money.format(plan.price * quantity);
    if ($('#calc-equation')) $('#calc-equation').textContent = `${money.format(plan.price)} × ${quantity} ${quantity === 1 ? 'servidor' : 'servidores'}`;
    if ($('#calc-summary')) $('#calc-summary').textContent = `${quantity} ${quantity === 1 ? 'servidor' : 'servidores'} ${plan.name} · Facturación mensual en USD`;
  }
  planInput?.addEventListener('change', () => {
    if (requestPlan) requestPlan.value = planInput.value;
    updateCalculator();
  });
  quantityInput?.addEventListener('input', updateCalculator);
  rangeInput?.addEventListener('input', () => {
    if (quantityInput) quantityInput.value = rangeInput.value;
    updateCalculator();
  });
  calcForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    updateCalculator();
    if (!calcForm.reportValidity()) return;
    openRequest(planInput.value);
    scrollToElement($('#registro'));
    $('#request-form input')?.focus({ preventScroll: true });
  });
  $$('[data-select-plan]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.selectPlan;
      if (!plans[value] || !planInput) return;
      planInput.value = value;
      if (requestPlan) requestPlan.value = value;
      updateCalculator();
      scrollToElement($('#calculadora'));
      planInput.focus({ preventScroll: true });
    });
  });
  updateCalculator();

  let requestDraft = null;
  const requestForm = $('#request-form');
  const requestSuccess = $('#request-success');
  const requestName = $('#request-name');
  function validateName() {
    requestName?.setCustomValidity(requestName.value.trim() ? '' : 'Escribe tu nombre completo.');
  }
  requestName?.addEventListener('input', validateName);
  function openRequest(value) {
    requestDraft = null;
    if (requestForm) requestForm.hidden = false;
    if (requestSuccess) requestSuccess.hidden = true;
    if (requestPlan) requestPlan.value = value;
  }
  $('#storage-request')?.addEventListener('click', (event) => {
    event.preventDefault();
    openRequest('storage');
    scrollToElement($('#registro'));
    requestName?.focus({ preventScroll: true });
  });
  requestPlan?.addEventListener('change', () => {
    if (plans[requestPlan.value] && planInput) {
      planInput.value = requestPlan.value;
      updateCalculator();
    }
  });
  requestForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    validateName();
    if (!requestForm.reportValidity()) return;
    const values = new FormData(requestForm);
    const selectedPlan = values.get('plan');
    const serverPlan = plans[selectedPlan];
    const quantity = serverPlan ? getQuantity() : null;
    if (serverPlan && quantity === null) {
      updateCalculator();
      scrollToElement($('#calculadora'));
      quantityInput?.focus({ preventScroll: true });
      quantityInput?.reportValidity();
      return;
    }
    const planName = serverPlan?.name || ({ storage: 'Almacenamiento', custom: 'Ayúdame a elegir' })[selectedPlan] || String(selectedPlan || '');
    requestDraft = {
      tipo: 'Borrador de solicitud DevCloud — sin enviar',
      creado: new Date().toISOString(),
      nombre: String(values.get('name') || '').trim(),
      correo: String(values.get('email') || '').trim(),
      region: String(values.get('region') || ''),
      plan: planName,
      cantidadServidores: quantity,
      precioMensualUSD: serverPlan ? serverPlan.price * quantity : null,
      entorno: String(values.get('environment') || ''),
      detalles: String(values.get('details') || '').trim(),
      nota: 'Este archivo se generó únicamente en tu navegador. No se ha enviado la solicitud, procesado un pago ni creado infraestructura.'
    };
    requestForm.hidden = true;
    if (requestSuccess) {
      requestSuccess.hidden = false;
      requestSuccess.setAttribute('tabindex', '-1');
      requestSuccess.focus({ preventScroll: true });
      scrollToElement(requestSuccess);
    }
    if ($('#request-summary')) {
      const selection = serverPlan ? `${quantity} ${quantity === 1 ? 'servidor' : 'servidores'} ${planName}, con una estimación de ${money.format(serverPlan.price * quantity)} USD al mes` : planName.toLowerCase();
      $('#request-summary').textContent = `${requestDraft.nombre}, tu borrador para ${selection} está listo para descargar.`;
    }
  });
  $('#download-request')?.addEventListener('click', () => {
    if (!requestDraft) return;
    const blob = new Blob([JSON.stringify(requestDraft, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'devcloud-solicitud.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#reset-request')?.addEventListener('click', () => {
    requestDraft = null;
    if (requestSuccess) requestSuccess.hidden = true;
    if (requestForm) {
      requestForm.reset();
      requestName?.setCustomValidity('');
      requestForm.hidden = false;
      if (requestPlan && planInput) requestPlan.value = planInput.value;
      $('input', requestForm)?.focus();
    }
  });

  const results = $('#js-results');
  if (results) {
    const name = 'Developer';
    const prices = [15, 45, 120];
    let quantity = 3;
    const isEnterprise = false;
    const discount = prices[2] * 10 / 100;
    quantity++;
    const afterIncrement = quantity;
    quantity += 2;
    const cheaper = prices[0] < prices[1];
    const rows = [
      ['Variable: declarar y asignar', "var nombrePlan = 'Developer';", name],
      ['Variable: asignación posterior', 'var cantidad; cantidad = 3;', 3],
      ['Tipo number', 'var precioBase = 15;', 15],
      ['Tipo boolean', 'var esEnterprise = false;', isEnterprise],
      ['Array: acceder a un valor', 'precios[1]', prices[1]],
      ['Array: longitud', 'precios.length', prices.length],
      ['Aritmético * y /', 'precios[2] * 10 / 100', discount],
      ['Aritmético -', 'precios[2] - descuento', prices[2] - discount],
      ['Aritmético %', 'precios[1] % 2', prices[1] % 2],
      ['Incremento ++', 'cantidad++;', afterIncrement],
      ['Asignación compuesta +=', 'cantidad += 2;', quantity],
      ['Operador de cadena +', "'Plan ' + nombrePlan + ' x' + cantidad", 'Plan ' + name + ' x' + quantity],
      ['Comillas escapadas', "'Plan \\'Developer\\' activo'", "Plan 'Developer' activo"],
      ['Orden de operadores', "'$' + precioBase * cantidad", '$' + 15 * quantity],
      ['Comparación <', 'precios[0] < precios[1]', cheaper],
      ['Comparación ==', "precios[1] == '45'", prices[1] == '45'],
      ['Comparación estricta ===', "precios[1] === '45'", prices[1] === '45'],
      ['Lógico && y !', 'esMasBarato && !esEnterprise', cheaper && !isEnterprise],
      ['Lógico ||', 'esEnterprise || precios[2] > 100', isEnterprise || prices[2] > 100]
    ];
    rows.forEach((values) => {
      const row = document.createElement('tr');
      values.forEach((value, index) => {
        const cell = document.createElement('td');
        if (index === 1) {
          const code = document.createElement('code');
          code.textContent = value;
          cell.appendChild(code);
        } else {
          cell.textContent = String(value);
        }
        row.appendChild(cell);
      });
      results.appendChild(row);
    });
  }
  if ($('#year')) $('#year').textContent = String(new Date().getFullYear());
})();
