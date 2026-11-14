# Assemble les pages statiques du site vitrine (en-tête, pied de page et pictogrammes communs).
# Usage, à la racine du dépôt : python3 scripts/design/build-landing.py
# Pictogrammes (Lucide, ISC) : scripts/design/landing-sprite.svg, généré par landing-sprite.mjs.
import json, pathlib, html
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'landing'
APP = 'https://novart-app.web.app'
SPRITE = (pathlib.Path(__file__).with_name('landing-sprite.svg')).read_text()
catalog = json.loads((ROOT / 'frontend/src/data/catalog.json').read_text())

def i(name, label=None):
    a = f' role="img" aria-label="{label}"' if label else ' aria-hidden="true"'
    return f'<svg class="icon"{a}><use href="#i-{name}"/></svg>'

NAV = [('index.html', 'Accueil'), ('fonctionnement.html', 'Fonctionnement'), ('faq.html', 'FAQ'), ('contact.html', 'Contact')]

def page(file, title, description, body):
    import re
    # Typographie française : espace fine insécable avant ! ? ; : et à l'intérieur des guillemets.
    body = re.sub(r' ([!?;:»])', '\u202f\\1', body).replace('« ', '«\u202f')
    nav = ''.join(f'<a href="{href}"{" aria-current=\"page\"" if href == file else ""}>{label}</a>' for href, label in NAV)
    doc = f'''<!DOCTYPE html>
<html lang="fr" class="no-js">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>{title}</title>
  <meta name="description" content="{description}" />
  <meta name="theme-color" content="#FF0000" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="assets/img/novart-logo-primary.png" />
  <link rel="icon" type="image/png" href="assets/img/novart-logo-primary.png" />
  <link rel="preload" href="assets/fonts/caveat-variable.ttf" as="font" type="font/ttf" crossorigin />
  <link rel="stylesheet" href="assets/site.css" />
</head>
<body>
{SPRITE}
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="NOVART, accueil"><span class="brand-logo" aria-hidden="true"></span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Ouvrir le menu"><svg class="icon" aria-hidden="true"><use href="#i-menu"/></svg></button>
    <nav id="site-nav" class="site-nav" aria-label="Navigation principale">{nav}<a class="btn btn--primary" href="{APP}">{i('log-in')}Ouvrir l’application</a></nav>
  </div>
</header>
<main id="contenu">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div>
      <span class="brand-logo brand-logo--white" role="img" aria-label="NOVART — L’art se crée ensemble."></span>
      <p class="light" style="margin-top:.8rem">Rencontrer, créer, partager. Ensemble, près de chez toi.</p>
    </div>
    <div><h2>Découvrir</h2><ul><li><a href="fonctionnement.html">Comment ça marche</a></li><li><a href="faq.html">Questions fréquentes</a></li><li><a href="{APP}">Ouvrir l’application</a></li></ul></div>
    <div><h2>NOVART</h2><ul><li><a href="index.html#tarifs">Tarifs</a></li><li><a href="index.html#lieux">Lieux et partenaires</a></li><li><a href="contact.html">Contact</a></li></ul></div>
    <div><h2>Informations</h2><ul><li><a href="legal.html#mentions">Mentions légales</a></li><li><a href="legal.html#cgu">Conditions d’utilisation</a></li><li><a href="legal.html#confidentialite">Confidentialité</a></li><li><a href="presentation/">Présentation du projet</a></li></ul></div>
    <p class="legal-line">© <span data-year>2026</span> NOVART — projet étudiant réalisé dans le cadre du Master 2 CIM. L’art ne se crée plus en solo !</p>
  </div>
</footer>
<script src="assets/site.js" defer></script>
</body>
</html>
'''
    (OUT / file).write_text(doc)

def phone(screen, alt, loading='lazy'):
    return f'<figure class="phone"><img src="assets/screens/{screen}.webp" alt="{alt}" width="780" height="1688" loading="{loading}" /></figure>'

band = '<div class="band" aria-hidden="true"><div class="band__track">' + ''.join(f'<span>{w}</span>' for w in ['Rencontrer', 'Créer', 'Partager', 'Ensemble'] * 4) + '</div></div>'
cta = f'''<section class="section section--red cta">
  <div class="wrap reveal">
    <img src="assets/img/mascotte-partage.webp" alt="" width="170" height="142" loading="lazy" />
    <h2>Prêt·e à créer ensemble ?</h2>
    <p class="lead" style="margin-inline:auto">Rejoins NOVART en quelques secondes avec ton compte Google ou ton e-mail, sans mot de passe.</p>
    <div class="btn-row"><a class="btn btn--light" href="{APP}">{i('log-in')}Rejoindre la communauté</a><a class="btn btn--ghost" href="fonctionnement.html">Voir comment ça marche</a></div>
  </div>
</section>'''

