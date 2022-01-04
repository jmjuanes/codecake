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
    const tabSize = options.tabSize || 4;
    const tabChar = " ".repeat(tabSize);
    const plugins = []; // List of available plugins
    let prev = ""; // Previous text
    let focus = false;

    // Create editor element and apply attributes and styles
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true"); // "plaintext-only" breaks in Firefox
    editor.setAttribute("spellcheck", options.spellcheck ? "true" : "false");
    // editor.className = options.className || "editor";
    editor.classList.add("CodeCake-editor");
    options.className && editor.classList.add(options.className); // Apply custom css
    editor.style.outline = "none";
    editor.style.overflowWrap = "break-word";
    editor.style.overflowY = "auto";
    editor.style.whiteSpace = "pre-wrap";
    editor.style.height = "100%";

    // Append editor to parent
    parent.appendChild(editor);

    // Manage code
    const getCode = () => editor.textContent || "";
    const setCode = (newCode, wait) => {
        editor.textContent = newCode;
        debouncePluginsCall(wait || 50);
    };

    // Get code before current caret position
    const getCodeBefore = () => {
        const {startContainer, startOffset} = getCurrentSelection().getRangeAt(0);
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.setEnd(startContainer, startOffset);
        return range.toString();
    };

    // Save current position
    const savePosition = () => {
        if (focus) {
            const selection = getCurrentSelection();
            const range = selection.getRangeAt(0);
            range.setStart(parent, 0);
            return range.toString().length;
        }
    };

    // Restore a position
    const restorePosition = index => {
        if (focus) {
            const selection = getCurrentSelection();
            const pos = getTextNodeAtPosition(editor, index);
            selection.removeAllRanges();
            const range = new Range();
            range.setStart(pos.node, pos.position);
            selection.addRange(range);
        }
    };

    // Debounce plugins call
    const debouncePluginsCall = debounce(() => {
        console.log("CALL PLUGINS");
        const prevPosition = savePosition();
        plugins.forEach(p => p(editor)); // Run all plugins
        restorePosition(prevPosition);
    });

    //Handle backspace down
    const handleBackspace = event => {
        const selection = getCurrentSelection();
        if (selection.type !== "Caret") {
            return; // --> do nothing
        }
        const pos = savePosition();
        // const pos = selection.focusOffset;
        const text = getCode();
        const textBefore = text.slice(0, pos);
        //Split the current text by \n and get the last line
        const lines = textBefore.split("\n");
        const line = lines[lines.length - 1] || ""; 
        //Check for not only space characters or empty line
        if (line.trim() !== "" || line === "") {
            return restorePosition(pos); // --> do nothing
        }
        //Prevent default --> we will remove up to a tab
        event.preventDefault();
        const removeChars = (line.length % tabSize === 0) ? tabSize : line.length % tabSize;
        setCode(text.substring(0, pos - removeChars) + text.substring(pos, text.length), 1);
        prev = getCode(); // Prevent calling plugins twice
        // Restore cursor position
        restorePosition(pos - removeChars);
    };

    // Handle new line character inserted
    const handleNewLine = event => {
        const lines = getCodeBefore().split("\n");
        const lastLine = lines[lines.length - 1];
        // Get the lst indentation and the last character
        const lastIndentation = /^([\s]*)/.exec(lastLine);
        const lastChar = lastLine.trim().slice(-1);
        // Check for no last indentation character
        if (lastIndentation === null || typeof lastIndentation[0] !== "string") {
            return; // <--- Add new line without indentation
        }
        let indentation = lastIndentation[0]; // Default indentation
        // Check if the last character is a new object or array indicator
        if (lastChar === "{" || lastChar === "[") {
            indentation = lastIndentation[0] + tabChar;
        }
        if (indentation.length > 0) {
            event.preventDefault(); // <<-- Prevent newline
            return insertText("\n" + indentation);
        }
    };

    // Handle tab
    // TODO: handle block indentation
    const handleTab = event => {
        event.preventDefault();
        return event.shiftKey ? handleBackspace(event) : insertText(tabChar);
    };

    // Register key down --> parse inserted key
    editor.addEventListener("keydown", event => {
        if (!event.defaultPrevented) {
            prev = getCode(); // Save current code
            if (event.keyCode === 13) { return handleNewLine(event); }
            if (event.keyCode === 8) { return handleBackspace(event); }
            if (event.keyCode === 9) { return handleTab(event); }
        }
    });

    // Register key up listener
    editor.addEventListener("keyup", event => {
        if (prev !== getCode()) {
            return debouncePluginsCall(250);
        }
    });

    // Focus listeners
    editor.addEventListener("focus", () => focus = true);
    editor.addEventListener("blur", () => focus = false);

    // Return editor actions
    return {
        "getCode": getCode,
        "setCode": c => setCode(c),
        "addPlugin": p => {
            plugins.push(p);
            debouncePluginsCall();
        },
        "clear": () => setCode(""),
    };
};
