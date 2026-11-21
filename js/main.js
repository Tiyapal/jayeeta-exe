
const welcomeScreen = document.getElementById("welcome-screen");
const desktop = document.getElementById("desktop");
const enterButton = document.getElementById("enter-button");

const icons = document.querySelectorAll(".desktop-icon");
const windows = document.querySelectorAll(".content-window");

const taskbar = document.getElementById("open-windows");
const startButton = document.getElementById("start-button");

let openWindows = [];
let minimizedWindows = new Set();
let activeWindow = null;
let highestZIndex = 20;

/* ENTER DESKTOP */

enterButton.addEventListener("click", () => {
    welcomeScreen.style.display = "none";
    desktop.style.display = "block";
});

/* WINDOW HELPERS */

function getVisibleWindows() {
    return openWindows.filter(id => !minimizedWindows.has(id));
}

function resetWindowPosition(win) {
    win.style.removeProperty("left");
    win.style.removeProperty("top");
    win.style.removeProperty("transform");
    win.style.removeProperty("--offset-x");
    win.style.removeProperty("--offset-y");
    delete win.dataset.normalPosition;
}

function saveWindowPosition(win) {
    const rect = win.getBoundingClientRect();

    win.dataset.normalPosition = JSON.stringify({
        left: win.style.left,
        top: win.style.top,
        transform: win.style.transform,
        offsetX: win.style.getPropertyValue("--offset-x"),
        offsetY: win.style.getPropertyValue("--offset-y"),
        rectLeft: rect.left,
        rectTop: rect.top
    });
}

function restoreWindowPosition(win) {
    if (!win.dataset.normalPosition) {
        resetWindowPosition(win);
        return;
    }

    const saved = JSON.parse(win.dataset.normalPosition);

    win.style.left = saved.left;
    win.style.top = saved.top;
    win.style.transform = saved.transform;

    if (saved.offsetX) {
        win.style.setProperty("--offset-x", saved.offsetX);
    } else {
        win.style.removeProperty("--offset-x");
    }

    if (saved.offsetY) {
        win.style.setProperty("--offset-y", saved.offsetY);
    } else {
        win.style.removeProperty("--offset-y");
    }

    delete win.dataset.normalPosition;
}

/* ARRANGE WINDOWS */

function arrangeWindows() {
    const visible = getVisibleWindows();

    openWindows.forEach(id => {
        const win = document.getElementById(id);

        if (!win) return;

        if (minimizedWindows.has(id)) {
            win.style.display = "none";
            win.classList.remove("active");
            return;
        }

        win.style.display = "block";

        if (!win.classList.contains("maximized")) {
            const position = visible.indexOf(id);

            if (visible.length === 2) {
                win.style.setProperty(
                    "--offset-x",
                    position === 0 ? "-35px" : "35px"
                );

                win.style.setProperty(
                    "--offset-y",
                    position === 0 ? "-25px" : "25px"
                );
            } else {
                win.style.setProperty("--offset-x", "0px");
                win.style.setProperty("--offset-y", "0px");
            }
        }

        win.classList.toggle("active", id === activeWindow);

        if (id === activeWindow) {
            highestZIndex++;
            win.style.zIndex = highestZIndex;
        }
    });

    renderTaskbar();
}

/* OPEN WINDOW */

function openWindow(id) {
    const win = document.getElementById(id);

    if (!win) return;

    if (openWindows.includes(id)) {
        minimizedWindows.delete(id);

        openWindows = openWindows.filter(item => item !== id);
        openWindows.push(id);

        activeWindow = id;
        arrangeWindows();
        return;
    }

    // Keep at most two windows in the taskbar.

    if (openWindows.length >= 2) {
        const oldest = openWindows.shift();
        const oldWindow = document.getElementById(oldest);

        if (oldWindow) {
            oldWindow.style.display = "none";
            oldWindow.classList.remove("maximized", "active");
            resetWindowPosition(oldWindow);

            const oldButton = oldWindow.querySelector(".maximize-window");
            if (oldButton) oldButton.textContent = "□";
        }

        minimizedWindows.delete(oldest);
    }

    resetWindowPosition(win);
    win.classList.remove("maximized");

    const maxButton = win.querySelector(".maximize-window");
    if (maxButton) maxButton.textContent = "□";

    openWindows.push(id);
    minimizedWindows.delete(id);
    activeWindow = id;

    arrangeWindows();
}

/* CLOSE WINDOW */

function closeWindow(id) {
    const win = document.getElementById(id);

    if (!win) return;

    openWindows = openWindows.filter(item => item !== id);
    minimizedWindows.delete(id);

    win.style.display = "none";
    win.classList.remove("maximized", "active");
    resetWindowPosition(win);

    const maxButton = win.querySelector(".maximize-window");
    if (maxButton) maxButton.textContent = "□";

    const visible = getVisibleWindows();

    activeWindow = visible.length
        ? visible[visible.length - 1]
        : null;

    arrangeWindows();
}

/* MINIMIZE WINDOW */

