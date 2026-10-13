<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/config.php';

echo "FitLife DB seeder — DB_NAME=" . DB_NAME . "\n";

$pdo = db();

// 1) Apply schema
$schema = file_get_contents(dirname(__DIR__, 2) . '/database/schema.sql');
if (!$schema) {
    fwrite(STDERR, "schema.sql introuvable\n");
    exit(1);
}
foreach (array_filter(explode(';', $schema)) as $stmt) {
    // Retire les lignes de commentaire au lieu d'ignorer tout le bloc qui les suit.
    $stmt = trim(preg_replace('/^\s*--.*$/m', '', $stmt));
    // La connexion cible déjà DB_NAME (imposée par l'hébergeur) : on ignore CREATE DATABASE / USE.
    if (preg_match('/^(CREATE\s+DATABASE|USE)\b/i', $stmt)) {
        continue;
    }
    if ($stmt !== '') {
        $pdo->exec($stmt);
    }
}
$pdo->exec('SET FOREIGN_KEY_CHECKS=0');

function truncate_all(PDO $pdo): void
{
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        $pdo->exec("DELETE FROM `$t`");
    }
}
truncate_all($pdo);

// 2) Static catalogs
$badges = [
    ['b_first_step', 'Premier pas', '', 'Parcours ton premier kilomètre.', '1 km', 'bronze'],
    ['b_5km', 'Lance-toi', '', 'Atteins 5 km cumulés.', '5 km', 'bronze'],
    ['b_25km', 'Marcheur régulier', '', 'Atteins 25 km cumulés.', '25 km', 'silver'],
    ['b_10km_5d', 'Machine', '', '10 km pendant 5 jours consécutifs.', '10 km x 5 jours', 'gold'],
    ['b_champion', 'Champion du mois', '', 'Termine 1er du classement mensuel.', 'Top 1 mensuel', 'platinum'],
    ['b_100km', 'Objectif 100 km', '', 'Parcours 100 km dans le mois.', '100 km / mois', 'platinum'],
    ['b_20_sessions', 'Assidu', '', 'Complète 20 séances d’entraînement.', '20 séances', 'silver'],
    ['b_30_days', '30 jours de feu', '', 'Termine le défi 30 jours.', 'Défi 30 jours', 'gold'],
];
$ins = $pdo->prepare('INSERT INTO badges (code, name, emoji, description, requirement, tier) VALUES (?,?,?,?,?,?)');
foreach ($badges as $b) {
    $ins->execute($b);
}

