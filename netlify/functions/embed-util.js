/**
 * Shared Embedding Utility
 *
 * NOT a Netlify function — just a module require()'d by other functions.
 * Generates embeddings via OpenAI text-embedding-3-small and stores them
 * in Firestore RAG chunks.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';

async function generateEmbedding(content) {
  if (!OPENAI_API_KEY) {
    return { success: false, error: 'OPENAI_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: content.slice(0, 8000)
      })
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return {
      success: true,
      embedding: data.data[0].embedding,
      dimensions: data.data[0].embedding.length,
      tokens: data.usage.total_tokens,
      cost: (data.usage.total_tokens / 1000000 * 0.02).toFixed(6)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function embedAndStore(db, admin, docId, content, collection = 'rag_knowledge_base') {
  const result = await generateEmbedding(content);
  if (!result.success) {
    console.error(`[embed-util] Failed to embed ${docId}: ${result.error}`);
    return result;
  }

  try {
    await db.collection(collection).doc(docId).update({
      embedding: result.embedding,
      embeddedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[embed-util] Embedded ${docId} (${result.dimensions}d, ${result.tokens} tokens)`);
    return result;
  } catch (error) {
    console.error(`[embed-util] Failed to store embedding for ${docId}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { generateEmbedding, embedAndStore };
