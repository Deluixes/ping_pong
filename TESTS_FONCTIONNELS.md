# Tests fonctionnels - Ping Pong Club PWA

Checklist complète pour valider le bon fonctionnement de l'application.

---

## 1. Authentification

### Inscription
- [ ] Créer un compte avec email + nom + mot de passe
- [ ] Vérifier la validation : nom obligatoire, email obligatoire, mot de passe >= 8 caractères
- [ ] Vérifier que les mots de passe doivent correspondre (confirmation)
- [ ] Vérifier l'affichage/masquage du mot de passe (icône œil)
- [ ] Vérifier le message de succès ("Compte créé !") et l'instruction de vérification email
- [ ] Tenter de s'inscrire avec un email déjà utilisé : message "Cet email est déjà inscrit"

### Connexion
- [ ] Se connecter avec email + mot de passe valides
- [ ] Tenter de se connecter avec un mauvais mot de passe : message "Email ou mot de passe incorrect"
- [ ] Vérifier la redirection vers le calendrier après connexion réussie

### Mot de passe oublié
- [ ] Cliquer "Mot de passe oublié ?" depuis la page de connexion
- [ ] Entrer un email et vérifier le message de confirmation d'envoi
- [ ] Vérifier que le lien de réinitialisation fonctionne (email reçu)

### Changement de mot de passe forcé
- [ ] Pour un utilisateur migré (must_change_password = true) : vérifier que l'écran de changement de mot de passe s'affiche obligatoirement
- [ ] Après changement : redirection vers l'accueil

### Déconnexion
- [ ] Se déconnecter depuis les paramètres
- [ ] Se déconnecter depuis le menu latéral
- [ ] Vérifier la redirection vers la page de connexion

---

## 2. Demande d'accès et approbation

### Nouveau membre
- [ ] Après inscription + confirmation email : la page "Demande d'accès" s'affiche
- [ ] Cliquer "Demander à rejoindre le groupe" : le statut passe à "en attente"
- [ ] Vérifier le bouton "Vérifier le statut" pour actualiser
- [ ] Vérifier que l'accès au calendrier est bloqué tant que non approuvé

### Approbation par admin
- [ ] Se connecter en admin
- [ ] Aller dans Gestion des membres
- [ ] Vérifier que les demandes en attente apparaissent
- [ ] Approuver un membre : il passe dans la liste des approuvés
- [ ] Refuser un membre : il disparaît de la liste (avec confirmation)

---

## 3. Calendrier - Navigation

### Navigation semaine
- [ ] La semaine courante s'affiche par défaut
- [ ] Bouton semaine précédente : les données changent
- [ ] Bouton semaine suivante : les données changent
- [ ] Cliquer sur un jour dans la barre de navigation : la vue jour s'affiche pour ce jour

### Vues
- [ ] Vue "Occupés" (par défaut) : seuls les créneaux avec des participants ou bloqués s'affichent
- [ ] Vue "Tous" : tous les créneaux dans les horaires d'ouverture s'affichent
- [ ] Vue "Semaine" : grille 7 jours avec les créneaux colorés (ouvert/cours/entraînement + légende)
- [ ] Cliquer sur un jour dans la vue semaine : bascule en vue jour pour ce jour

### Horaires d'ouverture
- [ ] Les créneaux hors horaires d'ouverture ne s'affichent pas
- [ ] Si la semaine n'est pas configurée : horaires par défaut (8h-23h)
- [ ] Si la semaine est configurée : seuls les horaires du template s'affichent

---

## 4. Calendrier - Créneaux bloqués

### Entraînements (bloquants)
- [ ] Les créneaux d'entraînement s'affichent avec le nom, coach et groupe
- [ ] L'icône cadenas s'affiche (non inscriptible)
- [ ] Impossible de s'inscrire sur un créneau bloquant

### Cours indicatifs (non bloquants)
- [ ] Les cours indicatifs s'affichent avec le badge "Info"
- [ ] Il est possible de s'inscrire sur un cours indicatif
- [ ] Les participants s'affichent sous le cours

---

## 5. Calendrier - Inscription aux créneaux

### Inscription simple
- [ ] Cliquer sur un créneau ouvert sans participants : la modale de durée s'affiche
- [ ] Choisir une durée (30min, 1h, 1h30, 2h, etc.)
- [ ] Choisir "S'inscrire" (pas invité seulement)
- [ ] Confirmer : l'inscription apparaît sur le créneau
- [ ] Le compteur de participants se met à jour (ex: 1/10)
- [ ] Le nom du joueur s'affiche dans la liste des participants

### Inscription avec participants existants
- [ ] Cliquer sur un créneau qui a déjà des participants : la modale des participants s'affiche
- [ ] Bouton "S'inscrire" depuis la modale des participants : lance le flux d'inscription

### Désinscription
- [ ] Cliquer sur le bouton X (désinscription) d'un créneau où on est inscrit
- [ ] Vérifier que l'inscription disparaît du créneau
- [ ] Vérifier que le compteur de participants se met à jour

