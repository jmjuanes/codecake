const insertText = text => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    const textElement = document.createTextNode(text);
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

const getEditorTemplate = () => {
    const templateContent = [
        `<div class="codecake">`,
        `    <div class="codecake-gutters" style="display:none;">`,
        `        <div class="codecake-gutter codecake-lines" style="display:none;"></div>`,
        `    </div>`,
        `    <div class="codecake-editor" spellcheck="false" autocorrect="off"></div>`, 
        `</div>`,
    ];
    const templateElement = document.createElement("template");
    templateElement.innerHTML = templateContent.join("").trim();
    return templateElement.content.firstChild;
};

//Code editor component
export const CodeCake = (parent, options = {}) => {
    let prevCode = "";
    let focus = false;
    let linesCount = -1;
    const tab = options?.indentation === "tabs" ? "\t" : " ".repeat(options.tabSize || 4);
    const endl = String.fromCharCode(10);
    parent.appendChild(getEditorTemplate());
    const editor = parent.querySelector(".codecake-editor");
    const lines = parent.querySelector(".codecake-lines");

    // Create editor element and apply attributes and styles
    parent.querySelector(".codecake").classList.add(`codecake-${options.theme || "light"}`);
    !options?.readonly && editor.setAttribute("contenteditable", "plaintext-only");
    options?.linenumbers && (parent.querySelector(".codecake-gutters").style.display = "");
    options?.linenumbers && (lines.style.display = "");

    // Check if plainText is not supported
    if (!options?.readonly && editor.contentEditable !== "plaintext-only") {
        editor.setAttribute("contenteditable", "true");
    }
    // Manage code
    const setCode = (newCode, wait) => {
        editor.textContent = newCode;
        update(wait ?? 50);
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
        const range = window.getSelection().getRangeAt(0);
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
    const update = debounce(() => {
        const position = focus && savePosition();
        let currentCode = getCode();
        if (!currentCode.endsWith(endl)) {
            currentCode = currentCode + endl;
            editor.textContent = currentCode;
        }
        // Update line numbers
        if (options.linenumbers) {
            const count = Math.max(currentCode.split(endl).length - 1, 1);
            if (linesCount !== count) {
                lines.innerText = Array.from({length: count}, (v, i) => i + 1).join("\n");
                linesCount = count;
            }
        }
        // Update highlight
        if (typeof options.highlight === "function") {
            editor.innerHTML = options.highlight(currentCode);
        }
        options?.onChange && options.onChange(currentCode);
        focus && restorePosition(position);
    });

    // Register editor events listeners
    editor.addEventListener("keydown", event => {
        if (!event.defaultPrevented && !options?.readonly) {
            prevCode = getCode();
            // Handle inserting new line
            if (event.key === "Enter") {
                event.preventDefault();
                const lines = getCodeBefore().split(endl);
                const lastLine = lines[lines.length - 1];
                const lastIndentation = (/^([\s]*)/.exec(lastLine))?.[0] || "";
                const lastChar = lastLine.trim().slice(-1);
                const indentation = lastIndentation + (/[\[\{]/.test(lastChar) ? tab : "");
                insertText(endl + indentation);
            }
            // Handle backspace
            else if (event.keyCode === 8 || (event.keyCode === 9 && event.shiftKey)) {
                if (window.getSelection().type === "Caret") {
                    let removeChars = 0;
                    const pos = savePosition();
                    const text = getCode();
                    const lines = text.slice(0, pos).split(endl);
                    const line = lines[lines.length - 1] || ""; 
                    // Check for line not empty with space characters
                    if (line !== "" && line.trim() === "") {
                        event.preventDefault();
                        removeChars = (line.length % tab.length === 0) ? tab.length : line.length % tab.length;
                        setCode(text.substring(0, pos - removeChars) + text.substring(pos, text.length), 1);
                        prevCode = getCode();
                    }
                    // Restore cursor position
                    restorePosition(pos - removeChars);
                }
            }
            // Handle insert tab
            else if (event.keyCode === 9 && !event.shiftKey) {
                event.preventDefault();
                insertText(tab);
            }
        }
    });
    editor.addEventListener("keyup", event => {
        if (!event.defaultPrevented && !options?.readonly && prevCode !== getCode()) {
            return update(250);
        }
    });
    editor.addEventListener("focus", () => focus = true);
    editor.addEventListener("blur", () => focus = false);
    editor.addEventListener("scroll", () => lines.style.top = `-${editor.scrollTop}px`);
    editor.addEventListener("paste", () => update(10));

    // Initialize editor values
    options?.initialCode ? setCode(options?.initialCode) : update(1);

    // Return editor actions
    return {
        get: () => getCode(),
        set: code => setCode(code || "", 1),
        clear: () => setCode(""),
    };
};
