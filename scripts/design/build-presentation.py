# Page de présentation du projet NOVART (rendu M2 CIM) : landing/presentation/index.html.
# Page autonome servie à côté du site vitrine (novart-109bf.web.app/presentation/), avec les
# styles et le menu du site vitrine (../assets) et sa propre feuille presentation.css.
# Usage, à la racine du dépôt : python3 scripts/design/build-presentation.py
# Sources : dossier de rendu « G1 ART » (charte, VPC, Lean Canvas, storyboard, UJM, roadmap,
# backlogs, UML, README) ; captures de l'appli : tests/e2e/presentation-screens.spec.ts.
import pathlib, re, html

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'landing' / 'presentation'
APP = 'https://novart-app.web.app'
VITRINE = 'https://novart-109bf.web.app'
GITHUB = 'https://github.com/elieqlf/m2gdp-g1-art'
SPRITE = (pathlib.Path(__file__).with_name('landing-sprite.svg')).read_text()
e = html.escape


def i(name):
    return f'<svg class="icon" aria-hidden="true"><use href="#i-{name}"/></svg>'


def ul(items, cls=''):
    return f'<ul{f" class=\"{cls}\"" if cls else ""}>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>'


def figure(src, alt, caption, w, h, cls='doc'):
    """Visuel d'origine de l'équipe, cliquable pour l'ouvrir en grand."""
    return (f'<figure class="{cls}"><a href="{src}" target="_blank" rel="noopener" aria-label="{e(alt)} (ouvrir en grand)">'
            f'<img src="{src}" alt="{e(alt)}" width="{w}" height="{h}" loading="lazy" decoding="async" /></a>'
            f'<figcaption>{caption} <a href="{src}" target="_blank" rel="noopener">Ouvrir en grand</a></figcaption></figure>')


def head(num, kicker, title, lead=''):
    return (f'<header class="sec-head"><span class="sec-num" aria-hidden="true">{num}</span>'
            f'<div><span class="eyebrow">{kicker}</span><h2>{title}</h2>{f"<p class=\"lead\">{lead}</p>" if lead else ""}</div></header>')


def sub(id_, title, text=''):
    return f'<h3 class="sub" id="{id_}">{title}</h3>' + (f'<p class="muted">{text}</p>' if text else '')


# ---------------------------------------------------------------- 01 · Projet
VALUES = ['Proximité', 'Partage', 'Inclusivité', 'Créativité', 'Collectif']
BRIEF = [
    ('Des passionnés se regroupent sur la base d’une discipline artistique qui favorise la co-créativité et le partage.', 'Conservé', 'On y ajoute la proximité : les passionnés se rencontrent et créent ensemble près de chez eux.'),
    ('Un animateur propose une activité à faire ensemble dans un lieu public (dessin, peinture, musique, danse, théâtre, art…).', 'Élargi', 'L’activité peut se tenir dans un lieu culturel ou partenaire : MJC, musée, café, atelier, ou chez un particulier quand le cadre s’y prête.'),
    ('Plusieurs participants s’inscrivent avec une liste d’attente ; en cas de désistement, ils sont notifiés et doivent confirmer.', 'Simplifié', 'L’organisateur fixe un nombre de places ; chaque activité a son groupe de discussion pour se rencontrer avant. La liste d’attente reste, en version légère.'),
    ('Des suggestions de lieux et des modèles d’activité aident l’animateur à organiser son événement.', 'Allégé', 'Les organisateurs savent déjà ce qu’ils veulent proposer : modèles et lieux suggérés restent facultatifs, et l’IA propose des idées à la demande.'),
]
TEAM = [('Hadi', 'Product Owner', 'Vision produit, Lean Canvas, roadmap, backlog et user stories.'),
        ('Palina', 'UX Designer', 'Pitch, charte graphique, mascotte, Value Proposition Canvas, parcours et maquettes.'),
        ('Elie', 'Développeur', 'Développement de l’application et du site vitrine, avec des agents de code IA.'),
        ('Lucas', 'Développeur', 'Développement de l’application et du site vitrine, avec des agents de code IA.')]

projet = f'''
<section class="section" id="projet" aria-labelledby="projet-title">
 <div class="wrap">
  {head('01', 'Le projet', '<span id="projet-title">Du brief à NOVART</span>', 'NOVART est une plateforme de proximité qui permet à des passionnés d’art de proposer, découvrir et rejoindre des activités artistiques près de chez eux, puis d’échanger avec les autres participants pour se rencontrer, partager et créer ensemble.')}
  <ul class="values" aria-label="Valeurs de NOVART">{''.join(f'<li>{v}</li>' for v in VALUES)}</ul>
  <div class="grid two">
   <article class="card"><h3>Vision</h3><p>NOVART place la rencontre locale et la création collective au cœur de l’expérience. La plateforme ne cherche pas à enseigner aux artistes comment organiser leur pratique : elle facilite la mise en relation, la découverte d’activités et l’échange entre participants.</p>
    <p class="journey-line" aria-label="Expérience NOVART en cinq temps"><span>Découvrir</span><span>Rejoindre</span><span>Échanger</span><span>Se rencontrer</span><span>Créer ensemble</span></p></article>
   <article class="card"><h3>Périmètre</h3>
    <div class="scope"><div><p class="scope__title">NOVART fait</p>{ul(['Découvrir des activités artistiques locales', 'Proposer une activité, limiter le nombre de places', 'Rejoindre un groupe de discussion', 'Faciliter la rencontre et le partage'], 'checks-list')}</div>
    <div><p class="scope__title scope__title--no">NOVART ne fait pas</p>{ul(['Paiement en ligne', 'Workflow lourd de désistement', 'Modèles d’activités imposés aux organisateurs'], 'cross-list')}</div></div></article>
  </div>
  <div class="table-wrap reveal"><table class="table">
   <caption>Projet 1 — ART : du brief initial à la direction NOVART</caption>
   <thead><tr><th scope="col">Brief initial</th><th scope="col">Choix</th><th scope="col">Direction NOVART</th></tr></thead>
   <tbody>{''.join(f'<tr><td>{a}</td><td><span class="tag">{b}</span></td><td>{c}</td></tr>' for a, b, c in BRIEF)}</tbody>
  </table></div>
  <h3 class="sub" id="equipe">L’équipe — Groupe 1 ART</h3>
  <ul class="team">{''.join(f'<li class="card"><span class="avatar" aria-hidden="true">{n[0]}</span><div><p class="team__name">{n}</p><p class="team__role">{r}</p><p class="muted">{d}</p></div></li>' for n, r, d in TEAM)}</ul>
 </div>
</section>'''

# ---------------------------------------------------------------- 02 · Canvas
VPC_OFFER = {
    'Produits & services': ['Plateforme de rencontres artistiques', 'Création et participation à des événements', 'Chat de groupe', 'Recherche par proximité', 'Lieux flexibles (domicile ou partenaires culturels)'],
    'Créateurs de gains': ['Rencontrer facilement des passionnés', 'Découvrir de nouvelles pratiques', 'Partager des moments créatifs et conviviaux'],
    'Réducteurs de douleurs': ['Simplifier l’organisation des rencontres', 'Proposer des lieux adaptés (domicile ou partenaires)', 'Faciliter l’intégration grâce au chat et à la communauté'],
}
VPC_PROFILE = {
    'Jobs à faire': ['Pratiquer une activité artistique', 'Partager sa passion', 'Rencontrer des personnes qui partagent ses centres d’intérêt', 'Découvrir de nouvelles pratiques', 'Organiser ou rejoindre une activité près de chez soi'],
    'Gains recherchés': ['Pratiquer régulièrement', 'Créer de nouveaux liens', 'Découvrir des activités près de chez soi', 'Se sentir intégré à un groupe'],
    'Douleurs principales': ['Difficile de trouver des personnes avec qui pratiquer', 'Trouver un moment commun', 'Ne pas savoir où pratiquer', 'Oser rejoindre seul une activité'],
}


