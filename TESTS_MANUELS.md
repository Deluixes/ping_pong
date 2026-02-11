# Tests manuels - Refactoring weekConfigService

Tests a effectuer pour valider que le refactoring de `applyTemplateToWeeks` n'a rien casse.

---

## 1. Affichage du calendrier

- [ ] Ouvrir l'app, se connecter
- [ ] Le calendrier s'affiche avec les creneaux de la semaine courante
- [ ] Les creneaux bloques (entrainements) s'affichent correctement avec leur nom/coach/groupe
- [ ] Les horaires d'ouverture sont respectes (creneaux hors horaires non affiches)
- [ ] Naviguer a la semaine suivante/precedente : les donnees se rechargent
- [ ] Les creneaux ouverts manuellement s'affichent comme "Ouvert"
- [ ] Les creneaux fermes s'affichent comme "Ferme"

## 2. Application d'un template (1 template, semaine vierge)

- [ ] Aller dans Admin > Gestion du planning > onglet "Semaines"
- [ ] Cliquer "Appliquer des templates aux semaines"
- [ ] Selectionner **un** template
- [ ] Selectionner une semaine **non configuree**
- [ ] Cliquer "Appliquer"
- [ ] Verifier : pas de dialogue de conflit (application directe)
- [ ] Retourner au calendrier et naviguer vers cette semaine
- [ ] Verifier que les creneaux du template sont bien affiches

## 3. Application d'un template (ecrasement d'une semaine existante)

- [ ] Reprendre la semaine configuree au test 2
- [ ] Appliquer un **autre** template sur cette meme semaine
- [ ] Le dialogue de mode doit s'afficher (la semaine est deja configuree)
- [ ] Choisir **"Ecraser"** (overwrite)
- [ ] Verifier sur le calendrier : les anciens creneaux sont remplaces par les nouveaux

## 4. Application d'un template en mode fusion (merge)

- [ ] Appliquer un template sur une semaine deja configuree
- [ ] Choisir **"Fusionner (garder existants)"** (merge)
- [ ] Verifier : les creneaux existants sont conserves
- [ ] Les nouveaux creneaux qui ne chevauchent pas sont ajoutes
- [ ] Les nouveaux creneaux qui chevauchent sont ignores (pas de doublon)

## 5. Application d'un template en mode fusion (merge_keep_new)

- [ ] Appliquer un template sur une semaine deja configuree
- [ ] Choisir **"Fusionner (garder nouveaux)"** (merge_keep_new)
- [ ] Verifier : les nouveaux creneaux sont ajoutes
- [ ] Les anciens creneaux en conflit sont supprimes et remplaces

## 6. Application de plusieurs templates

- [ ] Dans le selecteur de semaines, selectionner **2 templates ou plus**
- [ ] Les appliquer a une semaine
- [ ] Verifier que le premier template est applique en entier
- [ ] Verifier que les templates suivants sont fusionnes (pas d'ecrasement entre eux)

## 7. Nettoyage des reservations

- [ ] S'inscrire a un creneau sur une semaine
- [ ] Appliquer un template qui contient un creneau **bloquant** (entrainement) couvrant ce creneau
- [ ] Verifier que l'inscription est automatiquement supprimee
- [ ] Les inscriptions sur les creneaux non couverts ne sont pas touchees

## 8. Suppression d'un creneau individuel (admin)

- [ ] Se connecter en admin
- [ ] Sur le calendrier, passer en vue "Edition"
- [ ] Supprimer un creneau de semaine (icone poubelle)
- [ ] Confirmer la suppression
- [ ] Verifier que le creneau disparait du calendrier

## 9. Analyse de conflits

- [ ] Selectionner un template et une semaine deja configuree avec des creneaux qui chevauchent
- [ ] Cliquer "Appliquer"
- [ ] Verifier que le dialogue affiche les conflits detectes (creneaux en conflit listes)
- [ ] Annuler pour verifier que rien n'est modifie

## 10. Cas limites

- [ ] Appliquer un template a **plusieurs semaines** en une seule fois
- [ ] Appliquer un template qui n'a **aucun creneau** (template vide)
- [ ] Appliquer un template sur une semaine, puis naviguer au calendrier et verifier le temps reel (si un autre admin modifie en parallele)
