# ReViva ♻️

Plataforma web para incentivar a reciclagem e o descarte correto de resíduos.

## Estrutura

- `frontend/`: interface web;
- `backend/`: API Node.js/Express, autenticação e acesso ao MySQL;
- `sql/schema.sql`: criação do banco `reviva` e suas tabelas.

## Implementado nesta etapa

- Cadastro e login de usuários com senha protegida por bcrypt;
- Autenticação JWT e rotas de exemplo protegidas por perfil;
- Estrutura MySQL para usuários, materiais, pontos de coleta e reciclagens.

Consulte [backend/README.md](backend/README.md) para configuração, execução e teste da API.

# Atividade 2 realizada 04/11

Nesta etapa, foi desenvolvida a estrutura do banco de dados e implementado o sistema de cadastro, login e segurança dos usuários.

Banco de dados

Foi criado o banco de dados MySQL chamado reviva, contendo quatro tabelas relacionadas:

usuarios: armazena nome, e-mail, senha, tipo de usuário e pontuação;

materiais: contém informações sobre os materiais recicláveis;

pontos_coleta: registra os locais de coleta;

reciclagens: armazena os registros de reciclagem, relacionando usuários, materiais e pontos de coleta.

As tabelas utilizam chaves primárias e estrangeiras para estabelecer os relacionamentos.

Funcionalidades implementadas

Cadastro de usuários;

Validação dos campos obrigatórios;

Verificação de e-mails duplicados;

Criptografia de senhas;

Login de usuários;

Geração e validação de tokens JWT;

Autenticação de acesso às rotas;

Diferenciação entre usuários comuns e administradores;

Conexão real entre o backend e o MySQL.

Tecnologias utilizadas

Node.js: desenvolvimento do backend;

Express: criação do servidor e das rotas;

MySQL: armazenamento dos dados;

mysql2: conexão com o banco de dados;

bcryptjs: proteção das senhas;

jsonwebtoken: autenticação por tokens;

dotenv: gerenciamento de variáveis de ambiente;

cors: configuração da comunicação entre aplicações;

Nodemon: reinicialização automática do servidor durante o desenvolvimento.

Estrutura do backend

controllers/: lógica do cadastro e login;

database/: conexão com o banco de dados;

middlewares/: verificação de autenticação e permissões;

routes/: definição das rotas;

server.js: inicialização do servidor.

# Segurança

As senhas são armazenadas de forma criptografada utilizando bcryptjs. O sistema também utiliza tokens JWT para identificar usuários autenticados e controlar o acesso às rotas.

O cadastro público permite apenas a criação de contas comuns. O acesso administrativo é controlado separadamente.

# Status

Atividade 2 concluída: banco de dados estruturado, conexão com MySQL e sistema de autenticação implementados.

# Próximas etapas

Desenvolvimento do CRUD das principais funcionalidades;

Integração do frontend com a API;

Histórico de reciclagens e sistema de pontuação;

Testes e documentação final.
