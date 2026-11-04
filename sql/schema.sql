CREATE DATABASE IF NOT EXISTS reviva
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE reviva;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  senha VARCHAR(255) NOT NULL,
  tipo_usuario ENUM('comum', 'administrador') NOT NULL DEFAULT 'comum',
  pontos INT UNSIGNED NOT NULL DEFAULT 0,
  data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS materiais (
  id_material INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  pontos_por_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id_material),
  CONSTRAINT chk_materiais_pontos CHECK (pontos_por_kg >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pontos_coleta (
  id_ponto INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  endereco VARCHAR(255) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  PRIMARY KEY (id_ponto)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reciclagens (
  id_reciclagem INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario INT UNSIGNED NOT NULL,
  id_material INT UNSIGNED NOT NULL,
  id_ponto INT UNSIGNED NOT NULL,
  quantidade_kg DECIMAL(10,3) NOT NULL,
  pontos_gerados INT UNSIGNED NOT NULL DEFAULT 0,
  data_reciclagem TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_reciclagem),
  KEY idx_reciclagens_usuario (id_usuario),
  KEY idx_reciclagens_material (id_material),
  KEY idx_reciclagens_ponto (id_ponto),
  CONSTRAINT fk_reciclagens_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_reciclagens_material FOREIGN KEY (id_material) REFERENCES materiais (id_material)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_reciclagens_ponto FOREIGN KEY (id_ponto) REFERENCES pontos_coleta (id_ponto)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_reciclagens_quantidade CHECK (quantidade_kg > 0)
) ENGINE=InnoDB;