# ---------- Accueil ----------
disc = ''.join(f'<li class="discipline reveal"><img src="assets/covers/{d["id"]}-{1 + n % 2}.svg" alt="" width="800" height="500" loading="lazy" /><span>{d["label"]}</span></li>' for n, d in enumerate(catalog['disciplines']))
index = f'''
<section class="hero hero--home">
  <div class="wrap">
    <div class="hero__text">
      <span class="eyebrow">Pratiques artistiques · Métropole de Lyon</span>
      <h1>L’art se crée ensemble</h1>
      <p class="light">NOVART réunit les passionnés de peinture, de musique, de danse, de photo ou de théâtre autour d’activités organisées près de chez eux, dans des lieux publics.</p>
      <div class="btn-row"><a class="btn btn--primary" href="{APP}">{i('log-in')}Rejoindre la communauté</a><a class="btn btn--outline" href="fonctionnement.html">Comment ça marche ?</a></div>
    </div>
    <div class="hero__visual">
      <img class="hero__mascot" src="assets/img/mascotte-accueil-hd.webp" alt="La mascotte NOVART, un chat souriant qui porte un sac NOVART" width="1100" height="761" fetchpriority="high" />
    </div>
  </div>
  {band}
</section>

<section class="section section--rose" aria-labelledby="app-title">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">L’application</span>
      <h2 id="app-title">NOVART dans ta poche</h2>
      <p class="lead">Découvre les activités autour de toi, inscris-toi en un geste et échange avec le groupe avant de te retrouver. L’application s’ouvre directement dans le navigateur de ton téléphone, rien à installer.</p>
      <ul class="checks">
        <li>{i('map-pin')}<span>Les activités proches de chez toi, en liste ou sur la carte</span></li>
        <li>{i('users')}<span>Des places limitées pour des groupes à taille humaine</span></li>
        <li>{i('message-circle-more')}<span>Un groupe de discussion pour chaque activité, et des messages privés</span></li>
        <li>{i('bell')}<span>Complet ? La liste d’attente te prévient quand une place se libère</span></li>
      </ul>
      <div class="btn-row"><a class="btn btn--primary" href="{APP}">{i('smartphone')}Ouvrir l’application</a></div>
    </div>
    <div class="phones reveal">{phone('decouvrir', 'Écran Découvrir : activités autour de toi')}{phone('fiche', 'Fiche d’une activité avec date, lieu et places')}{phone('conversation', 'Groupe de discussion d’une activité')}</div>
  </div>
</section>

<section class="section" aria-labelledby="video-title">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">En vidéo</span><h2 id="video-title">NOVART en une minute</h2></div>
    <!-- Vidéo de présentation (54 s, 848 × 480, H.264/AAC, lecture progressive) : seules les métadonnées
         sont chargées avant la lecture. Si une voix off est ajoutée, prévoir des sous-titres (<track kind="captions">). -->
    <figure class="video video--player reveal">
      <video controls playsinline preload="metadata" poster="assets/img/video-poster.webp" width="848" height="480" aria-describedby="video-desc">
        <source src="assets/video/novart-presentation.mp4" type="video/mp4" />
        <a href="assets/video/novart-presentation.mp4">Télécharger la vidéo de présentation (MP4, 7 Mo)</a>
      </video>
    </figure>
    <p id="video-desc" class="video__caption center">Nouvelle à Lyon ? Découvre les activités autour de toi sur la carte, inscris-toi, échange avec le groupe et crée ta propre activité en quatre étapes.</p>
  </div>
</section>

<section class="section section--tint" aria-labelledby="solution-title">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">Pourquoi NOVART</span><h2 id="solution-title">La solution simple pour créer à plusieurs</h2>
      <p class="lead">Envie de peindre, de jouer ou de danser, mais personne avec qui partager ta passion ? NOVART t’aide à passer de l’envie à la rencontre.</p></div>
    <div class="grid grid--3" style="margin-top:2rem">
      <article class="card card--mascot reveal"><img src="assets/img/mascotte-decouverte.webp" alt="" width="180" height="156" loading="lazy" /><h3>Trouver près de chez toi</h3><p>Les activités sont classées par distance, avec des filtres par discipline, date, niveau et places disponibles.</p></article>
      <article class="card card--mascot reveal"><img src="assets/img/mascotte-rencontre.webp" alt="" width="186" height="160" loading="lazy" /><h3>Rencontrer d’autres passionnés</h3><p>Débutant ou confirmé, tu rejoins un petit groupe dans un parc, un café associatif ou une médiathèque.</p></article>
      <article class="card card--mascot reveal"><img src="assets/img/mascotte-creation.webp" alt="" width="186" height="160" loading="lazy" /><h3>Créer et partager</h3><p>Propose ta propre activité en quatre étapes et rassemble une communauté autour de ce que tu aimes.</p></article>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="what-title">
  <div class="wrap split split--reverse">
    <div class="reveal">
      <span class="eyebrow">C’est quoi NOVART ?</span>
      <h2 id="what-title">Une communauté artistique de proximité</h2>
      <p class="lead">NOVART met en relation deux types de membres : les <strong>organisateurs</strong>, qui proposent une activité (lieu, date, nombre de places, matériel), et les <strong>participants</strong>, qui s’y inscrivent et échangent avec le groupe.</p>
      <p style="margin-top:1rem">Les rencontres ont lieu dans des lieux publics de la Métropole de Lyon. Le nombre de places est fixé par l’organisateur, pour que chacun trouve sa place.</p>
      <div class="btn-row"><a class="btn btn--primary" href="fonctionnement.html">{i('arrow-right')}Découvrir le fonctionnement</a></div>
    </div>
    <div class="split__media reveal"><img class="mascot" src="assets/img/mascotte-joie-hd.webp" alt="" width="1100" height="839" loading="lazy" /></div>
  </div>
</section>

<section class="section section--rose" aria-labelledby="disc-title">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">12 disciplines, 60 pratiques</span><h2 id="disc-title">Toutes les façons de créer</h2>
      <p class="lead">De l’aquarelle au slam, du hip-hop à la poterie : chaque activité précise sa discipline, sa pratique et son niveau.</p></div>
    <ul class="disciplines" style="margin-top:2rem;padding:0;list-style:none">{disc}</ul>
  </div>
</section>

<section class="section" aria-labelledby="who-title">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">Pour qui ?</span><h2 id="who-title">Que tu participes ou que tu organises</h2></div>
    <div class="audience" style="margin-top:2rem">
      <article class="card reveal">
        <img src="assets/img/mascotte-enthousiasme.webp" alt="" width="170" height="140" loading="lazy" />
        <h3>Je veux participer</h3>
        <ul class="checks">
          <li>{i('search')}<span>Je cherche par discipline, date ou distance</span></li>
          <li>{i('heart')}<span>Je garde mes activités préférées en favoris</span></li>
          <li>{i('calendar-days')}<span>Je m’inscris et j’ajoute un rappel à mon agenda</span></li>
          <li>{i('send')}<span>Je pose mes questions à l’organisateur en message privé</span></li>
          <li>{i('message-circle-more')}<span>J’échange avec le groupe avant le jour J</span></li>
        </ul>
      </article>
      <article class="card reveal">
        <img src="assets/img/mascotte-confiance.webp" alt="" width="155" height="142" loading="lazy" />
        <h3>Je veux organiser</h3>
        <ul class="checks">
          <li>{i('sparkles')}<span>Je pars d’un modèle d’activité prêt à l’emploi</span></li>
          <li>{i('map-pin')}<span>Je choisis parmi plus de 120 lieux suggérés</span></li>
          <li>{i('users')}<span>Je fixe le nombre de places et le niveau</span></li>
          <li>{i('pencil')}<span>Je modifie ou j’annule mon activité à tout moment</span></li>
        </ul>
      </article>
    </div>
  </div>
</section>

<section id="tarifs" class="section section--tint" aria-labelledby="prices-title">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">Tarifs</span><h2 id="prices-title">Gratuit pour créer ensemble</h2></div>
    <div class="prices" style="margin-top:2.2rem">
      <article class="price reveal"><h3>Participant</h3><p class="price__amount">0 €</p><p>Inscription, recherche, participation et discussions de groupe.</p></article>
      <article class="price price--featured reveal"><span class="price__tag">Lancement</span><h3>Organisateur</h3><p class="price__amount">0 € <small>pendant le lancement</small></p><p>Création et gestion d’activités, sans limite pendant la phase de lancement.</p></article>
      <article class="price reveal"><h3>Lieux et associations</h3><p class="price__amount">Sur devis</p><p>Mise en avant de tes ateliers et de ton lieu auprès de la communauté. Bientôt disponible.</p><a href="contact.html">Nous contacter</a></article>
    </div>
    <p class="note center">Grille indicative, susceptible d’évoluer. Les frais éventuels d’une activité (matériel, entrée d’un lieu) sont indiqués par l’organisateur.</p>
  </div>
</section>

<section class="section" aria-labelledby="stories-title">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">Parcours</span><h2 id="stories-title">Ils pourraient utiliser NOVART</h2>
      <p class="lead">Portraits imaginés à partir de nos personas, pour illustrer les usages de l’application.</p></div>
    <div class="stories" style="margin-top:2rem">
      <article class="story reveal"><header><span class="avatar" aria-hidden="true">LÉ</span><div><strong>Léa, 24 ans</strong><small>Étudiante, nouvelle à Lyon · participante</small></div></header>
        <p>« Je dessine seule dans mon carnet depuis des années et je ne connais personne ici. »</p>
        <ol><li>Elle filtre « Dessin » et « Ce week-end ».</li><li>Elle rejoint une balade croquis aux Pentes.</li><li>Elle retrouve le groupe le samedi suivant.</li></ol></article>
      <article class="story reveal"><header><span class="avatar avatar--deep" aria-hidden="true">KA</span><div><strong>Karim, 35 ans</strong><small>Guitariste amateur · organisateur</small></div></header>
        <p>« Je cherche des musiciens pour jouer, sans monter un groupe. »</p>
        <ol><li>Il crée une jam session à partir d’un modèle.</li><li>Il choisit un café associatif suggéré et 12 places.</li><li>Il accueille les inscrits dans le groupe de discussion.</li></ol></article>
      <article class="story reveal"><header><span class="avatar avatar--grey" aria-hidden="true">MA</span><div><strong>Mathilde, 62 ans</strong><small>Retraitée, aquarelliste · les deux</small></div></header>
        <p>« J’aimerais transmettre ce que je sais à des débutants. »</p>
        <ol><li>Elle participe d’abord à quelques ateliers.</li><li>Elle propose une aquarelle au parc de la Tête d’Or.</li><li>Elle partage l’activité avec ses voisins.</li></ol></article>
    </div>
  </div>
</section>

<section id="lieux" class="section section--deep" aria-labelledby="places-title">
  <div class="wrap">
    <div class="reveal"><span class="eyebrow">Lieux et partenaires</span><h2 id="places-title">Partout dans la Métropole de Lyon</h2>
      <p class="lead">Parcs, berges, places, médiathèques, MJC, cafés associatifs, tiers-lieux : NOVART suggère aux organisateurs des lieux publics adaptés à leur discipline.</p>
      <ul class="places">
        <li>{i('map-pin')}Parc de la Tête d’Or</li><li>{i('map-pin')}Berges du Rhône</li><li>{i('map-pin')}Pentes de la Croix-Rousse</li><li>{i('map-pin')}Vieux Lyon</li><li>{i('map-pin')}Confluence</li><li>{i('map-pin')}Gerland</li><li>{i('map-pin')}Monplaisir</li><li>{i('map-pin')}Villeurbanne</li>
      </ul>
      <div class="stats">
        <div class="stat"><strong>127</strong>lieux suggérés</div><div class="stat"><strong>26</strong>quartiers et communes</div><div class="stat"><strong>12</strong>disciplines</div><div class="stat"><strong>12</strong>modèles d’activités</div>
      </div>
      <p style="margin-top:1.6rem">Tu gères un lieu culturel, une MJC ou une association ? Nous construisons nos premiers partenariats : <a href="contact.html" style="color:var(--rose);font-weight:600">écris-nous</a>.</p>
    </div>
  </div>
</section>
{cta}
'''
page('index.html', 'NOVART — L’art se crée ensemble', 'NOVART réunit les passionnés de pratiques artistiques autour d’activités près de chez eux, dans la Métropole de Lyon.', index)

