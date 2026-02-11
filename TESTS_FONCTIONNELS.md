# Tests fonctionnels - Ping Pong Club PWA

Checklist complete pour valider le bon fonctionnement de l'application.

---

## 1. Authentification

### Inscription
- [ ] Creer un compte avec email + nom + mot de passe
- [ ] Verifier la validation : nom obligatoire, email obligatoire, mot de passe >= 8 caracteres
- [ ] Verifier que les mots de passe doivent correspondre (confirmation)
- [ ] Verifier l'affichage/masquage du mot de passe (icone oeil)
- [ ] Verifier le message de succes ("Compte cree !") et l'instruction de verification email
- [ ] Tenter de s'inscrire avec un email deja utilise : message "Cet email est deja inscrit"

### Connexion
- [ ] Se connecter avec email + mot de passe valides
- [ ] Tenter de se connecter avec un mauvais mot de passe : message "Email ou mot de passe incorrect"
- [ ] Verifier la redirection vers le calendrier apres connexion reussie

### Mot de passe oublie
- [ ] Cliquer "Mot de passe oublie ?" depuis la page de connexion
- [ ] Entrer un email et verifier le message de confirmation d'envoi
- [ ] Verifier que le lien de reinitialisation fonctionne (email recu)

### Changement de mot de passe force
- [ ] Pour un utilisateur migre (must_change_password = true) : verifier que l'ecran de changement de mot de passe s'affiche obligatoirement
- [ ] Apres changement : redirection vers l'accueil

### Deconnexion
- [ ] Se deconnecter depuis les parametres
- [ ] Se deconnecter depuis le menu lateral
- [ ] Verifier la redirection vers la page de connexion

---

## 2. Demande d'acces et approbation

### Nouveau membre
- [ ] Apres inscription + confirmation email : la page "Demande d'acces" s'affiche
- [ ] Cliquer "Demander a rejoindre le groupe" : le statut passe a "en attente"
- [ ] Verifier le bouton "Verifier le statut" pour actualiser
- [ ] Verifier que l'acces au calendrier est bloque tant que non approuve

### Approbation par admin
- [ ] Se connecter en admin
- [ ] Aller dans Gestion des membres
- [ ] Verifier que les demandes en attente apparaissent
- [ ] Approuver un membre : il passe dans la liste des approuves
- [ ] Refuser un membre : il disparait de la liste (avec confirmation)

---

## 3. Calendrier - Navigation

### Navigation semaine
- [ ] La semaine courante s'affiche par defaut
- [ ] Bouton semaine precedente : les donnees changent
- [ ] Bouton semaine suivante : les donnees changent
- [ ] Cliquer sur un jour dans la barre de navigation : la vue jour s'affiche pour ce jour

### Vues
- [ ] Vue "Occupes" (par defaut) : seuls les creneaux avec des participants ou bloques s'affichent
- [ ] Vue "Tous" : tous les creneaux dans les horaires d'ouverture s'affichent
- [ ] Vue "Semaine" : grille 7 jours avec les creneaux colores (ouvert/cours/entrainement + legende)
- [ ] Cliquer sur un jour dans la vue semaine : bascule en vue jour pour ce jour

### Horaires d'ouverture
- [ ] Les creneaux hors horaires d'ouverture ne s'affichent pas
- [ ] Si la semaine n'est pas configuree : horaires par defaut (8h-23h)
- [ ] Si la semaine est configuree : seuls les horaires du template s'affichent

---

## 4. Calendrier - Creneaux bloques

### Entrainements (bloquants)
- [ ] Les creneaux d'entrainement s'affichent avec le nom, coach et groupe
- [ ] L'icone cadenas s'affiche (non inscriptible)
- [ ] Impossible de s'inscrire sur un creneau bloquant

### Cours indicatifs (non bloquants)
- [ ] Les cours indicatifs s'affichent avec le badge "Info"
- [ ] Il est possible de s'inscrire sur un cours indicatif
- [ ] Les participants s'affichent sous le cours

---

## 5. Calendrier - Inscription aux creneaux

### Inscription simple
- [ ] Cliquer sur un creneau ouvert sans participants : la modale de duree s'affiche
- [ ] Choisir une duree (30min, 1h, 1h30, 2h, etc.)
- [ ] Choisir "S'inscrire" (pas invite seulement)
- [ ] Confirmer : l'inscription apparait sur le creneau
- [ ] Le compteur de participants se met a jour (ex: 1/10)
- [ ] Le nom du joueur s'affiche dans la liste des participants

### Inscription avec participants existants
- [ ] Cliquer sur un creneau qui a deja des participants : la modale des participants s'affiche
- [ ] Bouton "S'inscrire" depuis la modale des participants : lance le flux d'inscription

### Desinscription
- [ ] Cliquer sur le bouton X (desinscription) d'un creneau ou on est inscrit
- [ ] Verifier que l'inscription disparait du creneau
- [ ] Verifier que le compteur de participants se met a jour

