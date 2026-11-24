# Fiches à remplir LIBOKÉ Épargne + Santé (de l'ouverture de compte au suivi de l'épargne).
# Contenu fidèle à la page officielle : 3 formules (Programmée, Libre, Santé & Familiale), dépôts par Mobile Money,
# accompagnement social, passerelle vers Clinique Havre de Vie et STAR VITAL. AUCUN prix, taux ou montant inventé.
FILIALE = dict(cle='liboke', nom='LIBOKÉ Épargne + Santé', logo_zip='images/liboke-epargne-sante-2.jpg')

def make_forms(champ, cases, lignes, section, table, signatures):
    FORMULES = ['Épargne Programmée', 'Épargne Libre', 'Épargne Santé & Familiale']
    OPERATEURS = ['Mobile Money MTN', 'Mobile Money Airtel', 'Autre']
    F = []

    # 1 ─ OUVERTURE DE COMPTE
    F.append(dict(fichier='ouverture-de-compte', court="Ouverture de compte",
        titre="Fiche d'ouverture <em>de compte</em>", sous="Remplissez en majuscules, au stylo bleu ou noir.",
        reserve=['N° de compte', 'Date d\'ouverture', 'Agent'],
        corps=
        section(1, "Identité du titulaire",
            champ('Nom', 6) + champ('Prénoms', 6) +
            champ('Date de naissance', 4) + champ('Lieu de naissance', 5) + cases('Sexe', ['Féminin', 'Masculin'], 3) +
            champ('Nationalité', 4) + cases('Situation familiale', ['Célibataire', 'Marié(e)', 'Veuf(ve)', 'Autre'], 8) +
            champ('Profession / activité', 12) +
            cases("Pièce d'identité", ['Carte nationale', 'Passeport', 'Permis', 'Autre'], 7) + champ('N° de la pièce', 5)) +
        section(2, "Coordonnées",
            champ('Adresse (quartier, rue, repère)', 8) + champ('Ville', 4) +
            champ('Téléphone Mobile Money', 4) + champ('WhatsApp', 4) + champ('E-mail', 4)) +
        section(3, "Formule choisie",
            cases('Je choisis (une ou plusieurs formules)', FORMULES, 12) +
            cases('Pour concrétiser', ['Logement', 'Études', 'Événement de vie', 'Santé de la famille', 'Autre'], 12)) +
        section(4, "Personne à prévenir",
            champ('Nom et prénoms', 5) + champ('Lien avec vous', 3) + champ('Téléphone', 4)) +
        '<p class="note"><b>Je certifie</b> que les renseignements ci-dessus sont exacts et je souhaite ouvrir un compte <b>LIBOKÉ Épargne + Santé</b>.</p>' +
        signatures(h=14)))

    # 2 ─ CHOIX DE FORMULE ET OBJECTIF D'ÉPARGNE
    F.append(dict(fichier='choix-de-formule', court="Choix de la formule d'épargne",
        titre="Choix de la formule<br><em>et de l'objectif d'épargne</em>", sous="Programmée, libre ou santé familiale : selon vos besoins.",
        reserve=['N° de compte', 'Date', 'Agent'],
        corps=
        section(1, "Le titulaire", champ('Nom et prénoms', 8) + champ('N° de compte', 4) + champ('Téléphone', 6) + champ('WhatsApp', 6)) +
        section(2, "Ma formule",
            cases('Je choisis', FORMULES, 12) +
            champ('Mon objectif (en quelques mots)', 12, 9) +
            cases('Je souhaite épargner', ['Chaque semaine', 'Chaque mois', 'À mon rythme', 'Autre'], 12)) +
        section(3, "Mes versements",
            champ('Montant que je souhaite verser (FCFA)', 6) + champ('Date souhaitée du 1er versement', 6) +
            cases('Je verse par', OPERATEURS, 12) +
            champ('Numéro Mobile Money utilisé', 6) + champ('Durée envisagée', 6)) +
        section(4, "Mes projets",
            lignes('Ce que je veux réaliser grâce à mon épargne', 2, 12, 8)) +
        '<p class="note">Le montant et le rythme sont choisis librement par le titulaire. Ils peuvent être modifiés avec la fiche « Demande de retrait ou de modification ».</p>' +
        signatures(h=15)))

    # 3 ─ FAMILLE / SANTÉ
    F.append(dict(fichier='famille-et-sante', court="Famille et couverture santé",
        titre="Fiche famille<br><em>et couverture santé</em>", sous="Les membres du foyer concernés par l'épargne santé et familiale.",
        reserve=['N° de compte', 'Date', 'Agent'],
        corps=
        section(1, "Le titulaire du compte", champ('Nom et prénoms', 8) + champ('N° de compte', 4) + champ('Téléphone', 6) + champ('Ville / quartier', 6)) +
        section(2, "Les membres du foyer",
            '<div style="grid-column:span 12">' + table(['Nom et prénoms', 'Lien', 'Date de naissance', 'Téléphone'], 8, 8.4, ['44%', '16%', '22%', '18%']) + '</div>') +
        section(3, "Remarques utiles",
            lignes('Informations que vous souhaitez nous communiquer', 2, 12, 8)) +
        '<p class="note"><b>Accompagnement :</b> notre équipe sociale peut vous orienter vers les autres services du groupe : <b>Clinique Havre de Vie</b> et <b>STAR VITAL</b>.</p>' +
        signatures(h=17)))

    # 4 ─ BORDEREAU DE VERSEMENT
    F.append(dict(fichier='bordereau-de-versement', court="Bordereau de versement",
        titre="Bordereau<br><em>de versement</em>", sous="À remplir pour chaque dépôt sur votre épargne.",
        reserve=['N° du bordereau', 'Date de réception', 'Agent'],
        corps=
        section(1, "Le déposant", champ('Date du versement', 4) + champ('N° de compte', 4) + champ('Formule', 4) +
            champ('Nom et prénoms du titulaire', 12)) +
        section(2, "Le versement",
            champ('Montant en chiffres (FCFA)', 5) + champ('Montant en lettres', 7) +
            cases('Moyen de versement', OPERATEURS, 12) +
            champ('Numéro qui a envoyé', 6) + champ('N° de la transaction (reçu Mobile Money)', 6)) +
        section(3, "Destination de l'épargne",
            cases('Verser sur', FORMULES, 12) +
            champ('Observations', 12, 24)) +
        '<p class="note">Conservez votre reçu Mobile Money. Le suivi de votre solde se fait en temps réel depuis votre compte STAR ENTREPRISE.</p>' +
        signatures('Signature du déposant', 'Date et lieu', 'Visa et cachet LIBOKÉ', h=30)))

    # 5 ─ DEMANDE DE RETRAIT OU DE MODIFICATION
    F.append(dict(fichier='retrait-ou-modification', court="Demande de retrait ou de modification",
        titre="Demande de retrait<br><em>ou de modification</em>", sous="Retirer, changer de formule ou mettre à jour mes informations.",
        reserve=['N° de demande', 'Date de réception', 'Agent'],
        corps=
        section(1, "Le titulaire", champ('Nom et prénoms', 8) + champ('N° de compte', 4) + champ('Téléphone', 6) + champ('WhatsApp', 6)) +
        section(2, "Ma demande",
            cases('Je souhaite', ['Retirer une partie de mon épargne', 'Changer de formule', 'Mettre à jour mes informations', 'Autre'], 12) +
            champ('Montant du retrait (FCFA)', 5) + champ('Nouvelle formule souhaitée', 7) +
            champ('Motif de la demande', 12, 24)) +
        section(3, "Réception",
            cases('Je souhaite recevoir', OPERATEURS, 12) +
            champ('Numéro Mobile Money qui recevra', 6) + champ('Date souhaitée', 6)) +
        '<p class="note">Le retrait est possible selon la formule choisie (dépôts et retraits flexibles pour l\'<b>Épargne Libre</b>).</p>' +
        signatures(h=30)))

    # 6 ─ DEMANDE D'ACCOMPAGNEMENT SOCIAL
    F.append(dict(fichier='accompagnement-social', court="Demande d'accompagnement social",
        titre="Demande d'accompagnement<br><em>social</em>", sous="Une équipe à l'écoute, présente sur la durée.",
        reserve=['N° de dossier', 'Date de réception', 'Agent'],
        corps=
        section(1, "La famille", champ('Nom et prénoms', 8) + champ('N° de compte (s\'il existe)', 4) +
            champ('Téléphone', 4) + champ('WhatsApp', 4) + champ('Ville / quartier', 4)) +
        section(2, "Nature de la demande",
            cases('Je demande', ['Conseil et orientation', 'Accompagnement dans un moment difficile', 'Orientation vers la Clinique Havre de Vie', 'Orientation vers STAR VITAL', 'Autre'], 12) +
            cases('Degré d\'urgence', ['Normal', 'Urgent'], 6) + cases('Me contacter par', ['WhatsApp', 'Appel', 'Visite'], 6)) +
        section(3, "Ma situation",
            lignes('Expliquez en quelques lignes ce dont vous avez besoin', 7, 12, 8.4)) +
        '<p class="note">Vos informations restent <b>confidentielles</b> et ne servent qu\'à vous accompagner.</p>' +
        signatures('Signature du demandeur', 'Date et lieu', 'Visa de l\'équipe sociale', h=24)))

    # 7 ─ SUIVI DU COMPTE
    F.append(dict(fichier='suivi-du-compte', court="Carnet de suivi de l'épargne",
        titre="Carnet de suivi<br><em>de mon épargne</em>", sous="Notez chaque dépôt et chaque retrait.",
        reserve=['N° de compte', 'Formule', 'Agent'],
        corps=
        section(1, "Le titulaire", champ('Nom et prénoms', 8) + champ('N° de compte', 4)) +
        section(2, "Mes opérations",
            '<div style="grid-column:span 12">' + table(['Date', 'Opération', 'Montant (FCFA)', 'Solde (FCFA)', 'Visa'], 14, 8.9, ['16%', '24%', '22%', '22%', '16%']) + '</div>') +
        '<p class="note">Le solde est aussi consultable en temps réel depuis votre compte STAR ENTREPRISE.</p>'))
    return F
