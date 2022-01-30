// Get current selection
const getCurrentSelection = () => window.getSelection();

// Escape HTML characters from the given input
const escape = text => {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

// Insert text
const insertText = text => document.execCommand("insertHTML", false, escape(text));

// Tiny debounce implementation
const debounce = fn => {
    let timer = null;
    return wait => {
        clearTimeout(timer);
        wait === 1 ? fn() : (timer = window.setTimeout(fn, wait)); 
    };
};

// Get text node at the specified position
const getTextNodeAtPosition = (root, index) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, el => {
        if (index > el.textContent.length){
            index = index - el.textContent.length;
            return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT;
    });
    return {
        "node": walker.nextNode() || root,
        "position": index,
    };
};

//Code editor component
export const CodeCake = (parent, options) => {
    options = options || {};
    const plugins = []; // List of available plugins
    let prevCode = ""; // Previous code
    const ctx = {
        tab: " ".repeat(options.tabSize || 4),
        readonly: !!options.readonly,
        focus: false,
        position: null, // Current position
        editor: document.createElement("div"), // Editor referente
    };

    // Create editor element and apply attributes and styles
    !ctx.readonly && ctx.editor.setAttribute("contenteditable", "plaintext-only");
    ctx.editor.setAttribute("spellcheck", options.spellcheck ? "true" : "false");
    ctx.editor.classList.add("CodeCake-editor");
    options.className && ctx.editor.classList.add(options.className); // Apply custom css
    ctx.editor.style.outline = "none";
    ctx.editor.style.overflowWrap = "normal"; // "break-word";
    ctx.editor.style.overflow = "auto";
    ctx.editor.style.whiteSpace = "pre"; // "pre-wrap";
    ctx.editor.style.wordWrap = "normal";
    ctx.editor.style.height = "100%";
    ctx.editor.style.width = "100%";

    // Append editor to parent
    parent.appendChild(ctx.editor);

    // Check if plainText is not supported
    if (!ctx.readonly && ctx.editor.contentEditable !== "plaintext-only") {
        ctx.editor.setAttribute("contenteditable", "true");
    }

    // Manage code
    ctx.getCode = () => ctx.editor.textContent || "";
    ctx.setCode = (newCode, wait) => {
        ctx.editor.textContent = newCode;
        debouncePluginsCall(wait || 50);
    };

    // Get code before current caret position
    ctx.getCodeBefore = () => {
        const {startContainer, startOffset} = getCurrentSelection().getRangeAt(0);
        const range = document.createRange();
        range.selectNodeContents(ctx.editor);
        range.setEnd(startContainer, startOffset);
        return range.toString();
    };

    // Save current position
    ctx.savePosition = () => {
        const selection = getCurrentSelection();
        const range = selection.getRangeAt(0);
        range.setStart(ctx.editor, 0);
        return range.toString().length;
    };

    // Restore a position
    ctx.restorePosition = index => {
        const selection = getCurrentSelection();
        const pos = getTextNodeAtPosition(ctx.editor, index);
        selection.removeAllRanges();
        const range = new Range();
        range.setStart(pos.node, pos.position);
        selection.addRange(range);
    };

    // Debounce plugins call
    const debouncePluginsCall = debounce(() => {
        ctx.position = ctx.focus && ctx.savePosition();
        plugins.forEach(p => p(ctx)); // Run all plugins
        ctx.focus && ctx.restorePosition(ctx.position);
    });

    //Handle backspace down
    const handleBackspace = event => {
        const selection = getCurrentSelection();
        if (selection.type !== "Caret") {
            return; // --> do nothing
        }
        const pos = ctx.savePosition();
        const text = ctx.getCode();
        const lines = text.slice(0, pos).split("\n");
        const line = lines[lines.length - 1] || ""; 
        //Check for not only space characters or empty line
        if (line === "" || line.trim() !== "") {
            return ctx.restorePosition(pos); // --> do nothing
        }
        //Prevent default --> we will remove up to a tab
        event.preventDefault();
        const removeChars = (line.length % ctx.tab.length === 0) ? ctx.tab.length : line.length % ctx.tab.length;
        ctx.setCode(text.substring(0, pos - removeChars) + text.substring(pos, text.length), 1);
        prevCode = ctx.getCode(); // Prevent calling plugins twice
        ctx.restorePosition(pos - removeChars); // Restore cursor position
    };

    // Handle new line character inserted
    const handleNewLine = event => {
        event.preventDefault();
        const lines = ctx.getCodeBefore().split("\n");
        const lastLine = lines[lines.length - 1];
        const lastIndentation = /^([\s]*)/.exec(lastLine);
        // Check for no last indentation character
        if (lastIndentation === null || typeof lastIndentation[0] !== "string") {
            return insertText("\n"); // <--- Add new line without indentation
        }
        const lastChar = lastLine.trim().slice(-1);
        const indentation = /[\[\{]/.test(lastChar) ? lastIndentation[0] + ctx.tab : lastIndentation[0];
        return insertText("\n" + indentation);
    };

    // Handle tab
    // TODO: handle block indentation
    const handleTab = event => {
        event.preventDefault();
        return event.shiftKey ? handleBackspace(event) : insertText(ctx.tab);
    };

    // Register key down --> parse inserted key
    ctx.editor.addEventListener("keydown", event => {
        if (!event.defaultPrevented && !ctx.editor.readonly) {
            prevCode = ctx.getCode(); // Save current code
            if (event.keyCode === 13) { return handleNewLine(event); }
            if (event.keyCode === 8) { return handleBackspace(event); }
            if (event.keyCode === 9) { return handleTab(event); }
        }
    });

    // Register key up listener
    ctx.editor.addEventListener("keyup", event => {
        if (!event.defaultPrevented && !ctx.readonly && prevCode !== ctx.getCode()) {
            return debouncePluginsCall(250);
        }
    });

    // Focus listeners
    ctx.editor.addEventListener("focus", () => ctx.focus = true);
    ctx.editor.addEventListener("blur", () => ctx.focus = false);

    // Return editor actions
    return {
        "getCode": ctx.getCode,
        "setCode": c => ctx.setCode(c),
        "addPlugin": p => {
            plugins.push(p);
            debouncePluginsCall(50);
        },
        "clear": () => ctx.setCode(""),
    };
};
