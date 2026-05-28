/**
 * MeCare Sales Kit — Main JavaScript
 * Nhà Thuốc Trúc Tâm
 *
 * Handles:
 *   1. Mobile nav toggle
 *   2. Smooth scroll for anchor links
 *   3. Scroll animations via IntersectionObserver
 *   4. FAQ accordion
 *   5. Nav scroll state (shadow on scroll)
 *   6. Sticky CTA visibility
 */

(function () {
  'use strict';

  /* ============================================================
     Utility Helpers
     ============================================================ */

  /**
   * Shorthand querySelector
   * @param {string} selector
   * @param {Element} [context=document]
   */
  function $(selector, context) {
    return (context || document).querySelector(selector);
  }

  /**
   * Shorthand querySelectorAll — returns Array
   * @param {string} selector
   * @param {Element} [context=document]
   */
  function $$(selector, context) {
    return Array.from((context || document).querySelectorAll(selector));
  }

  /**
   * Add event listener(s). Accepts space-separated event names.
   * @param {Element} el
   * @param {string} events
   * @param {Function} handler
   */
  function on(el, events, handler) {
    if (!el) return;
    events.split(' ').forEach(function (event) {
      el.addEventListener(event, handler, { passive: true });
    });
  }


  /* ============================================================
     1. Mobile Navigation Toggle
     ============================================================ */

  function initMobileNav() {
    var toggle = $('.nav-toggle');
    var mobileNav = $('.nav-mobile');
    var body = document.body;

    if (!toggle || !mobileNav) return;

    function openNav() {
      toggle.classList.add('is-open');
      mobileNav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Đóng menu');
      body.style.overflow = 'hidden';
    }

    function closeNav() {
      toggle.classList.remove('is-open');
      mobileNav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Mở menu');
      body.style.overflow = '';
    }

    function toggleNav() {
      if (toggle.classList.contains('is-open')) {
        closeNav();
      } else {
        openNav();
      }
    }

    // Toggle on button click
    toggle.addEventListener('click', toggleNav);

    // Close when a mobile nav link is clicked
    $$('.nav-mobile-link', mobileNav).forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.classList.contains('is-open')) {
        closeNav();
        toggle.focus();
      }
    });

    // Close when clicking outside the nav
    document.addEventListener('click', function (e) {
      var nav = $('.nav');
      if (nav && !nav.contains(e.target) && !mobileNav.contains(e.target)) {
        if (toggle.classList.contains('is-open')) {
          closeNav();
        }
      }
    });

    // Close mobile nav on window resize to desktop breakpoint
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768 && toggle.classList.contains('is-open')) {
        closeNav();
      }
    });

    // Set initial ARIA attributes
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Mở menu');
    toggle.setAttribute('aria-controls', mobileNav.id || 'nav-mobile');
  }


  /* ============================================================
     2. Nav Shadow on Scroll
     ============================================================ */

  function initNavScroll() {
    var nav = $('.nav');
    if (!nav) return;

    var scrollThreshold = 20;

    function updateNav() {
      if (window.scrollY > scrollThreshold) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }

    // Run immediately in case page loads mid-scroll
    updateNav();

    window.addEventListener('scroll', updateNav, { passive: true });
  }


  /* ============================================================
     3. Smooth Scroll for Anchor Links
     ============================================================ */

  function initSmoothScroll() {
    // Intercept all internal anchor link clicks
    document.addEventListener('click', function (e) {
      var target = e.target.closest('a[href^="#"]');
      if (!target) return;

      var hash = target.getAttribute('href');
      if (!hash || hash === '#') return;

      var destination = document.querySelector(hash);
      if (!destination) return;

      e.preventDefault();

      // Get nav height to offset scroll position
      var nav = $('.nav');
      var offset = nav ? nav.offsetHeight + 16 : 80;

      var top = destination.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({
        top: top,
        behavior: 'smooth'
      });

      // Update URL hash without jumping
      if (history.pushState) {
        history.pushState(null, null, hash);
      }

      // Shift focus to destination for accessibility
      destination.setAttribute('tabindex', '-1');
      destination.focus({ preventScroll: true });
    });
  }


  /* ============================================================
     4. Scroll Animations — IntersectionObserver
     Adds `.animate-in` to elements with animation classes
     when they enter the viewport.
     ============================================================ */

  function initScrollAnimations() {
    // Guard — don't run if user prefers reduced motion
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // Immediately reveal all animated elements
      $$('.fade-up, .fade-in, .slide-in-left, .slide-in-right, .zoom-in, .fade-down').forEach(function (el) {
        el.classList.add('animate-in');
      });
      return;
    }

    // Check browser support
    if (!('IntersectionObserver' in window)) {
      $$('.fade-up, .fade-in, .slide-in-left, .slide-in-right, .zoom-in, .fade-down').forEach(function (el) {
        el.classList.add('animate-in');
      });
      return;
    }

    var observerOptions = {
      root: null,           // viewport
      rootMargin: '0px 0px -60px 0px',  // trigger 60px before bottom of viewport
      threshold: 0.1        // 10% of element must be visible
    };

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          // Unobserve after animation so it doesn't re-trigger
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all elements that have animation classes
    var selectors = [
      '.fade-up',
      '.fade-in',
      '.slide-in-left',
      '.slide-in-right',
      '.zoom-in',
      '.fade-down',
      '[data-animate]'
    ];

    $$(selectors.join(', ')).forEach(function (el) {
      observer.observe(el);
    });
  }


  /* ============================================================
     5. FAQ Accordion
     ============================================================ */

  function initFAQ() {
    var faqItems = $$('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach(function (item) {
      var question = $('.faq-question', item);
      if (!question) return;

      question.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');

        // Close all other items (single-open accordion)
        faqItems.forEach(function (otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('is-open');
            var otherQuestion = $('.faq-question', otherItem);
            if (otherQuestion) {
              otherQuestion.setAttribute('aria-expanded', 'false');
            }
          }
        });

        // Toggle current item
        if (isOpen) {
          item.classList.remove('is-open');
          question.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('is-open');
          question.setAttribute('aria-expanded', 'true');
        }
      });

      // Keyboard support
      question.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          question.click();
        }
      });

      // Set initial ARIA state
      question.setAttribute('aria-expanded', 'false');
      question.setAttribute('role', 'button');
      question.setAttribute('tabindex', '0');
    });
  }


  /* ============================================================
     6. Active Nav Link Highlighting (based on scroll position)
     ============================================================ */

  function initActiveNavLinks() {
    var navLinks = $$('.nav-link[href^="#"]');
    if (!navLinks.length) return;

    var sections = navLinks.map(function (link) {
      var hash = link.getAttribute('href');
      return document.querySelector(hash);
    }).filter(Boolean);

    if (!sections.length) return;

    var navHeight = 80;

    function updateActiveLink() {
      var scrollY = window.scrollY;
      var activeSection = null;

      sections.forEach(function (section) {
        var top = section.offsetTop - navHeight - 32;
        var bottom = top + section.offsetHeight;
        if (scrollY >= top && scrollY < bottom) {
          activeSection = section;
        }
      });

      navLinks.forEach(function (link) {
        link.classList.remove('active');
        if (activeSection && link.getAttribute('href') === '#' + activeSection.id) {
          link.classList.add('active');
        }
      });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();
  }


  /* ============================================================
     7. Animated Counter — for stat numbers
     Counts up from 0 to target value when element enters viewport
     Usage: <span class="stat-number" data-count="85">85</span>
     ============================================================ */

  function initCounters() {
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var counters = $$('[data-count]');
    if (!counters.length || prefersReduced) return;

    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        var target = parseFloat(el.dataset.count);
        var suffix = el.dataset.suffix || '';
        var prefix = el.dataset.prefix || '';
        var decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
        var duration = 1200; // ms
        var start = null;

        function step(timestamp) {
          if (!start) start = timestamp;
          var progress = Math.min((timestamp - start) / duration, 1);
          // Ease out cubic
          var eased = 1 - Math.pow(1 - progress, 3);
          var current = eased * target;
          el.textContent = prefix + current.toFixed(decimals) + suffix;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = prefix + target.toFixed(decimals) + suffix;
          }
        }

        requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) {
      observer.observe(el);
    });
  }


  /* ============================================================
     8. Zalo Link Handler — opens Zalo on mobile, web on desktop
     Usage: <a href="#" class="zalo-link" data-zalo-id="...">
     ============================================================ */

  function initZaloLinks() {
    $$('.zalo-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var zaloId = link.dataset.zaloId;
        if (!zaloId) return;

        e.preventDefault();

        var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        var url = isMobile
          ? 'zalo://qr/p/' + zaloId
          : 'https://zalo.me/' + zaloId;

        window.open(url, '_blank', 'noopener,noreferrer');
      });
    });
  }


  /* ============================================================
     9. Sticky bottom CTA (mobile only)
     Shows a sticky "Dùng thử miễn phí" bar after scrolling past hero
     Element: <div class="sticky-cta-bar" id="sticky-cta">
     ============================================================ */

  function initStickyCTA() {
    var stickyCTA = $('#sticky-cta');
    var hero = $('.hero');
    if (!stickyCTA || !hero) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          stickyCTA.classList.add('is-visible');
        } else {
          stickyCTA.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.1 });

    observer.observe(hero);
  }


  /* ============================================================
     10. Image lazy loading fallback
     Modern browsers handle loading="lazy" natively.
     This provides a class-based fallback for older browsers.
     ============================================================ */

  function initLazyImages() {
    if ('loading' in HTMLImageElement.prototype) return; // native support

    if (!('IntersectionObserver' in window)) return;

    var lazyImages = $$('img[data-src]');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      });
    });

    lazyImages.forEach(function (img) {
      observer.observe(img);
    });
  }


  /* ============================================================
     11. Tooltip — simple hover tooltip
     Usage: <span data-tooltip="Giải thích...">text</span>
     ============================================================ */

  function initTooltips() {
    var tooltip = document.createElement('div');
    tooltip.className = 'tooltip-bubble';
    tooltip.style.cssText = [
      'position:fixed',
      'z-index:9999',
      'background:' + getComputedStyle(document.documentElement).getPropertyValue('--color-dark').trim(),
      'color:#fff',
      'font-size:12px',
      'padding:6px 10px',
      'border-radius:6px',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 150ms ease',
      'white-space:nowrap',
      'max-width:200px',
      'line-height:1.4'
    ].join(';');
    document.body.appendChild(tooltip);

    $$('[data-tooltip]').forEach(function (el) {
      el.addEventListener('mouseenter', function (e) {
        tooltip.textContent = el.dataset.tooltip;
        tooltip.style.opacity = '1';
      });

      el.addEventListener('mousemove', function (e) {
        var x = e.clientX + 12;
        var y = e.clientY - 8;
        // Prevent overflow right
        if (x + 200 > window.innerWidth) {
          x = e.clientX - 212;
        }
        tooltip.style.left = x + 'px';
        tooltip.style.top  = y + 'px';
      });

      el.addEventListener('mouseleave', function () {
        tooltip.style.opacity = '0';
      });
    });
  }


  /* ============================================================
     12. Initialization — run all modules on DOMContentLoaded
     ============================================================ */

  function init() {
    initMobileNav();
    initNavScroll();
    initSmoothScroll();
    initScrollAnimations();
    initFAQ();
    initActiveNavLinks();
    initCounters();
    initZaloLinks();
    initStickyCTA();
    initLazyImages();
    initTooltips();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already ready (script loaded with defer or at bottom of body)
    init();
  }

})();
