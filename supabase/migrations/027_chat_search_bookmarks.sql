-- Migration: 027_chat_search_bookmarks
-- Description: Add full-text search and bookmark support to chat messages
-- Supports: message bookmarking, full-text search, transcript export

-- ============================================================================
-- ADD BOOKMARK AND SEARCH COLUMNS
-- ============================================================================

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Index for bookmarked messages (partial - only bookmarked)
CREATE INDEX IF NOT EXISTS idx_chat_messages_bookmarked
    ON chat_messages (chat_id, created_at DESC)
    WHERE is_bookmarked = true;

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_chat_messages_search
    ON chat_messages USING GIN(search_vector);

-- ============================================================================
-- SEARCH VECTOR TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_chat_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_messages_search_vector_trigger ON chat_messages;
CREATE TRIGGER chat_messages_search_vector_trigger
    BEFORE INSERT OR UPDATE OF content ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_message_search_vector();

-- Backfill existing messages
UPDATE chat_messages
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;

-- ============================================================================
-- SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION search_chat_messages(
    p_chat_id UUID,
    p_query TEXT,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    chat_id UUID,
    role TEXT,
    content TEXT,
    is_bookmarked BOOLEAN,
    created_at TIMESTAMPTZ,
    rank REAL,
    headline TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.chat_id,
        cm.role::TEXT,
        cm.content,
        cm.is_bookmarked,
        cm.created_at,
        ts_rank(cm.search_vector, websearch_to_tsquery('english', p_query)) AS rank,
        ts_headline(
            'english',
            cm.content,
            websearch_to_tsquery('english', p_query),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, MaxFragments=2'
        ) AS headline
    FROM chat_messages cm
    WHERE cm.chat_id = p_chat_id
      AND cm.search_vector @@ websearch_to_tsquery('english', p_query)
    ORDER BY rank DESC, cm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_chat_messages IS 'Full-text search within a specific chat with relevance ranking and headline snippets';
