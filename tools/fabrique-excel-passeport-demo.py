#!/usr/bin/env python3
"""Classeur Excel d'exemple pour la démonstration « Suivi des demandes de passeport ».
Entrée : JSON des dossiers fictifs (exporté de la démo)  ·  Sortie : .xlsx avec formules vivantes et diagrammes.
Usage : /usr/bin/python3 tools/fabrique-excel-passeport-demo.py <dossiers.json> <sortie.xlsx>"""
import json, sys, datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import PieChart, BarChart, LineChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation

DB = json.load(open(sys.argv[1], encoding='utf-8')); OUT = sys.argv[2]
ST = [('depose', 'Demande déposée'), ('recu', 'Dossier reçu'), ('traitement', 'En traitement'), ('pret', 'Passeport prêt'), ('remis', 'Remis au demandeur')]
SN = dict(ST); TN = {'premiere': 'Première demande', 'renouvellement': 'Renouvellement'}
LIEUX = ['Makélékélé', 'Bacongo', 'Poto-Poto', 'Moungali', 'Ouenzé', 'Talangaï', 'Mfilou', 'Madibou', 'Djiri']
NUIT, OR, CREME = '06143A', 'C89B3C', 'F4F1EA'
def d(s): return dt.datetime.fromisoformat(s.replace('Z', '+00:00')).astimezone(dt.timezone(dt.timedelta(hours=1))).replace(tzinfo=None) if 'T' in s else dt.datetime.fromisoformat(s)
fin = Side(style='thin', color='D9D2BD'); cadre = Border(left=fin, right=fin, top=fin, bottom=fin)
H = Font(bold=True, color='FFFFFF', name='Calibri'); HF = PatternFill('solid', fgColor=NUIT)

wb = Workbook(); tb = wb.active; tb.title = 'Tableau de bord'; ds = wb.create_sheet('Dossiers'); sy = wb.create_sheet('Synthèse')

# ---- Dossiers ----
cols = ['N° dossier', 'Date de dépôt', 'Heure', 'Nom', 'Prénoms', 'Date de naissance', 'Sexe', 'Type de demande', 'Pièce', 'N° de pièce', 'Expiration pièce', 'Ancien passeport n°', 'Ancien expiré le', 'Ancien restitué', 'Téléphone', 'Secteur', 'État', 'Dernière mise à jour', 'Délai (jours)', 'Alerte']
ds.append(cols)
today = dt.datetime.now()
for x in sorted(DB, key=lambda z: z['createdAt']):
    p = x['person']; c = d(x['createdAt']); lm = d(x['history'][-1]['at'])
    fin_ = lm if x['status'] == 'remis' else today
    ds.append([x['id'], c.date(), c.strftime('%H:%M'), p['nom'], p['prenoms'], dt.date.fromisoformat(p['naissance']), p['sexe'], TN[x['type']], p['piece']['type'], p['piece']['numero'],
               dt.date.fromisoformat(p['piece']['expiration']) if p['piece']['expiration'] else None,
               x['ancien']['numero'] if x.get('ancien') else None, dt.date.fromisoformat(x['ancien']['expiration']) if x.get('ancien') else None,
               ('Oui' if x.get('ancienRestitue') else 'Non') if x.get('ancien') else None, p.get('tel'), x['lieu'], SN[x['status']], lm, (fin_ - c).days,
               ' | '.join(f['t'] for f in x.get('flags', [])) or None])
n = ds.max_row
for c in ds[1]: c.font = H; c.fill = HF; c.alignment = Alignment(vertical='center', wrap_text=True)
ds.row_dimensions[1].height = 32
for r in range(2, n + 1):
    for col in (2, 6, 11, 13): ds.cell(r, col).number_format = 'DD/MM/YYYY'
    ds.cell(r, 18).number_format = 'DD/MM/YYYY HH:MM'
