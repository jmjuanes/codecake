const escape = text => {
    return text.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const insertText = text => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    const textElement = document.createTextNode(escape(text));
    range.insertNode(textElement);
    range.setStartAfter(textElement);
    sel.removeAllRanges();
    sel.addRange(range);
};

const debounce = fn => {
    let timer = null;
    return wait => {
        clearTimeout(timer);
        wait === 1 ? fn() : (timer = window.setTimeout(fn, wait)); 
    };
};

const getTextNodeAtPosition = (root, index) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, el => {
        if (index > el.textContent.length){
            index = index - el.textContent.length;
            return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT;
    });
    return {
        node: walker.nextNode() || root,
        position: index,
    };
};

//Code editor component
export const CodeCake = (options = {}) => {
    let prevCode = ""; // Previous code
    let focus = false;
    const parent = options?.parent || document.createElement("div");
    const editor = document.createElement("div");
    const tab = " ".repeat(options.tabSize || 4);
    const readonly = !!options?.readonly;

    // Create editor element and apply attributes and styles
    !readonly && editor.setAttribute("contenteditable", "plaintext-only");
    editor.setAttribute("spellcheck", options.spellcheck ? "true" : "false");
    editor.classList.add("CodeCake-editor");
    options?.className && editor.classList.add(options.className); // Apply custom css

    // Append editor to parent
    parent.appendChild(editor);

    // Check if plainText is not supported
    if (!readonly && editor.contentEditable !== "plaintext-only") {
        editor.setAttribute("contenteditable", "true");
    }
    // Manage code
    const setCode = (newCode, wait) => {
        editor.textContent = newCode;
        debounceUpdate(wait || 50);
    };
    const getCode = () => editor.textContent || "";
    const getCodeBefore = () => {
        const {startContainer, startOffset} = window.getSelection().getRangeAt(0);
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.setEnd(startContainer, startOffset);
        return range.toString();
    };
    // Position managers
    const savePosition = () => {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.setStart(editor, 0);
        return range.toString().length;
    };
    const restorePosition = index => {
        const selection = window.getSelection();
        const pos = getTextNodeAtPosition(editor, index);
        selection.removeAllRanges();
        const range = new Range();
        range.setStart(pos.node, pos.position);
        selection.addRange(range);
    };
    // Debounce code update
    const debounceUpdate = debounce(() => {
        const position = focus && savePosition();
        const currentCode = getCode();
        options?.onChange && options.onChange(currentCode);
        focus && restorePosition(position);
    });

    //Handle backspace down
    const handleBackspace = event => {
        const selection = window.getSelection();
        if (selection.type !== "Caret") {
            return; // --> do nothing
        }
        const pos = savePosition();
        const text = getCode();
        const lines = text.slice(0, pos).split("\n");
        const line = lines[lines.length - 1] || ""; 
        //Check for not only space characters or empty line
        if (line === "" || line.trim() !== "") {
            return restorePosition(pos); // --> do nothing
        }
        //Prevent default --> we will remove up to a tab
        event.preventDefault();
        const removeChars = (line.length % tab.length === 0) ? tab.length : line.length % tab.length;
        setCode(text.substring(0, pos - removeChars) + text.substring(pos, text.length), 1);
        prevCode = getCode(); // Prevent calling plugins twice
        restorePosition(pos - removeChars); // Restore cursor position
    };

    // Handle new line character inserted
    const handleNewLine = event => {
        event.preventDefault();
        const lines = getCodeBefore().split("\n");
        const lastLine = lines[lines.length - 1];
        const lastIndentation = /^([\s]*)/.exec(lastLine);
        // Check for no last indentation character
        if (lastIndentation === null || typeof lastIndentation[0] !== "string") {
            return insertText("\n"); // <--- Add new line without indentation
        }
        const lastChar = lastLine.trim().slice(-1);
        const indentation = /[\[\{]/.test(lastChar) ? lastIndentation[0] + tab : lastIndentation[0];
        return insertText("\n" + indentation);
    };

    // Handle tab
    // TODO: handle block indentation
    const handleTab = event => {
        event.preventDefault();
        return event.shiftKey ? handleBackspace(event) : insertText(tab);
    };

    // Events listeners
    const handleKeyDownEvent = event => {
        if (!event.defaultPrevented && !readonly) {
            prevCode = getCode(); // Save current code
            if (event.keyCode === 13) { return handleNewLine(event); }
            if (event.keyCode === 8) { return handleBackspace(event); }
            if (event.keyCode === 9) { return handleTab(event); }
        }
    };
    const handleKeyUpEvent = event => {
        if (!event.defaultPrevented && !readonly && prevCode !== getCode()) {
            debounceUpdate(250);
        }
    };
    const handleFocusEvent = () => focus = true;
    const handleBlurEvent = () => focus = false;
    // Register editor events listeners
    editor.addEventListener("keydown", handleKeyDownEvent);
    editor.addEventListener("keyup", handleKeyUpEvent);
    editor.addEventListener("focus", handleFocusEvent);
    editor.addEventListener("blur", handleBlurEvent);

    // Return editor actions
    return {
        parent: parent,
        getCode: getCode,
        setCode: setCode,
        clearCode: () => setCode(""),
    };
};