def vpc_col(data, cls):
    return ''.join(f'<div class="vpc__block {cls}"><h4>{k}</h4>{ul(v)}</div>' for k, v in data.items())


LEAN = [
    ('problem', '1 · Problème', 'Les freins qui limitent la pratique artistique en communauté', ['Difficile de trouver un lieu pour se réunir', 'Être trop timide pour rejoindre une activité seul·e', 'Ne pas trouver de personnes qui pratiquent la même activité', 'Ne pas trouver de personnes à côté de chez soi', 'Organiser une activité mais personne ne vient']),
    ('segments', '2 · Segments clients', 'Des passionné·es aux profils variés', ['Étudiant·es créatif·ves (18–25 ans)', 'Jeunes actif·ves (25–35 ans)', 'Passionné·es de tout âge, débutant·es ou confirmé·es', '<em>Toutes celles et ceux qui veulent pratiquer, découvrir et partager une activité artistique.</em>']),
    ('uvp', '3 · Proposition de valeur unique', '« L’art se crée ensemble »', ['<strong>La plateforme qui connecte les passionné·es d’art pour créer ensemble, près de chez eux, dans des lieux inspirants ou à domicile.</strong>', 'Rencontrer · Partager · Créer · Découvrir · Appartenir']),
    ('solution', '4 · Solution', 'Une expérience simple et rassurante', ['Lieux partenaires et option domicile', 'Communauté bienveillante', 'Recherche par activité et par proximité', 'Outils simples d’organisation', 'Chat de groupe intégré']),
    ('channels', '5 · Canaux', 'Où et comment on les touche', ['Réseaux sociaux (Instagram, TikTok)', 'Communautés et associations artistiques', 'Écoles d’art et lieux culturels', 'Bouche-à-oreille', 'Site web / référencement local']),
    ('revenue', '6 · Revenus', 'Un modèle durable et aligné avec nos valeurs', ['Freemium (fonctionnalités de base gratuites)', 'Participation aux activités (certains événements payants)', 'Partenariats avec des lieux culturels (mise en avant, commissions)']),
    ('costs', '7 · Structure de coûts', 'Les principaux postes de dépenses', ['Développement et maintenance de la plateforme', 'Hébergement et infrastructure', 'Communication et acquisition', 'Modération et support utilisateur', 'Partenariats (lieux culturels)']),
    ('metrics', '8 · Indicateurs clés', 'Mesurer notre impact', ['Utilisateurs actifs mensuels', 'Nombre d’activités créées', 'Taux de participation', 'Taux de rétention', 'Satisfaction utilisateurs']),
    ('advantage', '9 · Avantage différenciant', 'Plus qu’un agenda, une vraie communauté', ['Focus sur la rencontre et le lien humain', 'Activités locales, lieux partenaires ou à domicile', 'Chat de groupe intégré', 'Expérience pensée pour les créatifs (univers, ton, design)']),
]

canvas = f'''
<section class="section section--rose" id="canvas" aria-labelledby="canvas-title">
 <div class="wrap">
  {head('02', 'Modèle et valeur', '<span id="canvas-title">Value Proposition &amp; Lean Canvas</span>', 'Les deux canvas présentés au pitch V0 (J2, 16 septembre 2026), retranscrits pour être lus et cherchés, avec les visuels d’origine de l’équipe.')}
  {sub('vpc', 'Value Proposition Canvas', 'Comprendre nos utilisateurs pour mieux créer de la valeur : l’offre NOVART (carré) face au profil du passionné (cercle). Chaque créateur de gain et réducteur de douleur répond à une douleur ou un gain du profil.')}
  <div class="vpc reveal">
   <div class="vpc__side vpc__side--offer"><p class="vpc__label">{i('gift')}Notre offre — proposition de valeur</p>{vpc_col(VPC_OFFER, '')}</div>
   <div class="vpc__fit" aria-hidden="true"><span>⇄</span><small>Adéquation</small></div>
   <div class="vpc__side vpc__side--profile"><p class="vpc__label">{i('users')}Profil utilisateur — le passionné</p>{vpc_col(VPC_PROFILE, '')}</div>
  </div>
  {figure('img/vpc.webp', 'Value Proposition Canvas de NOVART, visuel d’origine', 'Visuel d’origine (UX).', 2000, 1415)}
  {sub('lean', 'Lean Canvas', 'Les 9 blocs, dans l’ordre de remplissage du cours, construits à partir des problèmes identifiés auprès des personas.')}
  <div class="lean reveal">{''.join(f'<article class="lean__cell lean__cell--{k}"><h4>{t}</h4><p class="lean__sub">{s}</p>{ul(items)}</article>' for k, t, s, items in LEAN)}</div>
  {figure('img/lean.webp', 'Lean Canvas de NOVART, visuel d’origine', 'Visuel d’origine (PO), présenté au pitch V0.', 2200, 1239)}
 </div>
</section>'''

# ---------------------------------------------------------------- 03 · Parcours
PERSONAS = [('Léa', '22 ans', 'Étudiante en arts plastiques', 'J’adore peindre mais je n’ose pas toujours rejoindre des groupes seule…'),
            ('Thomas', '28 ans', 'Passionné de photographie', 'Je cherche des gens qui partagent ma passion près de chez moi.'),
            ('Sofia', '34 ans', 'Amatrice de danse', 'J’aimerais organiser des sessions, mais j’ai peur que personne ne vienne…'),
            ('Lucas', '19 ans', 'Curieux et débutant', 'Je veux découvrir de nouvelles pratiques, mais je ne sais pas où aller…')]
PROBLEMS = [('Difficile de trouver un lieu pour se réunir', '« Je ne sais pas où pratiquer mon activité près de chez moi. »', 'Des lieux pratiques et partenaires', '127 lieux suggérés (MJC, médiathèques, parcs, ateliers…) ou adresse libre, à domicile si le cadre s’y prête.'),
            ('Être trop timide pour rejoindre une activité seul·e', '« J’ai peur d’arriver seul·e et de ne connaître personne. »', 'Un chat commun avant la rencontre', 'Chaque activité a son groupe de discussion : on fait connaissance avant de se voir.'),
            ('Ne pas trouver de personnes qui pratiquent la même activité', '« Je ne trouve pas de passionnés qui pratiquent la même discipline que moi. »', 'Une communauté par passion', 'Filtres par discipline et centres d’intérêt du profil pour des suggestions « Selon tes envies ».'),
            ('Ne pas trouver de personnes à côté de chez soi', '« Les activités qui m’intéressent sont trop loin de chez moi. »', 'Une recherche géolocalisée', 'Carte, distances et tri par proximité depuis ta position ou ton quartier.'),
            ('Organiser une activité mais personne ne vient', '« J’ai préparé une activité, mais il n’y a pas assez de participants… »', 'Une meilleure visibilité', 'Activités mises en avant, partage, liste d’attente qui remplit les places libérées.')]
