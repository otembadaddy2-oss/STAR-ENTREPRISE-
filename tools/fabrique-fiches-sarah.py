#!/usr/bin/env python3
"""Fabrique la base de connaissances de SARAH sur les filiales et projets de STAR ENTREPRISE.

Sources : sites du dépôt (titres, descriptions, pages), docs/inventaire-sites-acces-star-entreprise.md,
fiches produits PIOUPIOU / Bissa Pop, REPRISE-SESSION.md. Rien n'est inventé : ce qui n'est pas
confirmé est classé « à confirmer » et SARAH ne l'affirme pas.

Sorties (mêmes données, deux formats) :
  docs/sarah/FILIALES-ET-PROJETS.md        -> à relire par Carry
  docs/sarah/public_seed_filiales.json     -> même format que 04_connaissances/public_seed.json
                                              de SARAH 3.0 (approval = pending_owner_review :
                                              à passer en « approved » par Carry seulement)
Lancer : python3 tools/fabrique-fiches-sarah.py
"""
import json, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
SORTIE = RACINE / "docs" / "sarah"
DATE = "2026-11-06"
A_REVOIR = "2026-11-13"
SOURCE_SITES = "Sites et dépôt STAR ENTREPRISE au 06/11/2026 — brouillon préparé, à relire par le président-fondateur"

