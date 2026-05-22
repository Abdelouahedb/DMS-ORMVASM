CREATE DATABASE IF NOT EXISTS document_management;
USE document_management;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  service_id INT NOT NULL,
  category VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  upload_date DATETIME NOT NULL,
  solr_id VARCHAR(36),
  original_file_name VARCHAR(255),
  original_mime_type VARCHAR(150),
  original_file_size BIGINT,
  keywords TEXT,
  CONSTRAINT fk_documents_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON UPDATE CASCADE
);