for i, w in enumerate([18, 13, 8, 18, 20, 14, 6, 17, 11, 13, 14, 16, 14, 12, 16, 13, 20, 18, 11, 70], 1): ds.column_dimensions[chr(64 + i)].width = w
ds.freeze_panes = 'E2'
t = Table(displayName='Dossiers', ref=f'A1:T{n}'); t.tableStyleInfo = TableStyleInfo(name='TableStyleLight1', showRowStripes=True); ds.add_table(t)
for c in ds[1]: c.font = H; c.fill = HF
dv = DataValidation(type='list', formula1='"' + ','.join(v for _, v in ST) + '"', allow_blank=False); ds.add_data_validation(dv); dv.add(f'Q2:Q{n + 300}')
ds.conditional_formatting.add(f'T2:T{n}', FormulaRule(formula=['LEN($T2)>0'], fill=PatternFill('solid', bgColor='FDECE7', fgColor='FDECE7'), font=Font(color='B42318')))
ds.conditional_formatting.add(f'Q2:Q{n}', CellIsRule(operator='equal', formula=['"Remis au demandeur"'], fill=PatternFill('solid', bgColor='DFE3EA', fgColor='DFE3EA')))
ds.conditional_formatting.add(f'Q2:Q{n}', CellIsRule(operator='equal', formula=['"Passeport prêt"'], fill=PatternFill('solid', bgColor='E1F6EA', fgColor='E1F6EA')))

# ---- Synthèse (formules vivantes : elles se recalculent quand on ajoute des lignes) ----
R = 'Dossiers!$A$2:$A$2000'
def rng(col): return f'Dossiers!${col}$2:${col}$2000'
sy['A1'] = 'Synthèse (formules : se met à jour toute seule)'; sy['A1'].font = Font(bold=True, size=14, color=NUIT)
sy.append([]); sy['A3'] = 'État'; sy['B3'] = 'Nombre'; sy['C3'] = 'Part'
for i, (_, nom) in enumerate(ST):
    r = 4 + i; sy.cell(r, 1, nom); sy.cell(r, 2, f'=COUNTIF({rng("Q")},A{r})'); sy.cell(r, 3, f'=IF($B$9=0,0,B{r}/$B$9)'); sy.cell(r, 3).number_format = '0.0%'
sy['A9'] = 'TOTAL'; sy['B9'] = '=SUM(B4:B8)'; sy['A9'].font = sy['B9'].font = Font(bold=True)
sy['A12'] = 'Type \\ État';
for j, (_, nom) in enumerate(ST): sy.cell(12, 2 + j, nom)
sy.cell(12, 7, 'Total')
for i, tp in enumerate(TN.values()):
    r = 13 + i; sy.cell(r, 1, tp)
    for j in range(5): sy.cell(r, 2 + j, f'=COUNTIFS({rng("H")},$A{r},{rng("Q")},{chr(66 + j)}$12)')
    sy.cell(r, 7, f'=SUM(B{r}:F{r})')
sy['A15'] = 'Total'
for j in range(6): sy.cell(15, 2 + j, f'=SUM({chr(66 + j)}13:{chr(66 + j)}14)')
sy['A18'] = 'Secteur'; sy['B18'] = 'Demandes'; sy['C18'] = 'Remis'
for i, l in enumerate(LIEUX):
    r = 19 + i; sy.cell(r, 1, l); sy.cell(r, 2, f'=COUNTIF({rng("P")},A{r})'); sy.cell(r, 3, f'=COUNTIFS({rng("P")},A{r},{rng("Q")},"Remis au demandeur")')
sy['E18'] = 'Jour'; sy['F18'] = 'Demandes'
for k in range(30):
    r = 19 + k; sy.cell(r, 5, (today.date() - dt.timedelta(days=29 - k))); sy.cell(r, 5).number_format = 'DD/MM'; sy.cell(r, 6, f'=COUNTIF({rng("B")},E{r})')
for rr in ('A3:C3', 'A12:G12', 'A18:C18', 'E18:F18'):
    for row in sy[rr]:
        for c in row: c.font = H; c.fill = HF
sy.column_dimensions['A'].width = 24
for c in 'BCDEFG': sy.column_dimensions[c].width = 18

