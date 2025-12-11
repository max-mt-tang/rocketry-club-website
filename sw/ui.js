/**
 * ================================================================================
 * SWIM TRACKER - UI MODULE
 * ================================================================================
 * 
 * User interface components including tabs, dropdowns, selects, and navigation.
 * Handles all UI interactions and routing.
 */

// ================================================================================
// NAVIGATION AND ROUTING
// ================================================================================

function go(action, value) {
    console.log("go called with:", action, value);
    console.log("Checking if window." + action + " exists:", typeof window[action]);
    window.location.hash = "#" + action + "/" + encodeURIComponent(value);
}

window.addEventListener("hashchange", loadContent);
window.addEventListener("load", loadContent);

async function loadContent() {
    await checkVersion();
    _backgroundActions.length = 0;

    let hash = window.location.hash.substring(1);
    if (!hash) {
        // Show welcome message when no hash is present - user can search for a swimmer
        if (typeof window.updateContent === 'function') {
            window.updateContent("<div style='text-align: center; padding: 40px;'><h2>Welcome to Swim Tracker</h2><p>Use the search box above to find a swimmer, or click one of the quick access buttons.</p></div>");
        } else {
            const contentEl = document.getElementById("content");
            if (contentEl) {
                contentEl.innerHTML = "<div style='text-align: center; padding: 40px;'><h2>Welcome to Swim Tracker</h2><p>Use the search box above to find a swimmer, or click one of the quick access buttons.</p></div>";
            }
        }
        return;
    }

    // Ensure updateContent is available (it's defined in common-utils.js)
    if (typeof window.updateContent === 'function') {
        window.updateContent("Loading....");
    } else {
        console.error('updateContent function not available - common-utils.js may not be loaded');
        document.getElementById("content").innerHTML = "Loading....";
    }

    let [action, value] = hash.split("/");
    value = decodeURIComponent(value);

    console.log("loadContent: action =", action, "value =", value);

    let func = window[action];
    console.log("loadContent: window." + action + " =", typeof func);

    if (func) {
        console.log("Calling", action, "function with value:", value);
        await func(value);
        // Update button states if this is a swimmer action
        if (action === "swimmer") {
            updateButtonStates(value);
        }
    } else {
        console.error("Function not found for action:", action);
        window.location.replace("");
    }
}

// ================================================================================
// BACKGROUND TASK RUNNER
// ================================================================================

