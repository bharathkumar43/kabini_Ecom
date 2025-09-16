const axios = require('axios');

/**
 * Publishes improved HTML into a Webflow CMS item rich text field and publishes the item live.
 * Mandatory params: apiToken (or env), collectionId, itemId, content.
 * Field selection: auto-detect common rich-text field keys if not provided.
 */
async function publishWebflowItem(params) {
  const {
    apiToken = process.env.WEBFLOW_API_TOKEN,
    collectionId = process.env.WEBFLOW_COLLECTION_ID,
    itemId,
    content,
    fieldKey, // optional; when omitted, try common keys
    publish = true,
  } = params || {};

  if (!apiToken) throw new Error('Missing Webflow API token');
  if (!collectionId) throw new Error('Missing Webflow collectionId');
  if (!itemId) throw new Error('Missing Webflow itemId');
  if (!content) throw new Error('Missing content');

  const base = 'https://api.webflow.com';
  const client = axios.create({
    baseURL: base,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  // Fetch current item to infer the rich text field key when not provided
  let chosenFieldKey = fieldKey;
  if (!chosenFieldKey) {
    let itemResp;
    try {
      const { data } = await client.get(`/collections/${collectionId}/items/${itemId}`);
      itemResp = data;
    } catch (e) {
      const status = e?.response?.status;
      const message = e?.response?.data || e.message;
      const err = new Error(`Failed to fetch item: ${message}`);
      err.status = status || 500;
      throw err;
    }
    const fields = itemResp?.fieldData || itemResp?.fields || itemResp;
    const candidates = ['body', 'content', 'richtext', 'post-body', 'main-content', 'long-content', 'article-body'];
    chosenFieldKey = candidates.find((k) => fields && Object.prototype.hasOwnProperty.call(fields, k));
    if (!chosenFieldKey) {
      const err = new Error('Unable to detect a rich text field. Provide fieldKey explicitly.');
      err.status = 400;
      throw err;
    }
  }

  // Update item with improved HTML
  const updatePayloadV2 = { fieldData: { [chosenFieldKey]: content } };
  let updateResponse;
  try {
    // Prefer v2 PATCH shape
    updateResponse = await client.patch(`/collections/${collectionId}/items/${itemId}`, updatePayloadV2);
  } catch (e1) {
    try {
      // Fallback to v1 style in case workspace is on v1
      const updatePayloadV1 = { fields: { [chosenFieldKey]: content } };
      updateResponse = await client.patch(`/collections/${collectionId}/items/${itemId}`, updatePayloadV1, {
        headers: { 'accept-version': '1.0.0' }
      });
    } catch (e2) {
      const status = e2?.response?.status || e1?.response?.status;
      const message = e2?.response?.data || e1?.response?.data || e2.message || e1.message;
      const err = new Error(`Failed to update item: ${message}`);
      err.status = status || 500;
      throw err;
    }
  }

  // Optionally publish the item live
  let publishResponse = null;
  if (publish) {
    try {
      // v1-style publish endpoint
      publishResponse = await client.post(`/collections/${collectionId}/items/publish`, {
        itemIds: [itemId],
        live: true,
      }, {
        headers: {
          // Some workspaces require the old accept-version header for publish
          'accept-version': '1.0.0',
        }
      });
    } catch (e) {
      // If publish fails, include error info but don't throw to preserve update success
      return { updated: updateResponse?.data, published: null, publishError: e?.response?.data || e.message };
    }
  }

  return { updated: updateResponse?.data, published: publishResponse?.data || null };
}

module.exports = { publishWebflowItem };


