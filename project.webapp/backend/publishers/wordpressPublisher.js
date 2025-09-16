const axios = require('axios');

/**
 * Publishes or updates a WordPress page using the REST API.
 * Supports updating by postId or by slug; if neither exists, creates a new page.
 * Auth via Application Passwords (Basic Auth: username:applicationPassword).
 *
 * @param {Object} params
 * @param {string} params.siteUrl - Base URL of the WordPress site, e.g. https://example.com
 * @param {string} params.username - WordPress username
 * @param {string} params.applicationPassword - WordPress application password
 * @param {string} [params.postId] - Existing page ID to update
 * @param {string} [params.slug] - Slug to find/update/create
 * @param {string} [params.title] - Page title (required for create)
 * @param {string} params.content - HTML content to publish
 * @param {('publish'|'draft'|'pending'|'private')} [params.status='publish'] - Publish status
 */
async function publishWordPressPage(params) {
  const {
    siteUrl,
    username,
    applicationPassword,
    postId,
    slug,
    title,
    content,
    status = 'publish',
    keepHighlights = true,
  } = params;

  if (!siteUrl || !username || !applicationPassword || !content) {
    throw new Error('Missing required parameters: siteUrl, username, applicationPassword, content');
  }

  const base = siteUrl.replace(/\/$/, '');
  const apiBase = `${base}/wp-json/wp/v2`;
  const authHeader = 'Basic ' + Buffer.from(`${username}:${applicationPassword}`).toString('base64');
  const axiosClient = axios.create({
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  // Helper to sanitize highlight artifacts that may be present from previews
  const sanitizeHtml = (html) => {
    try {
      if (!keepHighlights) {
        // Remove optional summary marker
        html = html.replace(/<script[^>]*id=["']ai-change-summary["'][^>]*>[\s\S]*?<\/script>/gi, '');
        // Remove highlight style blocks
        html = html.replace(/<style[^>]*id=["']ai-change-style["'][^>]*>[\s\S]*?<\/style>/gi, '');
        // Replace highlight wrapper with inner content
        html = html.replace(/<span([^>]*class=["'][^"']*ai-change-highlight[^"']*["'][^>]*)>([\s\S]*?)<\/span>/gi, '$2');
      }
      // Optional: ensure DOCTYPE and html/body present is fine; WP will wrap content inside editor
    } catch {}
    return html;
  };

  const cleanedContent = sanitizeHtml(content);

  // Determine endpoint resource for pages (could be posts if needed)
  const resource = 'pages';

  // Update by ID if provided
  if (postId) {
    const { data } = await axiosClient.post(`${apiBase}/${resource}/${postId}`, {
      content: cleanedContent,
      title: title,
      status,
    });
    return data;
  }

  // Try to find by slug if provided
  let existing = null;
  if (slug) {
    const { data: list } = await axiosClient.get(`${apiBase}/${resource}?slug=${encodeURIComponent(slug)}`);
    if (Array.isArray(list) && list.length > 0) {
      existing = list[0];
    }
  }

  if (existing) {
    const { data } = await axiosClient.post(`${apiBase}/${resource}/${existing.id}`, {
      content: cleanedContent,
      title: title || existing.title?.raw || existing.title?.rendered,
      status,
    });
    return data;
  }

  // Create new page
  const { data } = await axiosClient.post(`${apiBase}/${resource}`, {
    title: title || slug || 'New Page',
    slug: slug,
    content: cleanedContent,
    status,
  });
  return data;
}

module.exports = { publishWordPressPage };


