# ReViva — Backend ♻️

## Sobre

O backend do ReViva é responsável pelo processamento das informações, comunicação com o banco de dados MySQL, cadastro e login dos usuários e controle de acesso ao sistema.

## Tecnologias utilizadas

- Node.js
- Express
- MySQL
- mysql2
- bcryptjs
- jsonwebtoken (JWT)
- dotenv
- cors
- nodemon

## Estrutura de pastas

```text
backend/
├── controllers/
│   └── usuariosController.js
├── database/
│   └── conexao.js
├── middlewares/
│   └── usuariosMiddleware.js
├── routes/
│   └── usuariosRoutes.js
├── server.js
├── package.json
├── .env
└── README.md
```

## Banco de dados

O backend utiliza o MySQL para armazenar as informações do sistema.

O banco de dados se chama `reviva` e possui quatro tabelas:

- **usuarios:** dados dos usuários cadastrados;
- **materiais:** informações sobre materiais recicláveis;
- **pontos_coleta:** locais de coleta;
- **reciclagens:** registros das atividades de reciclagem.

As tabelas possuem relacionamentos por meio de chaves primárias e estrangeiras.

## Funcionalidades implementadas

- Cadastro de usuários;
- Validação de dados;
- Verificação de e-mails duplicados;
- Criptografia de senhas com bcryptjs;
- Login de usuários;
- Geração de tokens JWT;
- Verificação de autenticação;
- Controle de acesso de administradores;
- Conexão com o banco de dados MySQL.

## Instalação

Dentro da pasta `backend`, execute:

```bash
npm init -y
```

Instale as dependências:

```bash
npm install express mysql2 bcryptjs jsonwebtoken dotenv cors
```

Instale o Nodemon:

```bash
npm install --save-dev nodemon
```

## Configuração do banco de dados

Crie o banco de dados executando o arquivo `reviva.sql` no MySQL Workbench.

Configure o arquivo `.env` com os dados da conexão:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=reviva

JWT_SECRET=sua_chave_secreta
JWT_EXPIRES_IN=2h

PORT=3300
```

Substitua os valores de exemplo pelas configurações do seu ambiente.

## Executar o servidor

Para iniciar o backend em modo de desenvolvimento:

```bash
npm run dev
```

O servidor estará disponível em:

```text
http://localhost:3300
```

## Rotas disponíveis

| Método | Rota | Função |
|---|---|---|
| GET | `/` | Verificar se a API está funcionando |
| POST | `/api/usuarios/cadastro` | Cadastrar usuário |
| POST | `/api/usuarios/login` | Realizar login |
| GET | `/api/usuarios/perfil` | Consultar perfil autenticado |
| GET | `/api/usuarios/administrador` | Acessar área administrativa |

As rotas protegidas exigem um token JWT válido no cabeçalho `Authorization`, utilizando o formato `Bearer`.

## Segurança

- As senhas são protegidas com bcryptjs;
- O JWT identifica os usuários autenticados;
- As rotas protegidas verificam a validade do token;
- O acesso administrativo possui controle de permissão;
- As informações sensíveis ficam armazenadas no arquivo `.env`, que não deve ser enviado ao GitHub.

## Status

Atividade 2 — Banco de dados e autenticação implementados.
