-- 🧹 Script de Limpeza de Dados Órfãos - Postiz
-- Este script remove referências a arquivos de mídia que não existem mais no sistema

-- ========================================
-- 🔍 IDENTIFICAR DADOS ÓRFÃOS
-- ========================================

-- Verificar posts com mídia órfã (arquivo específico que está dando erro)
SELECT 
    id, 
    "organizationId", 
    state,
    "publishDate",
    image,
    "createdAt"
FROM "Post" 
WHERE image::text LIKE '%2481c24a217b2e935469938880459db4.png%'
ORDER BY "createdAt" DESC;

-- Verificar todos os posts com imagens (para análise geral)
SELECT 
    id,
    state,
    image,
    "createdAt"
FROM "Post" 
WHERE image IS NOT NULL 
    AND image != '[]' 
    AND image != 'null'
ORDER BY "createdAt" DESC
LIMIT 20;

-- ========================================
-- 🚨 LIMPEZA ESPECÍFICA - Arquivo Problemático
-- ========================================

-- OPÇÃO 1: Remover apenas a referência problemática mantendo o post
UPDATE "Post" 
SET image = '[]'
WHERE image::text LIKE '%2481c24a217b2e935469938880459db4.png%';

-- Verificar quantos registros foram afetados
SELECT COUNT(*) as "Posts Updated" 
FROM "Post" 
WHERE image = '[]';

-- ========================================
-- 🗑️ LIMPEZA COMPLETA - Posts Órfãos (CUIDADO!)
-- ========================================

-- OPÇÃO 2: Remover posts completamente (APENAS se necessário)
-- DESCOMENTE APENAS SE QUISER DELETAR OS POSTS COMPLETAMENTE

-- DELETE FROM "Post" 
-- WHERE image::text LIKE '%2481c24a217b2e935469938880459db4.png%';

-- ========================================
-- 🔧 LIMPEZA GERAL DE MÍDIA ÓRFÃ
-- ========================================

-- Verificar posts com estado ERROR que podem ter mídia órfã
SELECT 
    id,
    state,
    image,
    "publishDate",
    "createdAt"
FROM "Post" 
WHERE state = 'ERROR' 
    AND image IS NOT NULL 
    AND image != '[]'
ORDER BY "createdAt" DESC;

-- Limpar mídia de posts com ERROR (opcional)
-- UPDATE "Post" 
-- SET image = '[]' 
-- WHERE state = 'ERROR' 
--     AND image IS NOT NULL 
--     AND image != '[]';

-- ========================================
-- 📊 VERIFICAÇÃO FINAL
-- ========================================

-- Contar posts por estado
SELECT 
    state,
    COUNT(*) as count
FROM "Post" 
GROUP BY state
ORDER BY count DESC;

-- Verificar se ainda há referências ao arquivo problemático
SELECT COUNT(*) as "Remaining References"
FROM "Post" 
WHERE image::text LIKE '%2481c24a217b2e935469938880459db4.png%';

-- ========================================
-- 📝 INSTRUÇÕES DE USO
-- ========================================

/*
COMO USAR ESTE SCRIPT:

1. 🔍 PRIMEIRO - Execute as consultas SELECT para ver os dados órfãos
2. 🧹 DEPOIS - Execute o UPDATE para limpar as referências
3. ✅ FINALMENTE - Execute as verificações finais

CONEXÃO COM O BANCO:
psql -U postiz-local -d postiz-db-local -h localhost -f cleanup-orphan-media.sql

OU execute comando por comando no seu cliente SQL favorito.

⚠️ IMPORTANTE:
- Sempre faça backup antes de executar UPDATEs ou DELETEs
- Teste primeiro em ambiente de desenvolvimento
- As operações de DELETE estão comentadas por segurança
*/ 