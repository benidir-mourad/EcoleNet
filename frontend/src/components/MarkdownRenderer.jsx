import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

export default function MarkdownRenderer({ content = '' }) {
  return (
    <div className="prose prose-sm max-w-none
      prose-headings:text-gray-800 prose-headings:font-bold
      prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
      prose-p:text-gray-700 prose-p:leading-relaxed
      prose-strong:text-gray-900
      prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
      prose-blockquote:border-l-indigo-400 prose-blockquote:text-gray-600 prose-blockquote:bg-indigo-50 prose-blockquote:py-1 prose-blockquote:rounded-r-lg
      prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
      prose-table:text-sm prose-th:bg-gray-100 prose-th:text-gray-700
      prose-li:text-gray-700
      prose-hr:border-dashed prose-hr:border-gray-300
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
