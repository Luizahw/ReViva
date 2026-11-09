# Backend ReViva

API Node.js 24 com Express, ES Modules, MySQL, bcryptjs e JWT.

## Preparação

Na raiz do projeto, crie o banco e as tabelas executando `sql/schema.sql` no MySQL. Dentro de `backend`, copie `.env.example` para `.env` e informe as credenciais reais do seu MySQL e uma chave JWT aleatória com pelo menos 32 caracteres. O `.env` não deve ser enviado ao Git.

As dependências já estão declaradas em `package.json` e registradas no `package-lock.json`. Em uma instalação nova, execute `npm install` dentro de `backend`.

## Executar

Dentro de `backend`, use `npm run dev` para desenvolvimento ou `npm start`. O servidor testa a conexão MySQL antes de abrir a porta configurada por `PORT` (padrão `3000`).

## Rotas

| Método | Rota | Acesso |
| --- | --- | --- |
| GET | `/api/health` | Público |
| POST | `/api/usuarios/cadastro` | Público |
| POST | `/api/usuarios/login` | Público |
| GET | `/api/usuarios/me` | JWT válido |
| GET | `/api/usuarios/admin` | JWT de administrador |

Cadastro recebe `nome`, `email` e `senha` em JSON. Login recebe `email` e `senha`; a resposta inclui o JWT Bearer. Para rotas protegidas, envie `Authorization: Bearer <token>`. Usuários comuns recebem `403` na rota `/api/usuarios/admin`.

CORS aceita qualquer origem por padrão. Para restringir, configure `CORS_ORIGIN` no `.env` com a origem do frontend.
