/* =========================================================
   Prime Care Clinic — script.js (vanilla JavaScript)
   1. CLINIC_CONFIG  — edit your real details here
   2. Navigation, header, footer year
   3. Appointment enquiry form (validation + backend hook)
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. EDIT YOUR CLINIC DETAILS HERE
     Leave a value empty ("" or []) and the page keeps showing
     a clear "to be added" placeholder. Nothing is invented.
     --------------------------------------------------------- */
  var CLINIC_CONFIG = {
    address: '',        // e.g. 'Shop 3, Example Road, Area, City 400000'
    phone: '',          // e.g. '+91 98765 43210'
    whatsapp: '',       // with country code, e.g. '+91 98765 43210'
    hours: [],          // e.g. [{ days: 'Mon to Sat', time: '10:00 am to 1:00 pm' }, { days: 'Sunday', time: 'Closed' }]
    mapEmbedUrl: '',    // Google Maps > Share > Embed a map > copy the src="..." URL (must start with https://www.google.com/maps/embed)
    mapLinkUrl: '',     // Google Maps > Share > Copy link (https only)
    formEndpoint: ''    // URL that receives the enquiry (see submitEnquiry below). Empty = form is NOT connected.
  };

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */
  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $all(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }

  function parseHttps(url) {
    try {
      var u = new URL(url);
      return u.protocol === 'https:' ? u : null;
    } catch (e) {
      return null;
    }
  }

  /* ---------------------------------------------------------
     2a. Footer year
     --------------------------------------------------------- */
  function initYear() {
    $all('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  /* ---------------------------------------------------------
     2b. Header border on scroll
     --------------------------------------------------------- */
  function initHeader() {
    var header = $('[data-header]');
    if (!header) { return; }
    function update() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------------------------------------------------------
     2c. Mobile navigation
     --------------------------------------------------------- */
  function initNav() {
    var toggle = $('[data-nav-toggle]');
    var nav = $('[data-nav]');
    if (!toggle || !nav) { return; }

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close after choosing a link.
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) { setOpen(false); }
    });

    // Escape closes the menu and returns focus to the toggle.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Click outside closes the menu.
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') { return; }
      if (!nav.contains(e.target) && !toggle.contains(e.target)) { setOpen(false); }
    });

    // Reset when moving to the desktop layout.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) { setOpen(false); }
    });
  }

  /* ---------------------------------------------------------
     2d. Apply CLINIC_CONFIG to the page
     --------------------------------------------------------- */
  function applyConfig() {
    var cfg = CLINIC_CONFIG;

    // Address
    if (cfg.address) {
      $all('[data-contact="address"]').forEach(function (el) {
        el.textContent = cfg.address;
        el.classList.remove('placeholder');
      });
    }

    // Phone (becomes a tel: link)
    if (cfg.phone) {
      var tel = cfg.phone.replace(/[^\d+]/g, '');
      $all('[data-contact="phone"]').forEach(function (el) {
        var a = document.createElement('a');
        a.href = 'tel:' + tel;
        a.textContent = cfg.phone;
        el.replaceWith(a);
      });
    }

    // WhatsApp (becomes a wa.me link)
    if (cfg.whatsapp) {
      var wa = cfg.whatsapp.replace(/\D/g, '');
      $all('[data-contact="whatsapp"]').forEach(function (el) {
        var a = document.createElement('a');
        a.href = 'https://wa.me/' + wa;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = cfg.whatsapp;
        el.replaceWith(a);
      });
    }

    // Opening hours
    if (cfg.hours && cfg.hours.length) {
      $all('[data-hours]').forEach(function (box) {
        var dl = document.createElement('dl');
        dl.className = 'hours-list';
        cfg.hours.forEach(function (row) {
          var wrap = document.createElement('div');
          var dt = document.createElement('dt');
          var dd = document.createElement('dd');
          dt.textContent = row.days;
          dd.textContent = row.time;
          wrap.appendChild(dt);
          wrap.appendChild(dd);
          dl.appendChild(wrap);
        });
        box.textContent = '';
        box.appendChild(dl);
      });
    }

    // Google Map embed (only official Google Maps embed URLs are accepted)
    var mapBox = $('[data-map]');
    var embed = cfg.mapEmbedUrl ? parseHttps(cfg.mapEmbedUrl) : null;
    if (mapBox && embed && embed.hostname === 'www.google.com' && embed.pathname.indexOf('/maps/embed') === 0) {
      var frame = document.createElement('iframe');
      frame.src = embed.href;
      frame.title = 'Map showing the location of Prime Care Clinic';
      frame.loading = 'lazy';
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      frame.setAttribute('allowfullscreen', '');
      mapBox.textContent = '';
      mapBox.appendChild(frame);
    }

    // "Open in Google Maps" link
    var linkWrap = $('[data-map-link-wrap]');
    var mapLink = $('[data-map-link]');
    var linkUrl = cfg.mapLinkUrl ? parseHttps(cfg.mapLinkUrl) : null;
    if (linkWrap && mapLink && linkUrl) {
      mapLink.href = linkUrl.href;
      linkWrap.hidden = false;
    }
  }

  /* ---------------------------------------------------------
     3. Appointment enquiry form
     --------------------------------------------------------- */

  /*
    BACKEND CONNECTION POINT
    ------------------------
    This function is where the enquiry would be delivered to the clinic.
    - If CLINIC_CONFIG.formEndpoint is empty, nothing is sent and the visitor is told so honestly.
    - To connect a backend, set formEndpoint to your URL. It receives JSON:
        { "name": "...", "phone": "...", "date": "YYYY-MM-DD", "message": "..." }
      and must answer with a 2xx status on success.
    - You can also replace the body of this function with your own API call.
    Only these four fields are collected. Do not add sensitive medical data.
    Remember to validate and rate-limit again on the server.
  */
  function submitEnquiry(data) {
    if (!CLINIC_CONFIG.formEndpoint) {
      return Promise.resolve({ sent: false });
    }
    return fetch(CLINIC_CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) { throw new Error('Request failed with status ' + res.status); }
      return { sent: true };
    });
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function addYearsISO(years) {
    var d = new Date();
    d.setFullYear(d.getFullYear() + years);
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function initForm() {
    var form = $('[data-enquiry-form]');
    if (!form) { return; }

    var fields = {
      name: form.elements.name,
      phone: form.elements.phone,
      date: form.elements.date,
      message: form.elements.message
    };
    var statusBox = $('[data-form-status]', form);
    var submitBtn = $('[data-submit]', form);
    var counter = $('[data-char-count]', form);
    var min = todayISO();
    var max = addYearsISO(1);

    fields.date.min = min;
    fields.date.max = max;

    var validators = {
      name: function (v) {
        v = v.trim();
        if (!v) { return 'Enter your full name.'; }
        if (v.length < 2) { return 'Your name must have at least 2 characters.'; }
        if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'\u2019-]*$/u.test(v)) { return 'Use letters only in your name.'; }
        return '';
      },
      phone: function (v) {
        var cleaned = v.replace(/[\s\-().]/g, '');
        if (!cleaned) { return 'Enter your phone number.'; }
        if (!/^(?:\+91|91|0)?[6-9]\d{9}$/.test(cleaned)) { return 'Enter a valid 10-digit mobile number, for example 98765 43210.'; }
        return '';
      },
      date: function (v) {
        if (!v) { return 'Choose your preferred date.'; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v + 'T00:00:00').getTime())) { return 'Enter a valid date.'; }
        if (v < min) { return 'Choose today or a later date.'; }
        if (v > max) { return 'Choose a date within the next year.'; }
        return '';
      },
      message: function (v) {
        if (v.length > 300) { return 'Keep your message under 300 characters.'; }
        return '';
      }
    };

    function showError(key, msg) {
      var field = fields[key];
      var out = document.getElementById(key + '-error');
      if (out) { out.textContent = msg; }
      if (msg) { field.setAttribute('aria-invalid', 'true'); } else { field.removeAttribute('aria-invalid'); }
    }

    function check(key) {
      var msg = validators[key](fields[key].value);
      showError(key, msg);
      return msg === '';
    }

    function showStatus(type, text) {
      statusBox.hidden = false;
      statusBox.className = 'form-status form-status--' + type;
      statusBox.textContent = '';
      var p = document.createElement('p');
      p.textContent = text;
      statusBox.appendChild(p);
      statusBox.focus();
    }

    // Live validation after the first blur, so people are not scolded while typing.
    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener('blur', function () { check(key); });
      fields[key].addEventListener('input', function () {
        if (fields[key].getAttribute('aria-invalid') === 'true') { check(key); }
        if (key === 'message' && counter) { counter.textContent = String(fields.message.value.length); }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusBox.hidden = true;

      var firstInvalid = null;
      Object.keys(fields).forEach(function (key) {
        if (!check(key) && !firstInvalid) { firstInvalid = fields[key]; }
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      var data = {
        name: fields.name.value.trim(),
        phone: fields.phone.value.trim(),
        date: fields.date.value,
        message: fields.message.value.trim()
      };

      submitBtn.disabled = true;
      var originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Sending\u2026';

      submitEnquiry(data).then(function (result) {
        if (result.sent) {
          form.reset();
          if (counter) { counter.textContent = '0'; }
          showStatus('success', 'Thank you. Your enquiry has been sent to the clinic.');
        } else {
          showStatus('info', 'Your details look complete, but this website is not connected to the clinic yet, so nothing has been sent. Please contact the clinic by phone or WhatsApp to book your appointment.');
        }
      }).catch(function () {
        showStatus('error', 'Something went wrong and your enquiry was not sent. Please try again, or contact the clinic directly.');
      }).then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      });
    });
  }

  /* ---------------------------------------------------------
     Start
     --------------------------------------------------------- */
  initYear();
  initHeader();
  initNav();
  applyConfig();
  initForm();
})();