# ---------- Fonctionnement ----------
def step(n, kicker, title, text, screen, alt, extra=''):
    return f'''<article class="step reveal"><div class="step__text"><p class="step__number"><b>{n}</b>{kicker}</p><h3>{title}</h3><p style="margin-top:.6rem">{text}</p>{extra}</div>{phone(screen, alt)}</article>'''
fonct = f'''
<section class="hero hero--page section--rose">
  <div class="wrap">
    <div class="hero__text">
      <span class="eyebrow">Fonctionnement</span>
      <h1>Se réunir pour créer n’a jamais été aussi simple !</h1>
      <p class="light">De l’inscription à la première rencontre, voici comment NOVART fonctionne, pour les participants comme pour les organisateurs.</p>
      <div class="btn-row"><a class="btn btn--primary" href="#participer">Je veux participer</a><a class="btn btn--ghost" href="#organiser" style="color:var(--red)">Je veux organiser</a></div>
    </div>
    <div class="hero__visual"><img class="hero__mascot" src="assets/img/mascotte-carte-hd.webp" alt="" width="1027" height="1022" /></div>
  </div>
</section>

<section id="participer" class="section" aria-labelledby="participer-title">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">Côté participant</span><h2 id="participer-title">Comment ça marche ?</h2>
      <p class="lead">Cinq étapes pour passer de l’envie à la rencontre.</p></div>
    <div class="steps">
      {step(1, 'Inscription', 'Pas de mot de passe', 'Continue avec Google ou saisis ton adresse e-mail pour recevoir un lien de connexion. Tu crées ensuite ton profil en trois étapes : prénom ou pseudo, quartier et centres d’intérêt, puis tes préférences de découverte.', 'connexion', 'Écran de connexion par lien e-mail')}
      {step(2, 'Découverte', 'Les activités autour de toi', 'L’accueil te montre les activités proches, les plus populaires et celles qui correspondent à tes centres d’intérêt.', 'decouvrir', 'Écran Découvrir')}
      {step(3, 'Recherche', 'Filtre selon tes envies', 'Discipline, date, rayon autour de toi, places disponibles, niveau : affine ta recherche, en liste ou sur la carte.', 'filtres', 'Fenêtre de filtres de recherche')}
      {step(4, 'Participation', 'Inscris-toi en un geste', 'Sur la fiche, consulte le lieu, l’horaire, le matériel et la météo prévue, puis touche « Participer ». C’est complet ? Rejoins la liste d’attente : on te prévient si une place se libère.', 'participation', 'Écran de confirmation « Tu participes ! »')}
      {step(5, 'Échanges', 'Prépare la rencontre avec le groupe', 'Chaque activité a son groupe de discussion, réservé à l’organisateur et aux inscrits. Une question avant de t’inscrire ? Écris en privé à l’organisateur.', 'conversation', 'Groupe de discussion d’une activité')}
    </div>
  </div>
</section>

<section id="organiser" class="section section--rose" aria-labelledby="organiser-title">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">Côté organisateur</span><h2 id="organiser-title">Propose ton activité en quatre étapes</h2></div>
    <div class="steps">
      {step(1, 'Informations', 'Pars d’un modèle ou de zéro', 'Titre, discipline, description, niveau et matériel. Douze modèles d’activités t’aident à te lancer.', 'creer', 'Création d’une activité, étape informations')}
      {step(2, 'Lieu, date et places', 'Choisis où et quand', 'Sélectionne un lieu public suggéré ou saisis une adresse, puis fixe la date, les horaires et le nombre de places.', 'apercu', 'Aperçu de l’activité avant publication')}
      {step(3, 'Suivi', 'Gère tes activités', 'Retrouve tes activités et celles auxquelles tu participes. Modifie-les à tout moment, sans jamais descendre sous le nombre d’inscrits.', 'mes-activites', 'Écran Mes activités')}
    </div>
  </div>
</section>

<section class="section section--tint" aria-labelledby="trust-title">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">Confiance</span><h2 id="trust-title">Des rencontres sereines</h2></div>
    <div class="grid grid--3" style="margin-top:2rem">
      <article class="card reveal"><span class="card__icon">{i('map-pin')}</span><h3>Des lieux publics</h3><p>Les lieux suggérés sont des parcs, places, médiathèques ou lieux associatifs, ouverts à tous.</p></article>
      <article class="card reveal"><span class="card__icon">{i('users')}</span><h3>Des groupes à taille humaine</h3><p>L’organisateur fixe le nombre de places ; personne ne peut s’inscrire au-delà.</p></article>
      <article class="card reveal"><span class="card__icon">{i('lock')}</span><h3>Une discussion réservée</h3><p>Seuls l’organisateur et les participants inscrits accèdent au groupe de l’activité.</p></article>
    </div>
  </div>
</section>
{cta}
'''
page('fonctionnement.html', 'Comment ça marche ? — NOVART', 'Inscription, recherche, participation et création d’activités : découvre le fonctionnement de NOVART étape par étape.', fonct)