STORY = [('Rôle / tâche', 'Le chat veut pratiquer une activité artistique et rencontrer des personnes qui partagent sa passion près de chez lui.', 'J’aimerais créer avec d’autres, mais je ne sais pas où chercher.'),
         ('Douleur', 'Il trouve difficilement des activités locales adaptées et hésite à rejoindre seul un groupe d’inconnus.', 'Trop de choix… Et si j’arrive seul ?'),
         ('Gain', 'Il souhaite trouver facilement une activité proche, adaptée à ses envies, dans un cadre convivial.', 'Tiens ! Il y a une activité près de chez moi qui me plaît vraiment !'),
         ('Anti-douleur', 'Il rejoint l’activité et accède au chat du groupe pour échanger avec les participants avant la rencontre.', 'Je peux déjà faire connaissance avec le groupe avant d’y aller. Ça me rassure !'),
         ('Accélérateur de gains', 'Le jour venu, il retrouve le groupe dans le lieu prévu et se sent déjà intégré grâce aux échanges.', 'Je ne débarque plus vraiment seul. L’ambiance est super !'),
         ('Produit / service', 'Il participe, crée avec le groupe et garde le lien pour renouveler l’expérience.', 'J’étais venu pour créer. Je repars avec des rencontres et l’envie de recommencer !')]
UJM_PHASES = ['1. Découvrir', '2. Rejoindre', '3. Échanger &amp; partager', '4. Se rencontrer', '5. Créer ensemble']
UJM_ROWS = [
    ('Objectif', ['Explorer des activités artistiques locales qui me correspondent.', 'Rejoindre facilement une activité qui me plaît.', 'Échanger avec le groupe et me sentir intégré·e avant la rencontre.', 'Participer à la rencontre dans un lieu près de chez moi.', 'Vivre l’activité, partager et garder le lien avec le groupe.']),
    ('Actions', ['Parcourt les activités ; filtre (lieu, type, date) ; consulte le détail', 'Vérifie lieu, date, niveau, places ; « Rejoindre l’activité » ; reçoit une confirmation', 'Accède au chat ; échange avec les participants ; pose ses questions', 'Se rend sur le lieu ; rencontre l’organisateur et les participants', 'Participe ; partage son expérience ; reste en contact avec le groupe']),
    ('Pensée', ['« Est-ce qu’il y a quelque chose qui me correspond près de chez moi ? »', '« Ça me plaît… mais est-ce que je vais me sentir à ma place ? »', '« Je sais déjà avec qui je vais partager ce moment. »', '« Je ne débarque plus vraiment seul·e. »', '« J’ai créé quelque chose et rencontré des gens qui aiment la même chose que moi. »']),
    ('Freins', ['Trop d’informations à trier ; activités pertinentes difficiles à trouver', 'Peur de rejoindre seul·e un groupe inconnu ; doute sur le niveau ou l’ambiance', 'Manque d’informations ; crainte d’un groupe impersonnel', 'Légère appréhension avant la première rencontre physique', 'Risque que le lien s’arrête ; peu d’occasions de se retrouver']),
    ('Réponse NOVART', ['Recherche locale simple ; activités mises en avant ; infos essentielles visibles', 'Détails clairs et rassurants ; places limitées ; confirmation immédiate', 'Chat intégré à l’activité ; échanges en amont ; réponses aux questions', 'Groupe déjà constitué ; accueil chaleureux ; lieu clairement indiqué', 'Communauté vivante ; partage facilité ; découverte d’autres activités']),
]
EMOTIONS = [('Curiosité et intérêt', 2), ('Hésitation', 1), ('Rassurance', 3), ('Excitation', 4), ('Sentiment d’appartenance', 5)]
LESSONS = [('Proximité', 'Rendre visibles simplement les activités près de chez soi.'), ('Réassurance', 'Donner des informations claires avant de rejoindre.'),
           ('Lien avant la rencontre', 'Le chat permet de créer un lien et de se sentir intégré·e.'), ('Continuité', 'Faire de l’activité le début d’une communauté, pas une interaction ponctuelle.')]


def emotion_curve():
    """Courbe d'émotion de l'UJM : un point par phase, de 1 (bas) à 5 (haut)."""
    w, h, pad = 1000, 170, 130
    xs = [pad + k * (w - 2 * pad) / 4 for k in range(5)]
    ys = [h - 30 - (lvl - 1) * (h - 70) / 4 for _, lvl in EMOTIONS]
    path = f'M {xs[0]:.0f} {ys[0]:.0f} ' + ' '.join(f'S {(xs[k] - 60):.0f} {ys[k]:.0f} {xs[k]:.0f} {ys[k]:.0f}' for k in range(1, 5))
    dots = ''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="9"/><text x="{x:.0f}" y="{y - 18:.0f}" text-anchor="middle">{e(label)}</text>' for (label, _), x, y in zip(EMOTIONS, xs, ys))
    desc = ', puis '.join(label.lower() for label, _ in EMOTIONS)
    return f'<svg class="emotion" viewBox="0 0 {w} {h}" role="img" aria-label="Courbe d’émotion : {e(desc)}."><path d="{path}"/>{dots}</svg>'


parcours = f'''
<section class="section" id="parcours" aria-labelledby="parcours-title">
 <div class="wrap">
  {head('03', 'Parcours utilisateurs', '<span id="parcours-title">Personas, storyboard et parcours</span>', 'Des profils différents, une même envie : créer et partager. Les cinq problèmes identifiés auprès des personas guident tout le produit.')}
  {sub('personas', 'Nos personas')}
  <ul class="personas">{''.join(f'<li class="card reveal"><p class="persona__name">{n}, <span>{a}</span></p><p class="persona__role">{r}</p><blockquote>« {q} »</blockquote></li>' for n, a, r, q in PERSONAS)}</ul>
  <div class="table-wrap reveal"><table class="table table--problems">
   <caption>Les 5 problèmes principaux et les solutions NOVART</caption>
   <thead><tr><th scope="col">#</th><th scope="col">Problème identifié</th><th scope="col">Solution NOVART (dans l’application)</th></tr></thead>
   <tbody>{''.join(f'<tr><td class="num">{k}</td><td><strong>{p}</strong><br /><span class="quote">{q}</span></td><td><strong>{s}</strong><br />{d}</td></tr>' for k, (p, q, s, d) in enumerate(PROBLEMS, 1))}</tbody>
  </table></div>
  {figure('img/personas.webp', 'Personas, problèmes et solutions, slide du pitch V0', 'Slide 07 du pitch V0.', 2000, 1125)}
  {sub('storyboard', 'Storyboard', 'Du doute à la création collective : le parcours d’un participant, incarné par la mascotte.')}
  <ol class="story">{''.join(f'<li class="card reveal"><span class="story__step">{k}</span><p class="story__kicker">{t}</p><p>{d}</p><p class="quote">« {q} »</p></li>' for k, (t, d, q) in enumerate(STORY, 1))}</ol>
  <p class="callout reveal"><strong>En résumé :</strong> NOVART transforme une envie individuelle de pratiquer en une expérience artistique collective et locale.</p>
  {figure('img/storyboard.webp', 'Storyboard NOVART, visuel d’origine', 'Visuel d’origine (UX).', 2000, 1415)}
  {sub('ujm', 'User Journey Mapping', 'Du premier intérêt à la création collective : 5 phases, avec objectifs, actions, pensées, freins, réponses NOVART et émotions.')}
  <div class="table-wrap reveal"><table class="table table--ujm">
   <caption class="sr-only">Parcours d’un participant NOVART en cinq phases</caption>
   <thead><tr><th scope="col"><span class="sr-only">Étape</span></th>{''.join(f'<th scope="col">{p}</th>' for p in UJM_PHASES)}</tr></thead>
   <tbody>{''.join(f'<tr><th scope="row">{r}</th>{"".join(f"<td>{c}</td>" for c in cells)}</tr>' for r, cells in UJM_ROWS)}
    <tr><th scope="row">Émotion</th>{''.join(f'<td><span class="emo emo--{lvl}">{label}</span></td>' for label, lvl in EMOTIONS)}</tr></tbody>
  </table></div>
  {emotion_curve()}
  <ul class="lessons">{''.join(f'<li class="card reveal"><p class="lessons__k">{k}. {t}</p><p>{d}</p></li>' for k, (t, d) in enumerate(LESSONS, 1))}</ul>
  {figure('img/ujm.webp', 'User Journey Mapping NOVART, visuel d’origine', 'Visuel d’origine (UX).', 2000, 1415)}
 </div>
</section>'''

