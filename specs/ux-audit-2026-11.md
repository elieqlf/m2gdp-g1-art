# Audit UX NOVART — parcours prioritaires

Audit des parcours les plus probables : arriver sur le site, se connecter ou
créer un compte, découvrir une activité, choisir une zone, participer, publier
une activité et gérer son profil. Les parcours ont été relus dans l’application
et corrigés là où une incohérence empêchait d’avancer.

## Frictions relevées et corrections

| Parcours | Friction constatée | Correction |
| --- | --- | --- |
| Connexion et inscription | Un compte incomplet pouvait revenir à une page qui ne correspondait pas à son étape. | Après authentification, l’app vérifie les champs requis et reprend l’étape manquante. Connexion et inscription par e-mail gardent un chemin commun. |
| Lien e-mail | Le lien peut être ouvert sur un autre appareil et une erreur réseau interrompait le parcours sans solution visible. | Écran de confirmation de l’adresse, état de lien expiré, renvoi temporisé et messages de reprise. |
| Onboarding | Ville et GPS pouvaient sembler obligatoires ou exposés aux autres membres. | Ville facultative et privée; la demande GPS n’arrive qu’après une action claire. Les préférences peuvent être passées. |
| Découverte sans localisation | L’app choisissait une zone par défaut et donnait une fausse impression de proximité. | Aucune position n’est inventée. Sans zone, la liste est triée par date et les distances sont cachées. |
| Filtres de proximité | Le rayon restait inactif sans expliquer pourquoi. | Explication visible, rayon désactivé tant qu’aucune zone n’est connue, choix d’une ville ou demande GPS explicite. |
| Aucun résultat | « Voir toutes les activités » gardait le rayon proche actif. | L’action retire la recherche et les filtres géographiques, affiche réellement toutes les activités et les trie par date. |
| Carte | Des points rouges identiques se chevauchaient et ne distinguaient pas les disciplines. | Repères NOVART avec symbole par discipline, sélection visible et regroupement des points proches avec compteur. |
| Création d’activité | Des photos d’exemple suggérées prenaient la place de l’image de l’organisateur; coller une URL ne fonctionnait pas. | Départ sans photo présélectionnée; choix depuis la galerie ou les fichiers, aperçu, remplacement et retrait. Le brouillon est conservé localement. |
| Photos | L’ajout d’une image pouvait être confondu avec une validation de son contenu. | L’image est contrôlée pour le type, le poids et l’optimisation technique. **Aucune modération automatique n’est ajoutée.** |
| Participation | Un clic pouvait échouer si la dernière place venait d’être prise, sans indiquer quoi faire ensuite. | Erreur spécifique quand l’activité est complète, confirmation d’inscription et accès direct au groupe, aux détails et au rappel. |
| Profil et communauté | La liste de membres lisait les profils privés et pouvait afficher ville ou coordonnées. La photo importée n’était pas rendue dans l’avatar; la communauté pouvait garder l’ancienne bio en cache. | Données privées limitées au propriétaire. La communauté lit une liste blanche sans e-mail ni localisation; la carte des membres est supprimée. Les photos WebP importées s’affichent, profil privé et fiche publique sont enregistrés ensemble, et le cache public est actualisé dès la sauvegarde. |
| Navigation mobile | Les vues lourdes, dont la carte, étaient téléchargées dès l’ouverture. | Les écrans sont chargés à la demande; un état de chargement et un message de reprise sont affichés pendant ou après le chargement d’une vue. |
| Illustrations | Des mascottes de petite définition restaient dans les pages vitrine et les états vides. | Remplacées par les extraits HD déjà disponibles dans le dépôt (1 520–1 536 px de large); les anciennes versions floues sont retirées. |
| Titres et couleurs | Le site vitrine utilisait encore Sigmar One, un rouge moins vif et un fond jaune. | Fredoka 600 pour les titres, Caveat conservée pour la tagline, rouge `#FF0000` et fond `#F5F5F5` harmonisés avec l’application. |

## Confidentialité de la localisation

Les documents `users/{uid}` restent privés et ne sont accessibles qu’à leur
propriétaire. Les profils affichés dans la communauté sont écrits dans
`publicProfiles/{uid}` avec prénom, nom, photo, bio et centres d’intérêt seulement.
La ville, l’adresse e-mail et les coordonnées n’entrent pas dans cette liste.
Les lieux publics d’une activité restent visibles sur sa fiche et sa carte.

## Vérification avant publication

- Les tests unitaires vérifient les filtres sans zone, la saisie de ville et le
  nettoyage des coordonnées en cas de texte libre.
- Les parcours Playwright couvrent sur trois tailles d’écran connexion,
  inscription, communauté, filtres sans localisation, création, carte,
  inscription à une activité, conversation, édition et suppression. Le scénario
  de profil téléverse aussi une image de test, modifie la bio et vérifie son
  affichage dans la communauté.
- Les tests utilisent des services Firebase/Places simulés : ils ne créent pas
  de compte, n’envoient pas de vrai e-mail et n’écrivent pas dans Firestore.
- Les règles Firestore doivent être déployées avant le front; les profils déjà
  complets doivent ensuite être migrés vers `publicProfiles`. Voir
  `docs/donnees-firestore.md`.

## Limites restantes

- Les photos des activités et profils restent fournies par les membres; leur
  signalement et leur modération humaine ne sont pas couverts par cet audit.
- Les pins et la carte utilisent OpenStreetMap; leur fond dépend de la connexion
  réseau et du service de tuiles.
- Le bundle initial reste important en raison des bibliothèques d’authentification
  Firebase; les écrans sont séparés, mais une réduction supplémentaire demandera
  de découpler les modules Firebase.
