-- 1. Add embedding column to memories table
-- Vector size 1536 matches OpenAI text-embedding-3-small or Gemini embeddings
alter table public.memories 
add column if not exists embedding vector(1536);

-- 2. Create the search function (RPC)
create or replace function match_memories (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id text
)
returns table (
  id bigint,
  content text,
  role text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    memories.id,
    memories.content,
    memories.role,
    1 - (memories.embedding <=> query_embedding) as similarity
  from memories
  where memories.user_id = p_user_id
    and 1 - (memories.embedding <=> query_embedding) > match_threshold
  order by memories.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 3. Create a vector index for speed
create index if not exists memories_embedding_idx 
on public.memories 
using hnsw (embedding vector_cosine_ops);
