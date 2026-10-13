<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

class AuthController
{
    public static function register(array $body): void
    {
        $firstName = trim((string) ($body['firstName'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        if ($firstName === '' || $email === '' || strlen($password) < 6) {
            throw new ApiError('Vérifie les informations (mot de passe : 6 caractères minimum).', 400);
        }
        $db = db();
        $exists = $db->prepare('SELECT id FROM users WHERE email = ?');
        $exists->execute([$email]);
        if ($exists->fetch()) {
            throw new ApiError('Un compte existe déjà avec cet email.', 409);
        }

        $id = uid('u');
        $birthDate = (string) ($body['birthDate'] ?? date('Y-m-d'));
        $sex = in_array($body['sex'] ?? '', ['male', 'female', 'other'], true) ? $body['sex'] : 'other';
        $lastName = trim((string) ($body['lastName'] ?? ''));
        $phone = trim((string) ($body['phone'] ?? ''));
        $height = (int) ($body['height'] ?? 170);
        $weight = (float) ($body['weight'] ?? 70);

        $db->prepare(
            'INSERT INTO users (id, first_name, last_name, email, phone, password_hash, birth_date, sex, height_cm, weight_kg, role)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([$id, $firstName, $lastName, $email, $phone, password_hash($password, PASSWORD_DEFAULT), $birthDate, $sex, $height, $weight, 'user']);

        self::ensure_preferences($id);

        $user = self::user_row($id);
        $prefs = self::prefs_row($id);
        json_out(make_session($user, $prefs), 201);
    }

    public static function login(array $body): void
    {
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        $st = db()->prepare('SELECT * FROM users WHERE email = ?');
        $st->execute([$email]);
        $user = $st->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new ApiError('Email ou mot de passe incorrect.', 401);
        }
        self::ensure_preferences($user['id']);
        $prefs = self::prefs_row($user['id']);
        json_out(make_session($user, $prefs));
    }

    public static function logout(): void
    {
        json_out(['ok' => true]);
    }

    /* ---------------- helpers ---------------- */

    public static function user_row(string $userId): array
    {
        $st = db()->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute([$userId]);
        $u = $st->fetch();
        if (!$u) {
            throw new ApiError('Utilisateur introuvable', 404);
        }
        return $u;
    }

    public static function prefs_row(string $userId): array
    {
        $st = db()->prepare('SELECT * FROM user_preferences WHERE user_id = ?');
        $st->execute([$userId]);
        $p = $st->fetch();
        if (!$p) {
            self::ensure_preferences($userId);
            $st->execute([$userId]);
            $p = $st->fetch();
        }
        return $p;
    }

    public static function ensure_preferences(string $userId): void
    {
        $defaults = [
            'goal' => 'fitness', 'level' => 'beginner', 'days_per_week' => 3,
            'session_minutes' => 30, 'equipment' => '["none"]', 'favorite_foods' => '[]',
            'avoided_foods' => '[]', 'allergies' => '[]', 'diet_restrictions' => '[]',
            'budget' => 'medium', 'meals_per_day' => 3, 'onboarded' => 0,
            'water_goal_ml' => 2500, 'step_goal' => 8000, 'bio' => '', 'city' => '',
        ];
        $db = db();
        $st = $db->prepare('SELECT user_id FROM user_preferences WHERE user_id = ?');
        $st->execute([$userId]);
        if (!$st->fetch()) {
            $db->prepare(
                'INSERT INTO user_preferences (user_id, goal, level, days_per_week, session_minutes, equipment,
                 favorite_foods, avoided_foods, allergies, diet_restrictions, budget, meals_per_day, onboarded,
                 water_goal_ml, step_goal, bio, city)
                 VALUES (:uid,:goal,:level,:dpw,:sm,:eq,:fav,:avo,:all,:die,:bud,:mpd,:onb,:wgoal,:sgoal,:bio,:city)'
            )->execute(array_merge(['uid' => $userId], $defaults));
        }
    }
}