# (id, titre, corps, [à confirmer par Carry])
FICHES = [
 ("groupe_star_entreprise", "STAR ENTREPRISE — le groupe, sa devise, ses contacts",
  "STAR ENTREPRISE est une agence digitale basée à Brazzaville, République du Congo, fondée par Carry OTEMBA, président-fondateur. Devise : « Vos idées. Notre éclat. Un diamant. ». Elle conçoit des sites web, des applications mobiles, des boutiques en ligne, des identités de marque et des campagnes, et porte aussi ses propres projets (KOMYO, Keydou, STAR ALERTE, KIDIMBOU, etc.). Contact : WhatsApp +242 06 656 50 50 ; e-mail contact@starentreprise.com ; formulaire sur la page Contact du site. Les interventions peuvent se faire à distance. Un devis est gratuit ; les prix de création sont donnés sur devis par l'équipe, SARAH ne les invente pas. Ne jamais communiquer le business plan 2026-2031 (document confidentiel, usage interne et partenaires autorisés) ni ses chiffres.",
  ["Adresse e-mail officielle : contact@starentreprise.com (site, fiche SARAH) ou contact@star-entreprise.cg (business plan) ?",
   "Chiffres affichés sur le site (« 120+ projets livrés », « support 7j/7 », « réponse sous 24 h ») : confirmés ? SARAH ne les répète pas tant qu'ils ne le sont pas.",
   "Adresse physique (30 avenue Mbemba Théophile, Makélékélé) : publique ou interne ?"]),
 ("services_agence", "STAR ENTREPRISE — services de l'agence digitale",
  "Services : sites web sur mesure (vitrine, institutionnel, événementiel), applications mobiles installables sans magasin d'applications, boutiques en ligne (nourriture, cosmétiques, mode), identité de marque et stratégie digitale, avec formulaire de contact et intégration WhatsApp. Méthode « de l'idée au diamant » en 4 étapes. Pour un devis : la personne décrit son projet, l'équipe répond ; un devis STAR ENTREPRISE est vérifiable sur la page devis du site. SARAH ne s'engage jamais sur un prix, un délai ou une remise : elle transmet à Carry.",
  ["Grille de formules et prix publiables à donner à SARAH (page Services)."]),
 ("star_creat", "STAR CRÉAT — le studio créatif",
  "STAR CRÉAT est le studio créatif du groupe : identité de marque (logo, palette, typographie), packaging, mascottes et campagnes, pour les entreprises du groupe et pour tout client qui veut la même exigence. Parcours en 4 temps, du brief à la marque livrée. Chaque filiale a sa propre marque. Réalisations montrées sur le site : PIOUPIOU (identité de marque de snacks), Pices LAMAH (épices), gamme Bio (fruits secs : Mouton Bio, Lapin Bio), Burkina Faso Bio (campagne régionale). Ce sont des identités et emballages conçus ; SARAH ne dit pas que ces produits sont en vente sans confirmation.",
  ["Quels clients de STAR CRÉAT peuvent être cités publiquement ?"]),
 ("alpha", "ALPHA — diffusion et campagnes",
  "ALPHA est le produit de STAR CRÉAT pour la diffusion : campagnes publicitaires, gestion des réseaux sociaux et calendrier de publication, pour que ce que STAR CRÉAT construit soit vu. Canaux cités : Instagram, Google Ads, TikTok, Facebook. Prestations de suivi et d'optimisation. Demande de devis via le site ALPHA ou WhatsApp. Aucun prix ni résultat chiffré promis.",
  ["Tarifs ALPHA publiables."]),
 ("sos_doc", "SOS DOC — téléconsultation pédiatrique",
  "SOS DOC est un site et une application installable de téléconsultation médicale pour enfants, présenté comme disponible dans plusieurs pays. La mascotte PIOUPIOU accueille les familles, explique le parcours de soin et transmet les ordonnances sur WhatsApp. SARAH ne donne aucun conseil médical ni diagnostic : elle explique le service et oriente vers le site ou l'équipe. En urgence (danger, accident) : 117 police, 118 pompiers, 1444 violences et harcèlement.",
  ["Tarifs des consultations, pays couverts, médecins : à fournir avant toute réponse précise."]),
 ("pioupiou", "PIOUPIOU — mascotte, marque et dessins animés (trois sens à ne pas confondre)",
  "PIOUPIOU désigne trois choses du groupe. 1) La marque de snacks créée par STAR CRÉAT : chips de pomme de terre, patate, banane, plantain sucré, avec mascotte, emballages et présentoir ; et la boisson Bissa Pop (bissap, 200 ml). Les fiches produits indiquent des quantités de conditionnement prévues : ce sont des chiffres internes, SARAH ne les donne pas et ne dit pas que les produits sont en vente. 2) L'assistante vocale du site SOS DOC. 3) L'espace dessins animés pour enfants de 3 à 6 ans dans KOMYO : Pack « Les bonnes habitudes » 1 500 FCFA pour 30 jours, sans renouvellement automatique, 5 dessins animés disponibles sur 10 prévus (au 31/10/2026), aucune date promise pour la suite. Espace protégé : jamais de contact avec un mineur pour un service payant.",
  ["Les snacks PIOUPIOU et Bissa Pop sont-ils en vente ? Où, à quel prix ?"]),
 ("kidimbou", "KIDIMBOU — guichet unique des démarches de l'entreprise",
  "KIDIMBOU est un projet porté par STAR ENTREPRISE qui centralise les démarches administratives liées à l'entreprise en République du Congo : checklist claire par procédure, pièces à préparer, et lien vers le bon service officiel (le parcours indique le portail ou le guichet de l'ACPCE compétent). Installable gratuitement. Ce n'est pas un service de l'État : SARAH le précise et renvoie vers les sources officielles. Elle ne garantit aucun résultat de démarche.",
  ["Relations avec l'ACPCE : partenariat officiel ou simple information ? Formulation à valider."]),
 ("star_alerte", "STAR ALERTE — signaler une urgence",
  "STAR ALERTE est une application nationale, installable gratuitement, pour signaler une urgence en République du Congo avec une photo, la voix et la position : elle prépare un rapport clair et oriente vers le bon service. En danger immédiat, il faut appeler directement le service compétent : 117 police, 118 pompiers, 1444 violences et harcèlement, 10 10 assistance routière RN1. SARAH ne se présente jamais comme un service de secours, ne localise personne et ne promet aucune intervention.",
  ["STAR ALERTE est-elle reliée à de vrais services d'urgence ? Formulation exacte à valider."]),
 ("maison_drepanocytose", "La Maison de la Drépanocytose — Pointe-Noire",
  "Association à Pointe-Noire pour les personnes et familles touchées par la drépanocytose, autour de trois piliers : dépistage, accompagnement des familles, sensibilisation. Le site propose un espace membres, une messagerie et l'installation de l'application. Contact affiché sur le site : +242 04 044 77 40. SARAH ne donne aucun conseil médical : elle oriente vers l'équipe de la Maison. Dons et bénévolat : transmettre à Carry.",
  ["Numéro et horaires de l'accueil ; modalités de dépistage et de don."]),
 ("pilipili_events", "Pili-Pili Events — événementiel à Brazzaville",
  "Agence événementielle à Brazzaville : mariages coutumiers et traditionnels, anniversaires, baptêmes, baby showers, fiançailles, décoration et accessoires. Le site affiche 10 ans d'expérience et plus de 21 000 abonnés. Contact affiché : +242 06 870 00 66. Réservations, dates et devis : transmis à l'équipe, SARAH ne réserve rien à la place du client.",
  ["Pili-Pili est-elle une filiale ou une cliente partenaire ? Chiffres du site à confirmer."]),
 ("so_membres", "S.O — gestion des membres",
  "Application de STAR CRÉAT pour les associations et organisations : fiches d'adhésion, recherche, filtre par année, export Excel. Installable gratuitement sur téléphone, tablette et ordinateur, sans magasin d'applications. Accès protégé : jamais d'identifiant ni de mot de passe donnés par SARAH.",
  []),
 ("marketplace", "STAR Marketplace — acheter et vendre au Congo",
  "Place de marché de STAR ENTREPRISE : on dépose un produit ou un service, ou on trouve ce dont on a besoin ; chaque commande est suivie ; paiement Mobile Money (Airtel Money, MTN Mobile Money) avec vérification : aucune commande n'est validée sans le montant exact reçu. L'inscription vendeur ou acheteur passe par WhatsApp et l'espace équipe.",
  ["La Marketplace est-elle ouverte au public aujourd'hui ? Frais, commissions, villes."]),
 ("d_innovation_btp", "D-INNOVATION BTP — études et construction (Pointe-Noire)",
  "Site et application créés par STAR ENTREPRISE pour une entreprise de bâtiment et génie civil à Pointe-Noire : 8 corps de métier, un seul interlocuteur, fiches techniques remplies sur téléphone et transmises sur WhatsApp, galerie de chantiers. Devis : par l'entreprise, pas par SARAH.",
  ["D-INNOVATION : filiale ou cliente ? Contact public à donner."]),
 ("d_innovation_pressing", "D-INNOVATION Pressing — Speed Service (Pointe-Noire)",
  "Pressing à Pointe-Noire (Songolo) avec site de commande créé par STAR ENTREPRISE : nettoyage à sec, détachage, lavage, repassage ; enlèvement et livraison à domicile ; la commande se prépare sur le site puis s'envoie sur WhatsApp. Contact affiché : 06 979 55 38. Prix et délais : donnés par le pressing.",
  ["Tarifs et zones de livraison publiables."]),
 ("x_saphir", "X SAPHIR — jeu ARENA et film (en préparation)",
  "X SAPHIR est un univers de bande dessinée du groupe, avec le jeu de combat 2D X SAPHIR ARENA (coups spéciaux, 1 ou 2 joueurs) et un projet de film. Le jeu reste HORS LIGNE tant que Carry n'a pas donné son accord : SARAH ne le présente pas comme disponible et ne donne aucune date.",
  ["Date et conditions de sortie."]),
 ("jardis_jardissa", "JARDIS et Jardissa — ne pas confondre",
  "JARDIS est l'assistant personnel de Carry OTEMBA (documents, synthèses) : usage interne, SARAH n'en révèle ni le contenu ni les accès. Jardissa est l'assistante affichée sur le site vitrine (bulle violette) : elle répond aux questions courantes et prépare un message WhatsApp pré-rempli, sans engager l'entreprise. SARAH est l'agent de réponse 24 h sur 24 du groupe.",
  ["Jardissa continue-t-elle seule sur le site vitrine, ou SARAH la remplace-t-elle ?"]),
 ("projets_non_confirmes", "Noms de projets non confirmés (ne pas présenter comme existants)",
  "Le cahier des charges de SARAH citait : STAR AI CORE, STAR DEVIS, STAR CRM, STAR RH, STAR PAY, STAR DATA, STAR API, STAR ID, STAR CLOUD, STAR SECURITY, STAR IMMO, STAR P.A.M.E.P., STAR EVENTS. Aucune fiche vérifiée n'existe pour eux. SARAH ne confirme ni leur existence, ni leur prix, ni leur date : elle répond « ce projet est en préparation, je transmets votre question à l'équipe » et prévient Carry. (Le générateur de devis du site existe, mais ce nom n'est pas confirmé.)",
  ["Lesquels de ces projets existent vraiment, et sous quel statut ?"]),
 ("regles_multi_contacts", "Disponibilité 24 h sur 24 et conversations simultanées",
  "SARAH est disponible 24 h sur 24, sans horaire fixe, sur tous les projets et filiales du groupe. Elle peut répondre à de nombreuses personnes en même temps : chaque conversation est séparée, un contact ne voit jamais celle d'un autre. Les cas à risque (paiement, remboursement, litige, presse, partenaire, menace, mineur, données personnelles) reçoivent un accusé neutre et sont transmis à Carry. Numéro WhatsApp du groupe : +242 06 656 50 50. Jamais de code PIN, mot de passe ou code SMS demandé ou répété.",
  []),
]


