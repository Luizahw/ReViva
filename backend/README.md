# Backend ReViva

API em Node.js 24, Express, ES Modules, MySQL (`mysql2`) e JWT. A Atividade 2 continua responsável pelo cadastro e login de usuários; esta entrega acrescenta o CRUD de reciclagens.

## Configuração e execução

1. Execute `sql/schema.sql` no MySQL para criar o banco `reviva`, tabelas e dados iniciais de materiais e pontos.
2. Copie `.env.example` para `.env` e preencha os dados locais do MySQL. Use uma chave `JWT_SECRET` aleatória com pelo menos 32 caracteres. Nunca versione `.env`.
3. No diretório `backend`, execute `npm install` e depois `npm run dev` (ou `npm start`).

A API usa `PORT` quando definido, com padrão `3300`. O CORS aceita uma lista de origens separadas por vírgula em `CORS_ORIGIN`; o exemplo inclui `http://localhost:5500` e `http://localhost:5000`. Se o Live Server usar outra origem (por exemplo, `127.0.0.1`), inclua exatamente essa origem no `.env`. Acesse `frontend/index.html` pelo servidor estático. O Express não serve os arquivos do frontend.

## Rotas

| Método | Caminho | Acesso |
| --- | --- | --- |
| GET | `/api/health` | Público |
| POST | `/api/usuarios/cadastro` | Público; sempre cria usuário comum |
| POST | `/api/usuarios/login` | Público |
| GET | `/api/usuarios/me` | JWT válido |
| GET | `/api/usuarios/admin` | Administrador |
| GET | `/api/materiais` | Público; catálogo do MySQL |
| GET | `/api/pontos` | Público; catálogo do MySQL |
| GET | `/api/reciclagens` | JWT; próprio usuário ou todos para administrador |
| GET | `/api/reciclagens/resumo` | JWT; resumo e atividades do usuário autenticado |
| GET | `/api/reciclagens/:id` | JWT; proprietário ou administrador |
| POST | `/api/reciclagens` | JWT; cria para o usuário autenticado |
| PUT | `/api/reciclagens/:id` | JWT; proprietário ou administrador |
| DELETE | `/api/reciclagens/:id` | JWT; proprietário ou administrador |

Envie JSON nas operações de escrita. O cadastro de reciclagem recebe `id_material`, `id_ponto` e `quantidade_kg`; o servidor determina proprietário e pontuação. Para rotas protegidas, use `Authorization: Bearer <token>`. Uma tentativa de alterar registro de terceiros retorna `403`; ID inválido retorna `400` e registro inexistente retorna `404`.

## Pontuação e consistência

O backend calcula `Math.round(quantidade_kg * pontos_por_kg)` com o valor de `materiais`. Criação, edição e exclusão usam transação MySQL para manter o registro e o saldo do proprietário sincronizados. Na edição, o ajuste é a diferença entre pontos novos e anteriores.

## Demonstração pelo Thunder Client

Cadastre duas contas em `/api/usuarios/cadastro`, faça login e copie os tokens. Use o token de usuário comum para POST/GET/PUT/DELETE. Crie um registro de teste usando um `id_material` e `id_ponto` obtidos nos endpoints de catálogo. Teste a edição com quantidade/material diferentes e confira o saldo em `/api/usuarios/me`. Registre também uma reciclagem com a outra conta e tente consultar/editar/excluir seu ID usando o primeiro token (esperado `403`). Sem token, operações de reciclagem devem responder `401`. Por fim, use um token de administrador para conferir a listagem global. Para promover uma conta de demonstração, atualize `tipo_usuario` diretamente no banco em ambiente local; o cadastro público ignora qualquer campo de perfil enviado.

O roteiro automatizado cobre esses fluxos usando três contas temporárias e remove as contas ao terminar. Com a API em execução e banco de teste preparado, use `npm run test:integration` em `backend`. Se a API estiver em outra porta, defina `API_URL`, por exemplo `http://localhost:3301/api`.