# ---------------------------------------------------------------- 04 · Charte
COLORS = [('#C03C3A', 'Rouge NOVART', 'Couleur principale de la charte : énergie humaine et créative.'),
          ('#FFFBFB', 'Blanc rosé', 'Fonds et cartes.'),
          ('#FFFEF1', 'Crème', 'Fonds chaleureux.'),
          ('#781C27', 'Bordeaux', 'États sélectionnés, profondeur (« rouge plus foncé »).'),
          ('#545454', 'Gris anthracite', 'Texte courant.')]
APP_COLORS = [('#FF0000', 'Rouge vif', 'Actions, titres et pictogrammes dans l’appli et le site.'), ('#E00000', 'Rouge texte', 'Petit texte et boutons (contraste 4,9:1, WCAG AA).'), ('#F5F5F5', 'Gris clair', 'Fond de l’application.')]


def swatches(colors):
    return ''.join(f'<li><span class="swatch" style="background:{c}" aria-hidden="true"></span><span><strong>{n}</strong> <code>{c}</code><br /><span class="muted">{d}</span></span></li>' for c, n, d in colors)


charte = f'''
<section class="section section--rose" id="charte" aria-labelledby="charte-title">
 <div class="wrap">
  {head('04', 'Identité', '<span id="charte-title">Charte graphique</span>', 'Un univers chaleureux qui mêle créativité, culture urbaine et douceur, porté par une mascotte chat curieuse et bienveillante. Slogan : « L’art se crée ensemble. »')}
  <div class="logos">
   <figure class="card"><img src="img/logo-primaire.webp" alt="Logo primaire NOVART : lettres blanches sur fond rouge" width="700" height="619" loading="lazy" /><figcaption><strong>Logo primaire</strong> — affiches, campagnes, site, réseaux sociaux.</figcaption></figure>
   <figure class="card"><img src="img/logo-secondaire.webp" alt="Logo secondaire NOVART : lettres rouges avec le slogan" width="700" height="671" loading="lazy" /><figcaption><strong>Logo secondaire</strong> — compositions variées : l’appli, les supports numériques.</figcaption></figure>
   <figure class="card"><img src="img/logo-submark.webp" alt="Logo submark NOVART : le monogramme entre deux mains" width="700" height="652" loading="lazy" /><figcaption><strong>Submark</strong> — stickers, badges, motifs, détails de l’application.</figcaption></figure>
  </div>
  <div class="grid two">
   <article class="card"><h3>Palette de la charte</h3><ul class="swatches">{swatches(COLORS)}</ul>
    <p class="muted small">Dans l’application et le site, la refonte de novembre utilise un rouge plus vif :</p><ul class="swatches swatches--small">{swatches(APP_COLORS)}</ul></article>
   <article class="card"><h3>Typographies</h3>
    <dl class="fonts">
     <div><dt>Titres (charte)</dt><dd>Sigmar One</dd></div>
     <div><dt>Sous-titres (charte)</dt><dd>Bright Retro</dd></div>
     <div><dt>Titres (appli et sites)</dt><dd class="f-caveat">Caveat — l’écriture des annotations de la charte</dd></div>
     <div><dt>Corps de texte</dt><dd class="f-poppins">Poppins</dd></div>
     <div><dt>Texte secondaire</dt><dd class="f-montserrat">Montserrat Extra Light</dd></div>
    </dl>
    <h3 class="mt">Principes UX/UI retenus après le pitch V0</h3>
    {ul(['Slogan positif : « L’art se crée ensemble. »', 'Le chat devient la mascotte officielle, décliné par activité, avec une version simplifiée pour le mobile.', 'Éléments interactifs clairement identifiables : la couleur primaire signale l’action ; états sélectionnés en rouge plus foncé.', 'Découverte des activités en « feed » fluide, inspirée des usages sociaux.'])}</article>
  </div>
  {figure('img/mascotte.webp', 'La mascotte NOVART et ses déclinaisons par activité', 'La mascotte et ses déclinaisons : peinture, musique, danse, théâtre…', 1800, 984)}
  {figure('img/brandboard.webp', 'Brand board NOVART : logos, palette, typographies, mascotte, motifs et ambiance', 'Brand board complet (UX).', 1300, 1949, 'doc doc--portrait')}
 </div>
</section>'''

# ---------------------------------------------------------------- 05 · Maquettes
MAQUETTES = ['Connexion', 'Création de compte — informations et centres d’intérêt', 'Création de compte — personnalisation', 'Création de compte — vérification e-mail',
             'Découvrir — accueil', 'Découvrir — accueil (variante)', 'Recherche — liste des activités', 'Recherche — filtres', 'Recherche — carte', 'Recherche — aucun résultat',
             'Participation — confirmation', 'Mes favoris', 'Notifications', 'Conversations — liste', 'Conversation — groupe de l’activité', 'Activité — participants et groupe',
             'Mes activités', 'Créer — 1. informations', 'Créer — 2. médias', 'Créer — 3. lieu, date et places', 'Créer — 4. aperçu', 'Créer — assistance IA',
             'Modifier une activité', 'Profil', 'État — chargement', 'État — pas de connexion']
HEIGHTS = [1296, 1296, 1296, 1296, 1101, 1191, 1213, 1244, 1162, 1067, 1271, 1067, 1067, 1125, 1273, 1239, 1334, 1250, 1247, 1242, 1271, 1038, 1067, 1256, 1296, 1067]
SCREENS = [('recherche', 'Recherche avec autocomplétion et barre de catégories (Tout, Activités, Disciplines, Lieux)'),
           ('fiche', 'Fiche d’une activité : date, lieu et distance, places, niveau, inscription'),
           ('conversation', 'Groupe de l’activité : organisateur nommé dans l’en-tête, toucher un prénom pour écrire en privé'),
           ('ia', 'Idées d’activités proposées par l’IA (Mistral) à partir de mots-clés, sous le choix de la discipline'),
           ('photo', 'Photo facultative : sans photo, l’illustration NOVART de la discipline est utilisée'),
           ('lieu', 'Choix du lieu dans un panneau qui s’ouvre et se referme : 127 lieux suggérés filtrables')]

