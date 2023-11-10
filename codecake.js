/*
 * CodeCake Editor
*/

const insertText = text => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    const textElement = document.createTextNode(text);
    range.insertNode(textElement);
    range.setStartAfter(textElement);
    sel.removeAllRanges();
    sel.addRange(range);
};

const getCodeBeforeOrAfter = (parent, dir) => {
    const {startContainer, startOffset, endContainer, endOffset} = window.getSelection().getRangeAt(0);
    const range = document.createRange();
    range.selectNodeContents(parent);
    dir === -1 ? range.setEnd(startContainer, startOffset) : range.setStart(endContainer, endOffset);
    return range.toString();
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

// Create a new instance of the code editor
export const create = (parent, options = {}) => {
    let prevCode = "";
    let focus = false;
    let escKeyPressed = false;
    const listeners = {}; // Store events listeners
    const tab = options?.indentWithTabs ? "\t" : " ".repeat(options.tabSize || 4);
    const endl = String.fromCharCode(10);
    const autoIndent = options?.autoIndent ?? true;
    const addClosing = options?.addClosing ?? true;
    const openChars = `[({"'`, closeChars = `])}"'`;
    parent.appendChild(getEditorTemplate());
    const editor = parent.querySelector(".codecake-editor");
    const lines = parent.querySelector(".codecake-lines");
    !options?.readOnly && editor.setAttribute("contenteditable", "plaintext-only");
    (options?.className || "").split(" ").filter(c => !!c).forEach(c => parent.querySelector(".codecake").classList.add(c));
    options?.lineNumbers && (parent.querySelector(".codecake-gutters").style.display = "");
    options?.lineNumbers && (lines.style.display = "");
    // 'plaintext-only' mode is not supported in Firefox
    if (!options?.readOnly && editor.contentEditable !== "plaintext-only") {
        editor.setAttribute("contenteditable", "true");
    }
    if (options?.lineWrap) {
        editor.classList.add("codecake-linewrapping");
    }
    // Manage code
    const setCode = (newCode, wait) => {
        editor.textContent = newCode;
        prevCode = editor.textContent || "";
        update(wait ?? 50);
    };
    const getCode = () => editor.textContent || "";
    const getCodeBefore = () => getCodeBeforeOrAfter(editor, -1);
    const getCodeAfter = () => getCodeBeforeOrAfter(editor, +1);
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
        const newText = typeof options.highlight === "function" ? options.highlight(currentCode, options.language || "") : currentCode;
        editor.innerHTML = `<span class="line">` + newText.split("\n").join(`</span>\n<span class="line">`) + `</span>`;
        if (options?.lineNumbers) {
            const linesC = Array.from(editor.querySelectorAll(`span.line`)).map((line, index) => {
                return `<div style="height:${line.getBoundingClientRect().height}px;">${index + 1}</div>`;
            });
            lines.innerHTML = linesC.join("");
        }
        (typeof listeners["change"] === "function") && listeners["change"](currentCode);
        focus && restorePosition(position);
    });
    // Register editor events listeners
    editor.addEventListener("keydown", event => {
        (typeof listeners["keydown"] === "function") && (listeners["keydown"](event));
        if (!event.defaultPrevented && !options?.readOnly) {
            prevCode = getCode();
            // Handle inserting new line
            if (event.key === "Enter" && autoIndent) {
                event.preventDefault();
                const lines = getCodeBefore().split(endl);
                const extraLine = /^[)}\]]/.test(getCodeAfter());
                const pos = savePosition();
                const lastLine = lines[lines.length - 1];
                const lastIndentation = (/^([\s]*)/.exec(lastLine))?.[0] || "";
                const lastChar = lastLine.trim().slice(-1);
                const indentation = lastIndentation + (/[\[\{]/.test(lastChar) ? tab : "");
                setCode(prevCode.substring(0, pos) + endl + indentation + (extraLine ? (endl + lastIndentation) : "") + prevCode.substring(pos, prevCode.length), 1);
                restorePosition(pos + 1 + indentation.length);
            }
            // Handle backspace
            else if (event.key === "Backspace" || (event.key === "Tab" && !escKeyPressed && event.shiftKey)) {
                if (window.getSelection().type === "Caret") {
                    let removeChars = 0;
                    const pos = savePosition();
                    const lines = prevCode.slice(0, pos).split(endl);
                    const line = lines[lines.length - 1] || ""; 
                    if (line !== "" && line.trim() === "") {
                        event.preventDefault();
                        removeChars = (line.length % tab.length === 0) ? tab.length : line.length % tab.length;
                        setCode(prevCode.substring(0, pos - removeChars) + prevCode.substring(pos, prevCode.length), 1);
                    }
                    restorePosition(pos - removeChars);
                }
            }
            // Handle insert tab
            else if (event.key === "Tab" && !escKeyPressed && !event.shiftKey) {
                event.preventDefault();
                insertText(tab);
            }
            // Skip closing char
            else if (addClosing && closeChars.includes(event.key) && getCodeAfter().charAt(0) === event.key) {
                event.preventDefault();
                restorePosition(savePosition() + 1);
            }
            // Handle closing chars
            else if (addClosing && openChars.includes(event.key)) {
                event.preventDefault();
                const [start, end] = [getCodeBefore().length, getCodeAfter().length];
                const pos = savePosition();
                const wrapText = (prevCode.length - start - end > 0) ? prevCode.substring(start, prevCode.length - end) : "";
                setCode(prevCode.substring(0, pos - wrapText.length) + event.key + wrapText + closeChars[openChars.indexOf(event.key)] + prevCode.substring(pos, prevCode.length), 1);
                restorePosition(pos + 1);
            }
            // Save if escape key has been pressed to avoid trapping keyboard focus
            escKeyPressed = event.key === "Escape";
        }
    });
    editor.addEventListener("keyup", event => {
        (typeof listeners["keyup"] === "function") && (listeners["keyup"](event));
        if (!event.defaultPrevented && !options?.readOnly && prevCode !== getCode()) {
            return update(250);
        }
    });
    editor.addEventListener("focus", () => focus = true);
    editor.addEventListener("blur", () => focus = false);
    editor.addEventListener("scroll", () => lines.style.top = `-${editor.scrollTop}px`);
    editor.addEventListener("paste", () => update(10));
    // Initialize editor values
    options?.code ? setCode(options?.code) : update(1);
    return {
        getCode: () => getCode(),
        setCode: code => setCode(code || "", 1),
        onChange: listener => (listeners["change"] = listener),
        onKeyDown: listener => (listeners["keydown"] = listener),
        onKeyUp: listener => (listeners["keyup"] = listener),
    };
};


