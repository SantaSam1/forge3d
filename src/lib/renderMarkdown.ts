// Minimal markdown renderer — enough for blog posts (headings, paragraphs,
// bold/italic, links, images, lists, blockquotes, code).
// Avoids pulling in a heavy markdown dependency for a simple use case.

function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" class="blog-img" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let listOpen: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listOpen) { html.push(`</${listOpen}>`); listOpen = null; }
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line === '') { closeList(); continue; }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      closeList();
      html.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }

    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      if (listOpen !== 'ul') { closeList(); html.push('<ul>'); listOpen = 'ul'; }
      html.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (listOpen !== 'ol') { closeList(); html.push('<ol>'); listOpen = 'ol'; }
      html.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    // Standalone image on its own line
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      closeList();
      html.push(`<img src="${img[2]}" alt="${img[1]}" loading="lazy" class="blog-img" />`);
      continue;
    }

    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();

  return html.join('\n');
}
