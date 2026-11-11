# Banco de dados ReViva

Execute `schema.sql` no MySQL para criar/selecionar `reviva` e criar as tabelas `usuarios`, `materiais`, `pontos_coleta` e `reciclagens`, com suas chaves estrangeiras. O script inclui dados iniciais para os dois catálogos usados nos formulários da Entrega 3.

Não são necessárias alterações de esquema para o CRUD: os campos existentes (`pontos_por_kg`, `pontos_gerados`, `pontos` e relações) dão suporte ao cálculo e à atualização transacional.

## Plataforma

Depois do esquema inicial, execute `migrations/001_plataforma.sql` para adicionar níveis e conquistas, catálogo/resgates de recompensas e doações. A migração usa `CREATE TABLE IF NOT EXISTS` e `INSERT IGNORE` para catálogos internos; não remove nem recria tabelas ou dados existentes. Faça backup antes de aplicá-la em um banco com dados importantes. O catálogo de recompensas não recebe itens fictícios; cadastre parceiros e estoque reais pelo painel administrativo.