### Durees multiples
- [ ] S'inscrire sur 1h (2 creneaux de 30min) : verifier que les 2 creneaux sont marques
- [ ] Se desinscrire : les 2 creneaux sont liberes
- [ ] Verifier que les durees indisponibles (chevauchent un creneau bloquant) ne sont pas proposees

### Overbooking
- [ ] S'inscrire quand le creneau est plein : avertissement de surbooking affiche
- [ ] Verifier le badge "Surbooke" et les noms en rouge

---

## 6. Invitations

### Inviter un membre
- [ ] Lors de l'inscription : choisir "Inviter des personnes"
- [ ] Selectionner un membre dans la liste deroulante
- [ ] Ajouter jusqu'a 3 invites (bouton "Ajouter un joueur")
- [ ] Supprimer un invite de la liste
- [ ] Confirmer : les invitations sont envoyees

### Inviter sans s'inscrire
- [ ] Choisir "Inviter seulement" au lieu de "S'inscrire"
- [ ] Selectionner un ou plusieurs membres
- [ ] Confirmer : les invitations sont envoyees sans inscription personnelle

### Recevoir une invitation
- [ ] Le badge de notification (cloche) dans le header affiche le nombre d'invitations
- [ ] Aller dans la page "Invitations recues"
- [ ] Verifier l'affichage : date, creneau, duree, nom de l'inviteur
- [ ] Accepter une invitation : elle disparait de la liste
- [ ] Refuser une invitation (avec confirmation) : elle disparait de la liste
- [ ] Bouton calendrier : redirige vers le planning au bon jour

### Affichage des invites
- [ ] Les invites acceptes apparaissent dans la liste des participants du creneau
- [ ] Les invites en attente apparaissent avec la mention "(en attente)" et en gris

---

## 7. Gestion des creneaux (admin salles / admin)

### Ouvrir un creneau
- [ ] Passer en vue "Gestion creneaux" (disponible pour admin/admin_salles)
- [ ] Cliquer sur un creneau ferme : la modale d'ouverture s'affiche
- [ ] Choisir la cible : Tous / Loisir / Competition
- [ ] Choisir la duree d'ouverture
- [ ] Confirmer : le creneau apparait comme "Ouvert"
- [ ] Verifier le badge de restriction (Compet / Loisir) si applicable

### Fermer un creneau
- [ ] En vue "Gestion creneaux", cliquer sur le cadenas d'un creneau ouvert
- [ ] Confirmer la fermeture
- [ ] Verifier que le creneau passe a "Ferme"

### Restrictions par licence
- [ ] Ouvrir un creneau pour "Competition" seulement
- [ ] Un membre licence L voit le message "licence C requise" et ne peut pas s'inscrire
- [ ] Un membre licence C peut s'inscrire normalement
- [ ] Meme test inverse pour "Loisir"

### Suppression de participant (admin)
- [ ] En tant qu'admin, voir la liste des participants d'un creneau
- [ ] Cliquer sur l'icone poubelle a cote d'un participant
- [ ] Confirmer la suppression
- [ ] Verifier que le participant est retire du creneau

---

## 8. Administration des membres

### Liste des membres
- [ ] La page Admin affiche les membres groupes : Administrateurs / Gestionnaires salle / Membres
- [ ] La barre de recherche filtre par nom et email
- [ ] Le compteur de demandes en attente s'affiche

### Edition d'un membre
- [ ] Cliquer sur l'icone modifier d'un membre : la modale d'edition s'affiche
- [ ] Modifier le nom : le changement est sauvegarde (propage dans reservations et invitations)
- [ ] Modifier le type de licence (Loisir / Competition)
- [ ] Modifier le role (si autorise par le role courant)
- [ ] Verifier les restrictions : un admin ne peut pas modifier un super_admin, un membre ne peut pas modifier les roles

### Suppression d'un membre
- [ ] Dans la modale d'edition, cliquer "Supprimer du groupe"
- [ ] Confirmer : le membre est retire

### Temps reel
- [ ] Si un autre admin approuve un membre, la liste se met a jour automatiquement

---

## 9. Gestion du planning (admin)

### Configuration des tables
- [ ] Aller dans Gestion du planning > onglet Tables
- [ ] Modifier le nombre de tables
- [ ] Enregistrer : le message "Enregistre !" s'affiche
- [ ] Verifier que la capacite max (tables x 2) est mise a jour sur le calendrier

### Templates
- [ ] Creer un nouveau template (nom)
- [ ] Renommer un template existant
- [ ] Supprimer un template (avec confirmation)
- [ ] Ouvrir un template pour editer ses creneaux (TemplateEditor)

