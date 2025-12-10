# Ping Pong Club PWA 🏓

Une application progressive (PWA) pour gérer les disponibilités des membres du club de Ping Pong.

## Fonctionnalités
- **Calendrier Hebdomadaire** : Indiquez votre présence sur les créneaux (Matin, Midi, Après-midi, Soirée).
- **Temps Réel** : Visualisez qui est présent (support `window.storage` ou Fallback local).
- **PWA** : Installable sur mobile et fonctionne hors-ligne.
- **Thème** : Interface "Sportive" Orange & Bleu.

## Installation Locale

```bash
npm install
npm run dev
```

## Déploiement

### Vercel (Recommandé)
Le projet est configuré pour Vercel.
1. Importez le projet dans Vercel.
2. Déployez (Aucune configuration requise).

Aucune variable d'environnement n'est nécessaire car l'authentification et le stockage sont gérés côté client pour cette version "Serverless Free".

## Tech Stack
- React + Vite
- Vanilla CSS (Variables)
- Lucide React (Icônes)