/*
 * CodeCake Syntax highlight
*/

const escape = text => {
    return text.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const jsKeywords = [
    "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "constructor", "debugger", "default",
    "delete", "do", "else", "export", "extends", "finally", "for", "from", "function", "if", "implements", "import",
    "in", "instanceof", "let", "new", "of", "return", "static", "super", "switch", "symbol", "this", "throw",
    "try", "typeof", "undefined", "var", "void", "while", "with", "yield",
];

const cssConstants = [
    "absolute", "relative", "fixed", "sticky", "bold", "normal", "auto", "none", "solid", "dashed",
    "sans-serif", "sans", "serif", "monospace", "red", "white", "black", "blue", "yellow", "green", "orange", "gray",
];

// Languajes definition
const languages = {
    html: {
        aliases: [],
        rules: [
            {
                starts: /^<!--/,
                ends: /-->/,
                rules: [
                    {regex: /^(.+)/, token: "comment"},
                ],
            },
            {
                regex: /^(<([\w]+)(?![^>]*\/>)[^>]*>)/,
                rules: [
                    {
                        regex: /^(<[\w]+)/,
                        rules: [
                            {regex: /^(<)/, token: "punctuation"},
                            {regex: /^([\w]+)/, token: "tag"},
                        ],
                    },
                    {
                        regex: /^([\w\.\-\_]+="[^"]+")/,
                        rules: [
                            {regex: /^([\w\.\-\_]+)/, token: "attr"},
                            {regex: /^(=)/, token: "punctuation"},
                            {regex: /^(".*?")/, token: "string"},
                        ],
                    },
                    {regex: /^(>)/, token: "punctuation"},
                ],
            },
            {
                regex: /^(<\/[\w]+>)/,
                rules: [
                    {regex: /^([<\/>])/, token: "punctuation"},
                    {regex: /^([\w]+)/, token: "tag"},
                ],
            },
        ],
    },
    javascript: {
        aliases: ["js", "jsx"],
        rules: [
            {regex: /^(\/\/.*)/, token: "comment"},
            {
                starts: /^\/\*/,
                ends: /\*\//,
                rules: [
                    {regex: /^(.+)/, token: "comment"},
                ],
            },
            {regex: /^(\'.*?\')|^(\".*?\")/, token: "string"},
            {
                regex: /^(\`[^\`]*?\`)/,
                rules: [
                    {regex: /^(.+)/, token: "string"},
                ],
            },
            {regex: new RegExp(`^\\b(${jsKeywords.join("|")})\\b`), token: "keyword"},
            {regex: /^\b(true|false|null)\b/, token: "constant"},
            {regex: /^([+-]?([0-9]*[.])?[0-9]+)\b/, token: "number"},
            {regex: /^([{}[\](\):;\\.,])/, token: "punctuation"},
            {
                regex: /^(<(?:=>|[^>])+(?:\/)?>)/,
                rules: [
                    {
                        regex: /^(<\/?[\w]+)/,
                        rules: [
                            {regex: /^(<)/, token: "punctuation"},
                            {regex: /^([\w]+)/, token: "tag"},
                        ],
                    },
                    {
                        regex: /^([\w\.\-\_]+=(?:"[^"]*"|\{[^\}]*}))/,
                        rules: [
                            {regex: /^([\w\.\-\_]+)/, token: "attr"},
                            {regex: /^(=)/, token: "punctuation"},
                            {regex: /^("(?:.)*?"|\{(?:.)*?})/, token: "string"},
                        ],
                    },
                    {regex: /^(>)/, token: "punctuation"},
                ],
            },
            {regex: /^([?!&@~\/\-+*%=<>|])/, token: "operator"},
            {
                regex: /^([a-zA-Z][\w]*\s*\()/,
                rules: [
                    {regex: /^([^\(]+)/, token: "title function"},
                    {regex: /^(\()/, token: "punctuation"},
                ],
            },
            {regex: /^([\w]+)/, token: "word"},
        ],
    },
    css: {
        aliases: [],
        rules: [
            {
                starts: /^\/\*/,
                ends: /\*\//,
                rules: [
                    {regex: /^(.+)/, token: "comment"},
                ],
            },
            {regex: /^([{},;])/, token: "punctuation"},
            {regex: /^(@(font-face|import|keyframes))/, token: "keyword"},
            {
                regex: /^([a-z\-]+\s*:\s*[^;\n]+);/,
                rules: [
                    {
                        regex: /^([a-z\-]+\s*:)/,
                        rules: [
                            {regex: /^([a-z\-]+)/, token: "attribute"},
                            {regex: /^(:)/, token: "punctuation"},
                        ],
                    },
                    {regex: /^(#[\da-f]{3,8})/, token: "constant"},
                    {regex: /^([+-]?([0-9]*[.])?[0-9]+)/, token: "number"},
                    {regex: /^(\'(?:.)*?\')|^(\"(?:.)*?\")/, token: "string"},
                    {regex: new RegExp(`^\\b(${cssConstants.join("|")})\\b`), token: "constant"},
                    {regex: /^\b(cm|mm|in|px|pt|pc|em|rem|vw|vh)\b/, token: "unit"},
                ],
            },
            {regex: /^(::?[a-z]+)/, token: "selector-pseudo"},
            {regex: /^(\[[^\]]+\])/, token: "selector-attr"},
            {regex: /^(\.[\w\-\_]+)/, token: "selector-class"},
            {regex: /^(\#[\w\-\_]+)/, token: "selector-id"},
            {regex: /^(body|html|a|div|table|td|tr|th|input|button|textarea|label|form|svg|g|path|rect|circle|ul|li|ol)\b/, token: "selector-tag"},
            {regex: /^(\'(?:.)*?\')|^(\"(?:.)*?\")/, token: "string"},
        ],
    },
    markdown: {
        aliases: ["md"],
        rules: [
            {regex: /^(#{1,6}[^\n]+)/, token: "section"},
            {regex: /^(\`{3}[^\`{3}]+\`{3})/, token: "code"},
            {regex: /^(\`[^\`\n]+\`)/, token: "code"},
            {regex: /^ *([\*\-+:]|\d+\.) /, token: "bullet"},
            {regex: /^(\*{2}[^\*\n]+\*{2})/, token: "strong"},
            {regex: /^(\*[^\*\n]+\*)/, token: "emphasis"},
            {
                regex: /^(!?\[[^\]\n]*]\([^\)\n]+\))/,
                rules: [
                    {
                        regex: /^(\[.+\])/,
                        rules: [
                            {regex: /^([^\[\]]+)/, token: "string"},
                        ],
                    },
                    {
                        regex: /^(\(.+\))/,
                        rules: [
                            {regex: /^([^\(\)]+)/, token: "link"},
                        ],
                    }
                ],
            },
            {regex: /^(\> [^\n]+)/, token: "quote"},
        ],
    },
};

const getRule = (rules, str) => {
    return rules.find(rule => {
        if (rule.starts) {
            return rule.starts.test(str) && rule.ends.test(str);
        }
        return rule.regex.test(str);
    });
};

const getMatch = (rule, str) => {
    if (rule.starts) {
        const match = rule.ends.exec(str);
        return str.substring(0, match.index + match[0].length);
    }
    return rule.regex.exec(str)[0];
};

const _highlight = (code, rules) => {
    let text = "", i = 0;
    while (i < code.length) {
        const subCode = code.substring(i);
        const rule = getRule(rules, subCode);
        if (rule) {
            const match = getMatch(rule, subCode);
            if (match.length > 0) {
                text = text + (rule.rules ? _highlight(match, rule.rules) : `<span class="token-${rule.token}">${escape(match)}</span>`);
                i = i + match.length;
                continue;
            }
        }
        text = text + escape(code[i]);
        i = i + 1;
    }
    return text;
};

export const highlight = (code, language = "javascript") => {
    return _highlight(code, languages[language]?.rules || []);
};
