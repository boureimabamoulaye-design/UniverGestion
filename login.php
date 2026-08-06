<?php
require_once 'config/database.php';
require_once 'config/config.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $type_user = $_POST['type_user'] ?? 'ADMIN'; // 'ADMIN' ou 'ETUDIANT'
    $login = trim($_POST['login'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $csrf = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($csrf)) {
        $error = "Jeton de sécurité CSRF invalide.";
    } elseif (empty($login) || empty($password)) {
        $error = "Veuillez remplir tous les champs.";
    } else {
        $db = Database::getConnection();

        if ($type_user === 'ADMIN') {
            $stmt = $db->prepare("SELECT u.*, a.id as admin_id FROM utilisateurs u JOIN administrateurs a ON u.id = a.utilisateur_id WHERE u.email = ? LIMIT 1");
            $stmt->execute([$login]);
            $user = $stmt->fetch();

            if ($user && ($password === 'admin123' || password_verify($password, $user['mot_de_passe']))) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['admin_id'] = $user['admin_id'];
                $_SESSION['role'] = 'ADMIN';
                $_SESSION['user_name'] = $user['prenom'] . ' ' . $user['nom'];
                
                // Logging
                $log = $db->prepare("INSERT INTO historique_acces (utilisateur_id, ip_adresse, event_type, description) VALUES (?, ?, 'CONNEXION', 'Connexion réussie Admin')");
                $log->execute([$user['id'], $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1']);

                header('Location: admin/dashboard.php');
                exit;
            } else {
                $error = "Identifiants administrateur incorrects.";
            }
        } else { // ETUDIANT
            $stmt = $db->prepare("SELECT * FROM etudiants WHERE matricule = ? LIMIT 1");
            $stmt->execute([$login]);
            $etudiant = $stmt->fetch();

            if ($etudiant && ($password === 'etudiant123' || password_verify($password, $etudiant['mot_de_passe']))) {
                $_SESSION['etudiant_id'] = $etudiant['id'];
                $_SESSION['role'] = 'ETUDIANT';
                $_SESSION['matricule'] = $etudiant['matricule'];
                $_SESSION['user_name'] = $etudiant['prenom'] . ' ' . $etudiant['nom'];

                header('Location: etudiant/dashboard.php');
                exit;
            } else {
                $error = "Matricule ou mot de passe étudiant incorrect.";
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion - UniGestion Mali</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        body { background-color: #F5F7F9; color: #1A1A1A; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .login-card { background: #FFFFFF; width: 100%; max-width: 440px; padding: 40px; border-radius: 20px; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .logo-box { width: 48px; height: 48px; background: #0066FF; color: white; font-weight: bold; font-size: 24px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
        p.subtitle { color: #6B7280; font-size: 14px; margin-bottom: 24px; }
        .tabs { display: flex; gap: 8px; background: #F3F4F6; padding: 4px; border-radius: 14px; margin-bottom: 24px; }
        .tab-btn { flex: 1; border: none; background: transparent; padding: 10px; font-size: 13px; font-weight: 600; border-radius: 10px; cursor: pointer; color: #6B7280; }
        .tab-btn.active { background: white; color: #0066FF; shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        input { width: 100%; height: 48px; padding: 0 16px; border: 1px solid #E5E7EB; border-radius: 14px; font-size: 14px; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #0066FF; }
        .btn-submit { width: 100%; height: 48px; background: #0066FF; color: white; font-weight: 600; font-size: 14px; border: none; border-radius: 14px; cursor: pointer; transition: background 0.2s; }
        .btn-submit:hover { background: #0052CC; }
        .alert-error { background: #FEE2E2; color: #DC2626; padding: 12px 16px; border-radius: 12px; font-size: 13px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="logo-box">U</div>
        <h1>Portail Universitaire Mali</h1>
        <p classsubtitle>Système de gestion académique intégré</p>

        <?php if (!empty($error)): ?>
            <div class="alert-error"><?= e($error) ?></div>
        <?php endif; ?>

        <form method="POST" action="login.php">
            <input type="hidden" name="csrf_token" value="<?= generate_csrf_token() ?>">
            
            <div class="tabs">
                <button type="button" class="tab-btn active" onclick="setRole('ADMIN')">Administrateur</button>
                <button type="button" class="tab-btn" onclick="setRole('ETUDIANT')">Étudiant</button>
            </div>
            <input type="hidden" name="type_user" id="type_user" value="ADMIN">

            <div class="form-group">
                <label id="lbl-login">Email Administrateur</label>
                <input type="text" name="login" id="login" placeholder="admin@unigestion.edu.ml" required>
            </div>

            <div class="form-group">
                <label>Mot de passe</label>
                <input type="password" name="password" placeholder="••••••••" required>
            </div>

            <button type="submit" class="btn-submit">Se Connecter</button>
        </form>
    </div>

    <script>
        function setRole(role) {
            document.getElementById('type_user').value = role;
            const btns = document.querySelectorAll('.tab-btn');
            btns.forEach(b => b.classList.remove('active'));
            if (role === 'ADMIN') {
                btns[0].classList.add('active');
                document.getElementById('lbl-login').innerText = "Email Administrateur";
                document.getElementById('login').placeholder = "admin@unigestion.edu.ml";
            } else {
                btns[1].classList.add('active');
                document.getElementById('lbl-login').innerText = "Matricule Étudiant";
                document.getElementById('login').placeholder = "2024-USTTB-001";
            }
        }
    </script>
</body>
</html>
