fetch('/thedonutdan/blog/posts.json')
  .then(res => res.json())
  .then(posts => {
    const container = document.getElementById('post-list');
    if (!container) return;

    const limitAttr = container.dataset.postLimit;
    const limit = limitAttr === 'all'
      ? posts.length
      : parseInt(limitAttr, 10);

    posts
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit)
      .forEach(post => {
        const article = document.createElement('article');
        article.className = 'blogpost-card';

        article.innerHTML = `
          <header class="blogpost-card-header">
            <h3>
              <a href="/thedonutdan/blog/${post.slug}.html">
                ${post.title}
              </a>
            </h3>
            <time datetime="${post.date}">
              ${new Date(post.date).toLocaleDateString()}
            </time>
          </header>
          <p>${post.excerpt}</p>
        `;

        container.appendChild(article);
      });
  });