const _backgroundActions = [];
async function backgroundRunner() {
    while (true) {
        if (_backgroundActions.length > 0) {
            let [action, value] = _backgroundActions.shift();
            try {
                await action(value);
            } catch (e) {
                console.error(e);
            }
        } else {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
}
for (let i = 0; i < 1; i++) {
    backgroundRunner().catch(console.error);
}

// ================================================================================
// TAB VIEW COMPONENT
// ================================================================================

class TabView {
    #id;
    #tabs;
    #views;
    constructor(id) {
        this.#id = id;
        this.#tabs = [];
        this.#views = [];
    }

    addTab(name, view) {
        this.#tabs.push(name);
        this.#views.push(view);
    }

    render() {
        let html = [];

        html.push(`<div class="tabview" id="${this.#id}">`);

        html.push('<div class="tabs">');
        for (let i = 0; i < this.#tabs.length; ++i) {
            html.push(
                `<div class="tab${i == 0 ? " selected" : ""}" onclick="TabView.tab('${this.#id}', ${i})">${this.#tabs[i]}</div>`,
            );
        }
        html.push("</div>");

        for (let i = 0; i < this.#views.length; ++i) {
            html.push(
                `<div class="view ${i == 0 ? "" : "hide"}">${this.#views[i]}</div>`,
            );
        }

        html.push("</div>");

        return html.join("");
    }

    static tab(id, index) {
        console.log(`TabView.tab called: id=${id}, index=${index}`);
        let tabs = document.querySelectorAll(`#${id}>.tabs>.tab`);
        console.log(`Found ${tabs.length} tabs`);
        for (let i = 0; i < tabs.length; ++i) {
            tabs[i].classList.toggle("selected", i == index);
        }
        let views = document.querySelectorAll(`#${id}>.view`);
        console.log(`Found ${views.length} views`);
        for (let i = 0; i < views.length; ++i) {
            views[i].classList.toggle("hide", i != index);
            if (i == index) {
                console.log(`Showing view ${i}, innerHTML length:`, views[i].innerHTML.length);
                console.log(`View ${i} first 100 chars:`, views[i].innerHTML.substring(0, 100));
            }
        }
    }
}

// ================================================================================
// DROPDOWN COMPONENT
// ================================================================================

class Dropdown {
    #id;
    #triggerElem;
    #content;
    static #dropdowns = new Map();
    static get(id) {
        return Dropdown.#dropdowns.get(id);
    }

    constructor(id, triggerElem, content) {
        this.#id = id;
        this.#triggerElem = triggerElem;
        this.#content = content;
        this.onopen = null;

        Dropdown.#dropdowns.set(id, this);
    }

    render() {
        return (
            `<table id="${this.#id}" class="fill drop-layout"><tbody><tr><td onclick="Dropdown.get('${this.#id}').click()">${this.#triggerElem}</td></tr>` +
            `<tr><td style="position:relative"><div><div class="dropdown hide">${this.#content}</div></div></td></tr></tbody></table>`
        );
    }

    click() {
        if (
            document
                .querySelector(`#${this.#id} .dropdown`)
                .classList.contains("hide")
        ) {
            this.open();
        } else {
            this.close();
        }
    }

    open() {
        document
            .querySelector(`#${this.#id} .dropdown`)
            .classList.remove("hide");
        let closing = (e) => {
            if (!e.target.closest(`#${this.#id}`)) {
                this.close();
                window.removeEventListener("click", closing);
                window.removeEventListener("touchstart", closing);
            }
        };

        window.addEventListener("click", closing);
        window.addEventListener("touchstart", closing);
        this.onopen && this.onopen();
    }

    close() {
        document.querySelector(`#${this.#id} .dropdown`).classList.add("hide");
    }
}

// ================================================================================
// SELECT COMPONENT
// ================================================================================

class Select {
    #id;
    #values;
    #selected;
    #onchange;
    #dropdown;
    static #selects = new Map();
    static get(id) {
        return Select.#selects.get(id);
    }

    constructor(id, values, selected, onchange) {
        this.#id = id;
        this.#values = values;
        this.#selected = selected;
        this.#onchange = onchange;
        this.style = "";
        this.class = "";
        this.valueEqualtoSelection = (a, b) => a === b;

        Select.#selects.set(id, this);
    }

    select(value) {
        // clean list selection
        let root = document.getElementById(this.#id);

        for (let [i, [txt, val]] of this.#values.entries()) {
            let elem = root.querySelector(".o" + i);
            elem.classList.remove("selected");
        }

        // change selection & highlight selected item
        this.#selected = value;
        let text = "";
        for (let [i, [txt, val]] of this.#values.entries()) {
            if (val === undefined) {
                continue;
            }
            // we can have more than one selected highlight item
            if (this.valueEqualtoSelection(value, val)) {
                root.querySelector(".o" + i).classList.add("selected");
            }
            // but only one real selected value and text
            if (val === value) {
                text = txt;
            }
        }

        // set the text
        document.getElementById(this.#id + "-text").innerText = text;
        this.#dropdown.close();
        this.#onchange(value);
    }

    onclickItem(index) {
        this.select(this.#values[index][1]);
    }

    #renderCustom() {
        let cls = this.class ? ` ${this.class}` : "";
        let style = this.style ? ` style="${this.style}"` : "";
        let text = "";
        for (let value of this.#values) {
            if (value.length == 1) {
                value.push(undefined);
            }
            if (value[1] === this.#selected) {
                text = value[0];
            }
        }
        let elem = `<div class='select-text${cls}'><span id="${this.#id}-text"${style}>${text}</span><span class="arrow">▽</span></div>`;

        let options = [`<div id="${this.#id}">`];
        let ending = "";
        for (let [i, [txt, val]] of this.#values.entries()) {
            if (val === undefined) {
                options.push(ending);
                options.push(
                    `<div class="group"><div onclick="event.stopPropagation()" class="o${i} group-txt">${txt}</div>`,
                );
                ending = "</div>";
            } else {
                let selected = this.valueEqualtoSelection(this.#selected, val)
                    ? " selected"
                    : "";
                options.push(
                    `<div onclick="Select.get('${this.#id}').onclickItem(${i})" class="o${i} option${selected}${cls}">${txt || "&nbsp;"}</div>`,
                );
            }
        }
        options.push(ending, "</div>");

        this.#dropdown = new Dropdown(this.#id, elem, options.join(""));
        this.#dropdown.onopen = () => {
            let root = document.getElementById(this.#id);
            let index = this.#values.findIndex((v) => v[1] === this.#selected);
            let elem = root.querySelector(".o" + index);
            elem.scrollIntoView({
                behavior: "smooth",
                block: "end",
                inline: "nearest",
            });
        };
        return this.#dropdown.render();
    }

    render(custom) {
        if (custom) {
            return this.#renderCustom();
        }

        let html = [];
        let cls = this.class ? ` class="${this.class}"` : "";
        let ending = "";
        html.push(
            `<select${cls} onchange="Select.get('${this.#id}').onselect(this.value)">`,
        );
        for (let [txt, val] of this.#values) {
            if (val === undefined) {
                html.push(ending);
                html.push(`<optgroup label="${txt}">`);
                ending = "</optgroup>";
            } else {
                let selectedCls = this.valueEqualtoSelection(
                    this.#selected,
                    val,
                )
                    ? ' class="selected"'
                    : "";
                let selected = val === this.#selected ? " selected" : "";
                html.push(
                    `<option value="${val}"${selectedCls}${selected}>${txt}</option>`,
                );
            }
        }

        html.push(`${ending}</select>`);
        return html.join("");
    }

    onselect(value) {
        this.#onchange(value);
    }
}

// ================================================================================
// UTILITY UI FUNCTIONS
// ================================================================================

function createClickableDiv(content, action) {
    return `<div class="clickable" onclick="${action}">${content}</div>`;
}

function createPopup(text, popupText) {
    if (!text) {
        return "";
    }

    return [
        '<span class="bs">',
        text,
        '<div class="pop">',
        popupText,
        "</div></span>",
    ].join("");
}

function createCheckbox(id, text, checked, onchange) {
    onchange = onchange ? ` onchange="${onchange}"` : "";
    checked = checked ? " checked" : "";
    return (
        '<span style="display:inline-block"><span class="checkbox-wrapper">' +
        `<input type="checkbox" id="${id}"${onchange}${checked}><label for="${id}">${text}</label></span></span>`
    );
}

// ================================================================================
// BUTTON STATE MANAGEMENT
// ================================================================================

function updateButtonStates(swimmerId) {
    // Remove pressed state from both buttons
    document.querySelector(".ray-btn").classList.remove("pressed");
    document.querySelector(".max-btn").classList.remove("pressed");

    // Add pressed state to the appropriate button
    if (swimmerId === "500281") {
        document.querySelector(".ray-btn").classList.add("pressed");
    } else if (swimmerId === "1320806") {
        document.querySelector(".max-btn").classList.add("pressed");
    }
}

// ================================================================================
// EXPORT COMPONENTS
// ================================================================================

window.TabView = TabView;
window.Dropdown = Dropdown;
window.Select = Select;
window.go = go;
window.loadContent = loadContent;
window.updateButtonStates = updateButtonStates;
window.createClickableDiv = createClickableDiv;
window.createPopup = createPopup;
window.createCheckbox = createCheckbox;
window._backgroundActions = _backgroundActions;
