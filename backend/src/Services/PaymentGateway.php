<?php

declare(strict_types=1);

namespace FitLife\Services;

/**
 * Point d'intégration du prestataire de paiement (agrégateur Mobile Money / carte :
 * CinetPay, FedaPay, PayDunya, Flutterwave…).
 *
 * PAYMENT_PROVIDER=simulation (défaut) : aucun appel externe, le paiement est
 * confirmé automatiquement après quelques secondes (numéro finissant par 00 = refus).
 *
 * Pour brancher un vrai prestataire :
 *   1. implémenter initiate() avec son API (demande de paiement / lien de checkout),
 *   2. renseigner PAYMENT_WEBHOOK_SECRET et déclarer l'URL POST /api/payments/webhook
 *      dans le tableau de bord du prestataire ; c'est elle qui confirme le paiement.
 */
class PaymentGateway
{
    public static function provider(): string
    {
        return getenv('PAYMENT_PROVIDER') ?: 'simulation';
    }

    /**
     * Démarre la demande de paiement auprès du prestataire.
     * Retourne la référence côté prestataire (ou null en simulation).
     */
    public static function initiate(array $payment, ?string $phone): ?string
    {
        if (self::provider() === 'simulation') {
            return null;
        }
        throw new \ApiError('Prestataire de paiement non configuré', 503);
    }

    /**
     * Simulation uniquement : statut à appliquer à un paiement en attente,
     * ou null si l'opérateur n'a pas encore « répondu ».
     */
    public static function simulatedOutcome(array $payment): ?string
    {
        if (self::provider() !== 'simulation') {
            return null;
        }
        if (time() - strtotime($payment['created_at']) < 4) {
            return null;
        }
        return str_ends_with((string) $payment['phone_masked'], '00') ? 'failed' : 'succeeded';
    }

    /** Vérifie la signature des notifications envoyées par le prestataire. */
    public static function verifyWebhook(string $rawBody, string $signature): bool
    {
        $secret = getenv('PAYMENT_WEBHOOK_SECRET') ?: '';
        if ($secret === '') {
            return false;
        }
        return hash_equals(hash_hmac('sha256', $rawBody, $secret), $signature);
    }
}