# ---------- FAQ ----------
def faq_list(items):
    return '<div class="faq">' + ''.join(f'<details class="reveal"><summary>{q}{i("chevron-down")}</summary><div><p>{a}</p></div></details>' for q, a in items) + '</div>'
participants = [
  ('NOVART est-il gratuit ?', 'Oui, l’inscription et la participation aux activités sont gratuites. Si une activité demande du matériel ou l’entrée d’un lieu, l’organisateur l’indique dans la fiche.'),
  ('Faut-il un niveau particulier ?', 'Non. Chaque activité précise son niveau : débutant, intermédiaire, avancé ou tous niveaux. Tu peux filtrer les résultats selon ton niveau.'),
  ('Comment m’inscrire à une activité ?', 'Ouvre la fiche de l’activité et touche « Participer ». Ta place est confirmée immédiatement tant qu’il reste des places.'),
  ('Que se passe-t-il si l’activité est complète ?', 'Rejoins la liste d’attente : la fiche t’indique ton rang. Si quelqu’un se désinscrit, la place est proposée à la première personne de la liste, qui est prévenue dans l’application et a 24 heures pour la confirmer (jamais au-delà du début de l’activité). Sans réponse, elle passe à la personne suivante.'),
  ('Puis-je annuler ma participation ?', 'Oui, depuis la fiche de l’activité, avec « Quitter l’activité ». Ta place est libérée pour quelqu’un d’autre.'),
  ('Comment contacter l’organisateur ou le groupe ?', 'Avant de t’inscrire, touche « Contacter » sur la fiche de l’activité pour écrire en privé à l’organisateur. Après ton inscription, tu accèdes aussi au groupe de discussion de l’activité, depuis la fiche ou l’onglet Conversations.'),
  ('Comment sont calculées les distances ?', 'À partir de l’adresse de ton profil, ou de ta position si tu choisis « Me localiser » sur la carte. Sinon, depuis le centre de Lyon.'),
]
organisateurs = [
  ('Qui peut proposer une activité ?', 'Tout membre inscrit : artiste, amateur, professeur ou simple passionné.'),
  ('Combien de personnes puis-je accueillir ?', 'Entre 2 et 100 places. Tu peux modifier ce nombre plus tard, sans descendre sous le nombre de personnes déjà inscrites.'),
  ('Où organiser mon activité ?', 'Dans un lieu public ou accueillant du public. NOVART te suggère plus de 120 lieux de la Métropole de Lyon adaptés à ta discipline ; tu peux aussi saisir une adresse.'),
  ('Puis-je ajouter mes propres photos ?', 'Oui : à la création ou dans « Modifier », touche « Importer ma photo ». Elle est recadrée au format de la fiche et allégée avant l’envoi. Tu peux aussi choisir une illustration NOVART ou coller le lien d’une photo en ligne.'),
  ('Comment modifier ou annuler mon activité ?', 'Depuis la fiche, touche « Modifier ». Tu peux changer les informations ou supprimer l’activité ; pense à prévenir les inscrits dans le groupe de discussion.'),
]
compte = [
  ('Pourquoi n’y a-t-il pas de mot de passe ?', 'Tu te connectes avec ton compte Google, ou par un lien envoyé par e-mail : rien à retenir, et ton compte reste protégé par ta boîte mail. Coche « Rester connecté·e sur cet appareil » pour ne pas avoir à te reconnecter à chaque visite.'),
  ('Le lien de connexion ne fonctionne pas.', 'Ouvre-le dans le même navigateur que celui où tu l’as demandé. S’il a expiré ou déjà servi, demande un nouveau lien depuis l’écran de connexion. Pense à vérifier tes courriers indésirables.'),
  ('Quelles informations sont visibles par les autres membres ?', 'Les membres connectés voient ton profil : prénom, nom, photo, description et adresse, ainsi que tes activités. Ton adresse e-mail n’est jamais montrée aux autres membres. Le détail est expliqué dans notre <a href="legal.html#confidentialite">politique de confidentialité</a>.'),
  ('Mes messages privés sont-ils confidentiels ?', 'Une conversation privée n’est lisible que par les deux membres concernés : les autres membres n’y ont pas accès. Les messages sont chiffrés pendant leur transport et sur les serveurs de Google, mais ce n’est pas un chiffrement de bout en bout : l’équipe NOVART pourrait techniquement y accéder, ce qu’elle ne fait qu’en cas de signalement ou d’obligation légale. Évite d’y partager des informations sensibles.'),
  ('NOVART est-il disponible hors de Lyon ?', 'NOVART démarre dans la Métropole de Lyon. D’autres villes pourront suivre.'),
]
faq = f'''
<section class="hero hero--page section--rose">
  <div class="wrap">
    <div class="hero__text"><span class="eyebrow">Foire aux questions</span><h1>Nous sommes là pour répondre à tes questions !</h1>
      <p class="light">Les réponses aux questions les plus fréquentes des participants et des organisateurs.</p></div>
    <div class="hero__visual"><img class="hero__mascot" src="assets/img/mascotte-bonjour-hd.webp" alt="" width="1057" height="929" /></div>
  </div>
</section>
<section class="section" aria-label="Questions fréquentes">
  <div class="wrap" style="max-width:52rem">
    <h2 class="faq-title" id="faq-participants"><img src="assets/img/mascotte-enthousiasme.webp" alt="" width="170" height="140" loading="lazy" />Participants</h2>
    {faq_list(participants)}
    <h2 class="faq-title" id="faq-organisateurs"><img src="assets/img/mascotte-confiance.webp" alt="" width="155" height="142" loading="lazy" />Organisateurs</h2>
    {faq_list(organisateurs)}
    <h2 class="faq-title" id="faq-compte"><img src="assets/img/mascotte-surprise.webp" alt="" width="170" height="150" loading="lazy" />Compte et données</h2>
    {faq_list(compte)}
    <p class="center" style="margin-top:2.5rem">Tu ne trouves pas ta réponse ? <a href="contact.html">Écris-nous</a>.</p>
  </div>
</section>
{cta}
'''
page('faq.html', 'Questions fréquentes — NOVART', 'Inscription, participation, organisation d’activités, compte et données : toutes les réponses sur NOVART.', faq)

