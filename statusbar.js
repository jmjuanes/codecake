export const statusBar = options => {
    options = options || {};
    const height = options.height || "25px"
    return ctx => {
        if (!ctx.status) {
            // const parent = editor.parentNode;
            ctx.status = document.createElement("div");
            // container.className = options.className || "lines";
            ctx.status.classList.add("CodeCake-status");
            options.className && ctx.status.classList.add(options.className);
            ctx.status.style.height = height;
            ctx.status.style.width = "100%";
            ctx.status.style.overflow = "hidden";
            ctx.status.style.bottom = `-${height}`;
            ctx.status.style.left = "0px";
            ctx.status.style.position = "absolute";

            // Fix editor and append status bar container
            ctx.editor.parentNode.style.position = "relative";
            ctx.editor.parentNode.style.borderBottom = `${height} solid transparent`;
            ctx.editor.parentNode.appendChild(ctx.status);
        }
    };
};
