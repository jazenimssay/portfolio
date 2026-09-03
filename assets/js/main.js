/* =========================================================
   YASSMINE.OS, MAIN.JS
   Continuous Yuki Runner + Portfolio Desktop
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =======================================================
     HELPERS
     ======================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

  const random = (min, max) =>
    Math.random() * (max - min) + min;

  const randomInt = (min, max) =>
    Math.floor(random(min, max + 1));


  /* =======================================================
     DESKTOP / WINDOWS
     ======================================================= */

  const desktop = $("#desktop");
  const taskbarApps = $("#taskbarApps");

  let highestZ = 1000;
  let activeWindow = null;

  const windowStates = new Map();

  /*
    Small icon shown on each taskbar button.
    Reuses the same icons as the desktop, so the
    taskbar entry matches the app that opened it.
  */
  const TASKBAR_ICONS = {
    portfolioPopup: "assets/img/portfolio-icon.png",
    aboutPopup: "📄",
    hirePopup: "assets/img/work-icon.png",
    hobbiesPopup: "assets/img/yuki.png",
    sentPopup: "assets/img/work-icon.png",
    adminPopup: "assets/img/portfolio-icon.png",
    projectPopup: "assets/img/portfolio-icon.png",
  };


  function getWindowTitle(win) {
    return (
      win.dataset.title ||
      $(".popup-header span", win)?.textContent?.trim() ||
      "Window"
    );
  }


  function createTaskbarButton(win) {

    if (!taskbarApps) return;

    /*
      The Start Menu is not a regular app window,
      so it never gets its own taskbar entry.
    */
    if (win.id === "menuPopup") return;

    const id = win.id;

    let button = taskbarApps.querySelector(
      `[data-window="${id}"]`
    );

    if (button) return button;

    button = document.createElement("button");

    button.className = "taskbar-app";
    button.dataset.window = id;
    button.type = "button";

    const icon = TASKBAR_ICONS[id];

    if (icon) {
      if (icon.startsWith("assets/")) {
        const img = document.createElement("img");
        img.className = "taskbar-app-icon";
        img.src = icon;
        img.alt = "";
        button.appendChild(img);
      } else {
        const span = document.createElement("span");
        span.className = "taskbar-app-icon emoji";
        span.textContent = icon;
        button.appendChild(span);
      }
    }

    const label = document.createElement("span");
    label.className = "taskbar-app-label";
    label.textContent = getWindowTitle(win);
    button.appendChild(label);

    button.addEventListener("click", () => {

      if (!win.classList.contains("active")) {
        openWindow(win);
        return;
      }

      if (activeWindow === win) {
        minimizeWindow(win);
      } else {
        bringToFront(win);
      }

    });

    taskbarApps.appendChild(button);

    return button;
  }


  function updateTaskbarButton(win) {

    /*
      XP dims every window except the focused one.
      The Start menu is shell UI, so it never dims.
    */
    if (win.id !== "menuPopup") {

      win.classList.toggle(
        "window-inactive",
        win.classList.contains("active") &&
        activeWindow !== win
      );

    }

    const button = taskbarApps?.querySelector(
      `[data-window="${win.id}"]`
    );

    if (!button) return;

    button.classList.toggle(
      "active",
      win.classList.contains("active") &&
      activeWindow === win
    );
  }


  function updateAllTaskbarButtons() {

    $$(".popup-window").forEach(updateTaskbarButton);

  }


  function bringToFront(win) {

    if (!win) return;

    highestZ++;

    win.style.zIndex = highestZ;

    activeWindow = win;

    updateAllTaskbarButtons();

  }


  /*
    Keep a window fully on screen and clear of the taskbar.
    Runs when a window opens and whenever the viewport changes.
  */

  const TASKBAR_HEIGHT = 30;
  const SCREEN_MARGIN = 8;

  function fitWindowToViewport(win) {

    if (!win || win.id === "menuPopup") return;
    if (!win.classList.contains("active")) return;
    if (win.classList.contains("is-maximized")) return;

    const availableWidth =
      window.innerWidth - SCREEN_MARGIN * 2;

    const availableHeight =
      window.innerHeight -
      TASKBAR_HEIGHT -
      SCREEN_MARGIN * 2;

    if (availableWidth <= 0 || availableHeight <= 0) return;

    const rect = win.getBoundingClientRect();

    /* Shrink first, so a large window can still be placed. */

    let width = Math.min(rect.width, availableWidth);
    let height = Math.min(rect.height, availableHeight);

    if (width !== rect.width) {
      win.style.width = `${width}px`;
    }

    if (height !== rect.height) {
      win.style.height = `${height}px`;
    }

    /* Then pull it back inside the visible area. */

    const maxLeft =
      window.innerWidth - width - SCREEN_MARGIN;

    const maxTop =
      window.innerHeight -
      TASKBAR_HEIGHT -
      height -
      SCREEN_MARGIN;

    const left = clamp(rect.left, SCREEN_MARGIN, Math.max(SCREEN_MARGIN, maxLeft));
    const top = clamp(rect.top, SCREEN_MARGIN, Math.max(SCREEN_MARGIN, maxTop));

    win.style.left = `${left}px`;
    win.style.top = `${top}px`;

  }


  function openWindow(win) {

    if (!win) return;

    createTaskbarButton(win);

    win.classList.add("active");

    bringToFront(win);

    /*
      Measure only once the window is visible, otherwise
      it has no dimensions to correct.
    */

    fitWindowToViewport(win);

    /*
      Some windows need to initialise when first opened.
    */

    if (win.id === "hobbiesPopup") {

      initializeYukiStudio();

    }

  }


  function getTopVisibleWindow(exclude = null) {

    return (
      $$(".popup-window")
        .filter(win =>
          win !== exclude &&
          win.id !== "menuPopup" &&
          win.classList.contains("active")
        )
        .sort(
          (a, b) =>
            Number(b.style.zIndex || 0) -
            Number(a.style.zIndex || 0)
        )[0] || null
    );

  }


  function activateNextWindow(exclude = null) {

    const next =
      getTopVisibleWindow(exclude);

    if (next) {
      bringToFront(next);
    } else {
      activeWindow = null;
      updateAllTaskbarButtons();
    }

  }


  function closeWindow(win) {

    if (!win) return;

    const wasActive =
      activeWindow === win;

    win.classList.remove("active");

    /* A closed window reopens at its normal size. */
    if (win.classList.contains("is-maximized")) {

      win.classList.remove("is-maximized");

      const maxButton = $(".maximize-popup", win);

      if (maxButton) {
        maxButton.title = "Maximize";
        maxButton.setAttribute("aria-label", "Maximize");
      }

    }

    const button =
      taskbarApps?.querySelector(
        `[data-window="${win.id}"]`
      );

    button?.remove();

    if (wasActive) {
      activeWindow = null;
      activateNextWindow(win);
    } else {
      updateAllTaskbarButtons();
    }

  }


  function minimizeWindow(win) {

    if (!win) return;

    const wasActive =
      activeWindow === win;

    win.classList.remove("active");

    if (wasActive) {
      activeWindow = null;
      activateNextWindow(win);
    } else {
      updateAllTaskbarButtons();
    }

  }


  /* Open popup buttons */

  $$(".open-popup").forEach(button => {

    button.addEventListener("click", event => {

      event.preventDefault();

      const targetId = button.dataset.target;

      if (!targetId) return;

      const target = document.getElementById(targetId);

      if (!target) return;

      openWindow(target);

    });

  });


  /* Close buttons */

  $$(".close-popup").forEach(button => {

    button.addEventListener("click", event => {

      event.stopPropagation();

      const win = button.closest(".popup-window");

      closeWindow(win);

    });

  });


  /* Minimize buttons */

  $$(".minimize-popup").forEach(button => {

    button.addEventListener("click", event => {

      event.stopPropagation();

      const win = button.closest(".popup-window");

      minimizeWindow(win);

    });

  });


  /* Maximize / restore buttons */

  function toggleMaximize(win) {

    if (!win) return;

    const isMaximized =
      win.classList.toggle("is-maximized");

    const button = $(".maximize-popup", win);

    if (button) {
      const label = isMaximized ? "Restore" : "Maximize";
      button.title = label;
      button.setAttribute("aria-label", label);
    }

    bringToFront(win);

  }

  $$(".maximize-popup").forEach(button => {

    button.addEventListener("click", event => {

      event.stopPropagation();

      toggleMaximize(
        button.closest(".popup-window")
      );

    });

  });


  /* Double-clicking the title bar maximizes, as in XP */

  $$(".popup-header").forEach(header => {

    header.addEventListener("dblclick", event => {

      if (event.target.closest("button")) return;

      const win = header.closest(".popup-window");

      if (win && win.id !== "menuPopup") {
        toggleMaximize(win);
      }

    });

  });


  /* Clicking a window brings it forward */

  $$(".popup-window").forEach(win => {

    win.addEventListener("mousedown", () => {

      if (
        win.id !== "menuPopup" &&
        win.classList.contains("active")
      ) {
        bringToFront(win);
      }

    });

  });


  /* =======================================================
     WINDOW DRAGGING
     ======================================================= */

  $$(".popup-header").forEach(header => {

    const win = header.closest(".popup-window");

    if (!win) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener("pointerdown", event => {

      if (event.target.closest(".window-controls")) {
        return;
      }

      if (window.innerWidth <= 700) {
        return;
      }

      /* A maximized window is pinned, as in XP. */
      if (win.classList.contains("is-maximized")) {
        return;
      }

      dragging = true;

      header.setPointerCapture(event.pointerId);

      const rect = win.getBoundingClientRect();

      startX = event.clientX;
      startY = event.clientY;

      startLeft = rect.left;
      startTop = rect.top;

      win.style.left = `${startLeft}px`;
      win.style.top = `${startTop}px`;

      bringToFront(win);

      document.body.style.userSelect = "none";

    });


    header.addEventListener("pointermove", event => {

      if (!dragging) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      const maxLeft =
        window.innerWidth - win.offsetWidth;

      const maxTop =
        window.innerHeight - win.offsetHeight - TASKBAR_HEIGHT;

      const newLeft = clamp(
        startLeft + dx,
        0,
        Math.max(0, maxLeft)
      );

      const newTop = clamp(
        startTop + dy,
        0,
        Math.max(0, maxTop)
      );

      win.style.left = `${newLeft}px`;
      win.style.top = `${newTop}px`;

    });


    const stopDragging = () => {

      dragging = false;

      document.body.style.userSelect = "";

    };

    header.addEventListener(
      "pointerup",
      stopDragging
    );

    header.addEventListener(
      "pointercancel",
      stopDragging
    );

  });


  /* =======================================================
     SYSTEM TRAY + CLOCK
     XP Silver: sound + clock are permanent shell controls.
     No overflow arrow and no hidden tray.
     ======================================================= */

  const timeElement = $("#time");
  const taskbarClock = $("#taskbarClock");
  const volumeIcon = $("#volume");

  

  function updateClock() {
    if (!timeElement) return;

    const now = new Date();

    timeElement.textContent = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });

    if (taskbarClock) {
      const date = now.toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      taskbarClock.title = date;
      taskbarClock.setAttribute(
        "aria-label",
        `${date}, ${timeElement.textContent}`
      );
    }
  }

  updateClock();
  setInterval(updateClock, 1000);

  /* =======================================================
     TYPING HERO
     ======================================================= */

  const typedRole = $("#typedRole");

  if (typedRole) {

    const roles = [
      "Graphic Designer",
      "Product Designer",
      "UX/UI Designer",
      "Visual Designer"
    ];

    let roleIndex = 0;
    let characterIndex = 0;
    let deleting = false;

    function typeRole() {

      const role = roles[roleIndex];

      if (!deleting) {

        characterIndex++;
          window.__uiKey?.();


        typedRole.textContent =
          role.slice(0, characterIndex);

        if (characterIndex >= role.length) {

          deleting = true;

          setTimeout(typeRole, 1500);

          return;
        }

      } else {

        characterIndex--;

        typedRole.textContent =
          role.slice(0, characterIndex);

        if (characterIndex <= 0) {

          deleting = false;

          roleIndex =
            (roleIndex + 1) % roles.length;

        }

      }

      setTimeout(
        typeRole,
        deleting ? 45 : 80
      );

    }

    typeRole();

  }


  /* =======================================================
     PROJECT FORM
     ======================================================= */

  const hireForm = $(".hire-form");

  if (hireForm) {

    const response = $(".response", hireForm);
    const sendButton = $('button[type="submit"]', hireForm);

    /* ---------------------------------------------------
       Pixel art, drawn from character grids so the icons
       stay crisp at any size instead of being scaled bitmaps.
       --------------------------------------------------- */

    function buildPixelIcon(grid, palette) {

      const size = grid.length;
      let rects = "";

      grid.forEach((row, y) => {

        let x = 0;

        while (x < row.length) {

          const key = row[x];

          if (key === "." || !palette[key]) { x++; continue; }

          /* Merge horizontal runs of one colour into a single rect. */
          let run = 1;
          while (row[x + run] === key) run++;

          rects +=
            `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${palette[key]}"/>`;

          x += run;

        }

      });

      return (
        `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" ` +
        `xmlns="http://www.w3.org/2000/svg">${rects}</svg>`
      );

    }


    const PIXEL_ART = {

      /* Laptop and phone */
      "Product Design": {
        palette: { K: "#2f3142", S: "#7cc4ea", G: "#b9bccb", W: "#ffffff" },
        grid: [
          "................",
          "................",
          "..KKKKKKKKK.....",
          "..KSSSSSSSK.KKK.",
          "..KSSSSSSSK.KWK.",
          "..KSSSSSSSK.KWK.",
          "..KSSSSSSSK.KWK.",
          "..KSSSSSSSK.KWK.",
          "..KSSSSSSSK.KWK.",
          "..KKKKKKKKK.KWK.",
          ".KGGGGGGGGGKKKK.",
          ".KKKKKKKKKKK....",
          "................",
          "................",
          "................",
          "................"
        ]
      },

      /* A post card with a heart */
      "Social Media Design": {
        palette: { K: "#2f3142", W: "#ffffff", P: "#9fd3f0", R: "#e0576b", G: "#c9ccd8" },
        grid: [
          "................",
          "..KKKKKKKKKKKK..",
          "..KWWWWWWWWWWK..",
          "..KWGGWWWWWWWK..",
          "..KWGGWGGGGWWK..",
          "..KWWWWWWWWWWK..",
          "..KWPPPPPPPPWK..",
          "..KWPPPPPPPPWK..",
          "..KWPPPPPPPPWK..",
          "..KWWWWWWWWWWK..",
          "..KWRRWWRRWWWK..",
          "..KWRRRRRRWWWK..",
          "..KWWRRRRWWWWK..",
          "..KWWWRRWWWWWK..",
          "..KKKKKKKKKKKK..",
          "................"
        ]
      },

      /* Printer with a sheet coming out */
      "Print Design": {
        palette: { K: "#2f3142", W: "#ffffff", G: "#b9bccb", R: "#5fbf6a" },
        grid: [
          "................",
          "....KKKKKKKK....",
          "....KWWWWWWK....",
          "....KWWWWWWK....",
          "....KWWWWWWK....",
          "...KKKKKKKKKK...",
          "..KGGGGGGGGGGK..",
          "..KGGGGGGGGRGK..",
          "..KGGGGGGGGGGK..",
          "...KKKKKKKKKK...",
          "....KWWWWWWK....",
          "....KWWWWWWK....",
          "....KWWWWWWK....",
          "....KWWWWWWK....",
          "....KKKKKKKK....",
          "................"
        ]
      }

    };

    /* These two already exist as artwork. */
    const IMAGE_ART = {
      "Branding / Logo": "assets/img/logo.png",
      "Something else": "assets/img/yuki.png"
    };

    const CAPTIONS = {
      "Branding / Logo":     "Identity, marks, the whole system",
      "Product Design":      "Interfaces, flows, design systems",
      "Social Media Design": "Posts, campaigns, templates",
      "Print Design":        "Decks, posters, physical things",
      "Something else":      "Tell me about it below"
    };


    const serviceSelect = $("#hireService", hireForm);
    const artFrame = $("#serviceArt", hireForm);
    const artCaption = $("#serviceCaption", hireForm);

    function renderArt(choice) {

      if (!artFrame) return;

      if (PIXEL_ART[choice]) {
        const { grid, palette } = PIXEL_ART[choice];
        artFrame.innerHTML = buildPixelIcon(grid, palette);
        return;
      }

      if (IMAGE_ART[choice]) {
        artFrame.innerHTML =
          `<img src="${IMAGE_ART[choice]}" alt="">`;
        return;
      }

      /* Nothing chosen yet, an empty slot. */
      artFrame.innerHTML = '<span class="art-empty">?</span>';

    }

    function updateServiceArt() {

      if (!serviceSelect || !artFrame) return;

      const choice = serviceSelect.value;

      artFrame.dataset.service = choice || "";

      artFrame.classList.add("swapping");

      setTimeout(() => {
        renderArt(choice);
        artFrame.classList.remove("swapping");
      }, 130);

      if (artCaption) {
        artCaption.textContent =
          CAPTIONS[choice] || "Pick a service";
      }

    }

    serviceSelect?.addEventListener("change", updateServiceArt);
    renderArt(serviceSelect?.value || "");


    /* ---------------- Status bar ----------------
       Old apps explained the focused control in a bar at the
       foot of the window. Same idea here.
       --------------------------------------------------- */

    const statusBar = $("#hireStatus");
    const DEFAULT_STATUS = "Ready";

    function setStatus(message, state) {

      if (!statusBar) return;

      statusBar.textContent = message;
      statusBar.className = `status-bar${state ? " " + state : ""}`;

    }

    function describeField(field) {

      if (!field) return DEFAULT_STATUS;

      const hint = field.dataset.hint || "";

      /* The long field reports how much has been written. */
      if (field.tagName === "TEXTAREA") {

        const count = field.value.trim().length;

        return count
          ? `${hint} ,  ${count} character${count === 1 ? "" : "s"}`
          : hint;

      }

      return hint || DEFAULT_STATUS;

    }

    if (statusBar) {

      const described = $$("[data-hint]", hireForm);

      described.forEach(field => {

        field.addEventListener("focus", () =>
          setStatus(describeField(field))
        );

        field.addEventListener("blur", () => {
          if (!hireForm.querySelector(":focus")) {
            setStatus(DEFAULT_STATUS);
          }
        });

        /* Keep the character count live while typing. */
        if (field.tagName === "TEXTAREA") {
          field.addEventListener("input", () =>
            setStatus(describeField(field))
          );
        }

      });

    }


    /* ---------------- Validation ---------------- */

    function clearError(field) {

      field.classList.remove("invalid");
      field.closest(".cell")
        ?.querySelector(".field-error")
        ?.remove();

    }

    function showError(field, message) {

      clearError(field);
      field.classList.add("invalid");

      const note = document.createElement("span");
      note.className = "field-error";
      note.textContent = message;

      field.closest(".cell")?.appendChild(note);

    }

    function validate() {

      const fields = $$(
        "input[required], select[required], textarea[required]",
        hireForm
      );

      let firstBad = null;

      fields.forEach(field => {

        const value = field.value.trim();

        clearError(field);

        if (!value) {
          showError(field, "This one's needed.");
          firstBad = firstBad || field;
          return;
        }

        if (
          field.type === "email" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          showError(field, "That email doesn't look right.");
          firstBad = firstBad || field;
        }

      });

      if (firstBad) {
        setStatus("Some fields still need filling in.", "error");
        firstBad.focus();
        return false;
      }

      return true;

    }

    hireForm.addEventListener("input", event => {
      if (event.target.classList.contains("invalid")) {
        clearError(event.target);
      }
    });


    /* ---------------- Sending ---------------- */

    function setResponse(message, kind) {

      if (!response) return;

      response.textContent = message;
      response.className = `response show ${kind}`;

    }

    hireForm.addEventListener("submit", async event => {

      event.preventDefault();

      if (!validate()) return;

      const endpoint = hireForm.dataset.endpoint?.trim();

      /*
        With no custom endpoint, post back to the site itself:
        Netlify picks the submission up from the form's name
        and emails it on. Nothing to configure in the markup.
      */
      const target = endpoint || "/";

      if (sendButton) {
        sendButton.disabled = true;
        sendButton.textContent = "Sending...";
      }

      setStatus("Sending your request...", "busy");

      try {

        const data = new FormData(hireForm);

        /*
          Netlify expects urlencoded; a third-party endpoint is
          happier with the raw FormData.
        */
        const result = await fetch(target, {
          method: "POST",
          headers: endpoint
            ? { Accept: "application/json" }
            : { "Content-Type": "application/x-www-form-urlencoded" },
          body: endpoint
            ? data
            : new URLSearchParams(data).toString()
        });

        if (!result.ok) throw new Error(result.status);

        /*
          Confirm in its own window rather than a line of text
          the person might scroll past.
        */
        const sent = $("#sentPopup");
        const sentSummary = $("#sentSummary");

        if (sentSummary) {

          const service = serviceSelect?.value;

          sentSummary.textContent = service
            ? `Thank you, your ${service.toLowerCase()} enquiry has landed in my inbox.`
            : "Thank you, it's landed in my inbox.";

        }

        if (sent) {
          openWindow(sent);
        } else {
          setResponse(
            "Sent. Thank you, I'll come back to you shortly.",
            "ok"
          );
        }

        setStatus("Request sent.", "done");

        hireForm.reset();
        updateServiceArt();

      } catch (error) {

        setResponse(
          "That didn't send. Email me directly at ouaras.yassmine@gmail.com and I'll pick it up.",
          "bad"
        );

        setStatus("Couldn't send.", "error");

      } finally {

        if (sendButton) {
          sendButton.disabled = false;
          sendButton.textContent = "Send request";
        }

      }

    });

  }


  /* =======================================================
     YUKI STUDIO TABS
     ======================================================= */

  let yukiStudioInitialized = false;

  function initializeYukiStudio() {

    if (yukiStudioInitialized) {

      /*
        If the game was already started, don't reset it.
      */

      if (yukiRunner.initialized) {
        yukiRunner.resize();
      }

      return;

    }

    yukiStudioInitialized = true;

    initializeYukiTabs();
    initializeQuotes();
    initializePomodoro();
    initializeNotes();
    initializeYukiRunner();

  }


  function initializeYukiTabs() {

    const tabs = $$(".yuki-tool");

    const panels = {
      quote: $("#yukiQuotePanel"),
      game: $("#yukiGamePanel"),
      pomodoro: $("#yukiPomodoroPanel"),
      notes: $("#yukiNotesPanel"),
      paint: $("#yukiPaintPanel")
    };


    function activateTab(tabName) {

      tabs.forEach(tab => {

        tab.classList.toggle(
          "active",
          tab.dataset.yukiTab === tabName
        );

      });


      Object.entries(panels).forEach(
        ([name, panel]) => {

          if (!panel) return;

          panel.classList.toggle(
            "active",
            name === tabName
          );

        }
      );


      if (tabName === "game") {

        setTimeout(() => {

          yukiRunner.resize();

          if (!yukiRunner.started) {
            yukiRunner.showStart();
          }

        }, 50);

      }

      if (tabName === "paint") {

        setTimeout(initializePaint, 50);

      }

    }


    tabs.forEach(tab => {

      tab.addEventListener("click", () => {

        activateTab(
          tab.dataset.yukiTab
        );

      });

    });


    const active =
      tabs.find(tab =>
        tab.classList.contains("active")
      );

    if (active) {

      activateTab(
        active.dataset.yukiTab
      );

    }

  }


  /* =======================================================
     PAINT
     ======================================================= */

  const paintState = {
    ready: false,
    canvas: null,
    ctx: null,
    tool: "pencil",
    size: 2,
    fg: "#000000",
    bg: "#ffffff",
    drawing: false,
    usingBg: false,
    startX: 0,
    startY: 0,
    snapshot: null,
    history: []
  };

  /* The classic 28-colour Paint palette. */
  const PAINT_COLORS = [
    "#000000", "#808080", "#800000", "#808000",
    "#008000", "#008080", "#000080", "#800080",
    "#808040", "#004040", "#0080ff", "#004080",
    "#8000ff", "#804000",
    "#ffffff", "#c0c0c0", "#ff0000", "#ffff00",
    "#00ff00", "#00ffff", "#0000ff", "#ff00ff",
    "#ffff80", "#00ff80", "#80ffff", "#8080ff",
    "#ff0080", "#ff8040"
  ];


  function paintPushHistory() {

    if (!paintState.ctx) return;

    try {

      paintState.history.push(
        paintState.ctx.getImageData(
          0, 0,
          paintState.canvas.width,
          paintState.canvas.height
        )
      );

      /* Keep memory bounded. */
      if (paintState.history.length > 20) {
        paintState.history.shift();
      }

    } catch (error) {
      /* Reading pixels can fail in rare sandboxed cases. */
    }

  }


  function paintUndo() {

    if (!paintState.ctx) return;
    if (!paintState.history.length) return;

    const previous = paintState.history.pop();

    paintState.ctx.putImageData(previous, 0, 0);

  }


  function paintPointerPos(event) {

    const rect =
      paintState.canvas.getBoundingClientRect();

    const scaleX =
      paintState.canvas.width / rect.width;

    const scaleY =
      paintState.canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };

  }


  function paintActiveColor() {

    return paintState.usingBg
      ? paintState.bg
      : paintState.fg;

  }


  function paintUpdateSwatches() {

    const fg = $("#paintFg");
    const bg = $("#paintBg");

    if (fg) fg.style.background = paintState.fg;
    if (bg) bg.style.background = paintState.bg;

  }


  /* Scanline flood fill, like Paint's bucket. */
  function paintFloodFill(startX, startY, hexColor) {

    const ctx = paintState.ctx;
    const width = paintState.canvas.width;
    const height = paintState.canvas.height;

    startX = Math.floor(startX);
    startY = Math.floor(startY);

    if (
      startX < 0 || startY < 0 ||
      startX >= width || startY >= height
    ) {
      return;
    }

    const image =
      ctx.getImageData(0, 0, width, height);

    const data = image.data;

    const target = (startY * width + startX) * 4;

    const targetR = data[target];
    const targetG = data[target + 1];
    const targetB = data[target + 2];
    const targetA = data[target + 3];

    const fillR = parseInt(hexColor.slice(1, 3), 16);
    const fillG = parseInt(hexColor.slice(3, 5), 16);
    const fillB = parseInt(hexColor.slice(5, 7), 16);

    /* Nothing to do if the pixel is already the fill colour. */
    if (
      targetR === fillR &&
      targetG === fillG &&
      targetB === fillB &&
      targetA === 255
    ) {
      return;
    }

    function matches(index) {
      return (
        data[index] === targetR &&
        data[index + 1] === targetG &&
        data[index + 2] === targetB &&
        data[index + 3] === targetA
      );
    }

    const stack = [[startX, startY]];

    while (stack.length) {

      const [px, py] = stack.pop();

      let x = px;
      let index = (py * width + x) * 4;

      /* Walk left to the edge of the region. */
      while (x >= 0 && matches(index)) {
        x--;
        index -= 4;
      }

      x++;
      index += 4;

      let reachUp = false;
      let reachDown = false;

      while (x < width && matches(index)) {

        data[index] = fillR;
        data[index + 1] = fillG;
        data[index + 2] = fillB;
        data[index + 3] = 255;

        if (py > 0) {

          const up = index - width * 4;

          if (matches(up)) {
            if (!reachUp) {
              stack.push([x, py - 1]);
              reachUp = true;
            }
          } else {
            reachUp = false;
          }

        }

        if (py < height - 1) {

          const down = index + width * 4;

          if (matches(down)) {
            if (!reachDown) {
              stack.push([x, py + 1]);
              reachDown = true;
            }
          } else {
            reachDown = false;
          }

        }

        x++;
        index += 4;

      }

    }

    ctx.putImageData(image, 0, 0);

  }


  function paintPickColor(x, y) {

    const pixel =
      paintState.ctx.getImageData(
        Math.floor(x),
        Math.floor(y),
        1, 1
      ).data;

    const hex =
      "#" +
      [pixel[0], pixel[1], pixel[2]]
        .map(v => v.toString(16).padStart(2, "0"))
        .join("");

    if (paintState.usingBg) {
      paintState.bg = hex;
    } else {
      paintState.fg = hex;
    }

    paintUpdateSwatches();

  }


  function paintStrokeStyle() {

    const ctx = paintState.ctx;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = paintState.size;

    if (paintState.tool === "eraser") {
      ctx.strokeStyle = paintState.bg;
      ctx.lineWidth = Math.max(paintState.size * 2, 8);
    } else {
      ctx.strokeStyle = paintActiveColor();
    }

  }


  function initializePaint() {

    const canvas = $("#paintCanvas");

    if (!canvas) return;

    /* Only wire everything up once. */
    if (paintState.ready) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) return;

    paintState.canvas = canvas;
    paintState.ctx = ctx;
    paintState.ready = true;

    /* Paint starts on a white sheet. */
    ctx.fillStyle = paintState.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    /* ---- Palette ---- */

    const palette = $("#paintPalette");

    if (palette) {

      PAINT_COLORS.forEach(color => {

        const swatch = document.createElement("button");

        swatch.type = "button";
        swatch.className = "paint-swatch";
        swatch.style.background = color;
        swatch.title = color;
        swatch.setAttribute("aria-label", `Colour ${color}`);

        /* Left sets the front colour. */
        swatch.addEventListener("click", () => {
          paintState.fg = color;
          paintUpdateSwatches();
        });

        /* Right sets the back colour, as in Paint. */
        swatch.addEventListener("contextmenu", event => {
          event.preventDefault();
          paintState.bg = color;
          paintUpdateSwatches();
        });

        palette.appendChild(swatch);

      });

    }

    paintUpdateSwatches();


    /* ---- Tools ---- */

    $$(".paint-tool").forEach(button => {

      button.addEventListener("click", () => {

        paintState.tool = button.dataset.paintTool;

        $$(".paint-tool").forEach(other =>
          other.classList.toggle("active", other === button)
        );

      });

    });


    /* ---- Sizes ---- */

    $$(".paint-size").forEach(button => {

      button.addEventListener("click", () => {

        paintState.size =
          Number(button.dataset.paintSize) || 2;

        $$(".paint-size").forEach(other =>
          other.classList.toggle("active", other === button)
        );

      });

    });


    /* ---- Drawing ---- */

    canvas.addEventListener("contextmenu", event =>
      event.preventDefault()
    );

    canvas.addEventListener("pointerdown", event => {

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);

      paintState.usingBg = event.button === 2;

      const { x, y } = paintPointerPos(event);

      if (paintState.tool === "picker") {
        paintPickColor(x, y);
        return;
      }

      paintPushHistory();

      if (paintState.tool === "fill") {
        paintFloodFill(x, y, paintActiveColor());
        return;
      }

      paintState.drawing = true;
      paintState.startX = x;
      paintState.startY = y;

      /* Shapes preview against a frozen copy of the canvas. */
      if (["line", "rect", "ellipse"].includes(paintState.tool)) {

        paintState.snapshot =
          ctx.getImageData(0, 0, canvas.width, canvas.height);

        return;

      }

      paintStrokeStyle();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();

    });


    canvas.addEventListener("pointermove", event => {

      if (!paintState.drawing) return;

      const { x, y } = paintPointerPos(event);

      const tool = paintState.tool;

      if (["line", "rect", "ellipse"].includes(tool)) {

        if (paintState.snapshot) {
          ctx.putImageData(paintState.snapshot, 0, 0);
        }

        paintStrokeStyle();
        ctx.beginPath();

        if (tool === "line") {

          ctx.moveTo(paintState.startX, paintState.startY);
          ctx.lineTo(x, y);

        } else if (tool === "rect") {

          ctx.rect(
            paintState.startX,
            paintState.startY,
            x - paintState.startX,
            y - paintState.startY
          );

        } else {

          const cx = (paintState.startX + x) / 2;
          const cy = (paintState.startY + y) / 2;
          const rx = Math.abs(x - paintState.startX) / 2;
          const ry = Math.abs(y - paintState.startY) / 2;

          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

        }

        ctx.stroke();

        return;

      }

      /* Freehand tools. */
      paintStrokeStyle();
      ctx.lineTo(x, y);
      ctx.stroke();

    });


    function endStroke() {

      paintState.drawing = false;
      paintState.snapshot = null;
      ctx.beginPath();

    }

    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointerleave", () => {

      if (paintState.drawing && !["line", "rect", "ellipse"].includes(paintState.tool)) {
        endStroke();
      }

    });


    /* ---- Actions ---- */

    $("#paintUndo")?.addEventListener("click", paintUndo);

    $("#paintClear")?.addEventListener("click", () => {

      paintPushHistory();

      ctx.fillStyle = paintState.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

    });

    $("#paintSave")?.addEventListener("click", () => {

      try {

        const link = document.createElement("a");

        link.download = "yuki-paint.png";
        link.href = canvas.toDataURL("image/png");
        link.click();

      } catch (error) {
        /* Saving can be blocked in some embedded contexts. */
      }

    });

  }


  /* =======================================================
     QUOTES
     ======================================================= */

  function initializeQuotes() {

    const quoteText = $("#dailyQuote");
    const quoteAuthor = $("#quoteAuthor");
    const quoteBook = $("#quoteBook");
    const newQuoteButton = $("#newQuoteButton");

    if (!quoteText) return;


    const quotes = [

      {
        text:
          "Design is not just what it looks like and feels like. Design is how it works.",
        author: "Steve Jobs",
        book: ""
      },

      {
        text:
          "Good design is obvious. Great design is transparent.",
        author: "Joe Sparano",
        book: ""
      },

      {
        text:
          "The details are not the details. They make the design.",
        author: "Charles Eames",
        book: ""
      },

      {
        text:
          "Everything is designed. Few things are designed well.",
        author: "Brian Reed",
        book: ""
      },

      {
        text:
          "There is no such thing as a boring project. There are only boring executions.",
        author: "Irene Etzkorn",
        book: ""
      },

      {
        text:
          "Creativity is intelligence having fun.",
        author: "Albert Einstein",
        book: ""
      }

    ];


    function showRandomQuote() {

      const quote =
        quotes[randomInt(0, quotes.length - 1)];

      quoteText.textContent =
        quote.text;

      if (quoteAuthor)
        quoteAuthor.textContent =
          quote.author;

      if (quoteBook)
        quoteBook.textContent =
          quote.book;

    }


    if (newQuoteButton) {

      newQuoteButton.addEventListener(
        "click",
        showRandomQuote
      );

    }


    showRandomQuote();

  }


  /* =======================================================
     POMODORO
     ======================================================= */

  function initializePomodoro() {

    const timeDisplay = $("#pomodoroTime");
    const progress = $("#pomodoroProgress");
    const startButton = $("#pomodoroStart");
    const resetButton = $("#pomodoroReset");
    const sessionDisplay = $("#pomodoroSession");

    const focusDuration = $("#focusDuration");
    const shortBreakDuration = $("#shortBreakDuration");
    const longBreakDuration = $("#longBreakDuration");

    const modeButtons =
      $$(".pomodoro-mode-button");

    if (!timeDisplay) return;


    const durations = {

      focus: 25,
      short: 5,
      long: 20

    };


    let mode = "focus";
    let totalSeconds = 25 * 60;
    let remainingSeconds = totalSeconds;

    let timer = null;
    let session = 1;


    function getDuration() {

      if (mode === "focus") {

        return Number(
          focusDuration?.value || 25
        );

      }

      if (mode === "short") {

        return Number(
          shortBreakDuration?.value || 5
        );

      }

      return Number(
        longBreakDuration?.value || 20
      );

    }


    function formatTime(seconds) {

      const minutes =
        Math.floor(seconds / 60);

      const secs =
        seconds % 60;

      return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
      );

    }


    function updateDisplay() {

      timeDisplay.textContent =
        formatTime(remainingSeconds);

      if (progress) {

         
        const percentage =
          totalSeconds > 0
            ? ((totalSeconds - remainingSeconds) /
                totalSeconds) * 100
            : 0;

        progress.style.width =
          `${percentage}%`;

      }

    }


    function setMode(newMode) {

      mode = newMode;

      modeButtons.forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.mode === mode
        );

      });

      totalSeconds =
        getDuration() * 60;

      remainingSeconds =
        totalSeconds;

      stop();

      updateDisplay();

      if (startButton)
        startButton.textContent = "Start";

    }


    function tick() {

      if (remainingSeconds <= 0) {

        stop();

        session++;

        if (sessionDisplay)
          sessionDisplay.textContent =
            session;

        return;

      }

      remainingSeconds--;

      updateDisplay();

    }


    function start() {

      if (timer) {

        stop();

        return;

      }

      timer = setInterval(
        tick,
        1000
      );

      /* Reels turn while the tape runs, slower on a break. */
      const card = $(".pomodoro-card");
      card?.classList.add("running");
      card?.classList.toggle("on-break", mode !== "focus");

      if (startButton)
        startButton.textContent = "Pause";

    }


    function stop() {

      if (timer) {

        clearInterval(timer);

        timer = null;

      }

      $(".pomodoro-card")?.classList.remove("running");

      if (startButton)
        startButton.textContent = "Start";

    }


    function reset() {

      stop();

      totalSeconds =
        getDuration() * 60;

      remainingSeconds =
        totalSeconds;

      updateDisplay();

    }


    modeButtons.forEach(button => {

      button.addEventListener(
        "click",
        () => setMode(
          button.dataset.mode
        )
      );

    });


    [
      focusDuration,
      shortBreakDuration,
      longBreakDuration
    ].forEach(select => {

      select?.addEventListener(
        "change",
        () => {

          if (
            !timer &&
            (
              (mode === "focus" && select === focusDuration) ||
              (mode === "short" && select === shortBreakDuration) ||
              (mode === "long" && select === longBreakDuration)
            )
          ) {

            reset();

          }

        }
      );

    });


    startButton?.addEventListener(
      "click",
      start
    );

    resetButton?.addEventListener(
      "click",
      reset
    );


    updateDisplay();

  }


  /* =======================================================
     NOTES
     ======================================================= */

  function initializeNotes() {

    const input = $("#noteInput");
    const addButton = $("#addNote");
    const list = $("#notesList");
    const count = $("#notesCount");
    const clearCompleted = $("#clearCompleted");

    if (!input || !list) return;


    let notes = [];

    try {

      notes =
        JSON.parse(
          localStorage.getItem(
            "yassmine-yuki-notes"
          )
        ) || [];

    } catch {

      notes = [];

    }


    function save() {

      localStorage.setItem(
        "yassmine-yuki-notes",
        JSON.stringify(notes)
      );

    }


    function render() {

      list.innerHTML = "";

      notes.forEach((note, index) => {

        const item =
          document.createElement("div");

        item.className =
          "note-item" +
          (note.completed ? " completed" : "");

        const checkbox =
          document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked =
          note.completed;

        checkbox.addEventListener(
          "change",
          () => {

            note.completed =
              checkbox.checked;

            save();
            render();

          }
        );


        const text =
          document.createElement("span");

        text.textContent =
          note.text;


        const deleteButton =
          document.createElement("button");

        deleteButton.className =
          "delete-note";

        deleteButton.type =
          "button";

        deleteButton.textContent =
          "×";

        deleteButton.addEventListener(
          "click",
          () => {

            notes.splice(index, 1);

            save();
            render();

          }
        );


        item.append(
          checkbox,
          text,
          deleteButton
        );

        list.appendChild(item);

      });


      const remaining =
        notes.filter(
          note => !note.completed
        ).length;

      if (count) {

        count.textContent =
          `${remaining} task${remaining === 1 ? "" : "s"}`;

      }

    }


    function addNote() {

      const text =
        input.value.trim();

      if (!text) return;

      notes.push({
        text,
        completed: false
      });

      input.value = "";

      save();
      render();

    }


    addButton?.addEventListener(
      "click",
      addNote
    );


    input.addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {

          event.preventDefault();

          addNote();

        }

      }
    );


    clearCompleted?.addEventListener(
      "click",
      () => {

        notes =
          notes.filter(
            note => !note.completed
          );

        save();
        render();

      }
    );


    render();

  }


  /* =======================================================
     CONTINUOUS YUKI RUNNER
     ======================================================= */

  const yukiRunner = {

    initialized: false,

    started: false,
    gameOver: false,

    animationFrame: null,

    lastTime: 0,

    width: 0,
    height: 0,

    groundHeight: 46,

    player: null,
    world: null,
    game: null,

    scoreElement: null,
    yarnElement: null,
    livesElement: null,
    highScoreElement: null,

    startOverlay: null,
    gameOverOverlay: null,
    gameOverMessage: null,

    restartButton: null,
    startButton: null,

    playerX: 90,
    playerY: 0,

    playerWidth: 58,
    playerHeight: 58,

    velocityY: 0,

    gravity: 1900,
    jumpVelocity: 720,

    speed: 320,
    maxSpeed: 720,

    distance: 0,
    score: 0,
    yarn: 0,
    lives: 3,

    highScore: 0,

    cameraX: 0,

    objects: [],

    nextSpawnX: 700,

    spawnDistance: 300,

    keys: {
      left: false,
      right: false
    },

    jumpQueued: false,

    resize() {

      if (!this.game) return;

      this.width =
        this.game.clientWidth;

      this.height =
        this.game.clientHeight;

      this.playerWidth =
        this.player?.offsetWidth || 58;

      this.playerHeight =
        this.player?.offsetHeight || 58;

      if (!this.started) {

        this.playerY =
          this.groundHeight;

      }

      this.render();

    },


    initialize() {

      if (this.initialized) return;

      this.initialized = true;

      this.game = $("#yukiGame");
      this.world = $("#gameWorld");
      this.player = $("#gamePlayer");

      this.scoreElement =
        $("#yukiScore");

      this.yarnElement =
        $("#yukiYarnCount");

      this.livesElement =
        $("#yukiLives");

      this.highScoreElement =
        $("#yukiHighScore");

      this.startOverlay =
        $("#yukiStartOverlay");

      this.gameOverOverlay =
        $("#yukiGameOverOverlay");

      this.gameOverMessage =
        $("#yukiGameOverMessage");

      this.restartButton =
        $("#restartYuki");

      this.startButton =
        $("#startYukiGame");


      if (!this.game || !this.world || !this.player) {
        return;
      }


      /*
        Make the game keyboard-focusable.
      */

      this.game.tabIndex = 0;


      this.highScore =
        Number(
          localStorage.getItem(
            "yassmine-yuki-highscore"
          ) || 0
        );


      this.bindControls();

      this.resize();

      this.showStart();

    },


    showStart() {

      this.started = false;
      this.gameOver = false;

      this.startOverlay?.classList.remove(
        "hidden"
      );

      this.gameOverOverlay?.classList.add(
        "hidden"
      );

    },


    start() {

      if (!this.initialized) {
        this.initialize();
      }

      if (!this.game) return;

      this.resetWorld();

      this.started = true;
      this.gameOver = false;

      this.startOverlay?.classList.add(
        "hidden"
      );

      this.gameOverOverlay?.classList.add(
        "hidden"
      );

      this.game.focus();

      this.lastTime =
        performance.now();

      cancelAnimationFrame(
        this.animationFrame
      );

      this.animationFrame =
        requestAnimationFrame(
          this.loop.bind(this)
        );

    },


    restart() {

      this.start();

    },


    resetWorld() {

      this.objects.forEach(
        object => object.element.remove()
      );

      this.objects = [];

      this.playerX = 90;

      this.playerY =
        this.groundHeight;

      this.velocityY = 0;

      this.distance = 0;

      this.score = 0;

      this.yarn = 0;

      this.lives = 3;

      this.speed = 320;

      this.cameraX = 0;

      this.nextSpawnX =
        this.width + 350;

      this.spawnDistance = 300;

      this.player.classList.remove(
        "jumping",
        "hurt"
      );

      this.updateHUD();

      this.createGround();

      /*
        Initial objects are generated ahead
        of Yuki so the world isn't empty.
      */

      while (
        this.nextSpawnX <
        this.width + 1800
      ) {

        this.spawnObject();

      }

      this.render();

    },


    createGround() {

      const existing =
        this.world.querySelector(
          ".game-ground"
        );

      existing?.remove();

      const ground =
        document.createElement("div");

      ground.className =
        "game-ground";

      ground.style.left = "0px";

      ground.style.width =
        "100%";

      this.world.appendChild(ground);

    },


    spawnObject() {

      const gap =
        randomInt(
          260,
          Math.max(
            390,
            Math.floor(
              500 - this.speed * .15
            )
          )
        );

      this.nextSpawnX += gap;

      const roll =
        Math.random();

      /*
        Yarn appears frequently.
      */

      if (roll < 0.58) {

        this.spawnYarn(
          this.nextSpawnX,
          randomInt(
            70,
            125
          )
        );

        /*
          Sometimes make a small yarn chain.
        */

        if (Math.random() < .25) {

          this.spawnYarn(
            this.nextSpawnX + 48,
            randomInt(
              90,
              140
            )
          );

          this.nextSpawnX += 48;

        }

        return;

      }


      /*
        Obstacle.
      */

      this.spawnEnemy(
        this.nextSpawnX
      );


      /*
        Occasionally place yarn after
        the obstacle.
      */

      if (Math.random() < .45) {

        this.spawnYarn(
          this.nextSpawnX + 95,
          randomInt(70, 135)
        );

        this.nextSpawnX += 95;

      }

    },


    spawnYarn(worldX, height) {

      const element =
        document.createElement("div");

      element.className =
        "yarn";

      element.textContent =
        "🧶";

      element.style.left =
        `${worldX}px`;

      element.style.bottom =
        `${this.groundHeight + height}px`;

      this.world.appendChild(element);

      this.objects.push({

        type: "yarn",

        element,

        x: worldX,

        y:
          this.groundHeight +
          height,

        width: 34,
        height: 34,

        collected: false

      });

    },


    spawnEnemy(worldX) {

      const element =
        document.createElement("div");

      element.className =
        "yuki-enemy";

      element.textContent =
        Math.random() < .65
          ? "🪨"
          : "🌵";

      element.style.left =
        `${worldX}px`;

      element.style.bottom =
        `${this.groundHeight}px`;

      this.world.appendChild(element);

      this.objects.push({

        type: "enemy",

        element,

        x: worldX,

        y: this.groundHeight,

        width: 44,
        height: 44,

        hit: false

      });

    },


    bindControls() {

      /*
        Touch and pointer

        Tapping the play area jumps, which is the whole game
        on a phone. The pad gives left and right for anyone
        who wants finer control.
      */

      const holdMove = (button, dir) => {

        const press = event => {
          event.preventDefault();
          if (dir === "jump") {
            if (!this.started) this.start();
            else this.jumpQueued = true;
            return;
          }
          this.keys[dir] = true;
        };

        const release = event => {
          event.preventDefault();
          if (dir !== "jump") this.keys[dir] = false;
        };

        button.addEventListener("pointerdown", press);
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("pointerleave", release);
        button.addEventListener("contextmenu", e => e.preventDefault());

      };

      $$("[data-move]", this.game).forEach(button =>
        holdMove(button, button.dataset.move)
      );

      /* Tap anywhere on the play area to start or jump. */
      this.game?.addEventListener("pointerdown", event => {

        if (event.target.closest("[data-move]")) return;
        if (event.target.closest("button")) return;

        event.preventDefault();

        if (!this.started) this.start();
        else this.jumpQueued = true;

      });

      /* Stop the page scrolling while playing on a phone. */
      this.game?.addEventListener("touchmove", event => {
        if (this.started) event.preventDefault();
      }, { passive: false });


      /*
        Keyboard
      */

      window.addEventListener(
        "keydown",
        event => {

          if (
            event.code === "Space" ||
            event.code === "ArrowUp" ||
            event.code === "KeyW"
          ) {

            event.preventDefault();

            if (
              this.game?.classList.contains(
                "active"
              ) ||
              this.game
            ) {

              if (!this.started) {

                this.start();

              } else {

                this.jumpQueued = true;

              }

            }

            return;

          }


          if (
            event.code === "ArrowLeft" ||
            event.code === "KeyA"
          ) {

            event.preventDefault();

            this.keys.left = true;

          }


          if (
            event.code === "ArrowRight" ||
            event.code === "KeyD"
          ) {

            event.preventDefault();

            this.keys.right = true;

          }

        }
      );


      window.addEventListener(
        "keyup",
        event => {

          if (
            event.code === "ArrowLeft" ||
            event.code === "KeyA"
          ) {

            this.keys.left = false;

          }


          if (
            event.code === "ArrowRight" ||
            event.code === "KeyD"
          ) {

            this.keys.right = false;

          }

        }
      );


      /*
        Clicking the game focuses it.
      */

      this.game.addEventListener(
        "pointerdown",
        () => {

          this.game.focus();

        }
      );


      /*
        Start button
      */

      this.startButton?.addEventListener(
        "click",
        event => {

          event.preventDefault();

          this.start();

        }
      );


      /*
        Game-over restart
      */

      $("#restartYukiGame")?.addEventListener(
        "click",
        event => {

          event.preventDefault();

          this.start();

        }
      );


      /*
        Bottom restart button
      */

      this.restartButton?.addEventListener(
        "click",
        event => {

          event.preventDefault();

          this.start();

        }
      );


      window.addEventListener(
        "resize",
        () => this.resize()
      );

    },


    jump() {

      /*
        Don't allow double jumping.
      */

      if (
        this.playerY <=
        this.groundHeight + 2
      ) {

        this.velocityY =
          this.jumpVelocity;

        this.player.classList.add(
          "jumping"
        );

      }

    },


    loop(timestamp) {

      if (!this.started) return;

      if (this.gameOver) return;

      const delta =
        Math.min(
          (timestamp - this.lastTime) / 1000,
          .033
        );

      this.lastTime =
        timestamp;


      this.update(delta);

      this.render();


      this.animationFrame =
        requestAnimationFrame(
          this.loop.bind(this)
        );

    },


    update(delta) {

      /*
        Gradually accelerate.
      */

      this.speed +=
        delta * 4.5;

      this.speed =
        Math.min(
          this.speed,
          this.maxSpeed
        );


      /*
        Horizontal steering.

        The runner still moves forward
        automatically, but arrows give the
        player a little control.
      */

      if (this.keys.left) {

        this.playerX -=
          this.speed *
          .55 *
          delta;

      }


      if (this.keys.right) {

        this.playerX +=
          this.speed *
          .35 *
          delta;

      }


      this.playerX =
        clamp(
          this.playerX,
          50,
          Math.max(
            55,
            this.width * .45
          )
        );


      /*
        Jump
      */

      if (this.jumpQueued) {

        this.jumpQueued = false;

        this.jump();

      }


      /*
        Gravity
      */

      this.velocityY -=
        this.gravity * delta;

      this.playerY +=
        this.velocityY * delta;


      if (
        this.playerY <=
        this.groundHeight
      ) {

        this.playerY =
          this.groundHeight;

        this.velocityY = 0;

        this.player.classList.remove(
          "jumping"
        );

      }


      /*
        World moves left.

        Distance is the main score.
      */

      const movement =
        this.speed * delta;

      this.distance +=
        movement;

      this.cameraX +=
        movement;


      /*
        Move every generated object
        toward the player.
      */

      this.objects.forEach(
        object => {

          object.x -= movement;

          object.element.style.left =
            `${object.x}px`;

        }
      );


      /*
        Collision
      */

      this.checkCollisions();


      /*
        Remove objects that have gone
        behind the player.
      */

      this.objects =
        this.objects.filter(
          object => {

            if (
              object.x <
              -100
            ) {

              object.element.remove();

              return false;

            }

            return true;

          }
        );


      /*
        Keep generating the world.
      */

      while (
        this.nextSpawnX <
        this.cameraX +
        this.width +
        1000
      ) {

        this.spawnObject();

      }


      /*
        Score.
      */

      this.score =
        Math.floor(
          this.distance / 10
        ) +
        this.yarn * 50;


      /*
        High score.
      */

      if (
        this.score >
        this.highScore
      ) {

        this.highScore =
          this.score;

        localStorage.setItem(
          "yassmine-yuki-highscore",
          String(this.highScore)
        );

      }


      this.updateHUD();

    },


    checkCollisions() {

      const playerLeft =
        this.playerX + 8;

      const playerRight =
        this.playerX +
        this.playerWidth -
        8;

      const playerBottom =
        this.playerY;

      const playerTop =
        this.playerY +
        this.playerHeight -
        8;


      this.objects.forEach(
        object => {

          const objectLeft =
            object.x;

          const objectRight =
            object.x +
            object.width;

          const objectBottom =
            object.y;

          const objectTop =
            object.y +
            object.height;


          const overlap =
            playerLeft <
              objectRight &&
            playerRight >
              objectLeft &&
            playerBottom <
              objectTop &&
            playerTop >
              objectBottom;


          if (!overlap) return;


          /*
            Yarn
          */

          if (
            object.type === "yarn" &&
            !object.collected
          ) {

            object.collected =
              true;

            object.element.classList.add(
              "collected"
            );

            this.yarn++;

            setTimeout(
              () => {
                object.element.remove();
              },
              180
            );

            return;

          }


          /*
            Enemy
          */

          if (
            object.type === "enemy" &&
            !object.hit
          ) {

            this.hitEnemy(object);

          }

        }
      );

    },


    hitEnemy(enemy) {

      enemy.hit = true;

      this.lives--;

      this.player.classList.add(
        "hurt"
      );

      this.game.classList.add(
        "near-danger"
      );

      setTimeout(
        () => {

          this.player.classList.remove(
            "hurt"
          );

          this.game.classList.remove(
            "near-danger"
          );

        },
        500
      );


      this.updateHUD();


      /*
        Small knockback.
      */

      this.velocityY =
        Math.max(
          this.velocityY,
          380
        );


      /*
        Remove the obstacle so the player
        isn't hit repeatedly.
      */

      enemy.x -= 100;

      enemy.element.style.left =
        `${enemy.x}px`;


      if (this.lives <= 0) {

        this.endGame();

      }

    },


    endGame() {

      this.started = false;

      this.gameOver = true;

      cancelAnimationFrame(
        this.animationFrame
      );

      const message =
        this.gameOverMessage;

      if (message) {

        message.textContent =
          `You ran ${Math.floor(
            this.distance / 10
          )}m and collected ${this.yarn} yarn. ` +
          `Final score: ${this.score}.`;

      }

      this.gameOverOverlay?.classList.remove(
        "hidden"
      );

      this.updateHUD();

    },


    updateHUD() {

      if (this.scoreElement) {

        this.scoreElement.textContent =
          this.score;

      }

      if (this.yarnElement) {

        this.yarnElement.textContent =
          this.yarn;

      }

      if (this.livesElement) {

        this.livesElement.textContent =
          this.lives;

      }

      if (this.highScoreElement) {

        this.highScoreElement.textContent =
          this.highScore;

      }

    },


    render() {

      if (!this.player) return;

      /*
        Yuki's screen position.
      */

      this.player.style.left =
        `${this.playerX}px`;

      this.player.style.bottom =
        `${this.playerY}px`;


      /*
        Objects are already moved in world
        coordinates, so we only need to
        render them.
      */

      this.objects.forEach(
        object => {

          object.element.style.left =
            `${object.x}px`;

        }
      );

    }

  };


  /* =======================================================
     INITIALISE RUNNER
     ======================================================= */

  function initializeYukiRunner() {

    yukiRunner.initialize();

  }


  /* =======================================================
     OLD LEVEL SYSTEM COMPATIBILITY
     ======================================================= */

  /*
    Your old HTML may still contain elements
    with these IDs.

    We deliberately disable them so the old
    level system cannot interfere with the
    continuous runner.
  */

  [
    "#yukiLevelOverlay",
    "#yukiCompleteOverlay",
    "#startYukiLevel",
    "#nextYukiLevel"
  ].forEach(selector => {

    const element =
      $(selector);

    if (!element) return;

    if (
      selector === "#yukiLevelOverlay"
    ) {

      element.classList.add(
        "hidden"
      );

    }

    /*
      Don't remove the elements because
      existing CSS / HTML may expect them.
    */

  });



  /* =======================================================
     ABOUT, BOOKSHELF
     ======================================================= */

  (function initializeBookshelf() {

    const books = $$(".shelf .book");
    const pages = $$(".book-spread .book-page");

    if (!books.length || !pages.length) return;

    const readLabel = $("#chaptersRead");
    const readFill = $("#progressFill");

    /* Session-only: the shelf resets on each visit. */
    const opened = new Set();


    function titleOf(button) {

      return (
        $(".book-title", button)?.textContent?.trim() ||
        "Chapter"
      );

    }


    function updateProgress() {

      if (readLabel) {
        readLabel.textContent = opened.size;
      }

      if (readFill) {
        readFill.style.width =
          `${(opened.size / books.length) * 100}%`;
      }

    }


    function openBook(button, focusPage) {

      const targetId = button.getAttribute("aria-controls");

      books.forEach(other => {

        const isActive = other === button;

        other.classList.toggle("active", isActive);
        other.setAttribute("aria-selected", String(isActive));

      });

      pages.forEach(page => {

        const isActive = page.id === targetId;

        page.classList.toggle("active", isActive);

        /* A freshly opened page starts at the top. */
        if (isActive) {
          page.scrollTop = 0;
          if (focusPage) page.focus({ preventScroll: true });
        }

      });

      opened.add(button.dataset.book);
      updateProgress();

    }


    /*
      Build the previous / next controls from the shelf order
      so they stay correct if chapters are added or reordered.
    */

    books.forEach((button, index) => {

      const page =
        $(`#${button.getAttribute("aria-controls")}`);

      if (!page) return;

      const nav = document.createElement("div");
      nav.className = "page-nav";

      const prev = document.createElement("button");
      prev.type = "button";

      if (index > 0) {
        prev.textContent = `← ${titleOf(books[index - 1])}`;
        prev.addEventListener("click", () =>
          openBook(books[index - 1], true)
        );
      } else {
        prev.textContent = "← Start of shelf";
        prev.disabled = true;
      }

      const number = document.createElement("span");
      number.className = "page-number";
      number.textContent = `${index + 1} / ${books.length}`;

      const next = document.createElement("button");
      next.type = "button";

      if (index < books.length - 1) {
        next.textContent = `${titleOf(books[index + 1])} →`;
        next.addEventListener("click", () =>
          openBook(books[index + 1], true)
        );
      } else {
        next.textContent = "End of shelf →";
        next.disabled = true;
      }

      nav.append(prev, number, next);
      page.appendChild(nav);

      /* Pages take focus so arrow-key navigation reads naturally. */
      page.tabIndex = -1;

    });


    books.forEach(button => {

      button.addEventListener("click", () => openBook(button));

      /* Left/right arrows walk the shelf, as with real tabs. */
      button.addEventListener("keydown", event => {

        if (
          event.key !== "ArrowLeft" &&
          event.key !== "ArrowRight"
        ) {
          return;
        }

        event.preventDefault();

        const index = books.indexOf(button);

        const nextIndex =
          event.key === "ArrowRight"
            ? (index + 1) % books.length
            : (index - 1 + books.length) % books.length;

        books[nextIndex].focus();
        openBook(books[nextIndex]);

      });

    });


    /* The chapter already showing counts as opened. */
    const initial =
      books.find(book => book.classList.contains("active")) ||
      books[0];

    opened.add(initial.dataset.book);
    updateProgress();

  })();


  /* =======================================================
     PROJECTS

     The published list lives in assets/data/projects.json,
     which the content manager at /admin writes to. The copy
     below is only a fallback for when that file can't be
     read, opening the page straight from disk, for example.
     ======================================================= */

  const PROJECTS = [
    { no: "001", title: "DiData Rebranding",   cat: "branding", meta: "Identity \u00b7 Health data platform", image: "didata.jpg",       year: "2023", link: "", size: "regular" },
    { no: "002", title: "Le Grand Cin\u00e9",   cat: "branding", meta: "Identity \u00b7 Cinema",              image: "grand-cine.jpg",  year: "2023", link: "", size: "regular" },
    { no: "003", title: "TourniPOS",           cat: "branding", meta: "Identity \u00b7 POS product",          image: "tournipos.jpg",   year: "2024", link: "", size: "regular" },
    { no: "004", title: "Golexy",              cat: "branding", meta: "Identity \u00b7 Language school",      image: "golexy.jpg",      year: "2024", link: "", size: "regular" },
    { no: "005", title: "Central Test Agency", cat: "branding", meta: "Identity \u00b7 QA agency",            image: "central-test.jpg",year: "2025", link: "", size: "regular" }
  ];

  /* Replaced by the published file once it loads. */
  let publishedProjects = PROJECTS;


  /* =======================================================
     MARKDOWN

     A small renderer for the write-ups authored in the CMS.
     Everything is escaped first, so nothing typed into the
     editor can inject markup into the page.
     ======================================================= */

  function renderMarkdown(text) {

    if (!text) return "";

    const escape = value => String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    /* Inline: images, links, bold, italic, code. */
    function inline(line) {

      return line
        .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
          (m, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy">`)
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
          (m, label, href) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

    }

    const lines = escape(text).replace(/\r\n/g, "\n").split("\n");
    const out = [];

    let listType = null;
    let paragraph = [];
    let tableRows = [];

    function flushTable() {

      if (!tableRows.length) return;

      const rows = tableRows.slice();
      const hasHeader = tableRows.hasHeader;

      let html = '<div class="table-scroll"><table>';

      rows.forEach((cells, i) => {

        const tag = hasHeader && i === 0 ? "th" : "td";
        const section = hasHeader && i === 0 ? "thead" : "tbody";

        if (i === 0) html += `<${section}>`;
        if (hasHeader && i === 1) html += "</thead><tbody>";

        html += "<tr>" + cells.map(c => `<${tag}>${inline(c)}</${tag}>`).join("") + "</tr>";

      });

      html += "</tbody></table></div>";

      out.push(html);
      tableRows = [];

    }

    function flushParagraph() {
      if (paragraph.length) {
        out.push(`<p>${inline(paragraph.join(" "))}</p>`);
        paragraph = [];
      }
    }

    function closeList() {
      if (listType) {
        out.push(listType === "ul" ? "</ul>" : "</ol>");
        listType = null;
      }
    }

    lines.forEach(raw => {

      const line = raw.trim();

      if (!line) {
        flushParagraph();
        closeList();
        flushTable();
        return;
      }

      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = heading[1].length + 1;   /* h1 is the page title */
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        return;
      }

      if (/^(-{3,}|\*{3,})$/.test(line)) {
        flushParagraph();
        closeList();
        out.push("<hr>");
        return;
      }

      if (/^&gt;\s?/.test(line)) {
        flushParagraph();
        closeList();
        out.push(`<blockquote>${inline(line.replace(/^&gt;\s?/, ""))}</blockquote>`);
        return;
      }

      /* Table: | a | b |  followed by | --- | --- | */
      if (line.startsWith("|") && line.endsWith("|")) {

        flushParagraph();
        closeList();

        const cells = row => row
          .slice(1, -1)
          .split("|")
          .map(c => c.trim());

        /* The |---|---| divider marks the row above as a header. */
        if (/^\|[\s|:-]+\|$/.test(line)) {
          tableRows.hasHeader = true;
        } else {
          tableRows.push(cells(line));
        }

        return;

      }

      flushTable();

      const bullet = line.match(/^[-*+]\s+(.*)$/);
      if (bullet) {
        flushParagraph();
        if (listType !== "ul") { closeList(); out.push("<ul>"); listType = "ul"; }
        out.push(`<li>${inline(bullet[1])}</li>`);
        return;
      }

      const numbered = line.match(/^\d+\.\s+(.*)$/);
      if (numbered) {
        flushParagraph();
        if (listType !== "ol") { closeList(); out.push("<ol>"); listType = "ol"; }
        out.push(`<li>${inline(numbered[1])}</li>`);
        return;
      }

      paragraph.push(line);

    });

    flushParagraph();
    closeList();
    flushTable();

    return out.join("\n");

  }


  /* =======================================================
     PORTFOLIO
     ======================================================= */

  const drawer = $("#caseDrawer");
  const caseStatus = $("#caseStatus");
  let currentFilter = "all";
  let currentSort = "date-desc";


  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  }


  function projectCard(project) {

    const inner = `
      <div class="case-thumb">
        ${project.image
          ? `<img src="assets/img/work/${escapeHtml(project.image)}" alt="${escapeHtml(project.title)} cover" loading="lazy">`
          : `<span class="thumb-empty">No cover yet</span>`}
      </div>
      <div class="case-body">
        <span class="case-tab">CASE NO. ${escapeHtml(project.no)}</span>
        <h3 class="case-title">${escapeHtml(project.title)}</h3>
        <span class="case-meta">${escapeHtml(project.meta)}</span>
        ${project.outcome
          ? `<p class="case-outcome">${escapeHtml(project.outcome)}</p>`
          : ""}
        <span class="case-year">${escapeHtml(project.year)}</span>
      </div>`;

    const size = project.size && project.size !== "regular"
      ? ` size-${escapeHtml(project.size)}`
      : "";

    const featured = project.featured ? " is-featured" : "";

    /* Every card opens its case study. */
    return `<button type="button" class="case-file${size}${featured}"
              data-cat="${escapeHtml(project.cat)}"
              data-open="${escapeHtml(project.no)}">${inner}</button>`;

  }


  const EMPTY_LABELS = {
    branding: "Branding",
    digital: "Digital & Print",
    product: "Product Design"
  };


  function renderProjects(list) {

    if (!drawer) return;

    const order = {
      branding: 0, product: 1, digital: 2
    };

    const sorters = {

      "date-desc": (a, b) =>
        String(b.date || b.year).localeCompare(String(a.date || a.year)),

      "date-asc": (a, b) =>
        String(a.date || a.year).localeCompare(String(b.date || b.year)),

      "name-asc": (a, b) =>
        a.title.localeCompare(b.title),

      "name-desc": (a, b) =>
        b.title.localeCompare(a.title),

      "type": (a, b) =>
        (order[a.cat] ?? 9) - (order[b.cat] ?? 9) ||
        a.title.localeCompare(b.title)

    };

    const shown = list
      .filter(p => currentFilter === "all" || p.cat === currentFilter)
      .slice()
      .sort((a, b) =>
        /* Featured work leads regardless of the chosen order. */
        (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
        (sorters[currentSort] || sorters["date-desc"])(a, b)
      );

    if (!shown.length) {

      const label = EMPTY_LABELS[currentFilter] || "These";

      drawer.innerHTML =
        `<p class="case-empty show">${escapeHtml(label)} files are still being catalogued.</p>`;

    } else {

      drawer.innerHTML = shown.map(projectCard).join("");

    }

    const label = shown.length
      ? `${shown.length} file${shown.length === 1 ? "" : "s"}`
      : "No files in this drawer yet";

    if (caseStatus) caseStatus.textContent = label;

    const count = $("#caseCount");
    if (count) count.textContent = label;

  }


  /* Local drafts win over the published list while they exist. */
  function activeProjects() {

    try {
      const saved = localStorage.getItem("yassmine.projects");
      if (saved) return JSON.parse(saved);
    } catch (error) {
      /* Storage can be unavailable; fall through to what's published. */
    }

    return publishedProjects;

  }


  /*
    Load whatever the content manager last published. Reading
    it at runtime means hitting Publish is enough, there is no
    build step to wait for.
  */
  async function loadPublishedProjects() {

    try {

      const response = await fetch("assets/data/projects.json", {
        cache: "no-cache"
      });

      if (!response.ok) return;

      const data = await response.json();
      const list = Array.isArray(data) ? data : data.projects;

      if (Array.isArray(list) && list.length) {
        publishedProjects = list;
        refreshPortfolio();
      }

    } catch (error) {

      /*
        Opening index.html straight from disk blocks fetch, and
        the site may be hosted without the file. The built-in
        list already rendered, so there is nothing to do.
      */

    }

  }


  function refreshPortfolio() {
    renderProjects(activeProjects());
  }


  (function initializeCaseFilters() {

    const tabs = $$(".divider-tab");

    if (!tabs.length) return;

    tabs.forEach(tab => {

      tab.addEventListener("click", () => {

        tabs.forEach(other => {
          const active = other === tab;
          other.classList.toggle("active", active);
          other.setAttribute("aria-selected", String(active));
        });

        currentFilter = tab.dataset.filter;
        refreshPortfolio();

      });

      tab.addEventListener("keydown", event => {

        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

        event.preventDefault();

        const index = tabs.indexOf(tab);
        const next =
          event.key === "ArrowRight"
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;

        tabs[next].focus();
        tabs[next].click();

      });

    });

    const sortControl = $("#caseSort");

    sortControl?.addEventListener("change", () => {
      currentSort = sortControl.value;
      refreshPortfolio();
    });

    refreshPortfolio();
    loadPublishedProjects();

  })();


  /* =======================================================
     TOOLS I USE

     Rendered from assets/data/tools.json so the board can
     be edited in the content manager without touching code.
     ======================================================= */

  (function initializeToolBoard() {

    const board = $("#toolBoard");

    if (!board) return;

    /* Colour the letter tile from the name, so it is stable per tool. */
    function tint(name) {

      let hash = 0;

      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }

      return `hsl(${Math.abs(hash) % 360} 42% 62%)`;

    }


    function render(columns) {

      board.innerHTML = columns.map(col => `
        <div class="tool-col">
          <h5 class="tool-col-name" data-col="${escapeHtml(col.name.toLowerCase())}">${escapeHtml(col.name)}</h5>
          <ul>
            ${col.tools.map(tool => `
              <li class="tool">
                ${tool.logo
                  ? `<img src="${escapeHtml(tool.logo)}" alt="">`
                  : `<span class="tool-mark" style="background:${tint(tool.name)}">${escapeHtml(tool.name.charAt(0))}</span>`}
                <span>${escapeHtml(tool.name)}</span>
              </li>`).join("")}
          </ul>
        </div>`).join("");

    }


    async function load() {

      try {

        const response = await fetch("assets/data/tools.json", { cache: "no-cache" });

        if (!response.ok) return;

        const data = await response.json();

        if (Array.isArray(data.columns)) render(data.columns);

      } catch (error) {

        /* Opening the page from disk blocks fetch; the board stays empty. */
        board.innerHTML = '<p class="tool-empty">Tool list unavailable offline.</p>';

      }

    }

    load();

  })();


  /* =======================================================
     BACKGROUND MUSIC

     Generated with the Web Audio API rather than an audio
     file: nothing to license, nothing to download, and it
     never loops audibly. A slow chord pad with a soft
     pulse, kept quiet enough to read over.
     ======================================================= */

  (function initializeAmbience() {

    const toggle = $("#volume");
    if (!toggle) return;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    let master = null;
    let music = null;
    let playing = false;

    /* Shared context, created on the first real click. */
    function audio() {
      if (!ctx && Ctx) {
        ctx = new Ctx();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
      }
      ctx?.resume?.();
      return ctx;
    }

    /* Short synthesised blips, so no extra files to load. */
    function blip({ freq = 1200, length = 0.03, type = "square", level = 0.05 }) {
      if (!playing || !audio()) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(level, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain);
      gain.connect(master);
      osc.start(at);
      osc.stop(at + length + 0.02);
    }

    /* A dry two-part tick, like a mechanical switch. */
    window.__uiClick = () => {
      blip({ freq: 1800, length: 0.018, type: "square", level: 0.05 });
      setTimeout(() => blip({ freq: 900, length: 0.03, type: "square", level: 0.035 }), 22);
    };

    /* Softer, higher, with slight variation so it doesn't drone. */
    window.__uiKey = () => {
      blip({
        freq: 1500 + Math.random() * 500,
        length: 0.014,
        type: "triangle",
        level: 0.03
      });
    };

    function start() {
      if (!audio()) return;

      if (!music) {
        music = new Audio("assets/audio/lofi-soul.mp3");
        music.loop = true;
        music.volume = 0.22;
        music.addEventListener("error", () => { music = null; });
      }

      music?.play?.().catch(() => {});
      playing = true;

      toggle.classList.remove("muted");
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", "Volume: on");
      toggle.title = "Volume: on";

      try { localStorage.setItem("yassmine.sound", "on"); } catch (e) {}
    }

    function stop() {
      music?.pause?.();
      playing = false;

      toggle.classList.add("muted");
      toggle.setAttribute("aria-pressed", "true");
      toggle.setAttribute("aria-label", "Volume: off");
      toggle.title = "Volume: off";

      try { localStorage.setItem("yassmine.sound", "off"); } catch (e) {}
    }

    toggle.addEventListener("click", () => playing ? stop() : start());

    /* Sound is off until asked for. Browsers block it otherwise,
       and arriving to unexpected audio is hostile. */
    stop();

    /* Clicks on real controls tick, once sound is on. */
    document.addEventListener("click", event => {
      if (!playing) return;
      if (event.target.closest("#volume")) return;
      if (event.target.closest("button, .book, .case-file, .divider-tab, a")) {
        window.__uiClick();
      }
    });

  })();


    function scheduleChord() {

      const at = ctx.currentTime + 0.05;
      const chord = chords[step % chords.length];

      chord.forEach((freq, i) => {
        /* Stagger the notes very slightly so it breathes. */
        voice(freq, at + i * 0.18, 7.2);
      });

      step++;

    }


    function start() {

      if (!ctx) {

        ctx = new (window.AudioContext || window.webkitAudioContext)();

        master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);

      }

      ctx.resume?.();

      /* Ease the volume up rather than starting at full. */
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 2.5);

      scheduleChord();
      timer = setInterval(scheduleChord, 6000);

      playing = true;
      toggle.setAttribute("aria-pressed", "true");
      toggle.setAttribute("aria-label", "Turn background music off");
      toggle.classList.add("on");

      try { localStorage.setItem("yassmine.sound", "on"); } catch (e) {}

    }


    function stop() {

      clearInterval(timer);
      timer = null;

      if (master && ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      }

      playing = false;
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", "Turn background music on");
      toggle.classList.remove("on");

      try { localStorage.setItem("yassmine.sound", "off"); } catch (e) {}

    }


    toggle.addEventListener("click", () => playing ? stop() : start());


    /*
      Never autoplay. Browsers block it, and arriving to
      unexpected sound is hostile. It stays off until asked,
      but the choice is remembered for the next visit and
      resumed on the first interaction.
    */
    let remembered = null;
    try { remembered = localStorage.getItem("yassmine.sound"); } catch (e) {}

    if (remembered === "on") {

      const resume = () => {
        start();
        document.removeEventListener("pointerdown", resume);
        document.removeEventListener("keydown", resume);
      };

      document.addEventListener("pointerdown", resume, { once: true });
      document.addEventListener("keydown", resume, { once: true });

    }

  })();


  /* =======================================================
     IMAGE VIEWER

     Work needs to be seen at size. Any image inside a case
     study opens full screen, with arrows through the set.
     ======================================================= */

  (function initializeLightbox() {

    const box = $("#lightbox");
    const image = $("#lightboxImage");
    const caption = $("#lightboxCaption");
    const counter = $("#lightboxCount");

    if (!box || !image) return;

    let set = [];
    let index = 0;
    let lastFocus = null;


    function show(i) {

      if (!set.length) return;

      index = (i + set.length) % set.length;

      const item = set[index];

      image.src = item.src;
      image.alt = item.alt || "";

      if (caption) {
        caption.textContent = item.caption || "";
        caption.hidden = !item.caption;
      }

      if (counter) {
        counter.textContent = set.length > 1
          ? `${index + 1} / ${set.length}`
          : "";
      }

    }


    function open(images, start) {

      set = images;
      lastFocus = document.activeElement;

      box.hidden = false;
      document.body.classList.add("lightbox-open");

      show(start);
      $("#lightboxClose")?.focus();

    }


    function close() {

      box.hidden = true;
      document.body.classList.remove("lightbox-open");
      image.src = "";

      /* Send focus back where it came from. */
      lastFocus?.focus?.();

    }


    /* Any image in a case study is zoomable. */
    document.addEventListener("click", event => {

      const target = event.target.closest(
        ".project-content img, .project-gallery img"
      );

      if (!target) return;

      const scope = target.closest(".project-content");
      if (!scope) return;

      const all = $$("img", scope).filter(img =>
        !img.closest(".project-nav")
      );

      const images = all.map(img => ({
        src: img.currentSrc || img.src,
        alt: img.alt,
        caption: img.closest("figure")?.querySelector("figcaption")?.textContent || ""
      }));

      open(images, all.indexOf(target));

    });


    $("#lightboxClose")?.addEventListener("click", close);
    $("#lightboxPrev")?.addEventListener("click", () => show(index - 1));
    $("#lightboxNext")?.addEventListener("click", () => show(index + 1));

    /* Clicking the backdrop closes; clicking the image does not. */
    box.addEventListener("click", event => {
      if (event.target === box) close();
    });

    document.addEventListener("keydown", event => {

      if (box.hidden) return;

      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") show(index - 1);
      if (event.key === "ArrowRight") show(index + 1);

    });

  })();


  /* =======================================================
     CASE STUDY
     ======================================================= */

  (function initializeProjectViewer() {

    const win = $("#projectPopup");
    const body = $("#projectBody");
    const chrome = $("#projectChrome");
    const status = $("#projectStatus");

    if (!win || !body || !drawer) return;

    /* A stable name for the address bar, so a project can be linked to. */
    function slugFor(project) {

      if (project.slug) return project.slug;

      return String(project.title || project.no)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    }

    function findBySlug(slug) {
      return activeProjects().find(p => slugFor(p) === slug);
    }


    function factRow(label, value) {

      return value
        ? `<div class="fact"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
        : "";

    }


    function neighbours(project) {

      const list = activeProjects()
        .slice()
        .sort((a, b) =>
          (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
          String(a.no).localeCompare(String(b.no))
        );

      const index = list.findIndex(p => p.no === project.no);

      return {
        prev: index > 0 ? list[index - 1] : null,
        next: index >= 0 && index < list.length - 1 ? list[index + 1] : null
      };

    }


    function openProject(project, options = {}) {

      const facts = [
        factRow("Client", project.client),
        factRow("Role", project.role),
        factRow("Services", project.services),
        factRow("Year", project.year)
      ].join("");

      const { prev, next } = neighbours(project);

      const cols = project.galleryColumns || "2";

      const gallery = Array.isArray(project.gallery) && project.gallery.length
        ? `<div class="project-gallery" data-cols="${escapeHtml(cols)}">` +
          project.gallery.map(item => `
            <figure>
              <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.caption || project.title)}" loading="lazy">
              ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ""}
            </figure>`).join("") + `</div>`
        : "";

      /* Downloadable extras: a case study PDF, a brand sheet, whatever. */
      const files = Array.isArray(project.files) && project.files.length
        ? `<div class="project-files">
             <h3>Downloads</h3>
             <ul>` + project.files.map(f => `
               <li><a href="${escapeHtml(f.file)}" download>${escapeHtml(f.label || "Download")}</a></li>`
             ).join("") + `</ul>
           </div>`
        : "";

      body.innerHTML = `
        ${project.image
          ? `<div class="project-cover"><img src="assets/img/work/${escapeHtml(project.image)}" alt="${escapeHtml(project.title)} cover"></div>`
          : ""}

        <div class="project-inner">

          <span class="case-label">CASE NO. ${escapeHtml(project.no)}</span>
          <h1 class="project-title">${escapeHtml(project.title)}</h1>
          ${project.summary ? `<p class="project-summary">${escapeHtml(project.summary)}</p>` : ""}

          ${facts ? `<dl class="project-facts">${facts}</dl>` : ""}

          <div class="project-write-up">${renderMarkdown(project.body)}</div>

          ${gallery}

          ${files}

          ${project.link
            ? `<p class="project-link"><a class="xp-button primary" href="${escapeHtml(project.link)}" target="_blank" rel="noopener">Visit the live project</a></p>`
            : ""}

          <nav class="project-nav">
            ${prev
              ? `<button type="button" class="xp-button" data-goto="${escapeHtml(slugFor(prev))}">&lt; ${escapeHtml(prev.title)}</button>`
              : `<button type="button" class="xp-button" disabled>&lt; Start of drawer</button>`}
            <button type="button" class="xp-button" data-close-project>All projects</button>
            ${next
              ? `<button type="button" class="xp-button" data-goto="${escapeHtml(slugFor(next))}">${escapeHtml(next.title)} &gt;</button>`
              : `<button type="button" class="xp-button" disabled>End of drawer &gt;</button>`}
          </nav>

        </div>`;

      if (chrome) chrome.textContent = project.title;
      win.dataset.title = project.title;

      if (status) {
        status.textContent =
          `${EMPTY_LABELS[project.cat] || project.cat} · Case no. ${project.no}`;
      }

      openWindow(win);
      body.scrollTop = 0;
      body.focus({ preventScroll: true });

      /* Put the project in the address bar unless we came from it. */
      if (!options.fromHash) {

        const target = `#/project/${slugFor(project)}`;

        if (location.hash !== target) {
          history.pushState(null, "", target);
        }

      }

      document.title = `${project.title}, Ouaras Yassmine`;

    }


    drawer.addEventListener("click", event => {

      const card = event.target.closest("[data-open]");
      if (!card) return;

      const project = activeProjects()
        .find(p => p.no === card.dataset.open);

      if (project) openProject(project);

    });


    body.addEventListener("click", event => {

      if (event.target.closest("[data-close-project]")) {
        closeWindow(win);
        clearProjectHash();
        return;
      }

      const goto = event.target.closest("[data-goto]");

      if (goto) {
        const project = findBySlug(goto.dataset.goto);
        if (project) openProject(project);
      }

    });


    function clearProjectHash() {

      if (location.hash.startsWith("#/project/")) {
        history.pushState(null, "", location.pathname + location.search);
      }

      document.title = "Ouaras Yassmine, Product Designer";

    }


    /* Closing the window by any route drops the project from the address. */
    $(".close-popup", win)?.addEventListener("click", clearProjectHash);


    /*
      Open whatever the address asks for. This is what makes a project
      linkable: paste the address anywhere and it opens on that case.
    */
    function openFromHash() {

      const match = location.hash.match(/^#\/project\/([\w-]+)$/);

      if (!match) {

        if (win.classList.contains("active")) {
          closeWindow(win);
          document.title = "Ouaras Yassmine, Product Designer";
        }

        return;

      }

      const project = findBySlug(match[1]);

      if (project) {
        openProject(project, { fromHash: true });
      }

    }

    window.addEventListener("hashchange", openFromHash);
    window.addEventListener("popstate", openFromHash);

    /*
      The published list arrives after this runs, so try once now and
      again shortly after in case the address names a project that is
      only in the published file.
    */
    openFromHash();
    setTimeout(openFromHash, 400);

  })();


  /* =======================================================
     PROJECT MANAGER

     The passphrase is a latch, not a lock: it lives in the
     page source, so it only deters casual clicking. Real
     protection would need a server. Edits are kept in this
     browser until exported back into the PROJECTS array.
     ======================================================= */

  (function initializeAdmin() {

    const STORE_KEY = "yassmine.projects";
    const UNLOCK_KEY = "yassmine.admin";
    const PASSPHRASE = "yuki";

    const gate = $("#adminGate");
    const panel = $("#adminPanel");
    const passInput = $("#adminPass");
    const unlockButton = $("#adminUnlock");
    const gateNote = $("#gateNote");
    const adminStatus = $("#adminStatus");

    if (!gate || !panel) return;

    const fields = {
      title: $("#pTitle"),
      cat: $("#pCat"),
      year: $("#pYear"),
      meta: $("#pMeta"),
      image: $("#pImage"),
      link: $("#pLink"),
      size: $("#pSize")
    };

    const stage = $("#previewStage");
    const listEl = $("#adminList");
    const countEl = $("#adminCount");
    const exportBox = $("#adminExport");
    const exportNote = $("#exportNote");
    const heading = $("#editorHeading");
    const saveButton = $("#pSave");

    let working = activeProjects().map(p => ({ ...p }));
    let editingIndex = -1;


    function persist() {

      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(working));
      } catch (error) {
        setExportNote("Couldn't save locally, export before closing.", true);
      }

      refreshPortfolio();

    }


    function setExportNote(message, bad) {
      if (!exportNote) return;
      exportNote.textContent = message;
      exportNote.classList.toggle("bad", Boolean(bad));
    }


    /* ---------- Preview ---------- */

    function draft() {

      return {
        no: String(
          editingIndex >= 0
            ? working[editingIndex].no
            : working.length + 1
        ).padStart(3, "0"),
        title: fields.title.value.trim() || "Untitled project",
        cat: fields.cat.value,
        meta: fields.meta.value.trim() || "Discipline \u00b7 Client",
        image: fields.image.value.trim(),
        year: fields.year.value.trim(),
        link: fields.link.value.trim(),
        size: fields.size.value
      };

    }

    function drawPreview() {
      if (stage) stage.innerHTML = projectCard(draft());
    }

    Object.values(fields).forEach(field =>
      field?.addEventListener("input", drawPreview)
    );


    /* ---------- List ---------- */

    function renderList() {

      if (!listEl) return;

      if (!working.length) {
        listEl.innerHTML = '<li class="admin-empty">Nothing filed yet.</li>';
      } else {

        listEl.innerHTML = working.map((p, i) => `
          <li class="admin-item">
            <span class="admin-item-no">${escapeHtml(p.no)}</span>
            <span class="admin-item-title">${escapeHtml(p.title)}</span>
            <span class="admin-item-cat">${escapeHtml(EMPTY_LABELS[p.cat] || p.cat)}</span>
            <span class="admin-item-tools">
              <button type="button" class="xp-button small" data-up="${i}" aria-label="Move up">&#9650;</button>
              <button type="button" class="xp-button small" data-down="${i}" aria-label="Move down">&#9660;</button>
              <button type="button" class="xp-button small" data-edit="${i}">Edit</button>
              <button type="button" class="xp-button small" data-del="${i}">Delete</button>
            </span>
          </li>`).join("");

      }

      if (countEl) countEl.textContent = working.length;

      updateExport();

    }


    function updateExport() {

      if (!exportBox) return;

      const rows = working.map(p =>
        "    " + JSON.stringify({
          no: p.no, title: p.title, cat: p.cat, meta: p.meta,
          image: p.image, year: p.year, link: p.link || "", size: p.size || "regular"
        })
      ).join(",\n");

      exportBox.value =
        "const PROJECTS = [\n" + rows + "\n  ];";

    }


    /* ---------- Editing ---------- */

    function resetEditor() {

      editingIndex = -1;
      Object.values(fields).forEach(field => {
        if (field.tagName === "SELECT") field.selectedIndex = 0;
        else field.value = "";
      });
      if (heading) heading.textContent = "Add a project";
      if (saveButton) saveButton.textContent = "Add project";
      drawPreview();

    }


    saveButton?.addEventListener("click", () => {

      const entry = draft();

      if (!fields.title.value.trim()) {
        setExportNote("Give the project a title first.", true);
        fields.title.focus();
        return;
      }

      if (editingIndex >= 0) {
        working[editingIndex] = entry;
      } else {
        working.push(entry);
      }

      persist();
      renderList();
      resetEditor();
      setExportNote("Saved locally. Copy the code below to publish it.");

    });


    $("#pClear")?.addEventListener("click", resetEditor);


    listEl?.addEventListener("click", event => {

      const button = event.target.closest("button");
      if (!button) return;

      const { up, down, edit, del } = button.dataset;

      if (edit !== undefined) {

        editingIndex = Number(edit);
        const p = working[editingIndex];

        fields.title.value = p.title;
        fields.cat.value = p.cat;
        fields.year.value = p.year || "";
        fields.meta.value = p.meta || "";
        fields.image.value = p.image || "";
        fields.link.value = p.link || "";
        fields.size.value = p.size || "regular";

        if (heading) heading.textContent = `Editing ${p.title}`;
        if (saveButton) saveButton.textContent = "Save changes";

        drawPreview();
        return;

      }

      if (del !== undefined) {

        const i = Number(del);

        if (!confirm(`Delete "${working[i].title}"?`)) return;

        working.splice(i, 1);
        persist();
        renderList();
        resetEditor();
        return;

      }

      /* Reordering decides the order they appear in the drawer. */
      if (up !== undefined || down !== undefined) {

        const i = Number(up ?? down);
        const j = up !== undefined ? i - 1 : i + 1;

        if (j < 0 || j >= working.length) return;

        [working[i], working[j]] = [working[j], working[i]];

        persist();
        renderList();

      }

    });


    /* ---------- Publish ---------- */

    $("#adminCopy")?.addEventListener("click", async () => {

      try {
        await navigator.clipboard.writeText(exportBox.value);
        setExportNote("Copied. Paste it over the PROJECTS array in main.js.");
      } catch (error) {
        exportBox.select();
        setExportNote("Press Ctrl/Cmd+C to copy the selected code.");
      }

    });


    $("#adminDownload")?.addEventListener("click", () => {

      const blob = new Blob([exportBox.value], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "projects-snippet.txt";
      link.click();

      URL.revokeObjectURL(url);
      setExportNote("Downloaded. Paste it over the PROJECTS array in main.js.");

    });


    $("#adminReset")?.addEventListener("click", () => {

      if (!confirm("Discard local changes and reload the published projects?")) return;

      try { localStorage.removeItem(STORE_KEY); } catch (error) {}

      working = PROJECTS.map(p => ({ ...p }));
      persist();
      renderList();
      resetEditor();
      setExportNote("Back to the published list.");

    });


    /* ---------- Gate ---------- */

    function unlock() {

      gate.hidden = true;
      panel.hidden = false;
      if (adminStatus) adminStatus.textContent = "Unlocked \u00b7 changes are local until exported";

      renderList();
      resetEditor();

    }

    unlockButton?.addEventListener("click", () => {

      if (passInput.value === PASSPHRASE) {
        try { sessionStorage.setItem(UNLOCK_KEY, "1"); } catch (error) {}
        unlock();
        return;
      }

      if (gateNote) gateNote.textContent = "That's not it.";
      passInput.value = "";
      passInput.focus();

    });

    passInput?.addEventListener("keydown", event => {
      if (event.key === "Enter") unlockButton?.click();
    });

    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === "1") unlock();
    } catch (error) {}


    /* Opened with #admin in the address bar. */
    function openIfRequested() {

      if (location.hash.toLowerCase() !== "#admin") return;

      const win = $("#adminPopup");
      if (win) openWindow(win);

    }

    window.addEventListener("hashchange", openIfRequested);
    openIfRequested();

  })();


  /* =======================================================
     ALL PROGRAMS
     ======================================================= */

  (function initializeAllPrograms() {

    const trigger = $("#allProgramsButton");
    const flyout = $("#allPrograms");
    const studioTrigger = $("#studioSubButton");
    const studioSub = $("#studioSub");

    if (!trigger || !flyout) return;


    /*
      Anchor a panel beside the element that opened it: sitting
      just to its right, with their bottom edges level. Falls to
      the left if there isn't room on the right.
    */
    function placeBeside(panel, anchorEl, gap) {

      const box = anchorEl.getBoundingClientRect();

      /* Measure before deciding, so offsetWidth is real. */
      panel.style.visibility = "hidden";
      panel.classList.add("open");

      const width = panel.offsetWidth;
      const height = panel.offsetHeight;

      let left = box.right + gap;

      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, box.left - width - gap);
      }

      /* Line the bottom up with the trigger, but keep it on screen. */
      let bottom = window.innerHeight - box.bottom;

      if (bottom + height > window.innerHeight - 8) {
        bottom = Math.max(8, window.innerHeight - height - 8);
      }

      panel.style.left = `${left}px`;
      panel.style.bottom = `${bottom}px`;
      panel.style.visibility = "";

    }


    function closeStudioSub() {

      studioSub?.classList.remove("open");
      studioTrigger?.setAttribute("aria-expanded", "false");

    }

    function closeAll() {

      closeStudioSub();
      flyout.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");

    }


    trigger.addEventListener("click", event => {

      event.preventDefault();
      event.stopPropagation();

      if (flyout.classList.contains("open")) {
        closeAll();
        return;
      }

      placeBeside(flyout, trigger, 2);
      trigger.setAttribute("aria-expanded", "true");

    });


    /* Studio opens its own panel rather than the window. */
    studioTrigger?.addEventListener("click", event => {

      event.preventDefault();
      event.stopPropagation();

      if (!studioSub) return;

      if (studioSub.classList.contains("open")) {
        closeStudioSub();
        return;
      }

      placeBeside(studioSub, studioTrigger, 2);
      studioTrigger.setAttribute("aria-expanded", "true");

    });


    /* Opening a program closes everything behind it. */
    $$("[data-target]", flyout).forEach(button => {
      button.addEventListener("click", closeAll);
    });


    /*
      A Studio tool opens the Studio, then selects its tab by
      clicking it, reusing the tab logic rather than copying it.
    */
    $$("[data-yuki-open]", studioSub || document).forEach(button => {

      button.addEventListener("click", () => {

        const studio = $("#hobbiesPopup");

        if (studio) openWindow(studio);

        $(`.yuki-tool[data-yuki-tab="${button.dataset.yukiOpen}"]`)?.click();

        closeAll();

      });

    });


    /* Click away or press Escape to dismiss. */
    document.addEventListener("click", event => {

      if (!flyout.classList.contains("open")) return;

      if (
        flyout.contains(event.target) ||
        studioSub?.contains(event.target) ||
        trigger.contains(event.target)
      ) {
        return;
      }

      closeAll();

    });

    document.addEventListener("keydown", event => {

      if (event.key !== "Escape") return;

      /* Escape steps back one level at a time. */
      if (studioSub?.classList.contains("open")) {
        closeStudioSub();
        studioTrigger?.focus();
        return;
      }

      if (flyout.classList.contains("open")) {
        closeAll();
        trigger.focus();
      }

    });


    /* The menus belong to the Start menu, so they go when it does. */
    const menuPanel = $("#menuPopup");

    if (menuPanel) {

      new MutationObserver(() => {
        if (!menuPanel.classList.contains("active")) closeAll();
      }).observe(menuPanel, {
        attributes: true,
        attributeFilter: ["class"]
      });

    }

  })();


  /* =======================================================
     START MENU
     ======================================================= */

  const menuPopup = $("#menuPopup");
  const startButton = $("#startButton");

  function openStartMenu() {

    if (!menuPopup) return;

    highestZ++;
    menuPopup.style.zIndex = highestZ;
    menuPopup.classList.add("active");

    /*
      Start is shell UI, not an application window.
      It must never steal the active task button state.
    */
    const previouslyActive =
      activeWindow;

    menuPopup.dataset.previousWindow =
      previouslyActive?.id || "";

    startButton?.classList.add("active");
    startButton?.setAttribute("aria-expanded", "true");

  }

  function closeStartMenu() {

    if (!menuPopup) return;

    menuPopup.classList.remove("active");

    const previousId =
      menuPopup.dataset.previousWindow;

    menuPopup.dataset.previousWindow = "";

    if (previousId) {

      const previous =
        document.getElementById(previousId);

      if (
        previous &&
        previous.classList.contains("active")
      ) {
        bringToFront(previous);
      }

    }

    startButton?.classList.remove("active");
    startButton?.setAttribute("aria-expanded", "false");

  }

  function toggleStartMenu() {

    if (menuPopup?.classList.contains("active")) {
      closeStartMenu();
    } else {
      openStartMenu();
    }

  }

  if (menuPopup && startButton) {

    /* Clicking Start opens/closes the menu, like a real taskbar */

    startButton.addEventListener("click", event => {

      event.preventDefault();
      event.stopPropagation();

      toggleStartMenu();

    });

    /*
      Close the start menu when another
      application opens.
    */

    $$(".open-popup").forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const target =
              button.dataset.target;

            if (
              target &&
              target !== "menuPopup"
            ) {

              closeStartMenu();

            }

          }
        );

      }
    );

    /*
      Close the start menu when clicking
      anywhere outside of it (or the Start button).
    */

    document.addEventListener("click", event => {

      if (!menuPopup.classList.contains("active")) return;

      if (
        menuPopup.contains(event.target) ||
        startButton.contains(event.target)
      ) {
        return;
      }

      closeStartMenu();

    });

  }


  /* =======================================================
     KEEP WINDOWS ON SCREEN WHEN THE VIEWPORT CHANGES
     ======================================================= */

  let resizeTimer = null;

  window.addEventListener("resize", () => {

    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {

      $$(".popup-window.active").forEach(
        fitWindowToViewport
      );

    }, 120);

  });


  /* =======================================================
     ON ARRIVAL

     The work is the point, so the drawer opens straight away
     rather than waiting behind a desktop icon.
     ======================================================= */

  (function openPortfolioOnArrival() {

    /* A shared project link takes precedence over the drawer. */
    if (location.hash.startsWith("#/project/")) return;
    if (location.hash.toLowerCase() === "#admin") return;

    const portfolio = $("#portfolioPopup");

    if (!portfolio) return;

    /* Let the first paint finish before the window animates in. */
    /* Opening on arrival is off; the drawer waits behind its icon. */
    void portfolio;

  })();


  /* =======================================================
     INITIAL WINDOW STATE
     ======================================================= */

  $$(".popup-window").forEach(
    win => {

      win.classList.remove(
        "active"
      );

    }
  );


  /*
    If Yuki Studio is already visible for
    any reason, initialise it.
  */

  if (
    $("#hobbiesPopup")?.classList.contains(
      "active"
    )
  ) {

    initializeYukiStudio();

  }


  /* =======================================================
     GLOBAL ESCAPE
     ======================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Escape") return;

      /*
        Don't close the game while the
        user is playing.
      */

      if (
        yukiRunner.started &&
        document.activeElement ===
        yukiRunner.game
      ) {

        return;

      }

      if (menuPopup?.classList.contains("active")) {

        closeStartMenu();
        return;

      }


      const visibleWindows =
        $$(".popup-window.active")
          .sort(
            (a, b) =>
              Number(
                b.style.zIndex || 0
              ) -
              Number(
                a.style.zIndex || 0
              )
          );


      const top =
        visibleWindows[0];

      if (top) {

        closeWindow(top);

      }

    }
  );


});


/* =========================================================
   XP SILVER SHELL SAFETY
   ========================================================= */
(function () {
  function cleanTaskbarShell() {
    document.querySelectorAll(
      '.tray-toggle, .tray-arrow, .notify-toggle, .taskbar-tray-toggle, #tray-toggle, #notify-toggle'
    ).forEach(el => el.remove());

    document.querySelectorAll('.taskbar-divider').forEach(el => el.remove());

    const clock = document.querySelector('#taskbarClock');
    const time = document.querySelector('#time');
    const volume = document.querySelector('#volume');

    [clock, time, volume].forEach(el => {
      if (!el) return;
      el.hidden = false;
      el.removeAttribute('aria-hidden');
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cleanTaskbarShell);
  } else {
    cleanTaskbarShell();
  }
})();