$challenges = [
    ['ch_5km', 'Défi 5 km', '', 'Parcours 5 km en une semaine.', 'distance', 5, 'km', 7, 1240, '-2 days', '5 days', 'b_5km'],
    ['ch_10000_steps', 'Défi 10 000 pas', '', 'Fais 10 000 pas en une journée.', 'steps', 10000, 'pas', 1, 3420, 'today', '+1 days', 'b_first_step'],
    ['ch_100km', 'Défi 100 km', '', 'Parcours 100 km dans le mois.', 'distance', 100, 'km', 30, 860, '-10 days', '+20 days', 'b_100km'],
    ['ch_30_days', 'Défi 30 jours', '', 'Bouge chaque jour pendant 30 jours.', 'days', 30, 'jours', 30, 1250, '-5 days', '+25 days', 'b_30_days'],
    ['ch_20_sessions', 'Défi 20 séances', '', 'Complète 20 séances d’entraînement.', 'sessions', 20, 'séances', 30, 980, '-8 days', '+22 days', 'b_20_sessions'],
];
$ins = $pdo->prepare('INSERT INTO challenges (id, title, emoji, description, metric, target, unit, days, participants, starts_at, ends_at, badge_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
foreach ($challenges as $c) {
    [$id, $title, $emoji, $desc, $metric, $target, $unit, $days, $parts, $start, $end, $badge] = $c;
    $ins->execute([$id, $title, $emoji, $desc, $metric, $target, $unit, $days, $parts, date('Y-m-d H:i:s', strtotime($start)), date('Y-m-d H:i:s', strtotime($end)), $badge]);
}

$plans = [
    ['essential', 'Essentiel', 6500, 65000, ['Programme personnalisé', 'Suivi complet des séances', 'Programme alimentaire de base', 'Podomètre & suivi d’activité', 'Classements et défis', 'Historique des 30 derniers jours'], 0],
    ['premium', 'Premium', 10000, 100000, ['Tout l’Essentiel, plus :', 'Programme alimentaire avancé & liste de courses', 'Lives exclusifs avec les coachs', 'Chat illimité avec un coach', 'Coach IA illimité', 'Défis & classements Premium', 'Statistiques avancées et historique illimité', 'Badges exclusifs'], 1],
];
$ins = $pdo->prepare('INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, features, highlighted) VALUES (?,?,?,?,?,?)');
foreach ($plans as $p) {
    $ins->execute([$p[0], $p[1], $p[2], $p[3], json_encode($p[4], JSON_UNESCAPED_UNICODE), $p[5]]);
}

// Mots de passe des comptes : variables SEED_*_PASSWORD (fichier .env). En production, jamais de
// mot de passe par défaut : à défaut de variable, un mot de passe aléatoire est généré et affiché une fois.
$GLOBALS['seed_credentials'] = [];
function seed_pw(string $key, string $devDefault): string
{
    $pw = env($key) ?? (APP_ENV === 'production' ? rtrim(strtr(base64_encode(random_bytes(12)), '+/', 'Ab'), '=') : $devDefault);
    $GLOBALS['seed_credentials'][$key] = $pw;
    return $pw;
}

// 3) Users (demo / admin / coach / bots)
function insert_user(PDO $pdo, string $id, string $first, string $last, string $email, string $password, string $birth, string $sex, int $height, float $weight, string $role, int $premium, ?string $plan, string $createdDaysAgo): void
{
    $pdo->prepare('INSERT INTO users (id, first_name, last_name, email, phone, password_hash, birth_date, sex, height_cm, weight_kg, role, is_premium, premium_plan, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$id, $first, $last, $email, '+225 07 00 00 00', password_hash($password, PASSWORD_DEFAULT), $birth, $sex, $height, $weight, $role, $premium, $plan, date('Y-m-d H:i:s', time() - $createdDaysAgo * 86400)]);
}

$bots = [
    ['u_amina', 'Amina', 'Thiam', 'born@bot.local'],
    ['u_koffi', 'Koffi', 'Kouassi', 'born@bot.local'],
    ['u_fatou', 'Fatou', 'Ndiaye', 'born@bot.local'],
    ['u_yawa', 'Yawa', 'Atsu', 'born@bot.local'],
    ['u_moussa', 'Moussa', 'Traoré', 'born@bot.local'],
    ['u_grace', 'Grace', 'Olive', 'born@bot.local'],
    ['u_ibrahim', 'Ibrahim', 'Camara', 'born@bot.local'],
    ['u_nadia', 'Nadia', 'Sow', 'born@bot.local'],
    ['u_serge', 'Serge', 'Bamba', 'born@bot.local'],
    ['u_linda', 'Linda', 'Ekan', 'born@bot.local'],
    ['u_paul', 'Paul', 'Mendy', 'born@bot.local'],
    ['u_esther', 'Esther', 'Kanga', 'born@bot.local'],
    ['u_eric', 'Eric', 'Zadi', 'born@bot.local'],
    ['u_sarah', 'Sarah', 'Diop', 'born@bot.local'],
];
$botDist = [14.8, 12.6, 10.4, 9.1, 8.7, 7.9, 7.2, 6.8, 6.1, 5.5, 5.0, 4.4, 3.9, 3.3];
$botIdx = 0;
foreach ($bots as [$id, $first, $last]) {
    insert_user($pdo, $id, $first, $last, "bot_$id@bot.local", bin2hex(random_bytes(12)), '1992-04-12', 'female', 168, 62, 'user', 0, null, 120);
    $pdo->prepare('INSERT INTO user_preferences (user_id, goal, level, days_per_week, session_minutes, equipment, favorite_foods, avoided_foods, allergies, diet_restrictions, budget, meals_per_day, onboarded) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$id, 'fitness', 'intermediate', 4, 30, '["none"]', '[]', '[]', '[]', '[]', 'medium', 3, 1]);
    if ($id === 'u_charly') continue;
    // historical activities to feed leaderboards
    $stepsAgo = [2, 6, 9, 14, 21];
    foreach ($stepsAgo as $i => $daysAgo) {
        $km = $botDist[$botIdx] * (1 / ($i + 0.6)) * (0.6 + ($i % 3) * 0.2);
        $type = $i % 3 === 0 ? 'run' : ($i % 3 === 1 ? 'walk' : 'bike');
        $min = (int) round($km * ($type === 'bike' ? 3 : $type === 'run' ? 6 : 11));
        $start = date('Y-m-d H:i:s', time() - $daysAgo * 86400 - ($i * 3600) % 18000);
        $pdo->prepare("INSERT INTO activities (id, user_id, type, status, started_at, finished_at, duration_seconds, moving_seconds, distance_km, steps, avg_speed_kmh, max_speed_kmh, calories, review_status) VALUES (?,?,'$type','finished',?,?,?,?,?,?,?,?,?,'validated')")
            ->execute([uid('act'), $id, $start, date('Y-m-d H:i:s', strtotime($start) + $min * 60), $min * 60, $min * 60, round($km, 2), (int) round($km * 1330), round($km / max(1, $min) * 60, 1), round($km / max(1, $min) * 84, 1), (int) round($km * ($type === 'run' ? 62 : 42)), 1]);
    }
    // steps
    $pdo->prepare('INSERT INTO steps_log (user_id, date, steps) VALUES (?,?,?)')
        ->execute([$id, date('Y-m-d', time() - 86400), (int) (6000 + $botIdx * 213)]);
    $botIdx++;
}

insert_user($pdo, 'u_charly', 'Charly', 'Diallo', 'demo@fitlife.app', seed_pw('SEED_DEMO_PASSWORD', 'fitlife'), '1993-05-14', 'male', 180, 78, 'user', 1, 'premium', 90);
insert_user($pdo, 'u_admin', 'Admin', 'FitLife', 'admin@fitlife.app', seed_pw('SEED_ADMIN_PASSWORD', 'admin'), '1990-01-01', 'male', 180, 80, 'admin', 1, 'premium', 200);
insert_user($pdo, 'u_superadmin', 'Super', 'Admin', env('SEED_SUPERADMIN_EMAIL') ?? 'superadmin@fitlife.app', seed_pw('SEED_SUPERADMIN_PASSWORD', 'superadmin'), '1987-06-15', 'male', 178, 76, 'superadmin', 1, 'premium', 400);
insert_user($pdo, 'u_coach', 'Coach', 'Awa', 'coach@fitlife.app', seed_pw('SEED_COACH_PASSWORD', 'coach'), '1988-03-01', 'female', 168, 62, 'coach', 1, 'premium', 300);

$demoPrefs = [
    'u_charly' => ['weight_loss', 'intermediate', 4, 30, '["none","dumbbells","mat"]', '["Poulet","Riz","Banane"]', 'medium', 4],
    'u_admin' => ['fitness', 'advanced', 5, 45, '["gym"]', '[]', 'high', 4],
    'u_coach' => ['wellness', 'advanced', 7, 60, '["gym"]', '[]', 'high', 4],
];
foreach ($demoPrefs as $uid => $p) {
    $pdo->prepare('INSERT INTO user_preferences (user_id, goal, level, days_per_week, session_minutes, equipment, favorite_foods, avoided_foods, allergies, diet_restrictions, budget, meals_per_day, onboarded) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)')
        ->execute([$uid, $p[0], $p[1], $p[2], $p[3], $p[4], $p[5], '[]', '[]', '[]', $p[6], $p[7]]);
}

// 4) Charly: historical activities (30 days) + steps + water + weights + badges + notifications + subscription
$seed = 7;
$rnd = function () use (&$seed) {
    $seed = ($seed * 9301 + 49297) % 233280;
    return $seed / 233280;
};
for ($d = 29; $d >= 0; $d--) {
    if ($rnd() < 0.35) continue;
    $type = $rnd() > 0.75 ? 'run' : ($rnd() > 0.4 ? 'walk' : 'bike');
    $km = round($type === 'bike' ? 6 + $rnd() * 10 : 2 + $rnd() * 6, 2);
    $mins = (int) round($km * ($type === 'bike' ? 2.6 : $type === 'run' ? 6 : 11));
    $start = date('Y-m-d H:i:s', time() - $d * 86400 + 7 * 3600 + (int) round($rnd() * 3000));
    $pdo->prepare("INSERT INTO activities (id, user_id, type, status, started_at, finished_at, duration_seconds, moving_seconds, distance_km, steps, avg_speed_kmh, max_speed_kmh, calories, review_status) VALUES (?,?,'$type','finished',?,?,?,?,?,?,?,?,?,'validated')")
        ->execute([uid('act'), 'u_charly', $start, date('Y-m-d H:i:s', strtotime($start) + $mins * 60), $mins * 60, $mins * 60, $km, (int) round($km * 1333), round($km / max(1, $mins) * 60, 1), round($km / max(1, $mins) * 84, 1), (int) round($km * ($type === 'bike' ? 30 : $type === 'run' ? 62 : 42)), 4]);
}
// set today's activity for challeng
$pdo->prepare("INSERT INTO activities (id, user_id, type, status, started_at, finished_at, duration_seconds, moving_seconds, distance_km, steps, avg_speed_kmh, max_speed_kmh, calories, review_status) VALUES (?,?,'walk','finished',?,?,?,?,?,?,?,?,?,'validated')")
    ->execute([uid('act'), 'u_charly', date('Y-m-d 06:30:00'), date('Y-m-d 07:20:00'), 3000, 3000, 4.2, 5600, 5.0, 7.0, 176, 3]);

foreach (range(0, 29) as $d) {
    $stepVal = (int) round(4000 + $rnd() * 7000);
    $pdo->prepare('INSERT INTO steps_log (user_id, date, steps) VALUES (?,?,?) ON DUPLICATE KEY UPDATE steps = ?')
        ->execute(['u_charly', date('Y-m-d', time() - (29 - $d) * 86400), $stepVal, $stepVal]);
}
$pdo->prepare('INSERT INTO steps_log (user_id, date, steps) VALUES (?,?,?) ON DUPLICATE KEY UPDATE steps = ?')
    ->execute(['u_charly', date('Y-m-d'), 6482, 6482]);

$pdo->prepare('INSERT INTO water_log (user_id, date, ml) VALUES (?,?,?)')->execute(['u_charly', date('Y-m-d'), 1800]);
$pdo->prepare('INSERT INTO water_log (user_id, date, ml) VALUES (?,?,?)')->execute(['u_charly', date('Y-m-d', time() - 86400), 2500]);

for ($w = 8; $w >= 0; $w--) {
    $pdo->prepare('INSERT INTO weights (id, user_id, date, value) VALUES (?,?,?,?)')
        ->execute([uid('w'), 'u_charly', date('Y-m-d', time() - $w * 7 * 86400), round(78 + $w * 0.4, 1)]);
}

$earnedBadges = [['b_first_step', '-20 days'], ['b_5km', '-15 days'], ['b_25km', '-5 days']];
foreach ($earnedBadges as $b) {
    $pdo->prepare('INSERT INTO user_badges (user_id, badge_code, earned_at) VALUES (?,?,?)')
        ->execute(['u_charly', $b[0], date('Y-m-d H:i:s', strtotime($b[1]))]);
}

$notifs = [
    ['encouragement', 'Excellent travail', 'Bravo Charly, tu es à 80 % de ton objectif de la semaine !', 0],
    ['leaderboard', 'Amina vient de te dépasser', 'Il te manque 1,2 km pour reprendre la première place !', 0],
    ['live', 'Live dans 1h : Full Body', 'Coach Awa démarre sa séance Full Body dans une heure.', 0],
    ['hydration', 'N’oublie pas de boire', 'Tu es à 1,8 L sur 2,5 L aujourd’hui. Encore un petit effort !', 1],
];
$notif = $pdo->prepare('INSERT INTO notifications (id, user_id, type, title, body, created_at, `read`) VALUES (?,?,?,?,?,?,?)');
foreach ($notifs as $i => $n) {
    $notif->execute([uid('notif'), 'u_charly', $n[0], $n[1], $n[2], date('Y-m-d H:i:s', time() - $i * 3600), $n[3]]);
}

// join 2 challenges for the demo user
foreach (['ch_5km', 'ch_10000_steps'] as $cid) {
    $target = $cid === 'ch_5km' ? 5 : 10000;
    $pdo->prepare('INSERT INTO challenge_participations (challenge_id, user_id, progress, completed) VALUES (?,?,?,?)')
        ->execute([$cid, 'u_charly', min($target, $cid === 'ch_5km' ? 4.8 : 6482), 0]);
}

// subscription for Charly
$pdo->prepare('INSERT INTO subscriptions (id, user_id, plan_id, billing, status, started_at, renews_at) VALUES (?,?,?,?,?,?,?)')
    ->execute([uid('sub'), 'u_charly', 'premium', 'monthly', 'active', date('Y-m-d H:i:s', time() - 30 * 86400), date('Y-m-d H:i:s', time() + 5 * 86400)]);

// 5) Pending activities for the admin review queue
$pending = [
    ['act_pending_speed', 'run', 1800, 24, 48, 68, 1400, 'Vitesse moyenne incohérente (48 km/h).', '-3 hours'],
    ['act_pending_jump', 'bike', 3600, 9, 9, 140, 300, 'Saut GPS anormal détecté (signal suspect).', '-26 hours'],
    ['act_pending_dupe', 'walk', 4200, 12, 10.3, 12, 500, 'Session en doublon détectée.', '-40 hours'],
];
foreach ($pending as $p) {
    [$id, $type, $dur, $km, $avg, $max, $cal, $reason, $ago] = $p;
    $start = date('Y-m-d H:i:s', strtotime($ago));
    $pdo->prepare("INSERT INTO activities (id, user_id, type, status, started_at, finished_at, duration_seconds, moving_seconds, distance_km, steps, avg_speed_kmh, max_speed_kmh, calories, review_status, review_reason) VALUES (?,?,'$type','finished',?,?,?,?,?,?,?,?,?,'pending',?)")
        ->execute([$id, 'u_admin', $start, date('Y-m-d H:i:s', strtotime($start) + $dur), $dur, $dur, $km, (int) round($km * 1330), $avg, $max, $cal, $reason]);
}

// 6) Lives + initial messages
$lives = [
    ['live_1', 'coach_awa', 'Coach Awa', 'Full Body avec Coach Awa', 'Une séance complète pour tout le corps, accessible à tous les niveaux.', 'live', '-25 minutes', 45, 1240, 'beginner', 0],
    ['live_2', 'coach_koffi', 'Coach Koffi', 'HIIT Brûle-graisses', '30 minutes d’intensité pour transpirer et brûler un max de calories.', 'live', '-12 minutes', 30, 860, 'intermediate', 1],
    ['live_3', 'coach_amina', 'Coach Amina', 'Yoga & Récupération', 'Séance douce d’étirements et de respiration pour bien récupérer.', 'scheduled', '+3 hours', 40, 0, 'beginner', 0],
    ['live_4', 'coach_david', 'Coach David', 'Haut du corps – Haltères', 'Développe le haut du corps avec des haltères. Matériel requis.', 'scheduled', '+8 hours', 50, 0, 'advanced', 1],
    ['live_5', 'coach_awa', 'Coach Awa', 'Abdos & Gainage', '20 minutes pour renforcer le centre du corps.', 'scheduled', '+26 hours', 20, 0, 'intermediate', 0],
    ['live_6', 'coach_koffi', 'Coach Koffi', 'Cardio Dance', 'Bouge en musique et amuse-toi en brûlant des calories.', 'ended', '-24 hours', 35, 2100, 'beginner', 0],
    ['live_7', 'coach_amina', 'Coach Amina', 'Nutrition : bien manger après l’effort', 'Les bons réflexes alimentaires pour récupérer efficacement.', 'ended', '-48 hours', 45, 1580, 'beginner', 1],
];
$ins = $pdo->prepare('INSERT INTO lives (id, coach_id, coach_name, title, description, status, scheduled_at, duration_minutes, viewers, level, premium_only) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
foreach ($lives as $l) {
    $ins->execute([$l[0], $l[1], $l[2], $l[3], $l[4], $l[5], date('Y-m-d H:i:s', strtotime($l[6])), $l[7], $l[8], $l[9], $l[10]]);
}
$msgs = [
    ['lm_1', 'live_1', 'u_amina', 'Amina', 'Bonjour Coach ! Prête', '-20 minutes', 0, 0],
    ['lm_2', 'live_1', 'u_koffi', 'Koffi', 'Cette séance est top', '-16 minutes', 0, 0],
    ['lm_3', 'live_1', 'coach_awa', 'Coach Awa', 'On commence par un échauffement de 5 minutes, suivez bien !', '-12 minutes', 1, 0],
    ['lm_4', 'live_1', 'u_fatou', 'Fatou', 'Question : combien de séries pour les squats ?', '-8 minutes', 0, 1],
];
$ins = $pdo->prepare('INSERT INTO live_messages (id, live_id, user_id, user_name, text, created_at, is_coach, is_question) VALUES (?,?,?,?,?,?,?,?)');
foreach ($msgs as $m) {
    $ins->execute([$m[0], $m[1], $m[2], $m[3], $m[4], date('Y-m-d H:i:s', strtotime($m[5])), $m[6], $m[7]]);
}

// 7) Community posts + likes + comments
$posts = [
    ['post_1', 'u_charly', 'Séance du jour terminée ! Les jambes en feu mais tellement fier', '-2 hours', '{"distanceKm":12.6,"type":"run"}', 48],
    ['post_2', 'u_amina', '4e semaine du programme terminée. Le plus dur c’est de commencer, après on y prend goût', '-6 hours', null, 76],
    ['post_3', 'u_fatou', 'Premier 10 km de ma vie ce matin Objectif atteint !', '-20 hours', '{"distanceKm":10,"type":"run"}', 132],
    ['post_4', 'u_koffi', 'Nouveau menu de la semaine ajouté dans mon appli, hâte de tester', '-30 hours', null, 21],
];
$ins = $pdo->prepare('INSERT INTO community_posts (id, user_id, content, activity_json, likes_count, created_at) VALUES (?,?,?,?,?,?)');
foreach ($posts as $p) {
    $ins->execute([$p[0], $p[1], $p[2], $p[3], $p[4], date('Y-m-d H:i:s', strtotime($p[5]))]);
}
$likes = [['post_1', 'u_amina'], ['post_1', 'u_koffi'], ['post_1', 'u_fatou'], ['post_1', 'u_grace'], ['post_2', 'u_fatou'], ['post_2', 'u_yawa'], ['post_2', 'u_nadia'], ['post_2', 'u_linda'], ['post_2', 'u_charly'], ['post_2', 'u_ibrahim'], ['post_2', 'u_sarah'], ['post_3', 'u_charly'], ['post_3', 'u_bob'], ['post_4', 'u_charly'], ['post_4', 'u_sarah'], ['post_4', 'u_moussa']];
foreach ($likes as $l) {
    if ($l[1] !== 'u_bob') {
        $pdo->prepare('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?,?)')->execute($l);
    }
}
$comments = [
    ['c_1', 'post_1', 'u_amina', 'Bravo !', '-1.8 hours'],
    ['c_2', 'post_1', 'u_koffi', 'Belle perf !', '-1.5 hours'],
    ['c_3', 'post_2', 'u_fatou', 'Inspirante !', '-5.5 hours'],
];
$ins = $pdo->prepare('INSERT INTO post_comments (id, post_id, user_id, text, created_at) VALUES (?,?,?,?,?)');
foreach ($comments as $c) {
    $ins->execute([$c[0], $c[1], $c[2], $c[3], date('Y-m-d H:i:s', strtotime($c[4]))]);
}

// 8) Événements + annonces (gérés depuis l'Espace Gestion)
$events = [
    ['evt_run_lagune', 'Course collective du samedi', 'Footing de 6 km à allure libre, trois groupes de niveau. Échauffement guidé par Coach Koffi, étirements et collation offerte à l’arrivée.', 'run', '+3 days 07:00', 90, 'Boulevard de la Lagune, Cocody', 0, 60, 'https://images.unsplash.com/photo-1590333748338-d629e4564ad9?auto=format&fit=crop&q=75&w=900&h=500', 'Coach Koffi'],
    ['evt_atelier_nutrition', 'Atelier : préparer ses repas de la semaine', 'Coach Amina te montre comment préparer 5 déjeuners équilibrés en 1 h 30, avec des produits du marché et un petit budget.', 'workshop', '+6 days 18:30', 90, 'Live FitLife', 1, null, 'https://images.unsplash.com/photo-1665332111329-dd9d7fa46c74?auto=format&fit=crop&q=75&w=900&h=500', 'Coach Amina'],
    ['evt_bootcamp', 'Bootcamp plein air', 'Circuit training en équipe : 45 minutes intenses, tous niveaux. Pense à ta gourde et à ton tapis.', 'meetup', '+10 days 08:00', 60, 'Parc des Sports, Treichville', 0, 40, 'https://images.unsplash.com/photo-1596079306903-9164c205f400?auto=format&fit=crop&q=75&w=900&h=500', 'Coach David'],
];
$ins = $pdo->prepare('INSERT INTO events (id, title, description, category, starts_at, duration_minutes, location, online, capacity, cover_url, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
foreach ($events as $e) {
    $ins->execute([$e[0], $e[1], $e[2], $e[3], date('Y-m-d H:i:s', strtotime($e[4])), $e[5], $e[6], $e[7], $e[8], $e[9], $e[10]]);
}
$pdo->prepare('INSERT IGNORE INTO event_attendees (event_id, user_id) VALUES (?, ?)')->execute(['evt_atelier_nutrition', 'u_charly']);

$announcements = [
    ['ann_planning', 'Nouveau planning des lives', 'À partir de lundi, les lives Full Body passent à 6 h 30 et 19 h. Les replays restent disponibles 7 jours dans l’onglet Lives.', 'important', 1, null, 'Coach Awa', 'coach', '-2 days'],
    ['ann_defi', 'Défi 100 km : dernière ligne droite', 'Il reste 20 jours pour boucler le défi du mois. Les 10 premiers recevront un t-shirt FitLife.', 'info', 0, '+20 days', 'Équipe FitLife', 'admin', '-1 day'],
];
$ins = $pdo->prepare('INSERT INTO announcements (id, title, content, priority, pinned, expires_at, author_name, author_role, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
foreach ($announcements as $a) {
    $created = date('Y-m-d H:i:s', strtotime($a[8]));
    $ins->execute([$a[0], $a[1], $a[2], $a[3], $a[4], $a[5] ? date('Y-m-d H:i:s', strtotime($a[5])) : null, $a[6], $a[7], $created, $created]);
}

// 9) Menu du jour (aujourd'hui et demain)
$menu = [
    [0, 'breakfast', 'Bouillie de mil + arachides', 'Bouillie peu sucrée, une poignée d’arachides grillées et une banane.', 340, 12, 52, 9],
    [0, 'lunch', 'Attiéké + poisson grillé + crudités', 'Une louche d’attiéké, un poisson braisé sans huile ajoutée, tomates, oignons et concombre.', 620, 40, 70, 16],
    [0, 'snack', 'Yaourt nature + mangue', 'Un yaourt nature et une demi-mangue, 1 h avant la séance.', 180, 10, 26, 4],
    [0, 'dinner', 'Soupe de légumes + poulet', 'Soupe maison carottes, courgettes et gombo avec 120 g de poulet.', 360, 28, 34, 10],
    [1, 'breakfast', 'Omelette + légumes + fruit', 'Deux œufs, tomates et oignons revenus, une tranche de pain complet et une orange.', 380, 24, 30, 18],
    [1, 'lunch', 'Riz + haricots + plantain', 'Riz et haricots rouges en quantité égale, quelques rondelles de plantain bouilli.', 590, 22, 92, 12],
];
$ins = $pdo->prepare('INSERT INTO menu_items (id, date, meal_type, name, description, calories, protein, carbs, fat, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)');
foreach ($menu as $i => $m) {
    $ins->execute(['menu_seed_' . $i, date('Y-m-d', strtotime("+{$m[0]} day")), $m[1], $m[2], $m[3], $m[4], $m[5], $m[6], $m[7], 'Coach Amina']);
}

$pdo->exec('SET FOREIGN_KEY_CHECKS=1');
echo "Schema + seeds appliqués.\n";
echo "  Comptes : demo@fitlife.app · admin@fitlife.app · " . (env('SEED_SUPERADMIN_EMAIL') ?? 'superadmin@fitlife.app') . " · coach@fitlife.app\n";
foreach ($GLOBALS['seed_credentials'] as $k => $v) {
    echo "  $k = " . (env($k) ? '(défini dans .env)' : $v) . "\n";
}