let _config = null;

async function loadConfig() {
  if (_config) return _config;
  let api = {}, file = {};
  try { const r = await fetch('/api/config'); if (r.ok) api = await r.json(); } catch(e) {}
  try { const r = await fetch('config/git_config.json'); if (r.ok) file = await r.json(); } catch(e) {}
  const apiTok = String(api.github_token || '').trim();
  const fileTok = String(file.github_token || '').trim();
  _config = {
    github_token: (apiTok && apiTok !== 'YOUR_GITHUB_TOKEN') ? apiTok : fileTok,
    github_owner: file.github_owner || '',
    github_repo: file.github_repo || '',
    data_file_path: file.data_file_path || 'data/posts.json',
    admin_password: api.admin_password || file.admin_password || 'admin1234',
    kakao_channel_id: api.kakao_channel_id || file.kakao_channel_id || '_your_channel_id'
  };
  return _config;
}

function isAdmin() {
  return sessionStorage.getItem('isAdmin') === 'true';
}

function requireAdmin() {
  if (!isAdmin()) {
    window.location.href = 'admin.html';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInlineCode(text) {
  const parts = text.split('`');
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      result += `<code class="bg-surface px-1.5 py-0.5 rounded font-mono text-sm">${parts[i]}</code>`;
    } else {
      let segment = parts[i];
      segment = segment.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
      segment = segment.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
      segment = segment.replace(/~~([\s\S]+?)~~/g, '<del>$1</del>');
      segment = segment.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (match, linkText, url) => {
        const cleanUrl = url.trim();
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('mailto:')) {
          return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-semibold">${linkText}</a>`;
        }
        return linkText;
      });
      result += segment;
    }
  }
  return result;
}

function renderMarkdown(src) {
  if (!src) return '';
  const escaped = escapeHtml(src);
  const blocks = escaped.split('```');
  let htmlResult = [];
  
  for (let i = 0; i < blocks.length; i++) {
    if (i % 2 === 1) {
      const codeContent = blocks[i];
      const lines = codeContent.split('\n');
      let lang = '';
      let code = codeContent;
      if (lines.length > 0 && lines[0].trim().match(/^[a-zA-Z0-9_-]+$/)) {
        lang = lines[0].trim();
        code = lines.slice(1).join('\n');
      }
      htmlResult.push(`<pre class="bg-surface p-4 rounded-xl font-mono text-sm my-4 overflow-x-auto border border-border"><code>${code.trim()}</code></pre>`);
    } else {
      const content = blocks[i];
      const lines = content.split('\n');
      let inList = false;
      let inOrderedList = false;
      
      for (let j = 0; j < lines.length; j++) {
        let line = lines[j];
        const unorderedMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
        const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
        
        if (unorderedMatch) {
          if (inOrderedList) {
            htmlResult.push('</ol>');
            inOrderedList = false;
          }
          if (!inList) {
            htmlResult.push('<ul class="list-disc pl-6 my-4 space-y-1">');
            inList = true;
          }
          htmlResult.push(`<li>${renderInlineCode(unorderedMatch[2])}</li>`);
          continue;
        } else if (orderedMatch) {
          if (inList) {
            htmlResult.push('</ul>');
            inList = false;
          }
          if (!inOrderedList) {
            htmlResult.push('<ol class="list-decimal pl-6 my-4 space-y-1">');
            inOrderedList = true;
          }
          htmlResult.push(`<li>${renderInlineCode(orderedMatch[2])}</li>`);
          continue;
        } else {
          if (inList) {
            htmlResult.push('</ul>');
            inList = false;
          }
          if (inOrderedList) {
            htmlResult.push('</ol>');
            inOrderedList = false;
          }
        }
        
        if (line.startsWith('&gt; ')) {
          htmlResult.push(`<blockquote class="border-l-4 border-primary pl-4 italic my-4 text-muted">${renderInlineCode(line.substring(5))}</blockquote>`);
          continue;
        }
        if (line.startsWith('&gt;')) {
          htmlResult.push(`<blockquote class="border-l-4 border-primary pl-4 italic my-4 text-muted">${renderInlineCode(line.substring(4))}</blockquote>`);
          continue;
        }
        if (line.trim() === '---' || line.trim() === '***') {
          htmlResult.push('<hr class="my-6 border-border">');
          continue;
        }
        if (line.startsWith('# ')) {
          htmlResult.push(`<h1 class="text-3xl font-bold my-4 text-foreground">${renderInlineCode(line.substring(2))}</h1>`);
        } else if (line.startsWith('## ')) {
          htmlResult.push(`<h2 class="text-2xl font-bold my-3 text-foreground">${renderInlineCode(line.substring(3))}</h2>`);
        } else if (line.startsWith('### ')) {
          htmlResult.push(`<h3 class="text-xl font-bold my-2 text-foreground">${renderInlineCode(line.substring(4))}</h3>`);
        } else if (line.trim() === '') {
          htmlResult.push('<br>');
        } else {
          htmlResult.push(`<p class="my-2 text-body">${renderInlineCode(line)}</p>`);
        }
      }
      if (inList) htmlResult.push('</ul>');
      if (inOrderedList) htmlResult.push('</ol>');
    }
  }
  return htmlResult.join('\n');
}