function minimizeWindow(id) {
    if (!openWindows.includes(id)) return;

    minimizedWindows.add(id);

    const visible = getVisibleWindows();

    activeWindow = visible.length
        ? visible[visible.length - 1]
        : null;

    arrangeWindows();
}

/* MAXIMIZE AND RESTORE */

function toggleMaximize(id) {
    const win = document.getElementById(id);

    if (!win) return;

    const button = win.querySelector(".maximize-window");

    if (win.classList.contains("maximized")) {
        win.classList.remove("maximized");
        restoreWindowPosition(win);

        if (button) button.textContent = "□";
    } else {
        saveWindowPosition(win);
        win.classList.add("maximized");

        if (button) button.textContent = "❐";
    }

    activeWindow = id;
    highestZIndex++;
    win.style.zIndex = highestZIndex;

    windows.forEach(item => {
        item.classList.toggle("active", item.id === activeWindow);
    });

    renderTaskbar();
}

/* DESKTOP ICONS */

icons.forEach(icon => {
    icon.addEventListener("click", () => {
        openWindow(icon.dataset.window);
    });
});

/* WINDOW CONTROLS */

windows.forEach(win => {
    const closeButton = win.querySelector(".close-window");
    const minimizeButton = win.querySelector(".minimize-window");
    const maximizeButton = win.querySelector(".maximize-window");

    closeButton?.addEventListener("click", event => {
        event.stopPropagation();
        closeWindow(win.id);
    });

    minimizeButton?.addEventListener("click", event => {
        event.stopPropagation();
        minimizeWindow(win.id);
    });

    maximizeButton?.addEventListener("click", event => {
        event.stopPropagation();
        toggleMaximize(win.id);
    });
});

/* BRING WINDOW TO FRONT */

windows.forEach(win => {
    win.addEventListener("pointerdown", () => {
        if (!openWindows.includes(win.id)) return;
        if (minimizedWindows.has(win.id)) return;

        openWindows = openWindows.filter(id => id !== win.id);
        openWindows.push(win.id);

        activeWindow = win.id;
        highestZIndex++;

        win.style.zIndex = highestZIndex;

        windows.forEach(item => {
            item.classList.toggle("active", item.id === activeWindow);
        });

        renderTaskbar();
    });
});

/* DRAG WINDOWS */

windows.forEach(win => {
    const header = win.querySelector(".window-header");

    if (!header) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originalLeft = 0;
    let originalTop = 0;
    let pointerId = null;

    header.addEventListener("pointerdown", event => {
        if (event.target.closest(".window-controls")) return;
        if (win.classList.contains("maximized")) return;
        if (!openWindows.includes(win.id)) return;
        if (minimizedWindows.has(win.id)) return;
        if (window.matchMedia("(max-width: 700px)").matches) return;

        const rect = win.getBoundingClientRect();

        dragging = true;
        pointerId = event.pointerId;

        startX = event.clientX;
        startY = event.clientY;

        originalLeft = rect.left;
        originalTop = rect.top;

        win.style.transform = "none";
        win.style.left = rect.left + "px";
        win.style.top = rect.top + "px";

        header.setPointerCapture(pointerId);
        event.preventDefault();
    });

    header.addEventListener("pointermove", event => {
        if (!dragging || event.pointerId !== pointerId) return;

        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;

        const maxLeft = window.innerWidth - win.offsetWidth;
        const maxTop = window.innerHeight - win.offsetHeight - 70;

        const newLeft = Math.max(
            0,
            Math.min(maxLeft, originalLeft + deltaX)
        );

        const newTop = Math.max(
            0,
            Math.min(maxTop, originalTop + deltaY)
        );

        win.style.left = newLeft + "px";
        win.style.top = newTop + "px";
    });

    function stopDragging(event) {
        if (event.pointerId !== pointerId) return;

        dragging = false;
        pointerId = null;
    }

    header.addEventListener("pointerup", stopDragging);
    header.addEventListener("pointercancel", stopDragging);
});

/* TASKBAR */

function renderTaskbar() {
    taskbar.innerHTML = "";

    openWindows.forEach(id => {
        const button = document.createElement("button");
        const desktopIcon = document.querySelector(
            `[data-window="${id}"]`
        );

        const label = desktopIcon
            ? desktopIcon.innerText.trim().replace(/\s+/g, " ")
            : id;

        button.className = "task-window-button";
        button.textContent = "♡ " + label;

        button.classList.toggle("selected", id === activeWindow);
        button.classList.toggle("minimized", minimizedWindows.has(id));

        button.addEventListener("click", () => {
            if (activeWindow === id && !minimizedWindows.has(id)) {
                minimizeWindow(id);
            } else {
                openWindow(id);
            }
        });

        taskbar.appendChild(button);
    });
}

/* START BUTTON */

startButton.addEventListener("click", () => {
    [...openWindows].forEach(id => closeWindow(id));
});

/* DIGITAL CLOCK */

function updateClock() {
    const clock = document.getElementById("clock");

    clock.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

updateClock();
setInterval(updateClock, 1000);

