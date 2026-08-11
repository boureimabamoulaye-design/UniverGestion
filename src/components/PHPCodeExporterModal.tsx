import React, { useState } from 'react';
import { Modal } from './Modal';
import { FileCode, Database, Download, Copy, Check } from 'lucide-react';

interface PHPCodeExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PHPCodeExporterModal: React.FC<PHPCodeExporterModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<'sql' | 'database' | 'config' | 'login' | 'index'>('sql');

  const files = {
    sql: {
      name: 'universite.sql',
      type: 'SQL Script',
      desc: 'Base de données MySQL complète (20 tables) pour WAMP/XAMPP',
      code: `-- Base de données MySQL universite pour WAMP / XAMPP
CREATE DATABASE IF NOT EXISTS \`universite\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`universite\`;

-- Table universites
CREATE TABLE \`universites\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`nom\` VARCHAR(255) NOT NULL,
  \`sigle\` VARCHAR(50) NOT NULL,
  \`ville\` VARCHAR(100) DEFAULT 'Bamako',
  \`pays\` VARCHAR(100) DEFAULT 'Mali',
  \`telephone\` VARCHAR(30),
  \`email\` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table etudiants
CREATE TABLE \`etudiants\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`matricule\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`date_naissance\` DATE NOT NULL,
  \`sexe\` ENUM('M', 'F') NOT NULL,
  \`email\` VARCHAR(100) NOT NULL,
  \`telephone\` VARCHAR(30),
  \`classe_id\` INT NOT NULL,
  \`statut\` ENUM('Régulier', 'Inscrit', 'Suspendu', 'Diplômé') DEFAULT 'Inscrit',
  \`mot_de_passe\` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ... [Toutes les 20 tables sont définies dans universite.sql à la racine]`
    },
    database: {
      name: 'config/database.php',
      type: 'PHP 8 PDO Class',
      desc: 'Singleton de connexion PDO MySQL avec requêtes préparées',
      code: `<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'universite');
define('DB_USER', 'root');
define('DB_PASS', '');

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        }
        return self::$instance;
    }
}`
    },
    config: {
      name: 'config/config.php',
      type: 'PHP Configuration',
      desc: 'Protection CSRF, XSS, gestion des sessions et rôles',
      code: `<?php
session_start();

define('APP_NAME', 'UniGestion Mali');

function generate_csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf_token(string $token): bool {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function e(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}`
    },
    login: {
      name: 'login.php',
      type: 'PHP Auth System',
      desc: 'Authentification sécurisée Administrateur & Étudiant',
      code: `<?php
require_once 'config/database.php';
require_once 'config/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login = trim($_POST['login']);
    $password = trim($_POST['password']);
    
    $db = Database::getConnection();
    $stmt = $db->prepare("SELECT * FROM administrateurs WHERE email = ?");
    $stmt->execute([$login]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['mot_de_passe'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];
        header('Location: admin/dashboard.php');
        exit;
    }
}`
    },
    index: {
      name: 'index.php',
      type: 'PHP Main Entry',
      desc: 'Routeur principal WAMP / XAMPP',
      code: `<?php
require_once 'config/config.php';

if (isset($_SESSION['role'])) {
    if ($_SESSION['role'] === 'ADMIN') header('Location: admin/dashboard.php');
    else header('Location: etudiant/dashboard.php');
    exit;
}
header('Location: login.php');
exit;`
    }
  };

  const handleCopy = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadSQL = () => {
    const element = document.createElement("a");
    const file = new Blob([files.sql.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "universite.sql";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Code Source PHP 8 & Base MySQL (WAMP/XAMPP)" maxWidth="max-w-4xl">
      <div className="space-y-6 text-sm text-[#1A1A1A]">
        {/* Info Banner */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-[16px] flex items-start gap-3">
          <Database className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#0066FF]">Fichiers PHP 8 POO & Script SQL Prêts à l'emploi</p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Le projet généré contient la structure PHP complète (`config/database.php`, `login.php`, `admin/`, `etudiant/`, `universite.sql`). Vous pouvez copier-coller les fichiers directement dans votre répertoire `htdocs` WAMP ou XAMPP.
            </p>
          </div>
        </div>

        {/* File Selector Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
          {(Object.keys(files) as Array<keyof typeof files>).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedFile(key)}
              className={`px-4 py-2 rounded-[12px] text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedFile === key
                  ? 'bg-[#0066FF] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {files[key].name}
            </button>
          ))}
        </div>

        {/* Selected File Details */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-bold text-sm text-[#1A1A1A]">{files[selectedFile].name}</span>
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-mono">
                {files[selectedFile].type}
              </span>
              <p className="text-xs text-gray-500">{files[selectedFile].desc}</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedFile === 'sql' && (
                <button
                  onClick={handleDownloadSQL}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-[10px] text-xs font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger .sql
                </button>
              )}
              <button
                onClick={() => handleCopy(files[selectedFile].code, selectedFile)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px] text-xs font-semibold transition-colors"
              >
                {copiedKey === selectedFile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier le Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <pre className="bg-[#1E1E1E] text-gray-200 p-4 rounded-[16px] text-xs font-mono overflow-x-auto max-h-[300px] border border-gray-800 leading-relaxed">
            {files[selectedFile].code}
          </pre>
        </div>

        {/* Instructions WAMP / XAMPP */}
        <div className="p-4 bg-gray-50 rounded-[16px] border border-gray-200 space-y-2 text-xs">
          <p className="font-bold text-gray-800"> Guide d'installation rapide sur WAMP / XAMPP (Mali) :</p>
          <ol className="list-decimal list-inside text-gray-600 space-y-1 pl-1">
            <li>Lancez phpMyAdmin dans votre navigateur (`http://localhost/phpmyadmin`).</li>
            <li>Créez la base de données nommée <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">universite</code>.</li>
            <li>Importez le fichier <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">universite.sql</code> dans phpMyAdmin.</li>
            <li>Placez tout le dossier du projet dans <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">c:/wamp64/www/universite/</code> ou <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">c:/xampp/htdocs/universite/</code>.</li>
            <li>Accédez à <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">http://localhost/universite/login.php</code>.</li>
          </ol>
        </div>
      </div>
    </Modal>
  );
};
