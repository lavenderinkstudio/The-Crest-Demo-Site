(function () {
  "use strict";

  var cfg = window.CREST_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The <head> script adds js-motion unless the visitor prefers reduced motion.
  // Every hidden starting state in the CSS hangs off that class.
  var motionOn = document.documentElement.classList.contains("js-motion");
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp01 = function (n) { return Math.min(Math.max(n, 0), 1); };

  /* ---------- Booking links ---------- */

  // Builds the Airbnb URL with UTM tags so each button's clicks can be told apart.
  function bookingUrl(content, extraParams) {
    var url;
    try { url = new URL(cfg.airbnbUrl); } catch (e) { return null; }
    var utm = cfg.utm || {};
    if (utm.source) url.searchParams.set("utm_source", utm.source);
    if (utm.medium) url.searchParams.set("utm_medium", utm.medium);
    if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign);
    url.searchParams.set("utm_content", content);
    Object.keys(extraParams || {}).forEach(function (key) {
      if (extraParams[key]) url.searchParams.set(key, extraParams[key]);
    });
    return url.toString();
  }

  // The HTML links point at #book so the page never dead-ends without JavaScript.
  // Live: each link gets its tagged Airbnb URL and opens in a new tab.
  // Demo: links stay on the page and open the demo note instead.
  var demo = cfg.demo === true;
  $$("[data-book]").forEach(function (link) {
    if (demo) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        showDemoNote(link.getAttribute("data-book"));
      });
      return;
    }
    var href = bookingUrl(link.getAttribute("data-book"));
    if (!href) return;
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener";
  });

  // Rating, review count and price come from config.js so they only need editing once.
  $$("[data-cfg]").forEach(function (el) {
    var value = cfg[el.getAttribute("data-cfg")];
    if (value) el.textContent = value;
  });

  /* ---------- Section motion ---------- */

  // The glance rating rolls into place like a departure board: each digit's reel
  // runs up through the four numbers before it and stops on the real one.
  if (motionOn) {
    $$("[data-roll]").forEach(function (el) {
      var text = el.textContent;
      var label = document.createElement("span");
      var reels = document.createElement("span");
      label.className = "visually-hidden";
      label.textContent = text;
      reels.className = "roll";
      reels.setAttribute("aria-hidden", "true");
      text.split("").forEach(function (ch, i) {
        var col = document.createElement("span");
        col.className = "roll__col";
        if (/\d/.test(ch)) {
          var strip = document.createElement("span");
          strip.className = "roll__strip";
          strip.style.setProperty("--i", i);
          for (var k = 4; k >= 0; k--) {
            var digit = document.createElement("span");
            digit.textContent = (+ch - k + 10) % 10;
            strip.appendChild(digit);
          }
          col.appendChild(strip);
        } else {
          col.textContent = ch;
        }
        reels.appendChild(col);
      });
      el.textContent = "";
      el.appendChild(label);
      el.appendChild(reels);
    });
  }

  // Children of a [data-stagger] list get --i so the CSS can start them one after another.
  $$("[data-stagger]").forEach(function (list) {
    Array.prototype.forEach.call(list.children, function (child, i) { child.style.setProperty("--i", i); });
  });

  // Headings marked data-motion="lines" (and review quotes marked data-split) are split into
  // one span per rendered line, so each line can rise or come into focus in turn.
  var originals = new Map();

  function splitLines(el) {
    if (!originals.has(el)) originals.set(el, el.textContent.trim());
    var words = originals.get(el).split(/\s+/);

    // Lay the words out as they will render, then group them by their top offset
    el.textContent = "";
    var spans = words.map(function (word, i) {
      var span = document.createElement("span");
      span.textContent = word;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      return span;
    });
    var lines = [];
    var lastTop = null;
    spans.forEach(function (span) {
      if (span.offsetTop !== lastTop) { lines.push([]); lastTop = span.offsetTop; }
      lines[lines.length - 1].push(span.textContent);
    });

    el.textContent = "";
    lines.forEach(function (lineWords, i) {
      var line = document.createElement("span");
      var inner = document.createElement("span");
      line.className = "line";
      line.style.setProperty("--li", i);
      inner.className = "line__inner";
      inner.textContent = lineWords.join(" ");
      line.appendChild(inner);
      el.appendChild(line);
      if (i < lines.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.classList.add("is-split");
  }

  function unsplitLines(el) {
    if (!el.classList.contains("is-split")) return;
    el.textContent = originals.get(el);
    el.classList.remove("is-split");
  }

  // Once a heading's last line has risen, put the plain text back so it wraps naturally on resize.
  function restoreWhenRisen(el) {
    if (!el.classList.contains("is-split") || !el.matches('[data-motion="lines"]')) return;
    var last = $(".line:last-child .line__inner", el);
    var done = function () { unsplitLines(el); };
    last.addEventListener("transitionend", function (e) { if (e.target === last) done(); });
    window.setTimeout(done, 5000);
  }

  var motionEls = $$("[data-motion]");
  if (motionOn && "IntersectionObserver" in window) {
    var motionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        motionObserver.unobserve(entry.target);
        restoreWhenRisen(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    motionEls.forEach(function (el) { motionObserver.observe(el); });
  } else {
    motionEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  if (motionOn) {
    var splitEls = $$('[data-motion="lines"], [data-split]');
    var splitAll = function () {
      splitEls.forEach(function (el) {
        // A heading already revealed (fonts arrived late) stays as plain text
        if (el.matches('[data-motion="lines"]') && el.classList.contains("is-in")) return;
        splitLines(el);
      });
    };
    // Split only once the web fonts are in, so the measured line breaks are the real ones
    var fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (r) { window.setTimeout(r, 3000); })]).then(splitAll);

    // Line breaks change with width, so re-split anything still split after a resize
    var lastWidth = window.innerWidth;
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        splitEls.forEach(function (el) {
          if (!el.classList.contains("is-split")) return;
          unsplitLines(el);
          splitLines(el);
        });
      }, 200);
    });
  }

  /* ---------- Scroll: hero reveal, header, scroll-linked sections ---------- */

  // The hero is pinned inside a tall wrapper. Native scrolling through that wrapper
  // drives --p from 0 to 1, so wheel, touch and keyboard all work and nothing is blocked.
  // The <head> script skips the reveal (no js-reveal class) for reduced motion.
  var header = $("[data-header]");
  var hero = $("[data-hero]");
  var reveal = $("[data-reveal]");
  var revealOn = document.documentElement.classList.contains("js-reveal");
  var ticking = false;

  // [data-scrub] elements get three progress values as they cross the screen:
  // --enter  0 as the top edge appears at the bottom of the screen, 1 when it reaches the top
  // --pass   0 → 1 over the whole time any part of the element is on screen (0.5 = centred)
  // --center 0 → 1 as the middle of the screen travels from the element's top to its bottom
  var scrubEls = motionOn ? $$("[data-scrub]") : [];

  // The Around panel waits until the frame has finished widening on larger screens,
  // or until the panel itself is on screen when the layout is stacked.
  var aroundFrame = $(".around__frame");
  var aroundPanel = motionOn ? $(".around__panel") : null;
  var wide = window.matchMedia("(min-width: 900px)");

  // The footer sits fixed beneath the page and is uncovered as the final frame scrolls away.
  // It is always "on screen" underneath, so its reveal is measured from the page's bottom edge.
  var main = $("#main");
  var footer = motionOn ? $(".site-footer") : null;

  // The browser treats the covered footer as already on screen, so tabbing into it
  // wouldn't scroll. Scroll to the end ourselves so the focused link is uncovered.
  if (footer) {
    footer.addEventListener("focusin", function () {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  function onScroll() {
    // Read every measurement first, then write, so the browser lays out once per frame
    var vh = window.innerHeight;
    var y = window.scrollY;
    var pinDistance = revealOn ? reveal.offsetHeight - vh : 0;
    var heroEnd = revealOn ? reveal.offsetTop + pinDistance : hero.offsetHeight;
    var maxScroll = document.documentElement.scrollHeight - vh;
    var rects = scrubEls.map(function (el) { return el.getBoundingClientRect(); });
    var panelDue = false;
    if (aroundPanel && !aroundPanel.classList.contains("is-in")) {
      panelDue = wide.matches
        ? aroundFrame.getBoundingClientRect().top < vh * 0.2
        : aroundPanel.getBoundingClientRect().top < vh * 0.85;
    }
    var footerDue = footer && !footer.classList.contains("is-in") &&
      vh - main.getBoundingClientRect().bottom > footer.offsetHeight * 0.3;

    if (revealOn && pinDistance > 0) {
      // Finish the reveal at 85% of the distance, leaving a short hold on the full photo
      var p = (y - reveal.offsetTop) / (pinDistance * 0.85);
      hero.style.setProperty("--p", clamp01(p).toFixed(4));
    }

    // The slim header slides in once the hero has scrolled away.
    header.classList.toggle("is-visible", y > heroEnd - 40);

    if (motionOn) {
      header.style.setProperty("--progress", clamp01(y / maxScroll).toFixed(4));

      scrubEls.forEach(function (el, i) {
        var r = rects[i];
        // Well off screen: leave the values alone. They update before the element is seen again.
        if (r.bottom < -vh * 0.25 || r.top > vh * 1.25) return;
        var enter = clamp01((vh - r.top) / vh).toFixed(4);
        var pass = clamp01((vh - r.top) / (vh + r.height)).toFixed(4);
        var center = clamp01((vh * 0.5 - r.top) / r.height).toFixed(4);
        var key = enter + pass + center;
        if (el._scrub === key) return;
        el._scrub = key;
        el.style.setProperty("--enter", enter);
        el.style.setProperty("--pass", pass);
        el.style.setProperty("--center", center);
      });

      if (panelDue) aroundPanel.classList.add("is-in");
      if (footerDue) footer.classList.add("is-in");
    }
    ticking = false;
  }
  function requestTick() {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
  onScroll();

  /* ---------- Hero booking on phones ---------- */

  // On a phone the booking bar and rating card would cover most of the house photo,
  // so they move to just below the hero. The hero keeps its "Book your stay" pill.
  var heroBook = $("[data-hero-book]");
  var heroBookHome = heroBook && heroBook.parentNode;
  var ratingCard = $(".rating-card", hero);
  var heroBookSlot = $("[data-hero-book-slot]");
  var phone = window.matchMedia("(max-width: 720px)");

  function placeHeroBooking() {
    if (phone.matches) {
      heroBookSlot.append(heroBook, ratingCard);
    } else {
      heroBookHome.append(heroBook);
      hero.append(ratingCard);
    }
  }
  if (heroBook && ratingCard && heroBookSlot) {
    placeHeroBooking();
    phone.addEventListener("change", function () {
      placeHeroBooking();
      requestTick();
    });
  }

  /* ---------- Mobile booking bar ---------- */

  // Shown only while neither the hero nor a booking bar (hero or final) is on screen.
  var bar = $("[data-book-bar]");
  var forms = $$("[data-book-form]");

  if (bar && forms.length && "IntersectionObserver" in window) {
    var visibleForms = new Set();

    var updateBar = function () {
      var show = visibleForms.size === 0;
      bar.classList.toggle("is-visible", show);
      bar.setAttribute("aria-hidden", show ? "false" : "true");
      $("a", bar).tabIndex = show ? 0 : -1;
    };

    var formObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visibleForms.add(entry.target);
        else visibleForms.delete(entry.target);
      });
      updateBar();
    });
    forms.forEach(function (form) { formObserver.observe(form); });
    formObserver.observe(hero);
  }

  /* ---------- Tonight's sunset ---------- */

  // Sunrise equation (https://en.wikipedia.org/wiki/Sunrise_equation), accurate to a minute or two.
  function sunsetUtc(year, month, day, lat, lng) {
    var rad = Math.PI / 180;
    var jd = Date.UTC(year, month - 1, day, 12) / 86400000 + 2440587.5;
    var n = Math.ceil(jd - 2451545.0 + 0.0008);
    var jStar = n - lng / 360;
    var m = (357.5291 + 0.98560028 * jStar) % 360;
    var c = 1.9148 * Math.sin(m * rad) + 0.02 * Math.sin(2 * m * rad) + 0.0003 * Math.sin(3 * m * rad);
    var lambda = (m + c + 180 + 102.9372) % 360;
    var jTransit = 2451545.0 + jStar + 0.0053 * Math.sin(m * rad) - 0.0069 * Math.sin(2 * lambda * rad);
    var sinDec = Math.sin(lambda * rad) * Math.sin(23.4397 * rad);
    var cosDec = Math.cos(Math.asin(sinDec));
    var cosHour = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * sinDec) / (Math.cos(lat * rad) * cosDec);
    if (cosHour < -1 || cosHour > 1) return null;
    var jSet = jTransit + Math.acos(cosHour) / rad / 360;
    return new Date((jSet - 2440587.5) * 86400000);
  }

  var sunsetEl = $("[data-sunset]");
  var loc = cfg.location;
  if (sunsetEl && loc) {
    try {
      var now = new Date();
      var parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: loc.timeZone, year: "numeric", month: "2-digit", day: "2-digit"
      }).format(now).split("-").map(Number);
      var when = "tonight";
      var set = sunsetUtc(parts[0], parts[1], parts[2], loc.lat, loc.lng);
      if (set && set < now) {
        set = sunsetUtc(parts[0], parts[1], parts[2] + 1, loc.lat, loc.lng);
        when = "tomorrow";
      }
      if (set) {
        var time = new Intl.DateTimeFormat("en-AU", {
          timeZone: loc.timeZone, hour: "numeric", minute: "2-digit"
        }).format(set).replace(/\s/g, " ");
        sunsetEl.textContent = "Sunset " + when + " at " + time;
      }
    } catch (e) { /* keep the static fallback line */ }
  }

  /* ---------- Reviews ---------- */

  var stage = $("[data-reviews]");
  if (stage) {
    var reviews = $$(".review", stage);
    var count = $("[data-review-count]");
    var progress = $("[data-review-progress]");
    var toggle = $("[data-review-toggle]");
    var current = 0;
    var cycle = null;

    // Autoplay holds while the section is off screen, and while it is hovered or focused
    // until the visitor uses the pause/play button. From then on their choice wins.
    var held = { offscreen: "IntersectionObserver" in window, hover: false, focus: false, user: null };
    var isHeld = function () {
      return held.offscreen || (held.user === null ? held.hover || held.focus : held.user);
    };

    var showReview = function (i, announce) {
      current = (i + reviews.length) % reviews.length;
      reviews.forEach(function (r, j) { r.classList.toggle("is-active", j === current); });
      // Screen readers hear the changes the visitor asked for, not every automatic one
      count.setAttribute("aria-live", announce ? "polite" : "off");
      count.textContent = (current + 1) + " of " + reviews.length;
    };

    // Each review's 8 seconds are an animation of the progress line, so pausing the
    // carousel visibly stops the line and resuming carries on from the same point.
    var sync = function () {
      if (cycle) { if (isHeld()) cycle.pause(); else cycle.play(); }
    };
    var restart = function () {
      if (cycle) cycle.cancel();
      cycle = null;
      if (reduceMotion || typeof progress.animate !== "function") return;
      cycle = progress.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 8000, fill: "both" });
      cycle.onfinish = function () { showReview(current + 1, false); restart(); };
      sync();
    };

    $("[data-review-prev]").addEventListener("click", function () { showReview(current - 1, true); restart(); });
    $("[data-review-next]").addEventListener("click", function () { showReview(current + 1, true); restart(); });
    toggle.addEventListener("click", function () {
      held.user = held.user !== true;
      toggle.classList.toggle("is-paused", held.user);
      toggle.setAttribute("aria-label", held.user ? "Play reviews" : "Pause reviews");
      sync();
    });

    var section = stage.closest("section");
    var hold = function (key, value) { return function () { held[key] = value; sync(); }; };
    section.addEventListener("mouseenter", hold("hover", true));
    section.addEventListener("mouseleave", hold("hover", false));
    section.addEventListener("focusin", hold("focus", true));
    section.addEventListener("focusout", hold("focus", false));
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        held.offscreen = !entries[0].isIntersecting;
        sync();
      }).observe(section);
    }
    restart();
  }

  /* ---------- Gallery lightbox ---------- */

  var dialog = $("[data-lightbox]");
  var thumbs = $$("[data-gallery] button");

  // Full-size photo for a tile: the AVIF version when the browser chose AVIF for the tile
  var fullSrc = function (thumb) {
    var full = thumb.getAttribute("data-full");
    return /\.avif$/.test($("img", thumb).currentSrc) ? full.replace(/\.jpg$/, ".avif") : full;
  };

  // A small "View" circle follows the pointer over the tiles (mouse and trackpad only)
  var viewCursor = null;
  if (motionOn && thumbs.length && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    viewCursor = document.createElement("div");
    viewCursor.className = "view-cursor";
    viewCursor.setAttribute("aria-hidden", "true");
    viewCursor.textContent = "View";
    document.body.appendChild(viewCursor);
    $("[data-gallery]").classList.add("has-view-cursor");

    var cursorX = 0, cursorY = 0, targetX = 0, targetY = 0, cursorFrame = null;
    var moveCursor = function () {
      cursorX += (targetX - cursorX) * 0.22;
      cursorY += (targetY - cursorY) * 0.22;
      viewCursor.style.transform = "translate(" + cursorX.toFixed(1) + "px, " + cursorY.toFixed(1) + "px)";
      var settled = Math.abs(targetX - cursorX) + Math.abs(targetY - cursorY) < 0.2;
      cursorFrame = settled ? null : window.requestAnimationFrame(moveCursor);
    };
    thumbs.forEach(function (thumb) {
      thumb.addEventListener("pointerenter", function (e) {
        // Arrive at the pointer rather than gliding in from the last tile's position
        if (!viewCursor.classList.contains("is-visible")) { cursorX = e.clientX; cursorY = e.clientY; }
        viewCursor.classList.add("is-visible");
        // Start fetching the full-size photo so the lightbox can open on it straight away
        new Image().src = fullSrc(thumb);
      });
      thumb.addEventListener("pointerleave", function () { viewCursor.classList.remove("is-visible"); });
      thumb.addEventListener("pointermove", function (e) {
        targetX = e.clientX;
        targetY = e.clientY;
        if (!cursorFrame) cursorFrame = window.requestAnimationFrame(moveCursor);
      });
    });
  }

  if (dialog && thumbs.length && typeof dialog.showModal === "function") {
    var bigImg = $("[data-lightbox-img]", dialog);
    var index = 0;
    var turn = 0;
    var ease = "cubic-bezier(.22, .61, .36, 1)";
    // Where supported, the clicked tile grows into the lightbox photo and shrinks back on close
    var canMorph = motionOn && typeof document.startViewTransition === "function";
    var canSlide = motionOn && typeof bigImg.animate === "function";

    var wrap = function (i) { return (i + thumbs.length) % thumbs.length; };
    var tileImg = function (i) { return $("img", thumbs[i]); };
    var photoReady = function () {
      return bigImg.decode ? bigImg.decode().catch(function () {}) : Promise.resolve();
    };
    var stopSlides = function () {
      if (canSlide) bigImg.getAnimations().forEach(function (a) { a.cancel(); });
    };

    var showPhoto = function (i) {
      index = wrap(i);
      var thumb = thumbs[index];
      bigImg.src = fullSrc(thumb);
      bigImg.alt = $("img", thumb).alt;
      // Warm the cache for the next photo
      new Image().src = fullSrc(thumbs[wrap(index + 1)]);
    };

    var openAt = function (i) {
      turn++;
      stopSlides();
      if (viewCursor) viewCursor.classList.remove("is-visible");
      if (!canMorph) { showPhoto(i); dialog.showModal(); return; }
      var from = tileImg(i);
      from.style.viewTransitionName = "crest-photo";
      document.startViewTransition(function () {
        from.style.viewTransitionName = "";
        showPhoto(i);
        bigImg.style.viewTransitionName = "crest-photo";
        dialog.showModal();
        return photoReady();
      }).finished.finally(function () { bigImg.style.viewTransitionName = ""; });
    };

    var closeLightbox = function () {
      turn++;
      stopSlides();
      var to = tileImg(index);
      var r = to.getBoundingClientRect();
      // Morph back only when the photo's tile is on screen; otherwise just fade out
      if (!canMorph || r.bottom < 0 || r.top > window.innerHeight) { dialog.close(); return; }
      bigImg.style.viewTransitionName = "crest-photo";
      document.startViewTransition(function () {
        bigImg.style.viewTransitionName = "";
        dialog.close();
        to.style.viewTransitionName = "crest-photo";
      }).finished.finally(function () { to.style.viewTransitionName = ""; });
    };

    // Next/previous: the photo slides out in the direction of travel and the new one
    // comes into focus from the other side. Rapid presses skip straight to the latest photo.
    var step = function (dir) {
      if (!canSlide) { showPhoto(index + dir); return; }
      var token = ++turn;
      index = wrap(index + dir);
      stopSlides();
      bigImg.animate(
        [{ opacity: 1, translate: "0 0", filter: "blur(0)" }, { opacity: 0, translate: (-24 * dir) + "px 0", filter: "blur(6px)" }],
        { duration: 260, easing: ease, fill: "forwards" }
      ).finished.then(function () {
        if (token !== turn) return null;
        showPhoto(index);
        return photoReady();
      }).then(function () {
        if (token !== turn) return;
        stopSlides();
        bigImg.animate(
          [{ opacity: 0, translate: (24 * dir) + "px 0", filter: "blur(8px)" }, { opacity: 1, translate: "0 0", filter: "blur(0)" }],
          { duration: 650, easing: ease }
        );
      }).catch(function () { /* interrupted by a newer step */ });
    };

    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener("click", function () { openAt(i); });
    });

    $("[data-lightbox-close]", dialog).addEventListener("click", closeLightbox);
    $("[data-lightbox-prev]", dialog).addEventListener("click", function () { step(-1); });
    $("[data-lightbox-next]", dialog).addEventListener("click", function () { step(1); });

    // Escape goes through the same close, so it morphs back too
    dialog.addEventListener("cancel", function (e) { e.preventDefault(); closeLightbox(); });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) closeLightbox();
    });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });

    var startX = null;
    var swiped = false;
    dialog.addEventListener("pointerdown", function (e) { startX = e.clientX; swiped = false; });
    dialog.addEventListener("pointercancel", function () { startX = null; });
    dialog.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 50) { step(dx < 0 ? 1 : -1); swiped = true; }
      startX = null;
    });
    // A swipe that ends on the backdrop shouldn't also count as a click that closes it
    dialog.addEventListener("click", function (e) {
      if (swiped) { e.stopImmediatePropagation(); swiped = false; }
    }, true);
  }

  /* ---------- Demo booking note ---------- */

  // In demo mode, booking actions explain what a live build would hand to Airbnb:
  // the stay from the form (if any) and the button's tracking tag.
  var demoNote = $("[data-demo-note]");

  function showDemoNote(source, stay) {
    if (!demoNote || typeof demoNote.showModal !== "function") return;
    var toDate = function (iso) { var p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
    var day = new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short" });
    var dayYear = new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    var dates = stay && stay.checkIn
      ? day.format(toDate(stay.checkIn)) + " – " + dayYear.format(toDate(stay.checkOut))
      : "Chosen on Airbnb";
    var guestCount = stay ? stay.guests + (stay.guests === "1" ? " guest" : " guests") : "Chosen on Airbnb";
    $("[data-demo-dates]", demoNote).textContent = dates;
    $("[data-demo-guests]", demoNote).textContent = guestCount;
    $("[data-demo-source]", demoNote).textContent = source;
    demoNote.showModal();
  }

  if (demoNote) {
    $("[data-demo-close]", demoNote).addEventListener("click", function () { demoNote.close(); });
    demoNote.addEventListener("click", function (e) { if (e.target === demoNote) demoNote.close(); });
  }

  /* ---------- Booking bars → Airbnb ---------- */

  function toIso(d) {
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
  }
  function addDays(iso, days) {
    var p = iso.split("-").map(Number);
    return toIso(new Date(p[0], p[1] - 1, p[2] + days));
  }

  // Each bar (hero, final) gets the same behaviour; its data-book-form value tags the UTM.
  forms.forEach(function (form) {
    var checkIn = $("[data-check-in]", form);
    var checkOut = $("[data-check-out]", form);
    var guests = $("[data-guests]", form);

    for (var g = 1; g <= (cfg.maxGuests || 6); g++) {
      var opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g + (g === 1 ? " guest" : " guests");
      if (g === 2) opt.selected = true;
      guests.appendChild(opt);
    }

    // Suggest the coming weekend: next Friday to Sunday.
    var today = new Date();
    var todayIso = toIso(today);
    var daysToFriday = (5 - today.getDay() + 7) % 7 || 7;
    checkIn.min = todayIso;
    checkIn.value = addDays(todayIso, daysToFriday);
    checkOut.min = addDays(checkIn.value, 1);
    checkOut.value = addDays(checkIn.value, 2);

    checkIn.addEventListener("change", function () {
      if (!checkIn.value) return;
      checkOut.min = addDays(checkIn.value, 1);
      if (!checkOut.value || checkOut.value <= checkIn.value) checkOut.value = addDays(checkIn.value, 2);
    });

    // A short message under the bar when the dates can't be booked; role="alert" reads it out
    var error = document.createElement("p");
    error.className = "booking__error";
    error.setAttribute("role", "alert");
    form.after(error);
    var clearError = function () {
      error.textContent = "";
      checkIn.removeAttribute("aria-invalid");
      checkOut.removeAttribute("aria-invalid");
    };
    checkIn.addEventListener("change", clearError);
    checkOut.addEventListener("change", clearError);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!checkIn.value || !checkOut.value) {
        var missing = checkIn.value ? checkOut : checkIn;
        error.textContent = "Choose your arrival and departure dates.";
        missing.setAttribute("aria-invalid", "true");
        missing.focus();
        return;
      }
      if (checkOut.value <= checkIn.value) {
        error.textContent = "Choose a departure date after your arrival.";
        checkOut.setAttribute("aria-invalid", "true");
        checkOut.focus();
        return;
      }
      if (demo) {
        showDemoNote(form.getAttribute("data-book-form"), {
          checkIn: checkIn.value,
          checkOut: checkOut.value,
          guests: guests.value
        });
        return;
      }
      var href = bookingUrl(form.getAttribute("data-book-form"), {
        check_in: checkIn.value,
        check_out: checkOut.value,
        adults: guests.value
      });
      if (!href) return;
      var win = window.open(href, "_blank");
      if (win) win.opener = null; else window.location.href = href;
    });
  });
})();
