/* ASTRO QUEST — les 8 mondes et leurs questions d'astronomie (niveau collège, en français).
   Chaque monde a 3 questions : la première posée est tirée au hasard parmi les 3, la question « seconde chance » est tirée parmi les 2 autres.
   Format d'une question : { q: texte, ok: bonne réponse, faux: [3 mauvaises réponses] } — l'ordre des réponses est mélangé à chaque fois. */
window.ASTRO_MONDES = [
  {
    planete: "Mercure", gardien: "Gardien de Mercure", type: "roche",
    couleurs: ["#b9afa3", "#8a7f74", "#5d554d"], nebuleuse: [[70, 90, 200], [150, 80, 190]],
    fait: "Sur Mercure, une journée solaire (du lever au lever du Soleil) dure environ 176 jours terrestres !",
    questions: [
      { q: "Quelle est la planète la plus proche du Soleil ?", ok: "Mercure", faux: ["Vénus", "Mars", "La Terre"] },
      { q: "Combien de planètes compte le système solaire ?", ok: "8", faux: ["7", "9", "10"] },
      { q: "Quel type d'astre est le Soleil ?", ok: "Une étoile", faux: ["Une planète", "Une comète", "Un satellite"] }
    ]
  },
  {
    planete: "Vénus", gardien: "Gardien de Vénus", type: "nuages",
    couleurs: ["#f1d28a", "#d99a4e", "#a8612c"], nebuleuse: [[220, 140, 60], [190, 70, 90]],
    fait: "Vénus tourne sur elle-même à l'envers des autres planètes, et sa journée est plus longue que son année !",
    questions: [
      { q: "Quelle planète est la plus chaude du système solaire ?", ok: "Vénus", faux: ["Mercure", "Mars", "Jupiter"] },
      { q: "Comment s'appelle la galaxie dans laquelle se trouve notre système solaire ?", ok: "La Voie lactée", faux: ["Andromède", "Orion", "Le Grand Nuage"] },
      { q: "Comment appelle-t-on un astre qui tourne autour d'une planète ?", ok: "Un satellite naturel", faux: ["Une comète", "Une étoile", "Un astéroïde"] }
    ]
  },
  {
    planete: "Mars", gardien: "Gardien de Mars", type: "rouge",
    couleurs: ["#e0764a", "#b5441d", "#6d2410"], nebuleuse: [[190, 60, 40], [110, 50, 120]],
    fait: "Mars possède deux petites lunes, Phobos et Déimos. Phobos se rapproche très lentement de la planète.",
    questions: [
      { q: "Quelle planète est surnommée « la planète rouge » ?", ok: "Mars", faux: ["Jupiter", "Vénus", "Mercure"] },
      { q: "Comment s'appelle le satellite naturel de la Terre ?", ok: "La Lune", faux: ["Phobos", "Titan", "Europe"] },
      { q: "Quelle planète est juste après la Terre quand on s'éloigne du Soleil ?", ok: "Mars", faux: ["Vénus", "Mercure", "Jupiter"] }
    ]
  },
  {
    planete: "Jupiter", gardien: "Gardien de Jupiter", type: "bandes",
    couleurs: ["#e8c9a0", "#c98d5b", "#8c5636"], nebuleuse: [[200, 130, 60], [90, 60, 170]],
    fait: "On pourrait faire entrer plus de 1 300 Terres dans Jupiter ! C'est la géante du système solaire.",
    questions: [
      { q: "Quelle est la plus grande planète du système solaire ?", ok: "Jupiter", faux: ["Saturne", "La Terre", "Neptune"] },
      { q: "De quoi le Soleil est-il principalement composé ?", ok: "D'hydrogène et d'hélium", faux: ["De roche et de fer", "D'eau et de glace", "D'oxygène et d'azote"] },
      { q: "Comment s'appelle la grande tempête visible depuis des siècles sur Jupiter ?", ok: "La Grande Tache rouge", faux: ["La Grande Tache bleue", "Le Grand Cratère", "L'Œil de Mars"] }
    ]
  },
  {
    planete: "Saturne", gardien: "Gardien de Saturne", type: "anneaux",
    couleurs: ["#f3e2b3", "#d9b97a", "#a98954"], nebuleuse: [[210, 170, 80], [120, 70, 190]],
    fait: "Saturne est si peu dense qu'elle flotterait sur l'eau, si on trouvait un océan assez grand !",
    questions: [
      { q: "Quelle planète est célèbre pour ses anneaux ?", ok: "Saturne", faux: ["Mars", "Vénus", "Mercure"] },
      { q: "Qu'est-ce qu'une année-lumière ?", ok: "Une distance", faux: ["Une durée de 365 jours", "Une vitesse", "L'âge d'une étoile"] },
      { q: "Quelle est la deuxième plus grande planète du système solaire ?", ok: "Saturne", faux: ["Neptune", "Uranus", "La Terre"] }
    ]
  },
  {
    planete: "Uranus", gardien: "Gardien d'Uranus", type: "glace",
    couleurs: ["#c9f4f5", "#8fe0e4", "#4aa8b8"], nebuleuse: [[40, 170, 190], [70, 90, 200]],
    fait: "Uranus met environ 84 ans pour faire un tour autour du Soleil : une saison y dure plus de 20 ans !",
    questions: [
      { q: "Quelle planète tourne presque « couchée sur le côté » ?", ok: "Uranus", faux: ["Mars", "Mercure", "Jupiter"] },
      { q: "Qu'est-ce qui provoque les saisons sur Terre ?", ok: "L'inclinaison de l'axe de la Terre", faux: ["La distance Terre-Lune", "Les taches solaires", "La vitesse du vent solaire"] },
      { q: "Combien de temps la Terre met-elle pour faire un tour autour du Soleil ?", ok: "Un an (365 jours)", faux: ["24 heures", "Un mois", "10 ans"] }
    ]
  },
  {
    planete: "Neptune", gardien: "Gardien de Neptune", type: "bleu",
    couleurs: ["#7fa6ff", "#3a63e0", "#1b2f8f"], nebuleuse: [[50, 90, 230], [150, 60, 200]],
    fait: "Sur Neptune, les vents dépassent 2 000 km/h : ce sont les plus rapides du système solaire !",
    questions: [
      { q: "Quelle planète du système solaire est la plus éloignée du Soleil ?", ok: "Neptune", faux: ["Uranus", "Saturne", "Jupiter"] },
      { q: "Qu'est-ce qu'une étoile filante ?", ok: "Un petit morceau de roche qui brûle dans l'atmosphère", faux: ["Une étoile qui tombe sur Terre", "Une comète entière", "Un satellite en panne"] },
      { q: "De quelle couleur apparaît Neptune, en partie à cause du méthane de son atmosphère ?", ok: "Bleue", faux: ["Rouge", "Verte", "Jaune"] }
    ]
  },
  {
    planete: "Pluton", gardien: "Gardien de Pluton", type: "naine",
    couleurs: ["#e9d5bd", "#b99a7c", "#6f5a49"], nebuleuse: [[160, 80, 190], [60, 100, 200]],
    fait: "Pluton a été découverte en 1930 par l'astronome Clyde Tombaugh. Depuis 2006, c'est une planète naine.",
    questions: [
      { q: "Depuis 2006, comment classe-t-on Pluton ?", ok: "Planète naine", faux: ["Planète géante", "Étoile", "Satellite de Neptune"] },
      { q: "Quelle force maintient les planètes en orbite autour du Soleil ?", ok: "La gravitation", faux: ["Le magnétisme", "Le vent solaire", "La pression de l'air"] },
      { q: "Comment s'appelle la zone de petits astres rocheux entre Mars et Jupiter ?", ok: "La ceinture d'astéroïdes", faux: ["La ceinture de Kuiper", "Le nuage d'Oort", "La ceinture de Van Allen"] }
    ]
  }
];
