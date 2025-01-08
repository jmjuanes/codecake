interface CodeCakeOptions {
    /**
     * The language of the code. This value will be also passed as the second argument
     * of the function provided in {@link CodeCakeOptions.highlight}
     * @default ""
     */
    language: string;

    /**
     * If set to true, the editor will be in read-only mode
     * @default false
     */
    readOnly: boolean;

    /**
     * If set to true, the editor displays line numbers
     * @default false
     */
    lineNumbers: boolean;

    /**
     * If set to true, the editor will use the tab character "\t" for indentation instead of spaces
     * @default false
     */
    indentWithTabs: boolean;

    /**
     * The number of spaces for a tab
     * @default 4
     */
    tabSize: number;

    /**
     * Automatically close brackets, braces, parentheses, and quotes.
     * @default true
     */
    addClosing: boolean;

    /**
     * The function to use to highlight the code.
     * @param code The code the be highlighted
     * @param language The language to highlight the code in
     * @returns An HTML string representing the highlighted code
     * @default null
     */
    highlight: (code: string, language: string) => string;

    /**
     * A custom classname to customize the editing area
     * @default ""
     */
    className: "codecake-light" | "codecake-dark" | string;
}

interface CodeCakeEditor {
    /**
     * @returns The code in the editor
     */
    getCode(): string;

    /**
     * Sets the code in the editor
     * @param code The code to set
     */
    setCode(code: string): void;

    /**
     * Triggers a callback whenever the code changes
     * @param callback The function to call when the code changes
     */
    onChange(callback: (code: string) => void): void;
}

declare module 'codecake' {
    /**
     * Creates a new CodeCake editor
     * @param parent The parent div to append the editor to
     * @param options The options to use for the editor
     */
    export function create(parent: HTMLDivElement, options?: Partial<CodeCakeOptions>): CodeCakeEditor

    /**
     * Highlights code using the specified language
     * @param code The code to highlight
     * @param language The language to highlight the code in
     * @returns An HTML string representing the highlighted code
     */
    export function highlight(code: string, language: string): string
}