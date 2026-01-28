import { z } from 'zod';

/**
 * Schéma de validation pour les feedbacks de jeu
 * Limite stricte de 500 caractères et caractères autorisés uniquement
 */
export const gameFeedbackSchema = z.object({
  question: z.string()
    .trim()
    .min(10, 'Votre message doit contenir au moins 10 caractères')
    .max(500, 'Votre message ne peut pas dépasser 500 caractères')
    .regex(
      /^[a-zA-Z0-9\s\u00C0-\u017F.,!?'"\-()]+$/, 
      'Caractères non autorisés détectés'
    ),
});

/**
 * Schéma de validation pour les notices de vin (likes et détails de dégustation)
 * Compatible avec l'ancien format (acidity, tannins, body, sweetness) 
 * et le nouveau format (slot1, slot2, slot3, slot4)
 */
export const wineNoticeSchema = z.object({
  liked: z.number()
    .int('Le statut doit être un nombre entier')
    .min(-1, 'Valeur minimale : -1')
    .max(1, 'Valeur maximale : 1'),
  details: z.object({
    rating: z.number().min(0).max(10).optional(),
    // Ancien format (rétrocompatibilité)
    acidity: z.number().min(0).max(10).optional(),
    tannins: z.number().min(0).max(10).optional(),
    body: z.number().min(0).max(10).optional(),
    sweetness: z.number().min(0).max(10).optional(),
    // Nouveau format (slots génériques)
    slot1: z.number().min(0).max(10).optional(),
    slot2: z.number().min(0).max(10).optional(),
    slot3: z.number().min(0).max(10).optional(),
    slot4: z.number().min(0).max(10).optional(),
    remarks: z.string().max(500).optional(),
  }).optional(),
});

/**
 * Schéma de validation pour les commentaires de vin
 * Limite stricte de 1000 caractères
 */
export const wineCommentSchema = z.object({
  comment: z.string()
    .trim()
    .min(1, 'Le commentaire ne peut pas être vide')
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères')
    .regex(
      /^[a-zA-Z0-9\s\u00C0-\u017F.,!?'"\-()]+$/, 
      'Caractères non autorisés détectés'
    ),
});
