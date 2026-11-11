# ReViva ♻️

Plataforma para registrar reciclagens, acompanhar pontos e consultar materiais e locais de coleta. O projeto evolui as Atividades 1 e 2: preserva a identidade visual e o cadastro/login com bcrypt e JWT e integra agora o histórico de reciclagens ao MySQL.

## Estrutura

- `frontend/`: interface HTML, CSS e JavaScript puro, servida por Live Server;
- `backend/`: API Express em ES Modules, autenticação JWT e acesso MySQL;
- `sql/schema.sql`: banco `reviva`, tabelas, chaves estrangeiras e dados iniciais dos catálogos.

## Funcionalidades

- Cadastro público de contas comuns e login com senha protegida por bcrypt;
- Perfil autenticado e autorização de administrador já usados pela Atividade 2;
- CRUD de reciclagens integrado ao MySQL, com consulta por material e ponto;
- Usuários comuns acessam apenas seus registros; administradores consultam e alteram qualquer registro;
- Pontos calculados no backend por `Math.round(quantidade_kg * pontos_por_kg)`;
- Edição e exclusão transacionais com ajuste no saldo do proprietário;
- Dashboard com pontos, total de reciclagens, quilos e atividades recentes consultados no banco;
- Catálogos de materiais e pontos carregados pela API.

## Iniciar

1. Execute `sql/schema.sql` em um servidor MySQL.
2. Copie `backend/.env.example` para `backend/.env`, informe as credenciais e configure um `JWT_SECRET` com no mínimo 32 caracteres. O `.env` está no `.gitignore`.
3. No terminal, entre em `backend`, execute `npm install` e `npm run dev`.
4. Abra `frontend/index.html` com Live Server. O padrão da API é `http://localhost:3300`; para Live Server em `127.0.0.1:5500`, defina `CORS_ORIGIN=http://127.0.0.1:5500` no `.env`.

Consulte [backend/README.md](backend/README.md) para a tabela de rotas e roteiro de demonstração no Thunder Client. O cadastro público não cria administradores; uma conta de teste pode ser promovida diretamente no banco local.