### Durées multiples
- [ ] S'inscrire sur 1h (2 créneaux de 30min) : vérifier que les 2 créneaux sont marqués
- [ ] Se désinscrire : les 2 créneaux sont libérés
- [ ] Vérifier que les durées indisponibles (chevauchent un créneau bloquant) ne sont pas proposées

### Overbooking
- [ ] S'inscrire quand le créneau est plein : avertissement de surbooking affiché
- [ ] Vérifier le badge "Surbooké" et les noms en rouge

---

## 6. Invitations

### Inviter un membre
- [ ] Lors de l'inscription : choisir "Inviter des personnes"
- [ ] Sélectionner un membre dans la liste déroulante
- [ ] Ajouter jusqu'à 3 invités (bouton "Ajouter un joueur")
- [ ] Supprimer un invité de la liste
- [ ] Confirmer : les invitations sont envoyées

### Inviter sans s'inscrire
- [ ] Choisir "Inviter seulement" au lieu de "S'inscrire"
- [ ] Sélectionner un ou plusieurs membres
- [ ] Confirmer : les invitations sont envoyées sans inscription personnelle

### Recevoir une invitation
- [ ] Le badge de notification (cloche) dans le header affiche le nombre d'invitations
- [ ] Aller dans la page "Invitations reçues"
- [ ] Vérifier l'affichage : date, créneau, durée, nom de l'inviteur
- [ ] Accepter une invitation : elle disparaît de la liste
- [ ] Refuser une invitation (avec confirmation) : elle disparaît de la liste
- [ ] Bouton calendrier : redirige vers le planning au bon jour

### Affichage des invités
- [ ] Les invités acceptés apparaissent dans la liste des participants du créneau
- [ ] Les invités en attente apparaissent avec la mention "(en attente)" et en gris

---

## 7. Gestion des créneaux (admin salles / admin)

### Ouvrir un créneau
- [ ] Passer en vue "Gestion créneaux" (disponible pour admin/admin_salles)
- [ ] Cliquer sur un créneau fermé : la modale d'ouverture s'affiche
- [ ] Choisir la cible : Tous / Loisir / Compétition
- [ ] Choisir la durée d'ouverture
- [ ] Confirmer : le créneau apparaît comme "Ouvert"
- [ ] Vérifier le badge de restriction (Compét / Loisir) si applicable

### Fermer un créneau
- [ ] En vue "Gestion créneaux", cliquer sur le cadenas d'un créneau ouvert
- [ ] Confirmer la fermeture
- [ ] Vérifier que le créneau passe à "Fermé"

### Restrictions par licence
- [ ] Ouvrir un créneau pour "Compétition" seulement
- [ ] Un membre licence L voit le message "licence C requise" et ne peut pas s'inscrire
- [ ] Un membre licence C peut s'inscrire normalement
- [ ] Même test inverse pour "Loisir"

### Suppression de participant (admin)
- [ ] En tant qu'admin, voir la liste des participants d'un créneau
- [ ] Cliquer sur l'icône poubelle à côté d'un participant
- [ ] Confirmer la suppression
- [ ] Vérifier que le participant est retiré du créneau

---

## 8. Administration des membres

### Liste des membres
- [ ] La page Admin affiche les membres groupés : Administrateurs / Gestionnaires salle / Membres
- [ ] La barre de recherche filtre par nom et email
- [ ] Le compteur de demandes en attente s'affiche

### Édition d'un membre
- [ ] Cliquer sur l'icône modifier d'un membre : la modale d'édition s'affiche
- [ ] Modifier le nom : le changement est sauvegardé (propagé dans réservations et invitations)
- [ ] Modifier le type de licence (Loisir / Compétition)
- [ ] Modifier le rôle (si autorisé par le rôle courant)
- [ ] Vérifier les restrictions : un admin ne peut pas modifier un super_admin, un membre ne peut pas modifier les rôles

### Suppression d'un membre
- [ ] Dans la modale d'édition, cliquer "Supprimer du groupe"
- [ ] Confirmer : le membre est retiré

### Temps réel
- [ ] Si un autre admin approuve un membre, la liste se met à jour automatiquement

---

## 9. Gestion du planning (admin)

### Configuration des tables
- [ ] Aller dans Gestion du planning > onglet Tables
- [ ] Modifier le nombre de tables
- [ ] Enregistrer : le message "Enregistré !" s'affiche
- [ ] Vérifier que la capacité max (tables x 2) est mise à jour sur le calendrier

### Templates
- [ ] Créer un nouveau template (nom)
- [ ] Renommer un template existant
- [ ] Supprimer un template (avec confirmation)
- [ ] Ouvrir un template pour éditer ses créneaux (TemplateEditor)