# ---- Tableau de bord ----
tb.sheet_view.showGridLines = False
tb['B2'] = 'SUIVI DES DEMANDES DE PASSEPORT — DÉMONSTRATION'; tb['B2'].font = Font(bold=True, size=18, color=NUIT)
tb['B3'] = 'Données fictives · STAR CRÉAT · STAR ENTREPRISE · généré le ' + today.strftime('%d/%m/%Y'); tb['B3'].font = Font(italic=True, color='66708A')
kp = [('Demandes enregistrées', f'=COUNTA({R})'), ('Dossiers reçus', f'=COUNTA({R})-COUNTIF({rng("Q")},"Demande déposée")'), ('En traitement', f'=COUNTIF({rng("Q")},"En traitement")'),
      ('Passeports prêts à retirer', f'=COUNTIF({rng("Q")},"Passeport prêt")'), ('Passeports remis', f'=COUNTIF({rng("Q")},"Remis au demandeur")'), ('Pas encore remis', f'=COUNTA({R})-COUNTIF({rng("Q")},"Remis au demandeur")'),
      ('Renouvellements', f'=COUNTIF({rng("H")},"Renouvellement")'), ('Dossiers avec alerte', f'=COUNTIF({rng("T")},"?*")'), ('Délai moyen de remise (jours)', f'=IFERROR(ROUND(AVERAGEIFS({rng("S")},{rng("Q")},"Remis au demandeur"),0),0)')]
for i, (lab, f) in enumerate(kp):
    c0 = 2 + (i % 3) * 4; r0 = 5 + (i // 3) * 4
    tb.merge_cells(start_row=r0, start_column=c0, end_row=r0, end_column=c0 + 2); tb.merge_cells(start_row=r0 + 1, start_column=c0, end_row=r0 + 1, end_column=c0 + 2)
    a = tb.cell(r0, c0, f); a.font = Font(bold=True, size=24, color=NUIT if i != 7 else 'B42318'); a.alignment = Alignment(horizontal='center'); a.fill = PatternFill('solid', fgColor='FFFFFF')
    b = tb.cell(r0 + 1, c0, lab); b.font = Font(size=10, color='66708A'); b.alignment = Alignment(horizontal='center')
    for rr in (r0, r0 + 1):
        for cc in range(c0, c0 + 3): tb.cell(rr, cc).fill = PatternFill('solid', fgColor='FFFFFF'); tb.cell(rr, cc).border = Border(top=Side(style='medium', color=OR)) if rr == r0 else Border()
    tb.row_dimensions[r0].height = 36
for c in range(1, 14): tb.column_dimensions[chr(64 + c)].width = 11
tb.column_dimensions['A'].width = 3

def graph(ch, titre, w=15.5, h=8.2): ch.title = titre; ch.width = w; ch.height = h; return ch
p = graph(PieChart(), 'Répartition par état'); p.add_data(Reference(sy, min_col=2, min_row=3, max_row=8), titles_from_data=True); p.set_categories(Reference(sy, min_col=1, min_row=4, max_row=8))
p.dataLabels = DataLabelList(); p.dataLabels.showPercent = True; p.dataLabels.showVal = False; p.dataLabels.showCatName = False; p.dataLabels.showSerName = False; p.dataLabels.showLegendKey = False; tb.add_chart(p, 'B18')
b = graph(BarChart(), 'Première demande / renouvellement par état'); b.type = 'col'; b.grouping = 'stacked'; b.overlap = 100
b.add_data(Reference(sy, min_col=1, max_col=6, min_row=13, max_row=14), from_rows=True, titles_from_data=True); b.set_categories(Reference(sy, min_col=2, max_col=6, min_row=12)); tb.add_chart(b, 'H18')
l = graph(LineChart(), 'Demandes par jour (30 derniers jours)'); l.add_data(Reference(sy, min_col=6, min_row=18, max_row=48), titles_from_data=True); l.set_categories(Reference(sy, min_col=5, min_row=19, max_row=48)); l.legend = None; tb.add_chart(l, 'B35')
s = graph(BarChart(), 'Demandes et passeports remis par secteur'); s.type = 'bar'; s.add_data(Reference(sy, min_col=2, max_col=3, min_row=18, max_row=27), titles_from_data=True); s.set_categories(Reference(sy, min_col=1, min_row=19, max_row=27)); tb.add_chart(s, 'H35')
tb['B52'] = 'Ce classeur est vivant : ajoutez des lignes dans l\'onglet « Dossiers », les chiffres et les graphiques se mettent à jour. La démonstration en ligne produit le même fichier.'; tb['B52'].font = Font(italic=True, color='66708A')
wb.move_sheet('Dossiers', offset=0); wb.active = 0
wb.save(OUT); print('OK', OUT, n - 1, 'dossiers')