# ---------- Contact ----------
contact = f'''
<section class="hero hero--page section--rose">
  <div class="wrap">
    <div class="hero__text"><span class="eyebrow">Contact et accès</span><h1>Une question, une idée, un lieu à proposer ?</h1>
      <p class="light">Écris-nous ou ouvre directement l’application depuis ton téléphone.</p></div>
    <div class="hero__visual"><img class="hero__mascot" src="assets/img/mascotte-joie-hd.webp" alt="" width="1100" height="839" /></div>
  </div>
</section>
<section class="section" aria-label="Contact">
  <div class="wrap split" style="align-items:start">
    <div>
      <form id="contact-form" class="form" novalidate>
        <div><label for="name">Prénom</label><input id="name" name="name" autocomplete="given-name" aria-describedby="name-error" /><p id="name-error" class="field-error" aria-live="polite"></p></div>
        <div><label for="email">Adresse e-mail</label><input id="email" name="email" type="email" autocomplete="email" aria-describedby="email-error" /><p id="email-error" class="field-error" aria-live="polite"></p></div>
        <fieldset><legend>Tu es</legend><div class="chips">
          <label><input type="radio" name="profile" value="participant" checked /><span>Participant</span></label>
          <label><input type="radio" name="profile" value="organisateur" /><span>Organisateur</span></label>
          <label><input type="radio" name="profile" value="lieu" /><span>Lieu ou association</span></label>
          <label><input type="radio" name="profile" value="autre" /><span>Autre</span></label>
        </div></fieldset>
        <div><label for="message">Message</label><textarea id="message" name="message" aria-describedby="message-error"></textarea><p id="message-error" class="field-error" aria-live="polite"></p></div>
        <div><label class="consent"><input type="checkbox" name="consent" aria-describedby="consent-error" />J’accepte que mes informations servent uniquement à me répondre (<a href="legal.html#confidentialite">confidentialité</a>).</label><p id="consent-error" class="field-error" aria-live="polite"></p></div>
        <button class="btn btn--primary" type="submit">{i('send')}Envoyer</button>
      </form>
      <div id="contact-success" class="form-success" tabindex="-1" role="status">
        <img src="assets/img/mascotte-amitie.webp" alt="" width="152" height="140" />
        <h2 style="font-size:1.6rem">Merci <span data-name></span> !</h2>
        <p>Ce site est un prototype étudiant : le formulaire vérifie ta saisie mais n’envoie pas encore de message. L’envoi sera branché lors de la mise en service.</p>
      </div>
    </div>
    <aside class="card" aria-labelledby="access-title">
      <span class="card__icon">{i('smartphone')}</span>
      <h3 id="access-title">Accéder à l’application</h3>
      <p>NOVART fonctionne directement dans le navigateur de ton téléphone ou de ton ordinateur.</p>
      <p style="margin-top:.6rem"><a href="{APP}" style="font-weight:600">novart-app.web.app</a></p>
      <p style="margin-top:.6rem">Sur téléphone, ajoute-la à ton écran d’accueil depuis le menu de ton navigateur pour la retrouver comme une application.</p>
      <div class="btn-row"><a class="btn btn--primary" href="{APP}">{i('log-in')}Ouvrir l’application</a></div>
    </aside>
  </div>
</section>
'''
page('contact.html', 'Contact — NOVART', 'Contacter l’équipe NOVART et accéder à l’application.', contact)

