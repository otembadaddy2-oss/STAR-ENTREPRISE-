(function () {
  var $ = function (s) { return document.querySelector(s); };
  var q = new URLSearchParams(location.search);
  var pub = String(q.get('esp') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  var PIECES = { premiere: ['Photo d’identité', 'Pièce d’identité (carte nationale)', 'Acte de naissance', 'Certificat de nationalité', 'Justificatif de domicile (si demandé)'], renouvellement: ['Photo d’identité', 'Pièce d’identité', 'Ancien passeport (page d’identité)', 'Justificatif de domicile (si demandé)'] };
  if (pub.length !== 8) { $('#erreurLien').hidden = false; $('#bEnvoyer').disabled = true; }
  function type() { return document.querySelector('input[name="type"]:checked').value; }
  document.querySelectorAll('input[name="type"]').forEach(function (r) { r.onchange = function () { $('#blocAncien').hidden = type() !== 'renouvellement'; }; });
  var max = new Date().toISOString().slice(0, 10); $('#naiss').max = max;
  function montrerErreur(t) { var m = $('#msg'); m.textContent = '⚠ ' + t; m.hidden = false; m.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  function qrSvg(txt) { try { var c = qrcode(0, 'M'); c.addData(txt); c.make(); return c.createSvgTag(4, 0); } catch (e) { return ''; } }
  function montrerRecu(r, nom, prenoms, t) {
    $('#vForm').hidden = true; $('#vRecu').hidden = false; $('#rNum').textContent = r.id; $('#rCode').textContent = r.code; $('#rNom').textContent = nom + ' ' + prenoms;
    $('#rQr').className = 'qr'; $('#rQr').innerHTML = qrSvg('PSR1|' + r.id + '|' + r.code);
    var u = $('#rPieces'); u.innerHTML = ''; PIECES[t].forEach(function (x) { var li = document.createElement('li'); li.textContent = x; u.appendChild(li); });
    $('#aSuivi').href = 'index.html?suivi=' + encodeURIComponent(r.id) + '&code=' + encodeURIComponent(r.code) + '&esp=' + pub;
    try { sessionStorage.setItem('sp_prereg', JSON.stringify({ id: r.id, code: r.code, nom: nom, prenoms: prenoms, t: t, pub: pub })); } catch (e) { }
    window.scrollTo(0, 0);
  }
  $('#f').addEventListener('submit', function (e) {
    e.preventDefault(); $('#msg').hidden = true;
    var d = { type: type(), nom: $('#nom').value.trim(), prenoms: $('#prenoms').value.trim(), naissance: $('#naiss').value, sexe: $('#sexe').value, nationalite: $('#nat').value.trim(), tel: $('#tel').value.trim(),
      piece: { type: $('#ptype').value, numero: $('#pnum').value.trim(), expiration: $('#pexp').value }, ancien: type() === 'renouvellement' ? { numero: $('#anum').value.trim(), expiration: $('#aexp').value } : null };
    var manque = []; if (!d.nom) manque.push('votre nom'); if (!d.prenoms) manque.push('vos prénoms'); if (!d.naissance) manque.push('votre date de naissance'); if (!d.piece.numero) manque.push('le numéro de votre pièce'); if (d.type === 'renouvellement' && !d.ancien.numero) manque.push('le numéro de votre ancien passeport');
    if (manque.length) return montrerErreur('Il manque : ' + manque.join(', ') + '.');
    var b = $('#bEnvoyer'); b.disabled = true; b.textContent = 'Envoi en cours…';
    fetch('/api/passeport', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'preinscrire', public: pub, dossier: d }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (!x.ok) throw new Error(x.j.error || 'Envoi impossible.'); montrerRecu(x.j, d.nom.toUpperCase(), d.prenoms, d.type); })
      .catch(function (err) { b.disabled = false; b.textContent = 'Envoyer mon pré-enregistrement'; montrerErreur(err && err.message && !/Failed to fetch|NetworkError|Load failed/i.test(err.message) ? err.message : 'Pas de connexion : vérifiez votre réseau puis réessayez. Vos informations sont toujours à l’écran.'); });
  });
  $('#bPng').onclick = function () {
    var svg = $('#rQr svg'); if (!svg) return;
    var s = new XMLSerializer().serializeToString(svg), im = new Image();
    im.onload = function () {
      var c = document.createElement('canvas'); c.width = 640; c.height = 860; var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#062b1e'; x.textAlign = 'center';
      x.font = '600 22px sans-serif'; x.fillText('PASSEPORT SÛR — ACCUSÉ DE PRÉ-ENREGISTREMENT', 320, 50); x.font = '600 14px sans-serif'; x.fillText('Démonstration — données fictives', 320, 76);
      x.font = '800 34px serif'; x.fillText($('#rNum').textContent, 320, 130); x.imageSmoothingEnabled = false; x.drawImage(im, 120, 160, 400, 400);
      x.font = '300 18px sans-serif'; x.fillText('Code de contrôle', 320, 610); x.font = '800 40px sans-serif'; x.fillText($('#rCode').textContent, 320, 660);
      x.font = '600 20px sans-serif'; x.fillText($('#rNom').textContent, 320, 715); x.font = '300 16px sans-serif'; x.fillText('À présenter à l’accueil avec vos pièces originales', 320, 770);
      var a = document.createElement('a'); a.download = 'accuse-' + $('#rNum').textContent + '.png'; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
    };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.indexOf('xmlns=') < 0 ? s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"') : s);
  };
})();
