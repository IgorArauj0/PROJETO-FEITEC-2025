<?php

class Database {
    private $host = 'localhost';
    private $dbname = 'seu_banco_de_dados';
    private $user = 'seu_usuario';
    private $password = 'sua_senha';
    private $charset = 'utf8mb4';

    private $pdo;
    private $error;

    public function __construct() {
        $dsn = "mysql:host={$this->host};dbname={$this->dbname};charset={$this->charset}";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->pdo = new PDO($dsn, $this->user, $this->password, $options);
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            die("Erro de conexão: " . $this->error);
        }
    }

    public function getConnection() {
        return $this->pdo;
    }
}

// Para usar em outro arquivo:
// $database = new Database();
// $pdo = $database->getConnection();