maquettes = f'''
<section class="section" id="maquettes" aria-labelledby="maquettes-title">
 <div class="wrap">
  {head('05', 'Design', '<span id="maquettes-title">Maquettes et application</span>', 'Les 26 écrans du parcours utilisateur (maquettes UX), puis l’application telle qu’elle est en ligne, avec la vidéo de présentation.')}
  <ol class="mockups">{''.join(f'<li><a href="img/maquettes/{k:02d}.webp" target="_blank" rel="noopener"><img src="img/maquettes/{k:02d}.webp" alt="Maquette {k:02d} : {e(t)}" width="600" height="{h}" loading="lazy" decoding="async" /></a><span><b>{k:02d}</b> {t}</span></li>' for k, (t, h) in enumerate(zip(MAQUETTES, HEIGHTS), 1))}</ol>
  {sub('realise', 'L’application réalisée', 'Captures de l’application en ligne (données de démonstration de la Métropole de Lyon), dont plusieurs fonctionnalités ajoutées après les retours du professeur.')}
  <ul class="screens">{''.join(f'<li><figure class="phone-shot"><img src="img/app/{n}.webp" alt="{e(c)}" width="780" height="1688" loading="lazy" decoding="async" /><figcaption>{c}</figcaption></figure></li>' for n, c in SCREENS)}</ul>
  <div class="btn-row center-row"><a class="btn btn--primary" href="{APP}">{i('smartphone')}Ouvrir l’application</a><a class="btn btn--outline" href="{VITRINE}">{i('house')}Voir le site vitrine</a></div>
  {sub('video', 'Vidéo de présentation')}
  <figure class="video-box"><video controls playsinline preload="metadata" poster="../assets/img/video-poster.webp" width="848" height="480"><source src="../assets/video/novart-presentation.mp4" type="video/mp4" /><a href="../assets/video/novart-presentation.mp4">Télécharger la vidéo (MP4, 7 Mo)</a></video>
   <figcaption>NOVART en une minute (54 s) : découvrir les activités sur la carte, s’inscrire, échanger avec le groupe et créer sa propre activité.</figcaption></figure>
 </div>
</section>'''

# ---------------------------------------------------------------- 06 · PO
EPICS = [
    ('E1', 'Inscription &amp; connexion', 'MVP', 'Rejoindre NOVART sans friction, sans mot de passe à retenir.', 'Un lien de connexion par e-mail et « Continuer avec Google » réduisent l’abandon à l’inscription.',
     ['Lien de connexion par e-mail (Firebase), e-mail aux couleurs de NOVART envoyé par notre API', 'Continuer avec Google, « Rester connecté·e »', 'Inscription en 3 étapes (profil, pratiques, récapitulatif), reprise là où on s’était arrêté'], 'Livré'),
    ('E2', 'Accueil &amp; découverte', 'MVP', 'Voir tout de suite ce qui se passe près de chez soi (UJM : « trop d’informations à trier »).', 'Une carte plein écran avec un panneau à faire glisser donne envie d’explorer, comme les applis du quotidien.',
     ['Carte Leaflet centrée sur la position, repères par discipline regroupés', 'Panneau « Autour de toi » replié, en aperçu ou ouvert, au doigt', '« Tes prochaines activités », « Selon tes envies », « Populaires », « À ne pas manquer »'], 'Livré'),
    ('E3', 'Recherche &amp; filtres', 'MVP + cible', 'Trouver une activité qui correspond à son envie, à sa date, à son niveau.', 'L’autocomplétion et des filtres combinables font gagner du temps et évitent l’état « aucun résultat ».',
     ['Autocomplétion dès 2 lettres (activités, disciplines, lieux) avec barre de catégories', 'Filtres : disciplines, date, rayon, places, niveau ; tri proximité, date, popularité', 'Bascule Liste / Carte, état « aucun résultat » avec sortie'], 'Livré'),
    ('E4', 'Carte &amp; géolocalisation', 'Cible', 'Persona Thomas : « Les activités qui m’intéressent sont trop loin de chez moi. »', 'Afficher la distance sur chaque activité aide à se décider.',
     ['Position rapide puis GPS précis ; sinon la ville du profil, sans rien deviner', 'Distance sur chaque carte d’activité', '127 lieux de la Métropole de Lyon suggérés à la création'], 'Livré'),
    ('E5', 'Activités (annonces)', 'MVP + cible', 'Persona Sofia : organiser simplement, et que les gens viennent.', 'Une création guidée en 4 étapes avec aperçu limite les abandons ; une belle image donne envie de participer.',
     ['Création en 4 étapes, brouillon conservé, aperçu avant publication', 'Photo de l’organisateur (Cloudflare R2) ou illustration NOVART de la discipline', 'Lieu dans un panneau dédié ; modifier ou supprimer son activité'], 'Livré'),
    ('E6', 'Participation / réservation', 'MVP + cible', 'Rejoindre en confiance une activité aux places limitées (UJM : hésitation).', 'Une confirmation immédiate rassure ; une liste d’attente évite les places vides.',
     ['Inscription en un geste, capacité garantie (transaction Firestore)', 'Écran « Tu participes ! », ajout à l’agenda, désinscription', 'Liste d’attente : la place libérée est proposée au suivant, qui confirme'], 'Livré'),
    ('E7', 'Conversations', 'MVP + cible', 'Persona Léa : « J’ai peur d’arriver seule et de ne connaître personne. »', 'Échanger avant la rencontre crée le lien (enseignement clé n° 3 de l’UJM).',
     ['Groupe de discussion par activité, en temps réel, avec non-lus', 'Organisateur nommé dans l’en-tête et dans le fil', 'Message privé à un membre ou à l’organisateur, avant même de s’inscrire'], 'Livré'),
    ('E8', 'Profil &amp; préférences', 'MVP + cible', 'Se présenter, retrouver ses activités et garder la main sur ses données.', 'Un profil public minimal rassure les autres membres sans exposer l’adresse.',
     ['Profil public séparé : prénom, photo, bio, centres d’intérêt', 'Mes activités, favoris, notifications, communauté', 'Suppression du compte : toutes les données effacées par notre API'], 'Livré'),
    ('E9', 'Assistance IA', 'Ajout J5', 'Retour du professeur : aider l’organisateur à trouver une idée d’activité culturelle.', 'Trois idées à partir de quelques mots-clés débloquent la création.',
     ['« Trouver une idée avec l’IA » sous le choix de la discipline', 'Mistral Small, appelé par notre API (gratuit, sans clé dans l’appli)', 'L’idée choisie remplit titre, description, pratique, niveau et matériel'], 'Livré'),
]
US = [('US-01', 'Inscription &amp; connexion', 'Créer un compte pour rejoindre NOVART', 'Inscription'),
      ('US-02', 'Inscription &amp; connexion', 'Se connecter pour accéder à son espace', 'Connexion'),
      ('US-03', 'Inscription &amp; connexion', 'Se déconnecter pour fermer sa session', 'Profil'),
      ('US-04', 'Accueil &amp; découverte', 'Consulter les activités proches de soi', 'Découvrir'),
      ('US-05', 'Accueil &amp; découverte', 'Voir les activités mises en avant', 'Découvrir'),
      ('US-06', 'Recherche &amp; filtres', 'Rechercher une activité', 'Rechercher'),
      ('US-07', 'Recherche &amp; filtres', 'Filtrer par type d’art, lieu, date ou niveau', 'Filtres'),
      ('US-08', 'Activités', 'Consulter la fiche d’une activité', 'Fiche activité'),
      ('US-09', 'Activités', 'Voir les participants d’une activité', 'Fiche activité'),
      ('US-10', 'Activités', 'Créer une activité artistique', 'Créer'),
      ('US-11', 'Activités', 'Modifier une activité organisée', 'Modifier'),
      ('US-12', 'Activités', 'Supprimer une activité organisée', 'Modifier'),
      ('US-13', 'Participation', 'Rejoindre une activité', 'Fiche activité'),
      ('US-14', 'Participation', 'Quitter une activité', 'Fiche, Mes activités'),
      ('US-15', 'Participation', 'Recevoir une confirmation immédiate de participation', 'Tu participes !'),
      ('US-16', 'Conversations', 'Accéder au groupe lié à l’activité', 'Conversation'),
      ('US-17', 'Conversations', 'Envoyer un message dans le groupe', 'Conversation'),
      ('US-18', 'Conversations', 'Être informé d’un nouveau message', 'Pastilles, message flottant'),
      ('US-19', 'Profil &amp; préférences', 'Consulter son profil', 'Profil'),
      ('US-20', 'Profil &amp; préférences', 'Modifier ses informations de profil', 'Mes informations'),
      ('US-21', 'Profil &amp; préférences', 'Gérer ses préférences artistiques et sa localisation', 'Inscription, profil'),
      ('US-22', 'Profil &amp; préférences', 'Consulter ses activités organisées ou rejointes', 'Mes activités'),
      ('US-23', 'Profil &amp; préférences', 'Supprimer son compte', 'Profil'),
      ('US-24', 'Aide', 'Accéder à l’aide / FAQ', 'FAQ du site vitrine')]
