export const lineNumbers = options => {
    options = options || {};
    let lines = null; // Lines container
    return editor => {
        if (!lines) {
            // const parent = editor.parentNode;
            const container = document.createElement("div");
            // container.className = options.className || "lines";
            container.classList.add("CodeCake-lines");
            options.className && container.classList.add(options.className);
            container.style.position = "relative";

            // Initialize lines element
            lines = document.createElement("div");
            lines.style.position = "absolute";
            lines.style.top = "0px";
            lines.style.left = "0px";
            lines.style.bottom = "0px";
            lines.style.overflow = "hidden";
            lines.style.width = options.width || "40px"; // Lines block width
            container.appendChild(lines);

            // Append lines wrapper
            editor.parentNode.insertBefore(container, editor);
            editor.addEventListener("scroll", () => {
                lines.style.top = `-${editor.scrollTop}`;
            });
        }

        // Insert line numbers
        const code = editor.textContent || "";
        const count = code.replace(/n+$/, "\n").split("\n").length;
        const linesList = Array.from({length: count}, (v, i) => i + 1);
        lines.innerText = linesList.join("\n");
    };
};