def ecrire():
    SORTIE.mkdir(parents=True, exist_ok=True)
    seed = []
    for i, (fid, titre, corps, _) in enumerate(FICHES):
        seed.append({
            "id": fid, "title": titre, "body": corps,
            "source": SOURCE_SITES, "verified": DATE, "review_due": A_REVOIR,
            "classification": "public", "approval": "pending_owner_review",
            "scan_status": "first_party_text", "version": 1,
        })
    (SORTIE / "public_seed_filiales.json").write_text(
        json.dumps(seed, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    md = ["# Base de connaissances de SARAH — filiales et projets de STAR ENTREPRISE",
          "",
          f"Brouillon du {DATE}, à relire par Carry OTEMBA. Statut de chaque fiche : **en attente d'approbation** "
          "(rien n'est présenté comme validé tant que Carry ne l'a pas dit). Les fiches KOMYO et Keydou existent déjà "
          "dans SARAH 3.0 (`04_connaissances/public_seed.json`) et dans `.claude/agents/sarah-star.md`.",
          "",
          "Règles : SARAH ne dit que ce qui est dans ces fiches ; sinon « je vérifie et je reviens vers vous » et elle "
          "prévient Carry. Pas de prix, de date ni de chiffre inventés. Le business plan reste confidentiel.",
          ""]
    for fid, titre, corps, questions in FICHES:
        md += [f"## {titre}", f"*Identifiant : `{fid}`*", "", corps, ""]
        if questions:
            md += ["**À confirmer par Carry :**"] + [f"- {q}" for q in questions] + [""]
    (SORTIE / "FILIALES-ET-PROJETS.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    nb_q = sum(len(q) for *_, q in FICHES)
    print(f"{len(FICHES)} fiches écrites dans {SORTIE} ; {nb_q} points à confirmer par Carry.")


if __name__ == "__main__":
    ecrire()