NOT_DONE = set()
EXTRA = [('SHOULD', 'Participation', 'Rejoindre la liste d’attente et confirmer la place libérée (sujet ART)', 'Livré'),
         ('SHOULD', 'Conversations', 'Écrire en privé à l’organisateur ou à un membre', 'Livré'),
         ('SHOULD', 'Carte', 'Voir les activités sur une carte et la distance depuis sa position', 'Livré'),
         ('SHOULD', 'Inscription &amp; connexion', 'Continuer avec Google', 'Livré'),
         ('SHOULD', 'Activités', 'Importer la photo de son activité', 'Livré'),
         ('SHOULD', 'Profil &amp; préférences', 'Recevoir des notifications dans l’application et gérer ses favoris', 'Livré'),
         ('COULD', 'Activités', 'Obtenir des idées d’activités par l’IA à partir de mots-clés', 'Livré'),
         ('COULD', 'Recherche', 'Autocomplétion avec choix de la catégorie', 'Livré'),
         ('COULD', 'Activités', 'Voir la météo du jour, ajouter à son agenda, partager', 'Livré'),
         ('COULD', 'Profil &amp; préférences', 'Découvrir les membres de la communauté', 'Livré'),
         ('WON’T', '—', 'Paiement en ligne', 'Hors périmètre'),
         ('WON’T', '—', 'Notifications push et application installable (PWA)', 'Plus tard'),
         ('WON’T', '—', 'Avis et notation après une activité', 'Plus tard'),
         ('WON’T', '—', 'Connexion avec Apple', 'Plus tard')]
MILESTONES = [('J1', '09/09', 'Brief', 'Choix du projet ART'), ('J2', '16/09', 'Pitch V0', 'Charte, VPC, Lean Canvas, roadmap V0'),
              ('J3', '07/10', 'Proposition', 'Roadmap V2, backlog V2, site vitrine 75 %'), ('J4', '04/11', 'Démo', 'Scénario minimal'),
              ('J5', '10/11', 'Lancement', 'Application et site en ligne ; retours du professeur'), ('CF', '29/11', 'Rendu final', 'Site vitrine 25 % · application 75 %')]


def status(s):
    cls = 'ok' if s.startswith('Livré') else 'no' if s in ('Non livré',) else 'later'
    return f'<span class="status status--{cls}">{s}</span>'


po = f'''
<section class="section section--rose" id="po" aria-labelledby="po-title">
 <div class="wrap">
  {head('06', 'Product Owner', '<span id="po-title">Roadmap et backlog</span>', 'Du MVP (MUST) à la version cible (SHOULD + COULD), en 4 sprints de J1 à J5. Les 24 user stories du scénario minimal sont livrées.')}
  <ol class="milestones">{''.join(f'<li><span class="ms__j">{j}</span><span class="ms__d">{d}</span><strong>{t}</strong><span class="muted">{x}</span></li>' for j, d, t, x in MILESTONES)}</ol>
  {sub('roadmap', 'Roadmap : besoins, hypothèses et approches retenues', 'Une carte par EPIC : la vision produit (besoin et hypothèse), puis l’approche retenue et ce qui est en ligne.')}
  <div class="epics">{''.join(f'<article class="card epic reveal"><header><span class="epic__id">{k}</span><h4>{t}</h4><span class="tag">{sc}</span></header><p class="label">Vision produit</p><p><strong>Besoin :</strong> {b}</p><p><strong>Hypothèse :</strong> {h}</p><p class="label">Approche retenue</p>{ul(a)}<p class="epic__status">{status(st)}</p></article>' for k, t, sc, b, h, a, st in EPICS)}</div>
  {figure('img/roadmap.webp', 'Roadmap NOVART : EPICs, sprints et scénarios minimal et cible', 'Roadmap d’origine (PO) : EPICs, sprints J1 → J5, scénario minimal et cible.', 2200, 1239)}
  {sub('backlog', 'Backlog : EPIC | user story | priorité MoSCoW', 'Backlog V2 (scénario minimal, découpé en user stories), complété des fonctionnalités du scénario cible et de ce qui est volontairement exclu.')}
  <div class="table-wrap"><table class="table table--backlog">
   <caption class="sr-only">Backlog NOVART avec priorités et statut</caption>
   <thead><tr><th scope="col">ID</th><th scope="col">EPIC</th><th scope="col">User story</th><th scope="col">Priorité</th><th scope="col">Écran</th><th scope="col">Statut</th></tr></thead>
   <tbody>{''.join(f'<tr><td class="num">{k}</td><td>{ep}</td><td>{us}</td><td><span class="moscow moscow--must">MUST</span></td><td>{sc}</td><td>{status("Non livré" if k in NOT_DONE else "Livré")}</td></tr>' for k, ep, us, sc in US)}
   {''.join(f'<tr><td class="num">—</td><td>{ep}</td><td>{us}</td><td><span class="moscow moscow--{p.lower().replace("’", "")}">{p}</span></td><td>—</td><td>{status(st)}</td></tr>' for p, ep, us, st in EXTRA)}</tbody>
  </table></div>
  <p class="muted small">Format des user stories (titre, spécifications fonctionnelles, critères d’acceptation, prérequis, spécifications techniques, exclusions) et critères détaillés : <a href="{GITHUB}/tree/main/specs/user-stories">specs/user-stories</a> sur GitHub. Backlogs V1 et V2 : dossier de rendu.</p>
 </div>
</section>'''

# ---------------------------------------------------------------- 07 · DEV
STACK = [('Application', 'Vue 3, TypeScript, Vite, Tailwind CSS 4, Shadcn-Vue, Lucide', 'Firebase Hosting'),
         ('Site vitrine et présentation', 'HTML et CSS statiques, générés par script', 'Firebase Hosting'),
         ('Connexion', 'Firebase Authentication : lien par e-mail, Google', 'Google'),
         ('Données et temps réel', 'Cloud Firestore et règles de sécurité', 'Google'),
         ('API NOVART', 'Cloudflare Worker (JavaScript)', 'Cloudflare'),
         ('E-mails', 'Brevo (e-mail de connexion NOVART)', 'Brevo'),
         ('Photos', 'Cloudflare R2', 'Cloudflare'),
         ('Anti-abus', 'Cloudflare D1 (empreintes salées, effacées)', 'Cloudflare'),
         ('IA', 'Mistral Small 3.1 via Cloudflare Workers AI', 'Cloudflare'),
         ('Carte et lieux', 'Leaflet, OpenStreetMap, Google Places, Open-Meteo', 'Tiers'),
         ('Tests', 'Vitest, Playwright, node:test', 'Local')]
