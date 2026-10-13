<?php

declare(strict_types=1);

namespace FitLife\Controllers;

use ApiError;

class ProfileController
{
    public static function get(): void
    {
        $auth = require_auth();
        json_out(user_payload(AuthController::user_row($auth['uid'])));
    }

    public static function update(array $body): void
    {
        $auth = require_auth();
        $id = $auth['uid'];
        $set = [];
        $params = ['id' => $id];
        $map = [
            'firstName' => 'first_name', 'lastName' => 'last_name', 'phone' => 'phone',
            'height' => 'height_cm', 'weight' => 'weight_kg', 'avatarUrl' => 'avatar_url',
            'sex' => 'sex', 'birthDate' => 'birth_date',
        ];
        foreach ($map as $key => $col) {
            if (isset($body[$key])) {
                $set[] = "$col = :$key";
                $params["$key"] = $key === 'height' ? (int) $body[$key] : ($key === 'weight' ? (float) $body[$key] : $body[$key]);
            }
        }
        if ($set) {
            db()->prepare('UPDATE users SET ' . implode(', ', $set) . ' WHERE id = :id')->execute($params);
        }
        json_out(user_payload(AuthController::user_row($id)));
    }

    /** POST /profile/avatar (multipart, champ « avatar ») : JPG, PNG ou WebP, 2 Mo max. */
    public static function uploadAvatar(): void
    {
        $auth = require_auth();
        $file = $_FILES['avatar'] ?? null;
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new ApiError('Aucune image reçue', 400);
        }
        if ($file['size'] > 2 * 1024 * 1024) {
            throw new ApiError('Image trop lourde (2 Mo maximum)', 413);
        }
        $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
        if (!isset($types[$mime]) || @getimagesize($file['tmp_name']) === false) {
            throw new ApiError('Format non pris en charge (JPG, PNG ou WebP)', 415);
        }
        $dir = dirname(__DIR__, 2) . '/public/uploads/avatars';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new ApiError('Stockage indisponible', 500);
        }
        $name = $auth['uid'] . '-' . bin2hex(random_bytes(6)) . '.' . $types[$mime];
        if (!move_uploaded_file($file['tmp_name'], "$dir/$name")) {
            throw new ApiError('Enregistrement de l’image impossible', 500);
        }
        $old = AuthController::user_row($auth['uid'])['avatar_url'] ?? null;
        db()->prepare('UPDATE users SET avatar_url = ? WHERE id = ?')->execute(["/uploads/avatars/$name", $auth['uid']]);
        self::deleteLocalAvatar($old);
        json_out(user_payload(AuthController::user_row($auth['uid'])));
    }

    public static function removeAvatar(): void
    {
        $auth = require_auth();
        $old = AuthController::user_row($auth['uid'])['avatar_url'] ?? null;
        db()->prepare('UPDATE users SET avatar_url = NULL WHERE id = ?')->execute([$auth['uid']]);
        self::deleteLocalAvatar($old);
        json_out(user_payload(AuthController::user_row($auth['uid'])));
    }

    private static function deleteLocalAvatar(?string $url): void
    {
        if ($url && preg_match('#^/uploads/avatars/([\w-]+\.(jpg|png|webp))$#', $url, $m)) {
            @unlink(dirname(__DIR__, 2) . '/public/uploads/avatars/' . $m[1]);
        }
    }

    public static function getPreferences(): void
    {
        $auth = require_auth();
        json_out(prefs_payload(AuthController::prefs_row($auth['uid'])));
    }

    public static function savePreferences(array $body): void
    {
        $auth = require_auth();
        $id = $auth['uid'];
        $map = [
            'goal' => 'goal', 'level' => 'level', 'daysPerWeek' => 'days_per_week',
            'sessionMinutes' => 'session_minutes', 'budget' => 'budget', 'mealsPerDay' => 'meals_per_day',
            'onboarded' => 'onboarded', 'bio' => 'bio', 'city' => 'city',
            'waterGoal' => 'water_goal_ml', 'stepGoal' => 'step_goal',
        ];
        $jsonCols = ['equipment' => 'equipment', 'favoriteFoods' => 'favorite_foods', 'avoidedFoods' => 'avoided_foods', 'allergies' => 'allergies', 'dietRestrictions' => 'diet_restrictions'];

        $set = [];
        $params = ['uid' => $id];
        foreach ($map as $key => $col) {
            if (array_key_exists($key, $body)) {
                $set[] = "$col = :$key";
                $params[$key] = is_bool($body[$key]) ? (int) $body[$key] : $body[$key];
            }
        }
        foreach ($jsonCols as $key => $col) {
            if (array_key_exists($key, $body) && is_array($body[$key])) {
                $set[] = "$col = :$key";
                $params[$key] = json_encode($body[$key], JSON_UNESCAPED_UNICODE);
            }
        }
        if ($set) {
            db()->prepare('UPDATE user_preferences SET ' . implode(', ', $set) . ' WHERE user_id = :uid')->execute($params);
        }

        $user = AuthController::user_row($id);
        json_out(make_session($user, AuthController::prefs_row($id)));
    }
}