# Audit ergonomie et navigation NOVART — 100 points

Audit statique du code du frontend, réalisé le 10 novembre 2026. Il couvre les parcours, les états d’interface, l’accessibilité, les médias et les interactions. Il ne remplace pas une vérification visuelle sur un vrai téléphone ni un contrôle de la configuration Firebase.

**Légende :** `[OK]` présent dans le code relu · `[AMÉLIORÉ]` correction intégrée pendant cette passe · `[À VALIDER]` dépend d’un essai en situation ou d’une configuration externe.

## 1. Navigation et architecture

1. [OK] Les écrans utilisent des routes internes partageables sous forme de hash.
2. [OK] Une route inconnue revient à l’écran Découvrir.
3. [OK] Les activités ont des routes de détail, de modification et de confirmation.
4. [OK] Les conversations ont une route dédiée par activité.
5. [OK] Les identifiants de route sont encodés et décodés avant usage.
6. [AMÉLIORÉ] Le bouton retour garde un parcours de secours quand une page est ouverte directement.
7. [OK] La navigation du bas garde l’onglet parent sélectionné sur les sous-pages.
8. [OK] Les vues secondaires sans navigation principale masquent la barre du bas.
9. [AMÉLIORÉ] Chaque changement de vue ramène en haut et place le focus sur le titre de page.
10. [AMÉLIORÉ] Une transition légère accompagne les changements d’écran et respecte la préférence de réduction des animations.

## 2. Connexion et création de compte

11. [OK] L’adresse e-mail est vérifiée avant l’envoi du lien.
12. [OK] Le parcours d’e-mail ne révèle pas si l’adresse possède déjà un compte.
13. [OK] L’écran confirme explicitement que le lien a été envoyé.
14. [OK] Le renvoi du lien est temporisé pour éviter les clics répétés.
15. [OK] Un lien expiré dispose d’un écran de récupération.
16. [OK] Les profils incomplets reprennent à l’étape d’inscription requise.
17. [OK] L’avancement de l’onboarding est enregistré avec le profil.
18. [OK] Le choix « rester connecté » contrôle la persistance de session.
19. [OK] Les erreurs OAuth courantes donnent une explication exploitable.
20. [À VALIDER] Google et Apple nécessitent des fournisseurs et domaines autorisés dans Firebase, hors code frontend.

## 3. Découverte et recherche

21. [OK] La page Découvrir propose une recherche et des filtres rapides par discipline.
22. [OK] Les sections distinguent les activités proches, recommandées et populaires.
23. [OK] Les résultats peuvent être triés par proximité, date ou popularité.
24. [OK] La recherche propose une liste et une carte.
25. [OK] La géolocalisation a un état d’échec et conserve une origine de secours.
26. [OK] L’absence de résultats propose de modifier les filtres ou de les réinitialiser.
27. [AMÉLIORÉ] La recherche, le tri, les filtres et le choix liste/carte sont gardés dans l’URL.
28. [AMÉLIORÉ] La synchronisation de l’URL remplace l’entrée courante sans encombrer l’historique à chaque frappe.
29. [OK] Le panneau de filtres garde les changements en brouillon jusqu’à validation.
30. [OK] Le nombre de résultats et le nombre de filtres actifs sont annoncés dans l’interface.

## 4. Fiche d’activité et inscription

31. [OK] La fiche présente l’image, la discipline, la date, l’adresse et les places disponibles.
32. [OK] La météo n’est demandée que si l’activité est géolocalisée et assez proche dans le temps.
33. [OK] Le chargement de la météo est annulé lorsque la fiche change.
34. [OK] L’organisateur peut modifier son activité depuis la fiche.
35. [OK] Les participants et organisateurs accèdent au groupe de discussion.
36. [OK] Une activité passée ou complète ne peut pas être rejointe.
37. [OK] L’inscription utilise une transaction Firestore pour respecter la capacité.
38. [OK] Une erreur de dernière place prise reçoit un message précis.
39. [AMÉLIORÉ] La confirmation d’inscription ajoute une animation de célébration.
40. [OK] Quitter une activité demande confirmation et explique que la place sera libérée.

## 5. Création et gestion d’activités

41. [OK] La création est découpée en quatre étapes identifiées.
42. [OK] Le brouillon est conservé localement pendant la saisie.
43. [OK] Le brouillon retrouvé est annoncé et peut être réinitialisé.
44. [OK] Les erreurs de validation ramènent le focus sur le champ à corriger.
45. [OK] Le formulaire limite les longueurs de titre, description et matériel.
46. [OK] La discipline choisie propose une photo correspondante par défaut.
47. [OK] Changer de discipline met à jour la photo tant que l’organisateur n’a pas choisi une image personnalisée.
48. [OK] L’aperçu permet de retourner corriger les informations avant publication.
49. [OK] Une erreur de publication conserve le brouillon et propose de réessayer.
50. [À VALIDER] Le flux complet de modification et suppression doit être parcouru sur un compte Firebase réel.

## 6. Profils et communauté

