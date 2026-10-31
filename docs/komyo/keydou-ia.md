# Keydou : l'IA de la conversation

- **Modèle :** Claude Sonnet 5.5 (`claude-sonnet-5-5`), réglable par la variable `KEYDOU_MODEL`. Avant le 31/10/2026 : Haiku 5.5.
- **Réglages :** effort « low » (réponse rapide), 1 200 jetons de sortie au plus, consignes mises en cache (`cache_control`) car identiques à chaque message.
- **Coût indicatif (prix Anthropic) :** Haiku ≈ 0,26 FCFA, Sonnet ≈ 5 FCFA (moins avec le cache), Opus ≈ 10 FCFA par réponse. Limites de sécurité : 600 réponses par jour, 30 par heure et par connexion.
- **À réévaluer** vers 2 500 abonnements : passer à un modèle plus puissant (Opus) pour l'aide, ou revenir à Haiku si le coût pèse, selon la consommation réelle (Netlify → Usage and billing).
- Vérification : `/api/keydou-gardien-etat` fait un vrai appel d'essai avec ces réglages (`appelIA: "ok"`).