function markdownToText(src) {
  if (!src) return '';
  let clean = src;
  if (src.startsWith('---')) {
    const parts = src.split('---');
    if (parts.length >= 3) {
      clean = parts.slice(2).join('---');
    }
  }
  clean = clean
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`\n]+?)`/g, '$1')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/\*([\s\S]+?)\*/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1')
    .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*#+\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/<[^>]*>/g, '');
  return clean.trim();
}

async function getPosts() {
  const config = await loadConfig();
  const isGitConfigured = config.github_token && config.github_token !== 'YOUR_GITHUB_TOKEN' && config.github_owner && config.github_repo;
  
  if (isGitConfigured) {
    try {
      const cleanToken = String(config.github_token).replace(/\s+/g, "");
      const url = `https://api.github.com/repos/${config.github_owner}/${config.github_repo}/contents/${config.data_file_path}`;
      const res = await fetch(url, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `token ${cleanToken}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        const content = atob(json.content.replace(/\n/g, ''));
        const posts = JSON.parse(decodeURIComponent(escape(content)));
        localStorage.setItem('posts', JSON.stringify(posts));
        return posts;
      }
    } catch (e) {
      console.error("GitHub fetch failed, falling back to local storage:", e);
    }
  }
  
  let local = localStorage.getItem('posts');
  if (local) {
    return JSON.parse(local);
  }
  
  try {
    const res = await fetch('data/posts.json');
    if (res.ok) {
      const posts = await res.json();
      localStorage.setItem('posts', JSON.stringify(posts));
      return posts;
    }
  } catch (e) {
    console.error("Local data/posts.json fetch failed:", e);
  }
  return [];
}

async function savePost(post) {
  const config = await loadConfig();
  let posts = await getPosts();
  
  if (post.id) {
    posts = posts.map(p => p.id === post.id ? { ...p, ...post, date: post.date || new Date().toISOString().split('T')[0] } : p);
  } else {
    post.id = Date.now().toString();
    post.date = post.date || new Date().toISOString().split('T')[0];
    posts.unshift(post);
  }
  
  const isGitConfigured = config.github_token && config.github_token !== 'YOUR_GITHUB_TOKEN' && config.github_owner && config.github_repo;
  if (isGitConfigured) {
    try {
      const cleanToken = String(config.github_token).replace(/\s+/g, "");
      const url = `https://api.github.com/repos/${config.github_owner}/${config.github_repo}/contents/${config.data_file_path}`;
      
      let sha = null;
      const getFile = await fetch(url, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `token ${cleanToken}`
        }
      });
      if (getFile.ok) {
        const fileJson = await getFile.json();
        sha = fileJson.sha;
      }
      
      const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(posts, null, 2))));
      const body = {
        message: post.id ? "feat: update post" : "feat: create new post",
        content: contentBase64,
        sha: sha
      };
      
      const putFile = await fetch(url, {
        method: "PUT",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "Authorization": `token ${cleanToken}`
        },
        body: JSON.stringify(body)
      });
      
      if (!putFile.ok) {
        throw new Error(`GitHub upload failed with status ${putFile.status}`);
      }
    } catch (e) {
      console.error("GitHub upload failed:", e);
      throw e;
    }
  }
  
  localStorage.setItem('posts', JSON.stringify(posts));
}

async function deletePost(id) {
  const config = await loadConfig();
  let posts = await getPosts();
  posts = posts.filter(p => p.id !== id);
  
  const isGitConfigured = config.github_token && config.github_token !== 'YOUR_GITHUB_TOKEN' && config.github_owner && config.github_repo;
  if (isGitConfigured) {
    try {
      const cleanToken = String(config.github_token).replace(/\s+/g, "");
      const url = `https://api.github.com/repos/${config.github_owner}/${config.github_repo}/contents/${config.data_file_path}`;
      
      let sha = null;
      const getFile = await fetch(url, {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Authorization": `token ${cleanToken}`
        }
      });
      if (getFile.ok) {
        const fileJson = await getFile.json();
        sha = fileJson.sha;
      }
      
      const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(posts, null, 2))));
      const body = {
        message: "feat: delete post",
        content: contentBase64,
        sha: sha
      };
      
      const putFile = await fetch(url, {
        method: "PUT",
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "Authorization": `token ${cleanToken}`
        },
        body: JSON.stringify(body)
      });
      
      if (!putFile.ok) {
        throw new Error(`GitHub delete failed with status ${putFile.status}`);
      }
    } catch (e) {
      console.error("GitHub upload failed during delete:", e);
      throw e;
    }
  }
  
  localStorage.setItem('posts', JSON.stringify(posts));
}

async function openKakaoTalk() {
  const config = await loadConfig();
  const channelId = config.kakao_channel_id || '_your_channel_id';
  const webUrl = `https://pf.kakao.com/${channelId}/chat`;
  const appUrl = `kakaoplus://plusfriend/chat/${channelId}`;
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    const start = Date.now();
    window.location.href = appUrl;
    setTimeout(() => {
      if (Date.now() - start < 2000) {
        window.location.href = webUrl;
      }
    }, 1500);
  } else {
    window.open(webUrl, '_blank');
  }
}

window.db = {
  loadConfig,
  isAdmin,
  requireAdmin,
  escapeHtml,
  renderMarkdown,
  markdownToText,
  getPosts,
  savePost,
  deletePost,
  openKakaoTalk
};