ROUTES = [('GET', '/health', 'Vérifier que l’API répond', 'Public'),
          ('POST', '/auth/email-link', 'Envoyer l’e-mail de connexion NOVART (lien Firebase, Brevo)', 'Origine autorisée, 3 demandes / 10 min par adresse'),
          ('POST', '/uploads/cover', 'Stocker la photo d’une activité dans R2', 'Membre connecté (jeton Firebase), 30 / h'),
          ('GET', '/files/covers/…', 'Lire une photo (cache d’un an)', 'Public'),
          ('POST', '/ai/activity-ideas', 'Trois idées d’activités par Mistral Small', 'Membre connecté, 20 / h'),
          ('POST', '/account/delete', 'Supprimer son compte : activités organisées, participations, messages, conversations, profils, photos, puis le compte', 'Membre connecté, confirmation explicite')]
COLLECTIONS = [('users/{uid}', 'Profil privé : nom, ville, coordonnées, préférences, favoris', 'La personne seule'),
               ('publicProfiles/{uid}', 'Profil public : prénom, nom, photo, bio, centres d’intérêt', 'Membres connectés'),
               ('activities/{id}', 'Activité : discipline, description, lieu, date, places, participants, liste d’attente, place proposée', 'Membres connectés ; écriture contrôlée'),
               ('activities/{id}/messages', 'Messages du groupe', 'Participants et organisateur'),
               ('privateChats/{a__b}', 'Conversation privée, contexte de l’activité, dernière lecture', 'Les deux membres'),
               ('privateChats/{id}/messages', 'Messages privés', 'Les deux membres')]
DATA = [('Membres de démonstration', '120'), ('Activités (de J-30 à J+60)', '220'), ('Participations', '≈ 1 500'), ('Places en liste d’attente', '≈ 40'),
        ('Messages de groupe', '≈ 970'), ('Conversations privées', '40'), ('Lieux suggérés', '127'), ('Disciplines × pratiques', '12 × 5')]
CHANGES = [('Slogan « L’art ne se crée plus en solo »', '« L’art se crée ensemble »', 'Formulation positive, retenue après le pitch V0.'),
           ('Modèle Annonce + Séances (UML pré-J3), prix en centimes', 'Une activité = une date ; gratuite', 'Plus simple à créer, chercher et rejoindre ; plusieurs dates d’un même atelier restent regroupées dans la recherche.'),
           ('API REST /annonces (OpenAPI V1)', 'SDK Firestore + règles de sécurité ; Worker pour ce qui exige un serveur', 'Temps réel natif et moins de code serveur ; le Worker garde les secrets (e-mail, photos, IA).'),
           ('Realtime Database pour les messages', 'Firestore pour tout', 'Une seule base, des règles communes.'),
           ('Liste d’attente écartée du cœur (README)', 'Liste d’attente légère avec confirmation', 'Demandée par le sujet ART ; elle remplit automatiquement les places libérées.'),
           ('Illustrations imposées', 'Photo de l’organisateur facultative, illustrations claires par défaut', 'Retour du professeur : garder les illustrations génériques, versions blanches.'),
           ('Profils lisibles par tous', 'Profil public séparé du profil privé', 'RGPD : l’adresse et la position ne sont jamais partagées.'),
           ('Assistance IA (maquette 22), hors MVP', 'Idées d’activités par Mistral, gratuites', 'Retour du professeur à J5.'),
           ('Sigmar One pour les titres, rouge #C03C3A', 'Caveat et rouge vif #FF0000', 'Refonte de l’interface en novembre, validée par l’équipe ; Caveat reprend l’écriture manuscrite des annotations de la charte.')]

ARCH = f'''<div class="arch" role="img" aria-label="Architecture : l’application et les sites sur Firebase Hosting ; l’application parle à Firebase Auth et Firestore, et à l’API NOVART sur Cloudflare (Worker), qui utilise Brevo, R2, D1 et Workers AI.">
 <div class="arch__col"><p class="arch__title">Navigateur</p><div class="arch__box arch__box--front">Application Vue<small>novart-app.web.app</small></div><div class="arch__box arch__box--front">Site vitrine et présentation<small>novart-109bf.web.app</small></div></div>
 <div class="arch__arrows" aria-hidden="true"><span>→</span><span>→</span></div>
 <div class="arch__col"><p class="arch__title">Google Firebase</p><div class="arch__box">Hosting</div><div class="arch__box">Authentication<small>lien e-mail, Google</small></div><div class="arch__box">Cloud Firestore<small>données, temps réel, règles</small></div></div>
 <div class="arch__col"><p class="arch__title">Cloudflare</p><div class="arch__box arch__box--api">Worker « projet-art-api »<small>API NOVART</small></div><div class="arch__row"><div class="arch__box">R2<small>photos</small></div><div class="arch__box">D1<small>anti-abus</small></div><div class="arch__box">Workers AI<small>Mistral Small</small></div></div></div>
 <div class="arch__col"><p class="arch__title">Services tiers</p><div class="arch__box">Brevo<small>e-mails</small></div><div class="arch__box">Google Places<small>adresses</small></div><div class="arch__box">OpenStreetMap · Open-Meteo</div></div>
</div>'''

dev = f'''
<section class="section" id="dev" aria-labelledby="dev-title">
 <div class="wrap">
  {head('07', 'Développement', '<span id="dev-title">Architecture, données et qualité</span>', 'Une architecture serverless : l’application parle directement à Firebase, protégée par des règles de sécurité, et à une petite API sur Cloudflare pour tout ce qui demande un secret.')}
  <nav class="subnav" aria-label="Parties du développement"><a href="#architecture">Architecture</a><a href="#technologies">Technologies</a><a href="#donnees">Données</a><a href="#modele">Modèle</a><a href="#api">API</a><a href="#qualite">Qualité</a><a href="#changements">Ce qui a changé</a></nav>
  {sub('architecture', 'Architecture')}
  {ARCH}
  {sub('technologies', 'Technologies')}
  <div class="table-wrap"><table class="table"><thead><tr><th scope="col">Rôle</th><th scope="col">Outils</th><th scope="col">Hébergement</th></tr></thead>
   <tbody>{''.join(f'<tr><td><strong>{a}</strong></td><td>{b}</td><td>{c}</td></tr>' for a, b, c in STACK)}</tbody></table></div>
  {sub('donnees', 'Données de démonstration', 'Un jeu réaliste et reproductible de la Métropole de Lyon, rechargé la veille d’une démonstration (dates recalées sur le jour même).')}
  <ul class="stats-grid">{''.join(f'<li><strong>{v}</strong><span>{k}</span></li>' for k, v in DATA)}</ul>
  {sub('modele', 'Modèle de données', 'Le modèle UML du scénario minimal (pré-J3) prévoyait une annonce avec plusieurs séances datées. Le modèle réalisé dans Firestore est plus simple : une activité porte sa date, ses places et ses participants.')}
  {figure('img/uml.webp', 'Diagramme UML pré-J3 : Utilisateur organise Annonce, Annonce propose une ou plusieurs Séances', 'Modèle prévu (UML, pré-J3).', 2400, 549, 'doc doc--wide')}
  <div class="table-wrap"><table class="table"><caption>Modèle réalisé (Cloud Firestore)</caption><thead><tr><th scope="col">Collection</th><th scope="col">Contenu</th><th scope="col">Qui peut lire</th></tr></thead>
   <tbody>{''.join(f'<tr><td><code>{a}</code></td><td>{b}</td><td>{c}</td></tr>' for a, b, c in COLLECTIONS)}</tbody></table></div>
  {sub('api', 'API NOVART (Cloudflare Worker)', 'Toutes les autres opérations passent par le SDK Firestore, contrôlées par les règles de sécurité (capacité, liste d’attente, droits de l’organisateur).')}
  <div class="table-wrap"><table class="table"><thead><tr><th scope="col">Méthode</th><th scope="col">Route</th><th scope="col">Rôle</th><th scope="col">Accès et limites</th></tr></thead>
   <tbody>{''.join(f'<tr><td><span class="method method--{m.lower()}">{m}</span></td><td><code>{r}</code></td><td>{d}</td><td>{a}</td></tr>' for m, r, d, a in ROUTES)}</tbody></table></div>
  <p class="muted small">Spécification OpenAPI du scénario minimal (V1) : <a href="docs/NOVART-openapi-V1.json" download>NOVART-openapi-V1.json</a>.</p>
  {sub('qualite', 'Qualité, sécurité et accessibilité')}
  <ul class="stats-grid stats-grid--3"><li><strong>62</strong><span>tests unitaires (Vitest)</span></li><li><strong>100</strong><span>scénarios de bout en bout (Playwright), sur ordinateur, téléphone et petit écran (320 px)</span></li><li><strong>35</strong><span>tests de l’API (node:test)</span></li></ul>
  <div class="grid two">
   <article class="card"><h3>Sécurité et RGPD</h3>{ul(['Aucun secret dans l’application ni dans le dépôt : clés en secrets Cloudflare.', 'Règles Firestore : profil privé lisible par la personne seule, messages réservés aux membres du groupe ou de la conversation.', 'API limitée à l’origine de l’application, jetons Firebase vérifiés, quotas par membre.', 'Pas d’e-mail ni d’adresse IP stockés : seulement des empreintes salées, effacées.', 'Droit à l’effacement : chacun peut supprimer son compte et toutes ses données depuis son profil.'])}</article>
   <article class="card"><h3>Accessibilité et mobile</h3>{ul(['Conçu d’abord pour le téléphone, vérifié jusqu’à 320 px de large.', 'Contrastes conformes WCAG AA, navigation au clavier, lecteurs d’écran (combobox, onglets, dialogues).', 'Gestes au doigt sur l’accueil, boutons Retour toujours visibles.', 'Mouvements réduits respectés.'])}</article>
  </div>
  {sub('changements', 'Ce qui a changé en route')}
  <div class="table-wrap"><table class="table"><thead><tr><th scope="col">Prévu</th><th scope="col">Réalisé</th><th scope="col">Pourquoi</th></tr></thead>
   <tbody>{''.join(f'<tr><td>{a}</td><td><strong>{b}</strong></td><td>{c}</td></tr>' for a, b, c in CHANGES)}</tbody></table></div>
 </div>
</section>'''