### Edition d'un template (TemplateEditor)
- [ ] Ajouter un creneau bloquant (entrainement) : jour, heure debut/fin, nom, coach, groupe
- [ ] Ajouter un creneau indicatif (cours)
- [ ] Ajouter une plage horaire d'ouverture
- [ ] Supprimer un creneau ou une plage horaire
- [ ] Verifier l'affichage jour par jour dans l'editeur

### Application aux semaines
- [ ] Aller dans l'onglet Semaines
- [ ] Selectionner un template et une ou plusieurs semaines
- [ ] Appliquer sur une semaine vierge : application directe
- [ ] Appliquer sur une semaine deja configuree : dialogue de mode (Ecraser / Fusionner garder existants / Fusionner garder nouveaux)
- [ ] Verifier l'analyse de conflits (creneaux en conflit affiches)
- [ ] Appliquer plusieurs templates a la fois : le premier ecrase, les suivants fusionnent

---

## 10. Parametres utilisateur

### Profil
- [ ] Modifier son nom : sauvegarde et propage dans les reservations
- [ ] Modifier son type de licence (Loisir / Competition)
- [ ] Verifier l'affichage de l'email (non modifiable)

### Photo de profil
- [ ] Ajouter une photo de profil (upload)
- [ ] Verifier la limite de taille (5 Mo max)
- [ ] Verifier que seules les images sont acceptees
- [ ] Cliquer sur la photo : affichage en grand (modale)
- [ ] Changer la photo
- [ ] Supprimer la photo (avec confirmation)

### Mot de passe
- [ ] Modifier le mot de passe depuis les parametres
- [ ] Verifier la validation (>= 8 caracteres, confirmation)
- [ ] Verifier le message de succes

### Notifications push
- [ ] Verifier la detection du support navigateur
- [ ] Activer les notifications : la permission est demandee
- [ ] Configurer les preferences : invitations / ouvertures de creneaux
- [ ] Desactiver les notifications
- [ ] Tester les notifications (bouton test)
- [ ] Si permissions refusees : message explicatif affiche

---

## 11. Mon club

### Liste des membres
- [ ] Affichage de tous les membres approuves avec leur photo/initiale
- [ ] Recherche par nom
- [ ] Filtre par type de licence (Tous / Loisir / Competition)
- [ ] Compteur de membres affiche
- [ ] Cliquer sur un membre : modale avec photo en grand et badge licence

### News
- [ ] L'onglet News affiche le placeholder "Les actualites arrivent bientot !"

---

## 12. Menu lateral (SlideMenu)

- [ ] Ouvrir le menu avec le bouton hamburger
- [ ] Fermer le menu avec le X ou en cliquant sur l'overlay
- [ ] Verifier l'affichage : photo de profil, nom, email, badge role
- [ ] Navigation : Planning, Mon compte, Invitations recues (avec compteur), Mon club
- [ ] Liens admin visibles seulement pour les admins : Gestion des membres (avec compteur en attente), Gestion du planning
- [ ] Lien vers le site du club (ouvre dans un nouvel onglet)
- [ ] Bouton deconnexion

### Simulation de role (admin/super_admin)
- [ ] Le selecteur de role apparait pour les admins
- [ ] Simuler le role "Membre" : les menus admin disparaissent, les fonctions admin ne sont plus accessibles
- [ ] Simuler le role "Gestion Salle" : acces a la gestion des creneaux mais pas a l'admin des membres
- [ ] Revenir a son role reel : tout redevient normal
- [ ] Le bandeau de simulation s'affiche quand un role est simule

---

## 13. Temps reel

- [ ] Ouvrir l'app sur 2 appareils/navigateurs avec 2 comptes differents
- [ ] S'inscrire a un creneau sur un appareil : l'autre appareil voit la mise a jour sans refresh
- [ ] Se desinscrire : mise a jour en temps reel
- [ ] Inviter quelqu'un : le compteur de notifications se met a jour sur l'autre appareil
- [ ] Ouvrir/fermer un creneau (admin) : visible en temps reel pour les autres

---

## 14. PWA et mobile

- [ ] L'app est installable (bandeau d'installation ou bouton "Ajouter a l'ecran d'accueil")
- [ ] L'app fonctionne hors ligne (affichage des donnees en cache)
- [ ] L'icone de l'app s'affiche correctement (192x192 et 512x512)
- [ ] Le theme color (#FF6B00) s'affiche dans la barre du navigateur mobile
- [ ] L'app est responsive : affichage correct sur mobile, tablette, desktop

---

## 15. Cas limites et erreurs

- [ ] Perte de connexion reseau : l'app ne crash pas, les donnees en cache restent affichees
- [ ] Session expiree : redirection vers la page de connexion
- [ ] Double-clic sur un bouton d'action : pas de doublon (boutons desactives pendant le chargement)
- [ ] URL directe vers une page protegee sans etre connecte : redirection vers /login
- [ ] URL directe vers /admin sans etre admin : redirection vers /
