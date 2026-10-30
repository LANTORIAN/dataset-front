# passation-renderer-v1
"""Build standalone handover documents from local, authored dossier.json files.

Local repository: python -B docs/passation/generer_passation.py [--check]
Portfolio: python -B docs/passation/generer_passation.py --all [--check]
Only explicitly named generated files in existing docs/passation directories
are written. No application configuration, secret, database or provider is read.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import textwrap
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote


MARKER = "passation-generated-v1"
LABELS = ("Entrées et identité", "Application et traitements", "État et persistance", "Systèmes externes")
TABLES = (
    ("stack", "Stack et rôle des technologies", ["Couche", "Version / référence", "Rôle concret", "Source"]),
    ("data", "Données, portée et cycle de vie", ["Objet / stockage", "Source de vérité et contenu", "Portée / lifecycle", "Point de contrôle"]),
    ("contracts", "Contrats et interfaces", ["Interface", "Entrée et identité", "Sortie / effet", "Vérification et source"]),
    ("configuration", "Configuration et prérequis", ["Paramètre / dépendance", "Utilité et chargement", "Effet d'un mauvais réglage", "Contrôle de reprise"]),
    ("failures", "Diagnostic et reprise sur erreur", ["Symptôme", "Étape et hypothèses", "Contrôle discriminant", "Reprise et preuve attendue"]),
    ("delivered", "Ce qui est présent et niveau de preuve", ["Capacité", "Preuve disponible", "Limite de la preuve", "Recette à conserver"]),
    ("backlog", "Travaux restants et critères d'acceptation", ["Priorité", "Constat et source", "Intervention recommandée", "Critère d'acceptation"]),
)
TITLES = {
    "mission": "Mission, périmètre et lecture", "schema": "Carte des composants",
    "components": "Responsabilités et localisation du code", "exchanges": "Échanges et frontières",
    "flows": "Déroulement des parcours", "operations": "Démarrage et exploitation",
    "verification": "Vérification fonctionnelle", "history": "Interventions et chronologie",
    "strengths": "Points forts et raisons des choix", "ai_guide": "Guide de travail pour l'assistant IA",
    "evidence": "Sources et documents complémentaires", "maintenance": "Maintenir cette passation",
}
SECTION_ORDER = ("mission", "stack", "schema", "components", "exchanges", "flows", "data", "contracts",
                 "configuration", "operations", "failures", "verification", "history", "delivered",
                 "strengths", "backlog", "ai_guide", "evidence", "maintenance")


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def link(path: str, label: str | None = None) -> str:
    return f'<a href="{esc(quote("../../" + path, safe="/._-"))}">{esc(label or path)}</a>'


def ul(values: list[str], ordered: bool = False) -> str:
    tag = "ol" if ordered else "ul"
    return f"<{tag}>" + "".join(f"<li>{esc(item)}</li>" for item in values) + f"</{tag}>"


def table(headers: list[str], rows: list[list[str]]) -> str:
    head = "".join(f'<th scope="col">{esc(item)}</th>' for item in headers)
    body = "".join("<tr>" + "".join(f"<td>{esc(cell)}</td>" for cell in row) + "</tr>" for row in rows)
    return f'<div class="table-scroll" tabindex="0" role="region" aria-label="{esc(headers[0])}"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def md_table(headers: list[str], rows: list[list[str]]) -> str:
    def cell(value: object) -> str:
        return str(value).replace("|", "\\|").replace("\n", "<br>")
    matrix = [list(map(cell, headers)), *[list(map(cell, row)) for row in rows]]
    widths = [max(3, max(len(row[index]) for row in matrix)) for index in range(len(headers))]
    def line(row: list[str]) -> str:
        return "| " + " | ".join(value.ljust(width) for value, width in zip(row, widths)) + " |"
    separator = "| " + " | ".join("-" * width for width in widths) + " |"
    return "\n".join([line(matrix[0]), separator, *[line(row) for row in matrix[1:]]])


def git_history(directory: Path, data: dict, refresh: bool) -> dict:
    cache = directory / "historique-git.json"
    if cache.is_file() and not refresh:
        return json.loads(cache.read_text(encoding="utf-8"))
    revision = data.get("reference", {}).get("head")
    result = {"schema_version": "passation.git.v1", "revision": revision, "author_filter": "ylan (case-insensitive)",
              "scope": "ancestors of the recorded revision, not every unrelated branch", "commits": []}
    if not revision:
        result["note"] = "Pas d'historique Git attribuable à cette racine ; utiliser la chronologie documentaire sourcée."
        return result
    command = ["git", "-C", str(directory.parent.parent), "log", revision, "--reverse", "--regexp-ignore-case",
               "--author=ylan", "--format=%H%x1f%aI%x1f%an%x1f%s%x1e"]
    process = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60, check=False)
    if process.returncode:
        raise ValueError(f"Historique indisponible pour {data['id']} à {revision}; fournir le snapshot local existant")
    for record in process.stdout.split("\x1e"):
        record = record.strip()
        if not record:
            continue
        sha, date, author, subject = record.split("\x1f", 3)
        result["commits"].append({"hash": sha, "date": date, "author": author, "subject": subject})
    return result


def validate(directory: Path, data: dict) -> None:
    required = ("id", "title", "mission", "scope", "nodes", "edges", "flows", "operations", "verification",
                "history", "strengths", "ai_guide", "evidence") + tuple(section[0] for section in TABLES)
    missing = [key for key in required if not data.get(key)]
    if missing:
        raise ValueError(f"{directory}: sections absentes {missing}")
    node_ids = [item["id"] for item in data["nodes"]]
    if len(set(node_ids)) != len(node_ids):
        raise ValueError(f"{data['id']}: identifiants de composants dupliqués")
    for node in data["nodes"]:
        if not re.fullmatch(r"[a-z][a-z0-9-]*", node["id"]) or node["lane"] not in range(4):
            raise ValueError(f"{data['id']}: composant invalide {node['id']}")
        for key in ("role", "inputs", "outputs", "failure", "sources"):
            if not node.get(key):
                raise ValueError(f"{data['id']}: composant {node['id']} sans {key}")
    for edge in data["edges"]:
        if edge["from"] not in node_ids or edge["to"] not in node_ids:
            raise ValueError(f"{data['id']}: extrémité d'échange absente")
    for flow in data["flows"]:
        if len(flow["steps"]) < 3 or not flow.get("success") or not flow.get("replay"):
            raise ValueError(f"{data['id']}: parcours insuffisamment décrit")
    for key, _, headers in TABLES:
        if any(len(row) != len(headers) for row in data[key]):
            raise ValueError(f"{data['id']}: colonnes incorrectes dans {key}")
    root = directory.parent.parent.resolve()
    references = {reference["path"] for reference in data["evidence"]}
    references.update(source for node in data["nodes"] for source in node["sources"])
    for reference in sorted(references):
        target = (root / reference).resolve()
        if not target.is_relative_to(root) or not target.exists():
            raise ValueError(f"{data['id']}: source absente/hors dépôt {reference}")


def diagram(data: dict) -> str:
    groups: dict[int, list[dict]] = defaultdict(list)
    for node in data["nodes"]:
        groups[node["lane"]].append(node)
    height = 94 + max(map(len, groups.values())) * 150
    positions = {}
    markup = [f'<svg class="architecture-svg" viewBox="0 0 1240 {height}" width="1240" height="{height}" role="img" aria-labelledby="diagram-title diagram-description">',
              f'<title id="diagram-title">Architecture de {esc(data["title"])}</title>',
              '<desc id="diagram-description">Composants répartis par responsabilité. Chaque flèche numérotée correspond à une ligne de la table des échanges. Les composants renvoient à leurs explications.</desc>',
              '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="none" stroke="currentColor" stroke-width="1.2"/></marker></defs>']
    for lane in range(4):
        x = 18 + lane * 306
        markup.append(f'<rect class="lane" x="{x}" y="12" width="292" height="{height-24}" rx="8"/><text class="lane-title" x="{x+16}" y="40">{esc(LABELS[lane])}</text>')
        if not groups[lane]:
            markup.append(f'<text class="node-detail" x="{x+16}" y="84">Aucun composant actif établi ici.</text>')
        for index, node in enumerate(groups[lane]):
            positions[node["id"]] = (x + 18, 72 + index * 150, 256, 106)
    for index, edge in enumerate(data["edges"], 1):
        if edge.get("draw", True) is False:
            continue
        ax, ay, aw, ah = positions[edge["from"]]
        bx, by, bw, bh = positions[edge["to"]]
        if ax == bx:
            sx, sy, tx, ty = ax + aw, ay + ah / 2, bx + bw, by + bh / 2
            gutter = min(1220, sx + 12 + (index % 3) * 5)
            path = f"M{sx} {sy} H{gutter} V{ty} H{tx}"
            label_x, label_y = gutter + 5, (sy + ty) / 2 - 7
        else:
            direction = 1 if ax < bx else -1
            sx = ax + aw if direction == 1 else ax
            tx = bx if direction == 1 else bx + bw
            sy, ty = ay + ah / 2, by + bh / 2
            if abs(ax - bx) == 306:
                gutter = (sx + tx) / 2 + ((index % 3) - 1) * 6
                path = f"M{sx} {sy} H{gutter} V{ty} H{tx}"
                label_x, label_y = gutter + 4, (sy + ty) / 2 - 7
            else:
                source_gutter, target_gutter = sx + direction * 12, tx - direction * 12
                corridor = ay + ah + 26 + (index % 2) * 8
                path = f"M{sx} {sy} H{source_gutter} V{corridor} H{target_gutter} V{ty} H{tx}"
                label_x, label_y = (source_gutter + target_gutter) / 2, corridor - 7
        mode = edge.get("mode", "sync")
        markup.append(f'<g class="connection {esc(mode)}" data-from="{edge["from"]}" data-to="{edge["to"]}"><path d="{path}" marker-end="url(#arrow)"/><title>{index:02d} — {esc(edge["label"])}</title><text x="{label_x}" y="{label_y}">{index:02d}</text></g>')
    for node in data["nodes"]:
        x, y, width, node_height = positions[node["id"]]
        markup.append(f'<a href="#component-{node["id"]}" class="diagram-node"><rect class="node lane-{node["lane"]}" x="{x}" y="{y}" width="{width}" height="{node_height}" rx="8"/>')
        for line_index, line in enumerate(textwrap.wrap(node["name"], width=27)[:2]):
            markup.append(f'<text class="node-title" x="{x+14}" y="{y+25+line_index*20}">{esc(line)}</text>')
        short = node.get("short", node["role"])
        for line_index, line in enumerate(textwrap.wrap(short, width=34)[:2]):
            markup.append(f'<text class="node-detail" x="{x+14}" y="{y+69+line_index*17}">{esc(line)}</text>')
        markup.append('</a>')
    markup.append('</svg>')
    return "".join(markup)


CSS = r"""
:root{color-scheme:light;--paper:#f4f6fa;--surface:#fff;--ink:#172334;--muted:#4a5b70;--line:#d7dee8;--accent:#1a47a0;--soft:#eaf0fc;--amber:#855000;--green:#21633d;--mono:ui-monospace,SFMono-Regular,Consolas,monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}::selection{background:#cbdcff;color:#11264c}a{color:var(--accent);text-underline-offset:3px}a:hover{text-decoration-thickness:2px}a:focus-visible,button:focus-visible,summary:focus-visible,[tabindex]:focus-visible{outline:3px solid #a06300;outline-offset:4px}button{font:inherit;cursor:pointer;border:1px solid var(--line);border-radius:5px;padding:6px 12px;background:#fff;color:var(--ink)}button:hover{background:var(--soft)}button:disabled{opacity:.5;cursor:default}code,pre{font-family:var(--mono);font-size:.88em}code{overflow-wrap:anywhere}pre{background:#edf1f7;padding:18px;overflow:auto;line-height:1.6;border-radius:6px}p{max-width:76ch;margin:0 0 1em}h1,h2,h3,h4{line-height:1.22;letter-spacing:-.022em;text-wrap:balance}h1{font-size:2.6rem;margin:14px 0 18px;max-width:25ch}h2{font-size:1.7rem;margin:0 0 24px}h3{font-size:1.16rem;margin:30px 0 12px}h4{font-size:1rem;margin:20px 0 8px}ul,ol{padding-left:1.4em;max-width:90ch}li{margin:7px 0}strong{font-weight:650}.layout{display:grid;grid-template-columns:258px minmax(0,1fr);max-width:1650px;margin:0 auto;min-height:100vh}.sidebar{position:sticky;top:0;height:100vh;overflow-y:auto;border-right:1px solid var(--line);padding:32px 23px;background:#edf1f7;scrollbar-color:#8192aa #edf1f7;scrollbar-width:thin}.sidebar .project{font-weight:700;font-size:1.05rem;line-height:1.4;display:block;margin-bottom:8px}.sidebar .purpose{font-size:.85rem;color:var(--muted);margin-bottom:22px}.sidebar nav a{display:block;padding:7px 9px;margin:2px 0;text-decoration:none;font-size:.87rem;line-height:1.4;border-radius:4px;color:#304661}.sidebar nav a:hover,.sidebar nav a[aria-current]{background:#dbe6fa;color:#123f93}.sidebar .back{margin-top:25px;font-size:.87rem;display:block}.main{min-width:0;padding:46px 44px 70px;background:var(--surface)}header{padding-bottom:36px;border-bottom:1px solid var(--line)}.breadcrumbs{font-size:.9rem;color:var(--muted);margin:0}.meta{display:flex;flex-wrap:wrap;gap:9px 24px;color:var(--muted);font-size:.88rem;margin-top:20px;font-variant-numeric:tabular-nums}.intro{font-size:1.1rem;color:#34475f;max-width:74ch}.document-links{display:flex;flex-wrap:wrap;gap:12px 24px;margin-top:22px}section{padding-top:50px;margin-top:34px;border-top:1px solid var(--line)}section:first-of-type{border-top:0;margin-top:0}.note{background:#f1f5fc;padding:18px 22px;margin:24px 0;color:#283f60;border:1px solid #ccd8ed;border-radius:6px}.note.warning{background:#fff7e9;border-color:#e4c999;color:#654100}.table-scroll{width:100%;overflow-x:auto;margin:20px 0 28px;scrollbar-color:#8192aa #edf1f7;scrollbar-width:thin}table{border-collapse:collapse;width:100%;font-size:.9rem;line-height:1.6;text-align:left}th,td{padding:14px 15px;border-bottom:1px solid var(--line);vertical-align:top;min-width:150px;overflow-wrap:anywhere}th{background:#edf2fa;color:#243b5c;font-size:.84rem;font-weight:650}td:first-child{font-weight:600}tbody tr:hover{background:#f7f9fd}.diagram-toolbar{display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin-bottom:15px}.diagram-toolbar span{font-size:.87rem;color:var(--muted);margin-right:auto}.diagram-scroll{overflow-x:auto;width:100%;border:1px solid var(--line);border-radius:8px;background:#f9fbfe;scrollbar-color:#8192aa #edf1f7}.architecture-svg{display:block;width:1240px;max-width:none;height:auto}.lane{fill:#edf2f9}.lane-title{fill:#34475f;font-size:14px;font-weight:650}.node{fill:white;stroke:#b7c5d9;stroke-width:1.2}.node.lane-1{fill:#eaf0fc;stroke:#6184bc}.node.lane-3{fill:#f8f4eb;stroke:#baa77b}.node-title{font-size:15px;font-weight:650;fill:#152d50}.node-detail{font-size:12px;fill:#455a73}.diagram-node:hover .node,.diagram-node:focus .node{stroke:#174ba4;stroke-width:2.5}.connection{color:#6b7e96}.connection path{fill:none;stroke:currentColor;stroke-width:1.25}.connection text{font:600 12px var(--mono);fill:#294669;paint-order:stroke;stroke:#f9fbfe;stroke-width:5px;stroke-linejoin:round}.connection.async path{stroke-dasharray:7 4}.connection.storage path{stroke-dasharray:2 4}.legend{display:flex;flex-wrap:wrap;gap:10px 25px;padding:14px 0;font-size:.85rem;color:var(--muted)}.legend span{display:flex;align-items:center;gap:8px}.legend i{display:inline-block;width:32px;border-top:2px solid #6b7e96}.legend .async{border-top-style:dashed}.legend .storage{border-top-style:dotted}.component{padding:8px 0 26px;border-bottom:1px solid var(--line);scroll-margin-top:30px}.component .sources{font-size:.87rem;line-height:1.8;color:var(--muted)}dl{display:grid;grid-template-columns:140px minmax(0,1fr);gap:10px 18px;max-width:100ch}dt{font-weight:650;font-size:.9rem}dd{margin:0;min-width:0;overflow-wrap:anywhere}.flow{padding:8px 0 24px;margin:12px 0 28px;border-bottom:1px solid var(--line)}.flow ol{max-width:none}.flow li{padding:8px 0}.flow .step-title{display:block;font-weight:650}.proof{font-size:.9rem;color:var(--muted)}.operation{padding:8px 0 22px}.operation p{font-size:.95rem}.source-list li{margin:13px 0}.source-list code{font-size:.85em}details{border:1px solid var(--line);border-radius:6px;margin:24px 0}summary{padding:15px 18px;cursor:pointer;font-weight:650}details .table-scroll{margin:0}footer{margin-top:55px;padding-top:24px;border-top:1px solid var(--line);font-size:.88rem;color:var(--muted)}.skip{position:fixed;top:6px;left:6px;background:#fff;padding:10px;z-index:10;transform:translateY(-180%)}.skip:focus{transform:translateY(0)}.print-control{margin-top:20px}.screen-note{font-size:.87rem;color:var(--muted)}
@media(min-width:1500px){.main{padding-left:58px;padding-right:58px}}
@media(max-width:1000px){.layout{grid-template-columns:215px minmax(0,1fr)}.main{padding:30px 26px}.sidebar{padding:26px 15px}h1{font-size:2.2rem}}
@media(max-width:760px){.layout{display:block}.sidebar{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line);padding:22px}.sidebar nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px 8px}.sidebar .project{max-width:33ch}.sidebar .purpose{margin-bottom:12px}.sidebar .back{margin-top:14px}.main{padding:28px 20px 45px}h1{font-size:2rem}h2{font-size:1.5rem}section{padding-top:34px;margin-top:24px}.intro{font-size:1rem}dl{grid-template-columns:1fr;gap:4px}dd{margin-bottom:12px}.table-scroll table{min-width:720px}.note{padding:15px}.document-links{gap:10px 17px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{@page{size:A4 landscape;margin:15mm}.layout{display:block;max-width:none}.sidebar,.diagram-toolbar,.print-control,.skip{display:none}.main{padding:0}.diagram-scroll,.table-scroll{overflow:visible;border:0}.architecture-svg{width:100%!important;min-width:0}table{font-size:9pt;min-width:0!important}th,td{min-width:0;padding:7px}body{font-size:10pt;background:white}h1{font-size:24pt}section{break-before:auto}h2,h3{break-after:avoid}tr,.component{break-inside:avoid}a{color:inherit}details{display:block}details>summary{list-style:none}details>*{display:block!important}}
"""

CSS += r"""
.toc{border:0;margin:0}.toc>summary{display:none}.breadcrumbs{margin-bottom:22px}.breadcrumbs a{color:var(--muted)}
.main,.sidebar{overflow-wrap:anywhere}
@media(max-width:760px){.sidebar{display:flex;align-items:center;flex-wrap:wrap;gap:8px 20px;padding:12px 20px}.sidebar .project,.sidebar .purpose,.sidebar .print-control{display:none}.sidebar .toc{flex:1;min-width:0}.sidebar .toc[open]{flex-basis:100%}.toc>summary{display:list-item;padding:8px 0;cursor:pointer}.sidebar .back{margin:0}.sidebar nav{margin-bottom:10px}}
"""

SCRIPT = r"""
(()=>{
  const svg=document.querySelector('.architecture-svg');
  const frame=document.querySelector('.diagram-scroll');
  const status=document.querySelector('#zoom-status');
  let baseline=1240,width=1240;
  const change=(factor)=>{
    width=Math.max(baseline/2,Math.min(baseline*2,Math.round(width*factor)));
    svg.style.width=width+'px';status.textContent=Math.round(width/baseline*100)+' %';
    document.querySelector('#zoom-in').disabled=width>=baseline*2;
    document.querySelector('#zoom-out').disabled=width<=baseline/2;
  };
  const fit=()=>{baseline=frame.clientWidth>=1040?Math.min(1240,frame.clientWidth):1240;width=baseline;change(1)};
  fit();window.addEventListener('resize',fit);
  document.querySelector('#zoom-in').addEventListener('click',()=>change(1.2));
  document.querySelector('#zoom-out').addEventListener('click',()=>change(1/1.2));
  document.querySelector('#zoom-reset').addEventListener('click',()=>{width=baseline;change(1)});
  document.querySelector('#print-document').addEventListener('click',()=>window.print());
  if('IntersectionObserver'in window){
    const links=[...document.querySelectorAll('.sidebar nav a')];
    const observer=new IntersectionObserver((entries)=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if(!visible.length)return;
      links.forEach(a=>{if(a.hash==='#'+visible[0].target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
    },{rootMargin:'-10% 0px -65% 0px'});
    document.querySelectorAll('main section').forEach(s=>observer.observe(s));
  }
})();
"""


SCRIPT += r"""
(()=>{const toc=document.querySelector('.toc');const media=window.matchMedia('(max-width:760px)');const adapt=()=>{toc.open=!media.matches};adapt();media.addEventListener('change',adapt)})();
"""


def render(directory: Path, data: dict, history: dict) -> tuple[str, str, str]:
    fingerprint = hashlib.sha256(json.dumps(data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    revision = data.get("reference", {})
    titles = {**TITLES, **{key: title for key, title, _ in TABLES}}
    sections = {}
    markdown = [f"# Passation détaillée — {data['title']}", f"\n<!-- {MARKER}; source=dossier.json; sha256={fingerprint} -->\n",
                "[Schéma HTML et lecture navigable](architecture.html) · [Index local](README.md) · [Historique Git complet](HISTORIQUE_GIT.md)\n",
                f"État documentaire : {data.get('observed_on', '2026-10-29')}. Référence : branche `{revision.get('branch') or 'sans Git établi'}`, commit `{revision.get('head') or 'non applicable'}`.\n",
                "## Sommaire\n\n" + "\n".join(f"- {titles[key]}" for key in SECTION_ORDER)]

    def add(key: str, content: str, md: str) -> None:
        sections[key] = f'<section id="{key}"><h2>{esc(titles[key])}</h2>{content}</section>'
        markdown.append(f"\n## {titles[key]}\n\n{md}\n")

    scope = "<h3>Frontière du dépôt</h3>" + ul(data["scope"])
    proof = ("Un fichier ou un commit prouve une implémentation/modification, pas un déploiement. Les validations historiques restent datées ; "
             "les contrôles de reprise proposés ne sont pas déclarés exécutés. Les systèmes externes du schéma sont des dépendances à obtenir, pas du code contenu dans ce dépôt.")
    add("mission", "".join(f"<p>{esc(p)}</p>" for p in data["mission"]) + scope + f'<aside class="note">{proof}</aside>',
        "\n\n".join(data["mission"]) + "\n\n### Frontière du dépôt\n\n" + "\n".join("- " + item for item in data["scope"]) + "\n\n" + proof)
    for key, _, headers in TABLES:
        add(key, table(headers, data[key]), md_table(headers, data[key]))

    toolbar = '<div class="diagram-toolbar"><span>Cliquer sur un composant pour lire sa responsabilité.</span><button id="zoom-out" aria-label="Réduire le schéma">−</button><button id="zoom-in" aria-label="Agrandir le schéma">+</button><button id="zoom-reset">Taille initiale</button><output id="zoom-status" aria-live="polite">100 %</output></div>'
    legend = '<div class="legend" aria-label="Légende des échanges"><span><i></i>Appel synchrone / transport</span><span><i class="async"></i>Traitement asynchrone / événement</span><span><i class="storage"></i>Lecture / écriture persistée</span></div>'
    add("schema", f'<p>{esc(data.get("diagram_note", "Le schéma distingue entrée, exécution, état et dépendances externes. Les numéros des flèches sont détaillés dans les échanges ci-dessous."))}</p>' + toolbar + '<div class="diagram-scroll" tabindex="0" role="region" aria-label="Schéma d’architecture défilant">' + diagram(data) + '</div>' + legend,
        "Ouvrir [architecture.html](architecture.html) pour le schéma SVG annoté et son zoom. Les responsabilités et échanges sont aussi décrits intégralement ci-dessous.")

    nodes_html, nodes_md = [], []
    for node in data["nodes"]:
        sources = " · ".join(link(path) for path in node["sources"])
        nodes_html.append(f'<article class="component" id="component-{node["id"]}"><h3>{esc(node["name"])}</h3><p>{esc(node["role"])}</p><dl><dt>Entrées</dt><dd>{esc(node["inputs"])}</dd><dt>Sorties et effets</dt><dd>{esc(node["outputs"])}</dd><dt>Erreur / frontière</dt><dd>{esc(node["failure"])}</dd></dl><p class="sources">Code / référence : {sources}</p></article>')
        nodes_md.append(f"### {node['name']}\n\n{node['role']}\n\n- **Entrées :** {node['inputs']}\n- **Sorties / effets :** {node['outputs']}\n- **Erreur / frontière :** {node['failure']}\n- **Sources :** " + ", ".join(f"[{p}](../../{quote(p, safe='/._-')})" for p in node["sources"]))
    add("components", "".join(nodes_html), "\n\n".join(nodes_md))
    edge_rows = [[f"{i:02d} — {e['from']} → {e['to']}", e["label"], e.get("mode", "sync"), e["detail"]] for i, e in enumerate(data["edges"], 1)]
    add("exchanges", table(["Relation", "Déclenchement / contenu", "Mode", "Contrat et frontière"], edge_rows), md_table(["Relation", "Déclenchement / contenu", "Mode", "Contrat et frontière"], edge_rows))

    flows_html, flows_md = [], []
    for flow in data["flows"]:
        steps_html = "".join(f'<li><span class="step-title">{esc(row[0])}</span>{esc(row[1])}<p class="proof">Résultat / contrôle : {esc(row[2])}</p></li>' for row in flow["steps"])
        flows_html.append(f'<article class="flow"><h3>{esc(flow["title"])}</h3><p><strong>Déclencheur :</strong> {esc(flow["trigger"])}</p><ol>{steps_html}</ol><p><strong>Succès métier :</strong> {esc(flow["success"])}</p><p><strong>Rejeu / incident :</strong> {esc(flow["replay"])}</p></article>')
        flows_md.append(f"### {flow['title']}\n\n**Déclencheur :** {flow['trigger']}\n\n" + "\n".join(f"{i}. **{row[0]}** — {row[1]} Résultat / contrôle : {row[2]}" for i, row in enumerate(flow["steps"], 1)) + f"\n\n**Succès métier :** {flow['success']}\n\n**Rejeu / incident :** {flow['replay']}")
    add("flows", "".join(flows_html), "\n\n".join(flows_md))

    operations_html, operations_md = [], []
    for operation in data["operations"]:
        commands = "\n".join(operation.get("commands", []))
        operations_html.append(f'<article class="operation"><h3>{esc(operation["title"])}</h3><p><strong>Préconditions :</strong> {esc(operation["requires"])}</p>' + (f'<pre><code>{esc(commands)}</code></pre>' if commands else '') + f'<p><strong>Attendu :</strong> {esc(operation["expected"])}</p><p class="proof"><strong>Effets et limites :</strong> {esc(operation["effects"])}</p></article>')
        operations_md.append(f"### {operation['title']}\n\n**Préconditions :** {operation['requires']}\n\n" + (f"```text\n{commands}\n```\n\n" if commands else "") + f"**Attendu :** {operation['expected']}\n\n**Effets et limites :** {operation['effects']}")
    add("operations", "".join(operations_html), "\n\n".join(operations_md))
    add("verification", ul(data["verification"], ordered=True), "\n".join(f"{i}. {item}" for i, item in enumerate(data["verification"], 1)))

    history_rows = [[h["date"], h.get("commit", "document / local"), h["actor"], h["change"], h["proof"]] for h in data["history"]]
    commits = history["commits"]
    history_text = (f"L'annexe recense {len(commits)} commits signés par Ylan/YlanDecode dans les ancêtres du commit de référence. "
                    "Elle est exhaustive pour ce filtre et cette révision, pas pour les autres auteurs ni les branches non intégrées. Les merges sont des intégrations collectives, pas une attribution exclusive du code.")
    full_rows = [[item["date"][:10], item["hash"][:10], item["author"], item["subject"]] for item in commits]
    history_html = f'<p>{esc(history_text)}</p>' + table(["Date", "Référence", "Auteur / statut", "Intervention", "Portée de la preuve"], history_rows)
    if commits:
        history_html += f'<details><summary>Historique Git complet — {len(commits)} commits</summary>{table(["Date", "Commit", "Auteur", "Message"], full_rows)}</details>'
    else:
        history_html += '<p class="note warning">Aucun historique personnel Git établi dans ce périmètre. La chronologie documentaire est conservée sans date personnelle supposée.</p>'
    history_html += '<p><a href="HISTORIQUE_GIT.md">Lire l’annexe historique complète en Markdown</a></p>'
    add("history", history_html, history_text + "\n\n" + md_table(["Date", "Référence", "Auteur / statut", "Intervention", "Portée de la preuve"], history_rows) + "\n\n[Annexe Git complète](HISTORIQUE_GIT.md).")
    add("strengths", ul(data["strengths"]), "\n".join("- " + item for item in data["strengths"]))
    add("ai_guide", ul(data["ai_guide"], ordered=True), "\n".join(f"{i}. {item}" for i, item in enumerate(data["ai_guide"], 1)))

    evidence_html = '<ul class="source-list">' + "".join(f'<li>{link(item["path"])} — {esc(item["proves"])}</li>' for item in data["evidence"]) + '</ul>'
    evidence_md = "\n".join(f"- [{item['path']}](../../{quote(item['path'], safe='/._-')}) — {item['proves']}" for item in data["evidence"])
    local_docs = sorted({p for p in directory.glob("*.md") if p.name not in {"PASSATION_DETAILLEE.md", "HISTORIQUE_GIT.md"}} | {directory / "DESIGN.md"})
    evidence_html += '<h3>Synthèses locales complémentaires</h3><ul>' + "".join(f'<li><a href="{quote(p.name)}">{esc(p.name)}</a></li>' for p in local_docs) + '</ul>'
    evidence_md += "\n\n### Synthèses locales\n\n" + "\n".join(f"- [{p.name}]({quote(p.name)})" for p in local_docs)
    add("evidence", evidence_html, evidence_md)
    maintenance = ("Modifier dossier.json pour faire évoluer le fond de cette passation, puis générer les fichiers dérivés avec l'outil local et Python 3.10 ou plus récent. "
                   "Actualiser les références et les preuves lorsqu'un contrat change. Le snapshot historique est figé à la révision annoncée ; "
                   "--refresh-history le reconstruit depuis cette révision. --check contrôle sans écriture. Aucune clé ni donnée métier privée n'est nécessaire au rendu.")
    add("maintenance", f'<p>{esc(maintenance)}</p><pre><code>python -B docs/passation/generer_passation.py\npython -B docs/passation/generer_passation.py --check</code></pre>', maintenance + "\n\n```text\npython -B docs/passation/generer_passation.py\npython -B docs/passation/generer_passation.py --check\n```")
    nav = "".join(f'<a href="#{key}">{esc(titles[key])}</a>' for key in SECTION_ORDER)
    intro = data["mission"][0]
    contract_comment = "THESIS: Comprendre les responsabilités et les flux réels avant de modifier le dépôt. OWN-WORLD: Papier neutre, encre sombre, bleu de structure; typographie système pour lecture technique. STORY: Lire le schéma, suivre une séquence, retrouver le code et la preuve. FIRST VIEWPORT: Navigation du dossier, identité et début de la carte de lecture; contenu sans chargement réseau. FORM: Extension de la documentation locale, mode Read, sans dépendance distante."
    document = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="{esc('Passation technique détaillée et architecture de ' + data['title'])}"><title>{esc(data['title'])} — Architecture et passation</title><meta name="passation-source-sha256" content="{fingerprint}"><style>{CSS}</style></head>
<body><!-- {MARKER}; {contract_comment} -->
<a class="skip" href="#content">Aller au dossier</a><div class="layout"><aside class="sidebar"><span class="project">{esc(data['title'])}</span><p class="purpose">Architecture expliquée et guide de reprise</p><details class="toc" open><summary>Sommaire du dossier</summary><nav aria-label="Sommaire du dossier">{nav}</nav></details><a class="back" href="README.md">Index local de passation</a><button class="print-control" id="print-document">Imprimer le dossier</button></aside>
<main class="main" id="content"><header><nav class="breadcrumbs" aria-label="Fil d’Ariane"><a href="README.md">Passation locale</a> / Dossier détaillé</nav><h1>{esc(data['title'])}</h1><p class="intro">{esc(intro)}</p><div class="meta"><span>État : {esc(data.get('observed_on','2026-10-29'))}</span><span>Branche : <code>{esc(revision.get('branch') or 'sans Git établi')}</code></span><span>Référence : <code>{esc(revision.get('head') or 'documentaire')}</code></span></div><div class="document-links"><a href="#schema">Voir le schéma</a><a href="PASSATION_DETAILLEE.md">Dossier Markdown</a><a href="HISTORIQUE_GIT.md">Historique complet</a></div></header>{''.join(sections[key] for key in SECTION_ORDER)}<footer>Document autonome, rendu depuis les <a href="dossier.json">données documentaires locales</a>. Les chemins sources sont relatifs à ce dépôt. Les statuts de validation sont des preuves datées, pas une garantie de déploiement courant.</footer></main></div><script>{SCRIPT}</script></body></html>'''
    history_md = (f"# Historique Git — {data['title']}\n\n<!-- {MARKER} -->\n\n[Retour au dossier détaillé](PASSATION_DETAILLEE.md) · [Schéma HTML](architecture.html)\n\n" + history_text +
                  f"\n\nRévision de référence : `{history.get('revision') or 'sans Git établi'}`. Filtre auteur : `ylan`, insensible à la casse.\n\n" +
                  (md_table(["Date", "Commit", "Auteur", "Message"], full_rows) if commits else history.get("note", "Chronologie documentaire dans le dossier détaillé.")) +
                  "\n\n## Interprétation\n\nUne ligne décrit un commit de l'historique retenu. Elle ne prouve ni recette, ni livraison, ni attribution exclusive des fichiers d'une PR. Pour analyser le contenu, utiliser `git show <commit>` dans ce dépôt et confronter le diff aux contrats actuels. Les changements locaux non commités ne figurent pas dans cette annexe.\n")
    return "\n\n".join(block.strip() for block in markdown).rstrip() + "\n", document + "\n", history_md


def write_generated(path: Path, text: str, check: bool) -> bool:
    current = path.read_text(encoding="utf-8") if path.is_file() else None
    if current == text:
        return False
    if check:
        raise ValueError(f"Fichier dérivé absent ou périmé : {path}")
    if current is not None and MARKER not in current and "passation-renderer-v1" not in current:
        raise ValueError(f"Refus d'écraser un document non généré : {path}")
    path.write_text(text, encoding="utf-8", newline="\n")
    return True


def build(directory: Path, check: bool, refresh: bool, renderer: str) -> dict:
    if not directory.is_dir() or directory.name != "passation":
        raise ValueError(f"Dossier de passation existant requis : {directory}")
    data = json.loads((directory / "dossier.json").read_text(encoding="utf-8"))
    validate(directory, data)
    history = git_history(directory, data, refresh)
    markdown, page, history_md = render(directory, data, history)
    design = f"""# Style documentaire — {data['title']}

<!-- {MARKER} -->

## Périmètre

Ce système concerne uniquement la passation locale, en mode Read. Il ne remplace
pas le design produit défini à la racine de l'application. L'écran vise un
développeur lisant du code, avec consultation mobile et impression possibles.

## Typographie

Police système ; corps 16px/1.65. Titres h1 2.6rem, 2.2rem sur écran intermédiaire
et 2rem sur mobile ; h2 1.7rem puis 1.5rem ; h3 1.16rem ; h4 1rem. Introduction
1.1rem puis 1rem mobile. Navigation 0.87rem, tableaux 0.9rem, en-têtes 0.84rem,
notes/code 0.88rem, marque de dépôt 1.05rem, sous-titre 0.85rem. SVG : titre de
composant 15px, description et numéros 12px, titre de colonne 14px ; zoom disponible.
Les chemins longs peuvent se couper, les tableaux/schémas défilent dans leur cadre.

## Palette

Fond #f4f6fa, surface #ffffff, texte #172334, secondaire #4a5b70, bord #d7dee8,
accent #1a47a0, surface bleue #eaf0fc. Les dépendances externes utilisent un ton
papier ambré #f8f4eb ; les incertitudes ont un libellé, pas seulement une couleur.

## Structure et interaction

Sommaire latéral sur bureau, sommaire natif repliable et compact sur mobile.
Carte SVG avec connecteurs orthogonaux hors des boîtes non concernées, numéros
reliés à la table des échanges, ancrages vers les composants, zoom et impression.
Le schéma tient dans le cadre bureau lorsque sa largeur permet de garder les
labels lisibles ; sinon le défilement est local. Contenu présent sans réseau,
sans police distante et sans appel aux applications décrites.

## Maintenance

Le style est embarqué dans generer_passation.py ; les données sont dans dossier.json.
Vérifier 1440x1000 et 390x844, débordement, texte SVG, contraste et ancrages après
une modification de mise en page. Une vérification documentaire n'est pas une
recette métier des applications.
"""
    payloads = {"PASSATION_DETAILLEE.md": markdown, "architecture.html": page, "HISTORIQUE_GIT.md": history_md,
                "generer_passation.py": renderer, "DESIGN.md": design}
    history_path = directory / "historique-git.json"
    serialized = json.dumps(history, ensure_ascii=False, indent=2) + "\n"
    if check:
        if not history_path.is_file() or history_path.read_text(encoding="utf-8") != serialized:
            raise ValueError(f"Snapshot historique absent ou périmé : {history_path}")
    elif not history_path.is_file() or refresh:
        history_path.write_text(serialized, encoding="utf-8", newline="\n")
    changed = sum(write_generated(directory / name, text, check) for name, text in payloads.items())
    words = len(re.findall(r"\b\w+\b", markdown))
    return {"id": data["id"], "words": words, "components": len(data["nodes"]), "flows": len(data["flows"]),
            "author_commits": len(history["commits"]), "generated_files_changed": changed}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="Build every application/resource declared in the portfolio manifest")
    parser.add_argument("--check", action="store_true", help="Verify generated outputs without writing")
    parser.add_argument("--refresh-history", action="store_true", help="Rebuild the author snapshot from the documented Git revision")
    parser.add_argument("--only", help="Select a comma-separated list of application ids when --all is used")
    args = parser.parse_args()
    here = Path(__file__).resolve().parent
    renderer = Path(__file__).read_text(encoding="utf-8")
    if args.all:
        manifest = json.loads((here / "manifest.json").read_text(encoding="utf-8"))
        root = here.parent.parent
        selected = set(args.only.split(",")) if args.only else None
        entries = manifest["applications"] + manifest["resources"]
        directories = [root / item["root"] / "docs" / "passation" for item in entries if selected is None or item["id"] in selected]
    else:
        directories = [here]
    results, errors = [], []
    for directory in directories:
        try:
            results.append(build(directory, args.check, args.refresh_history, renderer))
        except (OSError, ValueError, KeyError, subprocess.TimeoutExpired) as error:
            errors.append(f"{directory}: {error}")
    print(json.dumps({"mode": "check" if args.check else "build", "dossiers": len(results), "results": results, "errors": errors}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