51. [OK] Le profil rassemble les informations, les favoris, les activités, les conversations et la communauté.
52. [OK] Les statistiques du profil distinguent les activités passées, à venir et les rencontres.
53. [OK] Le formulaire permet de choisir une photo de profil proposée.
54. [OK] Le lien vers une image externe est limité à HTTPS.
55. [OK] Les photos locales proposées sont stockées dans le projet et créditées.
56. [OK] Les membres de démonstration ont des portraits déterministes.
57. [OK] Un membre réel sans photo garde ses initiales plutôt qu’un visage attribué sans son accord.
58. [OK] Les photos des participants apparaissent dans les cartes d’agenda et les confirmations.
59. [OK] Les portraits peuvent aussi apparaître dans les conversations et sur les fiches.
60. [À VALIDER] La galerie de profils doit être vérifiée avec les données réellement présentes dans Firestore.

## 7. Conversations

61. [OK] Les messages du groupe sont reçus en temps réel.
62. [OK] La date sépare visuellement les journées de conversation.
63. [OK] Les messages de l’utilisateur sont visuellement distincts.
64. [OK] L’envoi est bloqué pour un message vide et limité à 1 000 caractères.
65. [OK] Une erreur réseau explique comment réessayer.
66. [AMÉLIORÉ] Les nouveaux messages ne déplacent plus la lecture si la personne consulte l’historique.
67. [AMÉLIORÉ] Un bouton permet de rejoindre les nouveaux messages reçus hors du bas de la conversation.
68. [AMÉLIORÉ] La liste de messages a son propre défilement, sans faire sauter toute la page.
69. [OK] La liste annonce l’ajout de messages sans relire tout l’historique.
70. [OK] Le groupe est réservé aux membres de l’activité.

## 8. Accessibilité et formulaires

71. [OK] Les actions essentielles sont des boutons ou liens sémantiques.
72. [OK] Les icônes seules ont un nom accessible.
73. [OK] Les champs ont des libellés visibles ou accessibles.
74. [OK] Les états d’erreur utilisent des annonces d’alerte.
75. [OK] Les états de chargement sont annoncés comme tels.
76. [AMÉLIORÉ] Les panneaux de filtres et de confirmation gardent le focus au clavier.
77. [AMÉLIORÉ] Échap ferme ces panneaux quand une action n’est pas en cours.
78. [OK] Les filtres sélectionnés exposent leur état via `aria-pressed`.
79. [OK] Le lien « Aller au contenu » est disponible au clavier.
80. [À VALIDER] Une revue avec lecteur d’écran et navigation clavier réelle reste à faire.

## 9. Présentation, responsive et médias

81. [AMÉLIORÉ] Les titres de formulaire et d’état sont plus grands et en gras, avec la police manuscrite retenue.
82. [OK] La couleur principale rouge est centralisée dans les variables CSS.
83. [OK] Les cartes et listes utilisent la même palette de surfaces et de texte.
84. [OK] Les images de couverture ont un cadrage adapté par `object-fit: cover`.
85. [OK] Les photos d’activité sont des fichiers WebP locaux en haute résolution.
86. [OK] Les photos de profil sont optimisées en WebP et proposées dans l’éditeur.
87. [OK] Les anciennes couvertures SVG et les couvertures manquantes basculent vers la photo de leur discipline.
88. [OK] Les images secondaires des cartes sont chargées paresseusement.
89. [OK] Les marges de navigation intègrent les zones de sécurité des téléphones.
90. [À VALIDER] Les tailles d’écran, le zoom et l’orientation doivent encore être contrôlés visuellement sur appareil.

## 10. Résilience et mouvement

91. [OK] Les écrans de chargement, d’erreur et de contenu vide sont différenciés.
92. [AMÉLIORÉ] Favoris et activités personnelles permettent de réessayer après une erreur de chargement.
93. [OK] Les actions d’envoi et de publication affichent un état occupé ou désactivé.
94. [OK] La suppression d’activité et la désinscription ne reposent pas sur une alerte navigateur native.
95. [OK] La capacité maximale est protégée par une opération transactionnelle côté Firestore.
96. [AMÉLIORÉ] L’entrée sur une page est animée sans mouvement brusque.
97. [AMÉLIORÉ] La confirmation de participation utilise un petit éclat de confettis.
98. [OK] Les animations principales sont coupées lorsque le système demande moins de mouvement.
99. [À VALIDER] Les règles Firestore et les permissions réelles n’ont pas été auditées par ce contrôle frontend.
100. [À VALIDER] Le parcours complet doit être essayé avec un vrai compte, des données réelles et un écran mobile.

## Améliorations intégrées pendant cet audit

- Synchronisation des filtres et du mode liste/carte avec l’URL, sans ajouter d’entrées d’historique à chaque frappe.
- Défilement du chat qui respecte la position de lecture et propose un raccourci vers les nouveaux messages.
- Titres plus visibles, portraits de démonstration et choix explicite de portraits dans le profil.
- Photos d’activités par discipline, avec crédits conservés dans [credits-visuels.md](credits-visuels.md).
- Transition de pages, gestion du focus, panneaux clavier et confettis après inscription.
