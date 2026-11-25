import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { unified } from 'unified';

const highlighterPromise = createHighlighterCore({
  themes: [import('shiki/themes/github-dark.mjs')],
  langs: [
    import('shiki/langs/typescript.mjs'),
    import('shiki/langs/javascript.mjs'),
    import('shiki/langs/json.mjs'),
    import('shiki/langs/yaml.mjs'),
    import('shiki/langs/bash.mjs'),
    import('shiki/langs/markdown.mjs'),
    import('shiki/langs/html.mjs'),
    import('shiki/langs/css.mjs'),
    import('shiki/langs/dart.mjs'),
    import('shiki/langs/swift.mjs'),
    import('shiki/langs/kotlin.mjs'),
    import('shiki/langs/sql.mjs'),
    import('shiki/langs/diff.mjs'),
    import('shiki/langs/dockerfile.mjs'),
    import('shiki/langs/toml.mjs'),
  ],
  engine: createJavaScriptRegexEngine(),
});

export async function renderMarkdown(markdown: string): Promise<string> {
  const highlighter = await highlighterPromise;
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeShikiFromHighlighter, highlighter, { theme: 'github-dark' })
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}
