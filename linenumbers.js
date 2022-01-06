export const lineNumbers = options => {
    options = options || {};
    let lines = null; // Lines container
    let prevCount = -1; // Prev number of lines
    return editor => {
        if (!lines) {
            // const parent = editor.parentNode;
            const container = document.createElement("div");
            // container.className = options.className || "lines";
            container.classList.add("CodeCake-lines");
            options.className && container.classList.add(options.className);
            container.style.position = "relative";
            // container.style.float = "left";
            container.style.height = "100%";
            container.style.width = options.width || "48px";
            container.style.overflow = "hidden";

            // Initialize lines element
            lines = document.createElement("div");
            lines.style.position = "absolute";
            lines.style.top = "0px";
            lines.style.right = "0px";
            lines.style.bottom = "0px";
            lines.style.overflow = "hidden";
            lines.style.paddingRight = options.padding || "12px";
            container.appendChild(lines);

            // Fix editor and append lines container
            editor.parentNode.style.display = "flex"; // Display items in a single row
            editor.style.order = "2";
            editor.style.flexGrow = "1"; // Expand to all available space
            editor.parentNode.appendChild(container);
            editor.addEventListener("scroll", () => {
                lines.style.top = `-${editor.scrollTop}`;
            });
        }

        // Insert line numbers
        const code = editor.textContent || "";
        const count = code.replace(/n+$/, "\n").split("\n").length;
        if (prevCount !== count) {
            const linesList = Array.from({length: count}, (v, i) => i + 1);
            lines.innerText = linesList.join("\n");
            prevCount = count; // Update num lines
        }
    };
};
