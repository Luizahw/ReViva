-- =========================================
-- BANCO DE DADOS
-- =========================================

CREATE DATABASE IF NOT EXISTS reviva;

USE reviva;


-- =========================================
-- TABELA DE USUÁRIOS
-- =========================================

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo_usuario ENUM('comum', 'administrador') DEFAULT 'comum',
    pontos INT DEFAULT 0,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- TABELA DE MATERIAIS
-- =========================================

CREATE TABLE IF NOT EXISTS materiais (
    id_material INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    pontos_por_kg DECIMAL(10,2) NOT NULL
);


-- =========================================
-- TABELA DE PONTOS DE COLETA
-- =========================================

CREATE TABLE IF NOT EXISTS pontos_coleta (
    id_ponto INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    endereco VARCHAR(200) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    descricao TEXT
);


-- =========================================
-- TABELA DE RECICLAGENS
-- =========================================

CREATE TABLE IF NOT EXISTS reciclagens (
    id_reciclagem INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_material INT NOT NULL,
    id_ponto INT NOT NULL,
    quantidade_kg DECIMAL(10,2) NOT NULL,
    pontos_gerados INT DEFAULT 0,
    data_reciclagem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reciclagem_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario),

    CONSTRAINT fk_reciclagem_material
        FOREIGN KEY (id_material)
        REFERENCES materiais(id_material),

    CONSTRAINT fk_reciclagem_ponto
        FOREIGN KEY (id_ponto)
        REFERENCES pontos_coleta(id_ponto)
);


-- =========================================
-- DADOS DE TESTE
-- =========================================

INSERT IGNORE INTO materiais
(nome, descricao, pontos_por_kg)
VALUES
('Plástico', 'Garrafas PET, embalagens e outros plásticos recicláveis', 10.00),
('Papel', 'Jornais, revistas, folhas e papelão', 8.00),
('Metal', 'Latas de alumínio e outros metais', 15.00),
('Vidro', 'Garrafas e potes de vidro', 12.00),
('Eletrônicos', 'Celulares, cabos e pequenos aparelhos eletrônicos', 20.00);


INSERT IGNORE INTO pontos_coleta
(nome, endereco, cidade, descricao)
VALUES
('EcoPonto Central', 'Rua Marechal Floriano, 100', 'Santa Cruz do Sul', 'Recebimento de materiais recicláveis'),
('Ponto Verde', 'Rua Tenente Coronel Brito, 250', 'Santa Cruz do Sul', 'Coleta de papel, plástico e metal'),
('Recicla Sul', 'Avenida Independência, 500', 'Santa Cruz do Sul', 'Coleta de diversos materiais'),
('EcoColeta', 'Rua Carlos Trein Filho, 300', 'Santa Cruz do Sul', 'Recebimento de vidro e plástico');


-- =========================================
-- VERIFICAR TABELAS
-- =========================================

SHOW TABLES;

SELECT * FROM usuarios;
SELECT * FROM materiais;
SELECT * FROM pontos_coleta;
SELECT * FROM reciclagens;