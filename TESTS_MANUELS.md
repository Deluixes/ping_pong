# Tests manuels - Refactoring weekConfigService

Tests à effectuer pour valider que le refactoring de `applyTemplateToWeeks` n'a rien cassé.

---

## 1. Affichage du calendrier

- [ ] Ouvrir l'app, se connecter
- [ ] Le calendrier s'affiche avec les créneaux de la semaine courante
- [ ] Les créneaux bloqués (entraînements) s'affichent correctement avec leur nom/coach/groupe
- [ ] Les horaires d'ouverture sont respectés (créneaux hors horaires non affichés)
- [ ] Naviguer à la semaine suivante/précédente : les données se rechargent
- [ ] Les créneaux ouverts manuellement s'affichent comme "Ouvert"
- [ ] Les créneaux fermés s'affichent comme "Fermé"

## 2. Application d'un template (1 template, semaine vierge)

- [ ] Aller dans Admin > Gestion du planning > onglet "Semaines"
- [ ] Cliquer "Appliquer des templates aux semaines"
- [ ] Sélectionner **un** template
- [ ] Sélectionner une semaine **non configurée**
- [ ] Cliquer "Appliquer"
- [ ] Vérifier : pas de dialogue de conflit (application directe)
- [ ] Retourner au calendrier et naviguer vers cette semaine
- [ ] Vérifier que les créneaux du template sont bien affichés

## 3. Application d'un template (écrasement d'une semaine existante)

- [ ] Reprendre la semaine configurée au test 2
- [ ] Appliquer un **autre** template sur cette même semaine
- [ ] Le dialogue de mode doit s'afficher (la semaine est déjà configurée)
- [ ] Choisir **"Écraser"** (overwrite)
- [ ] Vérifier sur le calendrier : les anciens créneaux sont remplacés par les nouveaux

## 4. Application d'un template en mode fusion (merge)

- [ ] Appliquer un template sur une semaine déjà configurée
- [ ] Choisir **"Fusionner (garder existants)"** (merge)
- [ ] Vérifier : les créneaux existants sont conservés
- [ ] Les nouveaux créneaux qui ne chevauchent pas sont ajoutés
- [ ] Les nouveaux créneaux qui chevauchent sont ignorés (pas de doublon)

## 5. Application d'un template en mode fusion (merge_keep_new)

- [ ] Appliquer un template sur une semaine déjà configurée
- [ ] Choisir **"Fusionner (garder nouveaux)"** (merge_keep_new)
- [ ] Vérifier : les nouveaux créneaux sont ajoutés
- [ ] Les anciens créneaux en conflit sont supprimés et remplacés

## 6. Application de plusieurs templates

- [ ] Dans le sélecteur de semaines, sélectionner **2 templates ou plus**
- [ ] Les appliquer à une semaine
- [ ] Vérifier que le premier template est appliqué en entier
- [ ] Vérifier que les templates suivants sont fusionnés (pas d'écrasement entre eux)

## 7. Nettoyage des réservations

- [ ] S'inscrire à un créneau sur une semaine
- [ ] Appliquer un template qui contient un créneau **bloquant** (entraînement) couvrant ce créneau
- [ ] Vérifier que l'inscription est automatiquement supprimée
- [ ] Les inscriptions sur les créneaux non couverts ne sont pas touchées

## 8. Suppression d'un créneau individuel (admin)

- [ ] Se connecter en admin
- [ ] Sur le calendrier, passer en vue "Édition"
- [ ] Supprimer un créneau de semaine (icône poubelle)
- [ ] Confirmer la suppression
- [ ] Vérifier que le créneau disparaît du calendrier

## 9. Analyse de conflits

- [ ] Sélectionner un template et une semaine déjà configurée avec des créneaux qui chevauchent
- [ ] Cliquer "Appliquer"
- [ ] Vérifier que le dialogue affiche les conflits détectés (créneaux en conflit listés)
- [ ] Annuler pour vérifier que rien n'est modifié

## 10. Cas limites

- [ ] Appliquer un template à **plusieurs semaines** en une seule fois
- [ ] Appliquer un template qui n'a **aucun créneau** (template vide)
- [ ] Appliquer un template sur une semaine, puis naviguer au calendrier et vérifier le temps réel (si un autre admin modifie en parallèle)
