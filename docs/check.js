'use strict';

const criteria = ['Entscheidungsfrage', 'Ja verändert etwas', 'Politischer Weg', 'Grund- und Menschenrechte'];

function checkProposal(data) {
  const { title, body, scope, baseline, direction, route, pro, contra, rights, foreignConfirmed } = data;
  const text = title.trim();
  const stem = text.replace(/[?!.]+$/u, '').trim();
  const foreign = scope === 'foreign';
  const result = [];
  const add = (tone, label, feedback, next = '') => result.push({ name: criteria[result.length], tone, label, feedback, next });
  const open = /^(wie|warum|weshalb|wieso|was|welch\w*|wer|wann|wo|inwiefern|inwieweit|how|why|what|which|who|when|where|pourquoi|comment|quel\w*|qui|quand|où)(?=\s|[?.,]|$)/iu.test(text);
  const yesNo = /^(soll\w*|muss|müssen|darf|dürfen|kann|können|sind|ist|wird|werden|wäre[n]?|hat|haben|gibt|will|wollen|braucht|sollt\w*|stimm\w*|should|shall|must|can|could|is|are|do|does|will|would|faut-il|doit-on|devrait-on|est-ce que|devrait|doit|faut|peut)(?=\s|$)/iu.test(stem);
  const alternatives = /\b(?:oder|or|ou)\s+(?:soll\w*|should|devrait)\b|\b(?:entweder|either)\b.+\b(?:oder|or)\b/iu.test(stem);
  const multiple = (text.match(/\?/g) || []).length > 1;
  const negative = /^(?:soll\w*|should|faut-il|devrait-on)\s.*\b(?:beibehalten|unverändert bleiben|weiterhin gelten|remain unchanged|keep the current|maintenir le statu quo)\b/iu.test(stem);
  const death = /\b(?:todesstrafe|death penalty|capital punishment|peine de mort)\b/iu.test(stem);
  const introduce = /\b(?:\w*einführ\w*|\w*einzuführ\w*|wiedereinsetz\w*|verhäng\w*|reintroduc\w*|introduc\w*|restor\w*|rétabl\w*|réintrodu\w*)\b/iu.test(stem);
  const negation = /\b(?:nicht|kein\w*|never|not|against|contre|verbot|verbiet\w*|abschaff\w*|ablehn\w*)\b/iu.test(stem);
  const emrkExit = /\b(?:EMRK|ECHR|CEDH|Menschenrechtskonvention)\b/iu.test(stem) && /kündig|austret|austritt|rückgängig|withdraw|dénonc/iu.test(stem);
  let rewrite = '';

  if (multiple || alternatives) {
    add('bad', 'Überarbeiten', 'Der Titel enthält mehrere Fragen oder stellt Alternativen zur Wahl.', 'Wähle eine konkrete Massnahme und frage, ob sie umgesetzt werden soll.');
  } else if (open) {
    add('bad', 'Überarbeiten', 'Der Titel beginnt mit einer offenen Frage.', 'Wähle eine mögliche Lösung und formuliere sie als Entscheidungsfrage: «Soll [zuständige Stelle] [konkrete Massnahme]?»');
  } else if (yesNo && stem.split(/\s+/).length >= 3) {
    if (!text.endsWith('?')) {
      add('bad', 'Überarbeiten', 'Der Satzanfang passt zu einer Entscheidungsfrage. Das Fragezeichen fehlt.', 'Schliesse den Titel mit einem Fragezeichen ab.');
      rewrite = stem + '?';
    } else {
      add('good', 'Formal plausibel', 'Der Satzanfang passt zu einer Ja/Nein-Frage.', 'Lies beide Antworten laut: Beziehen sich Ja und Nein eindeutig auf dieselbe Massnahme?');
    }
  } else {
    add('warn', 'Abklären', 'Das Tool erkennt noch keine eindeutige Ja/Nein-Form.', 'Prüfe, ob der Titel als Frage funktioniert. Verwende etwa «Soll …?», «Should …?» oder «Faut-il … ?».');
  }

  if (!rewrite && yesNo && !multiple && !alternatives && negative) {
    const keep = stem.match(/^(Soll(?:en)?) (.+) beibehalten werden$/iu);
    if (keep) rewrite = keep[1] + ' ' + keep[2] + ' aufgehoben werden?';
  }
  if (direction === 'keep' || negative) {
    add('bad', 'Überarbeiten', 'Ein Ja scheint den heutigen Zustand zu bestätigen.', 'Drehe die Frage um: Nenne die konkrete Änderung, der man mit Ja zustimmen würde. Ein Nein soll die heutige Regel bestehen lassen.');
  } else if (direction === 'change' && baseline) {
    add('good', 'Nach deiner Angabe', 'Dein Ausgangspunkt: «' + baseline + '». Nach deiner Einschätzung würde Ja etwas ändern und Nein diesen Zustand belassen.', 'Gleiche den Ausgangspunkt mit einer aktuellen Quelle ab.');
  } else {
    add('warn', 'Abklären', baseline ? 'Du hast beschrieben, was heute gilt. Die Folgen von Ja und Nein sind noch zu klären.' : 'Aus der Formulierung allein lässt sich nicht erkennen, was heute gilt.', 'Ergänze «Heute gilt …», «Bei Ja ändert sich …» und «Bei Nein bleibt …» im Entwurf oder unter «Rückmeldung präzisieren».');
  }

  if (foreign && (!body || !foreignConfirmed)) {
    add('warn', 'Beitrag ergänzen', 'Der Auslandsbezug braucht eine Erklärung im Beitrag.', 'Nenne Land oder Organisation. Halte fest, dass die Moderation das Verfahren erklärt und beide Seiten den geltenden Rechtsrahmen beachten. Die Details können nach der Themenwahl folgen.');
  } else if (route) {
    add('good', 'Weg genannt', 'Du nennst «' + route + '» als möglichen Weg.' + (foreign ? ' Der Auslandsbezug ist laut deiner Angabe im Beitrag erläutert.' : ''), 'Prüfe anhand einer offiziellen Quelle, wer das Verfahren anstossen darf und welche Stelle entscheiden kann.');
  } else {
    add('warn', 'Abklären', 'Ein Verfahren und eine zuständige Stelle fehlen in den Prüfangaben.', foreign ? 'Recherchiere das konkrete Verfahren im gewählten Land oder in der Organisation.' : 'Kläre zuerst Bund, Kanton oder Gemeinde. Prüfe dann z. B. Volksinitiative, Motion über ein Parlamentsmitglied, Referendum zu einer konkreten Vorlage oder Petition an die zuständige Behörde.');
  }

  if (!foreign && death && introduce && !negation) {
    add('bad', 'Nach Klassenregeln unzulässig', 'Der Titel deutet auf eine Wiedereinführung der Todesstrafe. In der Schweiz verbieten Art. 10 Abs. 1 BV und Protokoll Nr. 13 zur EMRK die Todesstrafe.', 'Wechsle zu einer konkreten Massnahme, etwa «Soll der Bund zusätzliche Programme zur Gewaltprävention in Gefängnissen finanzieren?» Prüfe auch dafür Ausgangslage und Zuständigkeit.');
    rewrite = '';
  } else if (rights === 'no') {
    add('bad', 'Überarbeiten', 'Nach deiner Einschätzung kann mindestens eine Seite nur mit einem Verstoss gegen geltende Rechte für ihre Position eintreten.', 'Ändere die Massnahme so, dass beide Seiten tragfähige Argumente im geltenden Rechtsrahmen haben.');
  } else if (emrkExit && !foreign) {
    add('warn', 'Rechtsrahmen abklären', 'Eine Kündigung der EMRK ist nach den Klassenregeln grundsätzlich als Thema denkbar. Die verfassungsrechtlichen Grundrechte gelten auch für die Argumente der Pro-Seite.', 'Suche für beide Seiten mehrere Argumente und kläre, welche Verpflichtungen bei einer Kündigung bestehen blieben.');
  } else if (death) {
    add('warn', 'Rechtsrahmen abklären', 'Der Titel nennt die Todesstrafe. Ob sie eingeführt, abgeschafft oder nur als Hintergrund erwähnt wird, ist für die Prüfung entscheidend.', 'Prüfe den geltenden Rechtsrahmen und zeige, dass beide Positionen ohne Verstoss gegen Grund- und Menschenrechte begründet werden können.');
  } else if (pro && contra && pro.trim().toLowerCase() !== contra.trim().toLowerCase() && rights === 'yes') {
    add('good', 'Nach deiner Angabe', 'Du hast je ein Pro- und Contra-Argument skizziert und den Rechtsrahmen nach eigener Angabe geprüft.', 'Suche je ein weiteres unabhängiges Argument. Halte die einschlägigen Bestimmungen oder Quellen fest.');
  } else {
    add('warn', 'Abklären', rights === 'unclear' ? 'Nach deiner Einschätzung könnte ein Recht betroffen sein.' : 'Es ist noch offen, ob beide Seiten genügend grundrechtskonformen Spielraum haben.', 'Notiere je ein konkretes Pro- und Contra-Argument. Prüfe dann, welche Grund- oder Menschenrechte berührt sind und ob beide Positionen diese respektieren.');
  }
  return { result, rewrite };
}

if (typeof module === 'object' && module.exports) module.exports = { checkProposal };
