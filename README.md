# CodeCake

> A tiny code editor for the web in less than 200 lines of code.

Why another code editor for the web? I wanted something ver simple, tiny and minimalistic, just for editing smll chunks of HTML, JavaScript or CSS. Finally I decided to create my own code editor with a small syntax highlight.


## Getting started

You can install **CodeCake** using npm:

```bash
$ npm install --save codecake
```

In your HTML code, import the `codecake.css` style:

```html
<link rel="stylesheet" href="https://unpkg.com/codecake/codecake.css">
```

Create a new `<div>` element and add the base `CodeCake` class and one of our themes (`CodeCake-light` or `CodeCake-dark`):

```html
<div id="editor" class="CodeCake CodeCake-dark"></div>
```

In your `<script type="module">` tag, import **CodeCake** and initialize the editor:

```html
<script type="module">
    import {CodeCake} from "https://unpkg.com/codecake/codecake.js";

    const parent = document.getElementById("editor");
    const cake = CodeCake(parent, {});
</script>
```

The first argument of the `CodeCake` function is the reference to the `<div>` element. The second argument is an object with the editor options:

- `readonly`: editor will be in read-only mode. Default is `false`.
- `tabSize`: number of spaces for a tab. Default is `4`.
- `className`: custom classname to customize the editing area.

The `CodeCake` function will return an object with some methods that you can use to manipulate the editor.

Use `cake.getCode()` to get the current code in the editor.

```javascript
const code = cake.getCode();
```

Use `cake.setCode(newCode)` to update the code displayed in the editor.

```javascript
cake.setCode("Hello world");
```

Use `cake.addPlugin` to register a new plugin. For example, you can create your own simple plugin to higlight the code using [PrismJS](https://prismjs.com/):

```javascript
cake.addPlugin(({editor}) => {
    Prism.highlightElement(editor);
});
```

## Line numbers 

You can use our line numbers plugin to display the line numbers on the left side of the editor:

```javascript
import {lineNumbers} from "https://unpkg.com/codecake/linenumbers.js";

cake.addPlugin(linenumbers());
```


## Highlight

We also provide a tiny highlight plugin that you can use to highlight the text in your editor. Only basic web languages are supported (`html`, `js` and `css`). Just import the `highlight` module and enable the plugin in `cake.addPlugin`: 

```javascript
import {highlight} from "https://unpkg.com/codecake/highlight.js";

cake.addPlugin(highlight("html"));
```

## Themes

We provide two themes to customize the editor and the highlighted code:

```html
<!-- Light theme -->
<div id="editor" class="CodeCake CodeCake-light"></div>

<!-- Dark theme -->
<div id="editor" class="CodeCake CodeCake-dark"></div>
```


## License

Released under the MIT License.