# ---------- Mentions légales, CGU, confidentialité ----------
legal = f'''
<section class="section">
  <div class="wrap legal">
    <span class="eyebrow">Informations légales</span>
    <h1 style="font-size:clamp(2rem,8vw,3rem)">Mentions légales, conditions et confidentialité</h1>
    <p class="light" style="margin-top:1rem">NOVART est un projet étudiant réalisé dans le cadre du Master 2 CIM. Ces documents décrivent le fonctionnement prévu du service ; ils n’ont pas de valeur contractuelle tant que le service n’est pas ouvert au public.</p>
    <ul class="toc"><li><a href="#mentions">Mentions légales</a></li><li><a href="#cgu">Conditions d’utilisation</a></li><li><a href="#confidentialite">Confidentialité</a></li></ul>

    <h2 id="mentions">Mentions légales</h2>
    <h3>Éditeur</h3><p>NOVART, projet étudiant (groupe 1ART) du Master 2 CIM. Contact : via la <a href="contact.html">page de contact</a>.</p>
    <h3>Hébergement</h3><p>Site et application hébergés par Firebase Hosting, service de Google. Données de l’application stockées dans Cloud Firestore (Google Cloud).</p>
    <h3>Propriété intellectuelle</h3><p>Le nom NOVART, les logos, la mascotte et les illustrations sont la propriété de l’équipe du projet. Pictogrammes : Lucide (licence ISC). Polices : Poppins, Caveat et Montserrat (SIL Open Font License). Fonds de carte : © contributeurs OpenStreetMap.</p>

    <h2 id="cgu">Conditions générales d’utilisation</h2>
    <h3>1. Objet</h3><p>NOVART met en relation des personnes qui proposent des activités artistiques (organisateurs) et des personnes qui souhaitent y participer (participants), dans la Métropole de Lyon.</p>
    <h3>2. Compte</h3><p>L’inscription se fait avec une adresse e-mail valide, par lien de connexion. Chaque membre complète un profil exact et le tient à jour.</p>
    <h3>3. Activités</h3><ul><li>L’organisateur décrit son activité de façon exacte : lieu, date, horaires, nombre de places, niveau et matériel.</li><li>Les activités ont lieu dans des lieux publics ou accueillant du public, dans le respect de leur règlement.</li><li>L’organisateur peut modifier ou supprimer son activité ; il prévient alors les inscrits.</li></ul>
    <h3>4. Participation</h3><p>L’inscription est confirmée dans la limite des places disponibles. Quand une activité est complète, le membre peut rejoindre la liste d’attente ; une place libérée lui est proposée dans l’ordre d’arrivée et doit être confirmée dans le délai indiqué. Le participant qui ne peut plus venir se désinscrit pour libérer sa place.</p>
    <h3>5. Comportement</h3><p>Les membres s’engagent à rester respectueux dans les activités et les discussions. Les contenus illicites, haineux ou publicitaires sont interdits et peuvent entraîner la suppression du compte.</p>
    <h3>6. Responsabilité</h3><p>NOVART est un service de mise en relation : chaque activité est placée sous la responsabilité de son organisateur.</p>
    <h3>7. Tarifs et conditions de vente</h3><p>Le service est gratuit pendant la phase de lancement. Aucune vente n’est réalisée sur NOVART : il n’y a donc pas de conditions générales de vente à ce stade.</p>

    <h2 id="confidentialite">Politique de confidentialité</h2>
    <h3>Données traitées</h3>
    <table>
      <thead><tr><th scope="col">Données</th><th scope="col">Usage</th><th scope="col">Visibilité</th></tr></thead>
      <tbody>
        <tr><td>Adresse e-mail</td><td>Connexion par lien ou avec Google (Firebase Authentication), jamais enregistrée dans le profil</td><td>Équipe NOVART uniquement</td></tr>
        <tr><td>Nom et photo du compte Google (si tu choisis « Continuer avec Google »)</td><td>Pré-remplir ton profil à l’inscription, modifiable avant de valider</td><td>Membres connectés, une fois le profil enregistré</td></tr>
        <tr><td>Prénom, nom, photo (lien), description, centres d’intérêt</td><td>Profil, suggestions d’activités</td><td>Membres connectés</td></tr>
        <tr><td>Adresse et coordonnées approximatives</td><td>Calcul des distances, carte de la communauté</td><td>Membres connectés</td></tr>
        <tr><td>Activités créées, inscriptions, favoris</td><td>Fonctionnement du service</td><td>Membres connectés (favoris : toi seul)</td></tr>
        <tr><td>Photos d’activités importées</td><td>Illustrer la fiche de l’activité</td><td>Toute personne disposant du lien de l’image</td></tr>
        <tr><td>Messages de groupe</td><td>Discussion entre l’organisateur et les inscrits</td><td>Membres du groupe</td></tr>
        <tr><td>Messages privés</td><td>Échange entre deux membres (par exemple une question à l’organisateur avant de s’inscrire)</td><td>Les deux membres de la conversation</td></tr>
        <tr><td>Liste d’attente</td><td>Proposer une place libérée dans l’ordre d’arrivée</td><td>Membres connectés</td></tr>
      </tbody>
    </table>
    <h3>Confidentialité des messages</h3><p>Les messages privés ne sont lisibles que par les deux membres de la conversation, et les messages de groupe que par les membres du groupe. Ils sont chiffrés en transit et au repos par Google Cloud, sans chiffrement de bout en bout : un administrateur du projet peut techniquement y accéder, ce que l’équipe NOVART ne fait qu’en cas de signalement ou d’obligation légale.</p>
    <h3>Sous-traitants et services tiers</h3><ul><li>Google Firebase (authentification par lien e-mail ou compte Google, base de données, hébergement).</li><li>Cloudflare : service qui prépare l’e-mail de connexion et limite les demandes répétées (seule une empreinte non réversible de ton adresse est conservée, 24 heures).</li><li>Brevo : envoi de l’e-mail de connexion (ton adresse e-mail et ton lien de connexion).</li><li>Cloudflare R2 : stockage des photos d’activités importées par les organisateurs.</li><li>Google Places : suggestions d’adresse pendant la saisie.</li><li>Open-Meteo : météo du jour de l’activité, à partir des seules coordonnées du lieu.</li><li>OpenStreetMap : fonds de carte.</li></ul>
    <h3>Stockage sur ton appareil</h3><p>L’application conserve sur ton appareil l’état de connexion, le brouillon d’une activité en cours de création et la liste des notifications déjà vues. Aucun traceur publicitaire n’est utilisé.</p>
    <h3>Durée et droits</h3><p>Les données sont conservées tant que le compte est actif. Tu peux demander l’accès, la rectification ou la suppression de tes données depuis la <a href="contact.html">page de contact</a>, conformément au RGPD.</p>
  </div>
</section>
'''
page('legal.html', 'Mentions légales, CGU et confidentialité — NOVART', 'Mentions légales, conditions générales d’utilisation et politique de confidentialité de NOVART.', legal)
print('pages écrites')