# ---------------------------------------------------------------- page
NAV = [('#projet', 'Projet'), ('#canvas', 'Canvas'), ('#parcours', 'Parcours'), ('#charte', 'Charte'), ('#maquettes', 'Maquettes'), ('#po', 'PO'), ('#dev', 'DEV')]
LINKS = [(APP, 'Application', 'smartphone'), (VITRINE, 'Site vitrine', 'house'), (GITHUB, 'Dépôt GitHub', 'pen-line'), ('docs/NOVART-pitch-V0.pdf', 'Pitch V0 (PDF)', 'play')]

hero = f'''
<section class="p-hero" aria-labelledby="top-title">
 <div class="wrap">
  <div class="p-hero__text">
   <span class="eyebrow">Projet 1 — ART · Groupe 1 · M2 CIM 2026/2027</span>
   <h1 id="top-title">NOVART</h1>
   <p class="p-hero__slogan">L’art se crée ensemble.</p>
   <p class="lead">La plateforme qui réunit les passionné·es d’art pour proposer, découvrir et rejoindre des activités artistiques près de chez eux, dans la Métropole de Lyon.</p>
   <div class="btn-row"><a class="btn btn--primary" href="{APP}">{i('smartphone')}Ouvrir l’application</a><a class="btn btn--outline" href="{VITRINE}">{i('house')}Site vitrine</a><a class="btn btn--outline" href="{GITHUB}">{i('pen-line')}GitHub</a><a class="btn btn--ghost" href="docs/NOVART-pitch-V0.pdf" download>{i('play')}Pitch V0 (PDF)</a></div>
  </div>
  <div class="p-hero__visual"><img src="img/logo-secondaire.webp" alt="" width="700" height="671" fetchpriority="high" /></div>
 </div>
 <div class="wrap"><ul class="key-figures" aria-label="Chiffres clés">
  <li><strong>24/24</strong><span>user stories du scénario minimal livrées</span></li>
  <li><strong>9</strong><span>EPICs, dont l’assistance IA ajoutée à J5</span></li>
  <li><strong>26</strong><span>maquettes du parcours</span></li>
  <li><strong>190+</strong><span>tests automatisés</span></li>
 </ul></div>
</section>'''

body = hero + projet + canvas + parcours + charte + maquettes + po + dev
# Typographie française : espace fine insécable avant ! ? ; : » et après «.
body = re.sub(r' ([!?;:»])', ' \\1', body).replace('« ', '« ')

doc = f'''<!DOCTYPE html>
<html lang="fr" class="no-js">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>NOVART — Présentation du projet (Groupe 1 ART, M2 CIM)</title>
  <meta name="description" content="Présentation du projet NOVART : canvas, personas, parcours, charte, maquettes, roadmap, backlog et architecture. Groupe 1 ART, M2 CIM 2026/2027." />
  <meta name="robots" content="noindex" />
  <meta name="theme-color" content="#FF0000" />
  <link rel="icon" type="image/png" href="../assets/img/novart-logo-primary.png" />
  <link rel="preload" href="../assets/fonts/caveat-variable.ttf" as="font" type="font/ttf" crossorigin />
  <link rel="stylesheet" href="../assets/site.css" />
  <link rel="stylesheet" href="presentation.css" />
</head>
<body>
{SPRITE}
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="#top-title" aria-label="NOVART, haut de la page"><span class="brand-logo" aria-hidden="true"></span><span class="brand-tag">Présentation du projet</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Ouvrir le menu"><svg class="icon" aria-hidden="true"><use href="#i-menu"/></svg></button>
    <nav id="site-nav" class="site-nav" aria-label="Sections de la présentation">{''.join(f'<a href="{h}">{l}</a>' for h, l in NAV)}<a class="btn btn--primary" href="{APP}">{i('log-in')}Ouvrir l’app</a></nav>
  </div>
</header>
<main id="contenu">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div><span class="brand-logo brand-logo--white" role="img" aria-label="NOVART — L’art se crée ensemble."></span>
      <p class="light" style="margin-top:.8rem">Projet 1 — ART, Groupe 1. Master 2 CIM 2026/2027.</p></div>
    <div><h2>Équipe</h2><ul>{''.join(f'<li>{n} — {r}</li>' for n, r, _ in TEAM)}</ul></div>
    <div><h2>Liens</h2><ul>{''.join(f'<li><a href="{h}">{l}</a></li>' for h, l, _ in LINKS)}</ul></div>
    <div><h2>Documents</h2><ul><li><a href="docs/NOVART-README.pdf">README du projet (PDF)</a></li><li><a href="docs/NOVART-openapi-V1.json" download>OpenAPI V1 (JSON)</a></li><li><a href="{GITHUB}/tree/main/specs">Spécifications (GitHub)</a></li></ul></div>
    <p class="legal-line">© <span data-year>2026</span> NOVART — projet étudiant. Visuels : équipe NOVART ; pictogrammes Lucide (ISC) ; polices sous licence SIL OFL.</p>
  </div>
</footer>
<script src="../assets/site.js" defer></script>
</body>
</html>
'''
(OUT / 'index.html').write_text(doc)
print('écrit', OUT / 'index.html', len(doc), 'caractères')
