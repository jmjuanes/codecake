export const lineNumbers = options => {
    options = options || {};
    return ctx => {
        if (!ctx.lines) {
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
            ctx.lines = document.createElement("div");
            ctx.lines.style.position = "absolute";
            ctx.lines.style.top = "0px";
            ctx.lines.style.right = "0px";
            ctx.lines.style.bottom = "0px";
            ctx.lines.style.overflow = "hidden";
            ctx.lines.style.paddingRight = options.padding || "12px";
            container.appendChild(ctx.lines);

            // Fix editor and append lines container
            ctx.editor.parentNode.style.display = "flex"; // Display items in a single row
            ctx.editor.style.order = "2";
            ctx.editor.style.flexGrow = "1"; // Expand to all available space
            ctx.editor.parentNode.appendChild(container);
            ctx.editor.addEventListener("scroll", () => {
                ctx.lines.style.top = `-${ctx.editor.scrollTop}`;
            });
        }

        // Insert line numbers
        const count = ctx.getCode().replace(/n+$/, "\n").split("\n").length;
        if (ctx.linesCount !== count) {
            const linesList = Array.from({length: count}, (v, i) => i + 1);
            ctx.lines.innerText = linesList.join("\n");
            ctx.linesCount = count; // Update num lines
        }
    };
};
