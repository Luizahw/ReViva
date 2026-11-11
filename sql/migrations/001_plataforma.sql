-- Migração incremental da plataforma ReViva.
-- Execute em um backup/ambiente controlado. Não altera nem recria as tabelas existentes.
USE reviva;

CREATE TABLE IF NOT EXISTS conquistas (
  id_conquista INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(60) NOT NULL UNIQUE,
  nome VARCHAR(120) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  icone VARCHAR(40) NOT NULL DEFAULT 'leaf',
  criterio_tipo ENUM('reciclagens', 'peso', 'material', 'diversidade', 'pontos') NOT NULL,
  criterio_valor DECIMAL(12,2) NOT NULL DEFAULT 1,
  criterio_material VARCHAR(100) NULL,
  ativa TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios_conquistas (
  id_usuario INT NOT NULL,
  id_conquista INT NOT NULL,
  desbloqueada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, id_conquista),
  CONSTRAINT fk_uc_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_uc_conquista FOREIGN KEY (id_conquista) REFERENCES conquistas(id_conquista) ON DELETE RESTRICT,
  INDEX idx_uc_desbloqueada (desbloqueada_em)
);

CREATE TABLE IF NOT EXISTS niveis_jornada (
  id_nivel INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nome VARCHAR(80) NOT NULL,
  pontos_minimos INT UNSIGNED NOT NULL,
  ordem INT UNSIGNED NOT NULL UNIQUE,
  icone VARCHAR(40) NOT NULL DEFAULT 'leaf'
);

CREATE TABLE IF NOT EXISTS recompensas (
  id_recompensa INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(140) NOT NULL,
  descricao TEXT NOT NULL,
  parceiro VARCHAR(140) NOT NULL,
  pontos_necessarios INT UNSIGNED NOT NULL,
  quantidade INT UNSIGNED NOT NULL DEFAULT 0,
  imagem_url VARCHAR(500) NULL,
  ativa TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_recompensas_ativas (ativa, nome)
);

CREATE TABLE IF NOT EXISTS resgates (
  id_resgate BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_recompensa INT NOT NULL,
  pontos_gastos INT UNSIGNED NOT NULL,
  status ENUM('pendente', 'concluido', 'cancelado') NOT NULL DEFAULT 'pendente',
  solicitado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resgate_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  CONSTRAINT fk_resgate_recompensa FOREIGN KEY (id_recompensa) REFERENCES recompensas(id_recompensa) ON DELETE RESTRICT,
  INDEX idx_resgate_usuario_data (id_usuario, solicitado_em),
  INDEX idx_resgate_status_data (status, solicitado_em)
);

CREATE TABLE IF NOT EXISTS doacoes (
  id_doacao BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  equipamento VARCHAR(140) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  estado_conservacao ENUM('novo', 'bom', 'regular', 'para_reparo') NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  contato_nome VARCHAR(120) NOT NULL,
  contato_email VARCHAR(255) NOT NULL,
  contato_telefone VARCHAR(40) NULL,
  status ENUM('pendente', 'em_analise', 'aprovada', 'rejeitada', 'concluida') NOT NULL DEFAULT 'pendente',
  observacao_admin TEXT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_doacao_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  INDEX idx_doacoes_usuario_data (id_usuario, criado_em),
  INDEX idx_doacoes_status_data (status, criado_em),
  INDEX idx_doacoes_cidade (cidade)
);

INSERT IGNORE INTO niveis_jornada (codigo, nome, pontos_minimos, ordem, icone) VALUES
  ('semente', 'Semente', 0, 1, 'seedling'),
  ('broto', 'Broto', 100, 2, 'sprout'),
  ('arvore', 'Árvore', 500, 3, 'tree'),
  ('guardiao_verde', 'Guardião Verde', 1500, 4, 'shield-leaf');

INSERT IGNORE INTO conquistas (codigo, nome, descricao, icone, criterio_tipo, criterio_valor, criterio_material) VALUES
  ('primeira_reciclagem', 'Primeira Reciclagem', 'Registre sua primeira reciclagem.', 'recycle', 'reciclagens', 1, NULL),
  ('primeiros_5kg', 'Primeiros 5 kg', 'Recicle ao menos 5 kg no total.', 'weight', 'peso', 5, NULL),
  ('dez_reciclagens', '10 Reciclagens', 'Registre 10 reciclagens.', 'repeat', 'reciclagens', 10, NULL),
  ('mestre_plastico', 'Mestre do Plástico', 'Recicle plástico em 5 registros.', 'bottle', 'material', 5, 'Plástico'),
  ('diversidade_materiais', 'Diversidade de Materiais', 'Recicle ao menos 3 materiais diferentes.', 'layers', 'diversidade', 3, NULL),
  ('cinquenta_kg', '50 kg Reciclados', 'Recicle ao menos 50 kg no total.', 'scale', 'peso', 50, NULL),
  ('guardiao_meio_ambiente', 'Guardião do Meio Ambiente', 'Gere 1.500 pontos em reciclagens.', 'shield-leaf', 'pontos', 1500, NULL);
