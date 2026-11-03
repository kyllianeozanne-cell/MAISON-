# MAISON — dressing virtuel

React + TypeScript + Tailwind + Framer Motion + React Three Fiber. Mobile d'abord.

## Lancer

```bash
npm install
npm run dev        # http://localhost:5173 (--host : accessible depuis ton téléphone sur le même Wi-Fi)
npm run build      # vérification TypeScript + build de production
```

Node 18+ requis. Au premier lancement : prénom, localisation facultative, puis « Charger un dressing de démonstration » dans l'onglet Wardrobe pour tester.

## Ce qui fonctionne sans aucune clé

- Dressing complet : ajout par photo / galerie / lot / manuel, fiche détaillée, filtres, recherche, lavage, archive, suppression.
- Détourage automatique du fond (fonctionne sur fond uni) et détection de la couleur dominante.
- Avatar 3D paramétrique (taille, morphologie, proportions, teint, coiffure, barbe), rotation au doigt, fallback 2D sans WebGL.
- Essayage par emplacement (swipe horizontal), tenues enregistrées, favoris, partage, « autre combinaison ».
- Styliste local : météo, ressenti, pluie, saison, contexte, harmonie des couleurs, formalité, pièces oubliées. Ne propose que des pièces disponibles que tu possèdes.
- Météo réelle (Open-Meteo, sans clé), accueil, recommandations, calendrier, statistiques, valise, wishlist, capsules, export / import JSON.
- Données persistantes dans IndexedDB sur l'appareil.

## Limites à connaître

- L'avatar montre couleurs et volumes ; les vêtements sont des coques colorées, **pas** un ajustement réel (pas de données de patron ni de simulation textile).
- Les notifications se déclenchent à l'ouverture de l'app (pas de push en arrière-plan).
- Le compte utilisateur et la synchro Supabase ne sont pas branchés dans l'interface : le schéma (`supabase/schema.sql`) et le client (`src/lib/supabase.ts`) sont prêts.
- Ce code n'a pas pu être compilé ni testé dans l'environnement où il a été écrit (réseau npm bloqué) : lance `npm run build` et signale-moi les erreurs éventuelles.

## Styliste IA (facultatif)

1. Crée un projet Supabase, exécute `supabase/schema.sql`.
2. `supabase functions deploy stylist` puis `supabase secrets set ANTHROPIC_API_KEY=...` (la clé ne quitte jamais le serveur).
3. Copie `.env.example` en `.env` et renseigne `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
4. Réglages → Styliste IA → Active. Seuls nom, catégorie et couleur des pièces sont envoyés, jamais les photos ; les identifiants renvoyés sont revalidés côté app.

## App iOS (Capacitor)

Sur un Mac avec Xcode : `npm run ios` (ou `./scripts/ios-setup.sh`). Le script construit le site, crée le projet iOS, ajoute les autorisations caméra / photos / position, puis ouvre Xcode. Choisis ton iPhone, renseigne ton compte Apple dans Signing & Capabilities, puis Run.

- Compte Apple gratuit : l'app installée sur ton iPhone expire au bout de 7 jours (il faut la réinstaller). Compte développeur payant (99 €/an) : installation durable, TestFlight, App Store.
- Dans l'app native, les notifications à l'ouverture ne sont pas disponibles (l'API web n'existe pas dans WKWebView) : il faudrait le plugin `@capacitor/local-notifications`.