### Édition d'un template (TemplateEditor)
- [ ] Ajouter un créneau bloquant (entraînement) : jour, heure début/fin, nom, coach, groupe
- [ ] Ajouter un créneau indicatif (cours)
- [ ] Ajouter une plage horaire d'ouverture
- [ ] Supprimer un créneau ou une plage horaire
- [ ] Vérifier l'affichage jour par jour dans l'éditeur

### Application aux semaines
- [ ] Aller dans l'onglet Semaines
- [ ] Sélectionner un template et une ou plusieurs semaines
- [ ] Appliquer sur une semaine vierge : application directe
- [ ] Appliquer sur une semaine déjà configurée : dialogue de mode (Écraser / Fusionner garder existants / Fusionner garder nouveaux)
- [ ] Vérifier l'analyse de conflits (créneaux en conflit affichés)
- [ ] Appliquer plusieurs templates à la fois : le premier écrase, les suivants fusionnent

---

## 10. Paramètres utilisateur

### Profil
- [ ] Modifier son nom : sauvegardé et propagé dans les réservations
- [ ] Modifier son type de licence (Loisir / Compétition)
- [ ] Vérifier l'affichage de l'email (non modifiable)

### Photo de profil
- [ ] Ajouter une photo de profil (upload)
- [ ] Vérifier la limite de taille (5 Mo max)
- [ ] Vérifier que seules les images sont acceptées
- [ ] Cliquer sur la photo : affichage en grand (modale)
- [ ] Changer la photo
- [ ] Supprimer la photo (avec confirmation)

### Mot de passe
- [ ] Modifier le mot de passe depuis les paramètres
- [ ] Vérifier la validation (>= 8 caractères, confirmation)
- [ ] Vérifier le message de succès

### Notifications push
- [ ] Vérifier la détection du support navigateur
- [ ] Activer les notifications : la permission est demandée
- [ ] Configurer les préférences : invitations / ouvertures de créneaux
- [ ] Désactiver les notifications
- [ ] Tester les notifications (bouton test)
- [ ] Si permissions refusées : message explicatif affiché

---

## 11. Mon club

### Liste des membres
- [ ] Affichage de tous les membres approuvés avec leur photo/initiale
- [ ] Recherche par nom
- [ ] Filtre par type de licence (Tous / Loisir / Compétition)
- [ ] Compteur de membres affiché
- [ ] Cliquer sur un membre : modale avec photo en grand et badge licence

### News
- [ ] L'onglet News affiche le placeholder "Les actualités arrivent bientôt !"

---

## 12. Menu latéral (SlideMenu)

- [ ] Ouvrir le menu avec le bouton hamburger
- [ ] Fermer le menu avec le X ou en cliquant sur l'overlay
- [ ] Vérifier l'affichage : photo de profil, nom, email, badge rôle
- [ ] Navigation : Planning, Mon compte, Invitations reçues (avec compteur), Mon club
- [ ] Liens admin visibles seulement pour les admins : Gestion des membres (avec compteur en attente), Gestion du planning
- [ ] Lien vers le site du club (ouvre dans un nouvel onglet)
- [ ] Bouton déconnexion

### Simulation de rôle (admin/super_admin)
- [ ] Le sélecteur de rôle apparaît pour les admins
- [ ] Simuler le rôle "Membre" : les menus admin disparaissent, les fonctions admin ne sont plus accessibles
- [ ] Simuler le rôle "Gestion Salle" : accès à la gestion des créneaux mais pas à l'admin des membres
- [ ] Revenir à son rôle réel : tout redevient normal
- [ ] Le bandeau de simulation s'affiche quand un rôle est simulé

---

## 13. Temps réel

- [ ] Ouvrir l'app sur 2 appareils/navigateurs avec 2 comptes différents
- [ ] S'inscrire à un créneau sur un appareil : l'autre appareil voit la mise à jour sans refresh
- [ ] Se désinscrire : mise à jour en temps réel
- [ ] Inviter quelqu'un : le compteur de notifications se met à jour sur l'autre appareil
- [ ] Ouvrir/fermer un créneau (admin) : visible en temps réel pour les autres

---

## 14. PWA et mobile

- [ ] L'app est installable (bandeau d'installation ou bouton "Ajouter à l'écran d'accueil")
- [ ] L'app fonctionne hors ligne (affichage des données en cache)
- [ ] L'icône de l'app s'affiche correctement (192x192 et 512x512)
- [ ] Le theme color (#FF6B00) s'affiche dans la barre du navigateur mobile
- [ ] L'app est responsive : affichage correct sur mobile, tablette, desktop

---

## 15. Cas limites et erreurs

- [ ] Perte de connexion réseau : l'app ne crash pas, les données en cache restent affichées
- [ ] Session expirée : redirection vers la page de connexion
- [ ] Double-clic sur un bouton d'action : pas de doublon (boutons désactivés pendant le chargement)
- [ ] URL directe vers une page protégée sans être connecté : redirection vers /login
- [ ] URL directe vers /admin sans être admin : redirection vers /
