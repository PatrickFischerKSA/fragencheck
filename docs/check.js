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
  const hints = [];
  const choice = /\b(?:oder|or|ou)\b/iu.test(stem);
  const continued = /\b(?:weiterhin|wie bisher|auch künftig)\b/iu.test(stem);
  const classDecision = /^(?:soll\w*|muss)\s+(?:unsere\s+)?(?:klassengruppe|klassenchat|klasse)\b/iu.test(stem) &&
    /\b(?:namen|umbenenn\w*)\b/iu.test(stem);
  const federalMotionToMunicipality = /\bmotion\b/iu.test(route || '') &&
    /\b(?:eidgenössisch\w*|nationalrat\w*|ständerat\w*|bundesparlament\w*)\b/iu.test(route) &&
    /\ban (?:den |die |das |einen )?(?:gemeinderat|stadtrat|gemeinde)\b/iu.test(route);
  const today = body?.match(/(?:^|[.!?\n])\s*((?:heute|bisher|derzeit)\b[^.!?\n]+)/iu)?.[1].trim();
  const onYes = body?.match(/(?:^|[,.!?\n])\s*(bei ja\b[^.!?\n]+?)(?=,\s*bei nein\b|[.!?\n]|$)/iu)?.[1].trim();
  const onNo = body?.match(/(?:^|[,.!?\n])\s*(bei nein\b[^.!?\n]+)/iu)?.[1].trim();
  const bodyProcedure = body?.match(/\b(volksinitiative|initiative|motion|referendum|petition)\b/iu)?.[0];
  const split = stem.match(/^(Soll (?:die Stadt|die Gemeinde|der Kanton|der Bund)) ([\p{Lu}][\p{L}-]*) oder ([\p{Lu}][\p{L}-]*) (bauen|finanzieren|fördern|einführen)$/u);
  const separateQuestions = text.match(/[^?]+\?/gu)?.map(question => question.trim()) || [];
  const parkingFees = stem.match(/^Soll (die Gemeinde|die Stadt|der Kanton) weiterhin (Gebühren für .+) erheben$/iu);
  const allowsTorture = /^(?:soll\w*|darf|dürfen)\b.*\bfoltern(?:\s+dürfen)?$/iu.test(stem) &&
    !/\b(?:nicht|nie|kein\w*|verboten)\b/iu.test(stem);

  if (multiple || alternatives) {
    add('bad', 'Überarbeiten', 'Der Titel enthält mehrere Fragen oder stellt Alternativen zur Wahl.', 'Wähle eine konkrete Massnahme und frage, ob sie umgesetzt werden soll.');
  } else if (open) {
    add('bad', 'Überarbeiten', 'Der Titel beginnt mit einer offenen Frage.', 'Wähle eine mögliche Lösung und formuliere sie als Entscheidungsfrage: «Soll [zuständige Stelle] [konkrete Massnahme]?»');
    if (/^wie soll der bund lebensmittelverschwendung bekämpfen$/iu.test(stem)) {
      hints.push('Wenn dich unverkaufte Ware im Detailhandel interessiert: Soll der Bund grosse Detailhändler verpflichten, geniessbare unverkaufte Lebensmittel zur Weitergabe anzubieten?');
      hints.push('Wenn dich Abfall in Haushalten interessiert: Soll der Bund Programme zur Vermeidung von Lebensmittelabfällen in Haushalten finanzieren?');
    } else {
      hints.push('Wenn du eine bestimmte Änderung diskutieren willst: Soll [zuständige Stelle] [deine konkrete Massnahme] umsetzen?');
    }
  } else if (split) {
    add('warn', 'Entscheidung präzisieren', 'Die Frage lässt offen, ob du zwischen zwei Vorhaben wählen oder beide gemeinsam zur Abstimmung stellen willst.', 'Wenn dieselbe Fläche zur Debatte steht, nenne den Ort und frage nach genau einer Nutzung gegenüber dem heutigen Zustand.');
  } else if (choice) {
    add('warn', 'Alternativen prüfen', '«Oder» kann eine Wahl zwischen zwei Massnahmen anzeigen. Prüfe, ob ein Ja die Frage eindeutig beantwortet.', 'Falls die beiden Optionen getrennte Massnahmen sind, prüfe jeweils eine davon gegen den heutigen Zustand.');
  } else if (yesNo && stem.split(/\s+/).length >= 3) {
    if (!text.endsWith('?')) {
      add('bad', 'Überarbeiten', 'Der Satzanfang passt zu einer Entscheidungsfrage. Das Fragezeichen fehlt.', 'Schliesse den Titel mit einem Fragezeichen ab.');
      hints.push(stem + '?');
    } else {
      add('good', 'Formal plausibel', 'Der Satzanfang passt zu einer Ja/Nein-Frage.', 'Lies beide Antworten laut: Beziehen sich Ja und Nein eindeutig auf dieselbe Massnahme?');
    }
  } else {
    add('warn', 'Abklären', 'Das Tool erkennt noch keine eindeutige Ja/Nein-Form.', 'Prüfe, ob der Titel als Frage funktioniert. Verwende etwa «Soll …?», «Should …?» oder «Faut-il … ?».');
  }

  if (split && !multiple) {
    hints.push('Wenn du das erste Vorhaben einzeln prüfen willst: ' + split[1] + ' ' + split[2] + ' ' + split[4] + '?');
    hints.push('Wenn du das zweite Vorhaben einzeln prüfen willst: ' + split[1] + ' ' + split[3] + ' ' + split[4] + '?');
    hints.push('Wenn beide Vorhaben als Paket gemeint sind: ' + split[1] + ' ' + split[2] + ' und ' + split[3] + ' ' + split[4] + '?');
  } else if (multiple && separateQuestions.every(question => /^soll(?:en)?\s/iu.test(question))) {
    hints.push(...separateQuestions.map(question => 'Wenn du dieses Vorhaben einzeln prüfen willst: ' + question.replace(/^Soll (?:er|sie) /iu, 'Soll [zuständige Stelle] ')));
  } else if (alternatives && !multiple && !open) {
    const alternative = stem.match(/^Soll (die Stadt|die Gemeinde|der Kanton|der Bund) .+ oder soll (?:sie|er) (.+)$/iu);
    if (alternative) hints.push('Wenn der erste Teil beschreibt, was heute gilt: Soll ' + alternative[1] + ' ' + alternative[2] + '?');
  }
  const keep = stem.match(/^(Soll(?:en)?) (.+) beibehalten werden$/iu);
  if (direction === 'keep' || negative || (continued && direction !== 'change')) {
    const tentative = continued && !negative && direction !== 'keep';
    add(tentative ? 'warn' : 'bad', tentative ? 'Richtung prüfen' : 'Überarbeiten',
      tentative ? '«Weiterhin» oder eine ähnliche Wendung deutet darauf hin, dass ein Ja die bisherige Praxis bestätigt.' : 'Ein Ja scheint den heutigen Zustand zu bestätigen.',
      'Wenn du eine Änderung diskutieren willst, formuliere sie als Ja-Option. Bei Nein soll die heutige Regel bestehen bleiben.');
    if (keep) hints.push(keep[1] + ' ' + keep[2] + ' aufgehoben werden? (Falls du eine Aufhebung diskutieren willst.)');
    else if (parkingFees) {
      hints.push('Wenn du die Gebühr senken willst: Soll ' + parkingFees[1] + ' die ' + parkingFees[2] + ' senken?');
      hints.push('Wenn du die Gebühr abschaffen willst: Soll ' + parkingFees[1] + ' die ' + parkingFees[2] + ' abschaffen?');
    } else hints.push('Soll [zuständige Stelle] [die heutige Regel] durch [deine gewünschte Änderung] ersetzen?');
  } else if (direction === 'change' && baseline) {
    add('good', 'Nach deiner Angabe', 'Dein Ausgangspunkt: «' + baseline + '». Nach deiner Einschätzung würde Ja etwas ändern und Nein diesen Zustand belassen.', 'Gleiche den Ausgangspunkt mit einer aktuellen Quelle ab.');
  } else if (!direction && today && onYes && onNo) {
    add('warn', 'Im Beitrag beschrieben', 'Dein Beitrag nennt «' + today + '», «' + onYes + '» und «' + onNo + '».', 'Vergleiche diese drei Angaben: Beschreibt Ja die Änderung und Nein dieselbe Regel wie heute?');
  } else {
    add('warn', 'Abklären', baseline ? 'Du hast beschrieben, was heute gilt. Die Folgen von Ja und Nein sind noch zu klären.' : 'Aus der Formulierung allein lässt sich nicht erkennen, was heute gilt.', 'Ergänze «Heute gilt …», «Bei Ja ändert sich …» und «Bei Nein bleibt …» im Entwurf oder unter «Rückmeldung präzisieren».');
  }

  if (foreign && (!body || !foreignConfirmed)) {
    add('warn', 'Beitrag ergänzen', 'Der Auslandsbezug braucht eine Erklärung im Beitrag.', 'Nenne Land oder Organisation. Halte fest, dass die Moderation das Verfahren erklärt und beide Seiten den geltenden Rechtsrahmen beachten. Die Details können nach der Themenwahl folgen.');
  } else if (!foreign && federalMotionToMunicipality) {
    add('warn', 'Zuständigkeit prüfen', 'Eine Motion im eidgenössischen Parlament richtet sich an den Bundesrat. Du nennst eine Gemeindebehörde als Adressatin.', 'Wenn die Massnahme in der Zuständigkeit der Gemeinde liegt, prüfe ein kommunales Verfahren, etwa eine Petition an die zuständige Stelle.');
  } else if (!foreign && classDecision) {
    add('bad', 'Politischen Bezug ergänzen', 'Die Frage betrifft offenbar eine Entscheidung innerhalb der Klasse.', 'Wenn dein Thema politisch sein soll, wähle eine Regel oder Massnahme, die eine zuständige öffentliche Stelle beeinflussen kann.');
  } else if (route) {
    add('good', 'Weg angegeben', 'Du nennst «' + route + '» als möglichen Weg.' + (foreign ? ' Der Auslandsbezug ist laut deiner Angabe im Beitrag erläutert.' : ''), 'Prüfe anhand einer offiziellen Quelle, wer das Verfahren anstossen darf und welche Stelle entscheiden kann.');
  } else if (bodyProcedure) {
    add('warn', 'Verfahren im Beitrag erwähnt', 'Du erwähnst «' + bodyProcedure + '» im Beitrag.', 'Prüfe, welche Stelle zuständig ist und wie dieses Verfahren die gewünschte Änderung anstossen könnte.');
  } else {
    add('warn', 'Abklären', 'Ein Verfahren und eine zuständige Stelle fehlen in den Prüfangaben.', foreign ? 'Recherchiere das konkrete Verfahren im gewählten Land oder in der Organisation.' : 'Kläre zuerst Bund, Kanton oder Gemeinde. Prüfe dann z. B. Volksinitiative, Motion über ein Parlamentsmitglied, Referendum zu einer konkreten Vorlage oder Petition an die zuständige Behörde.');
  }

  if (!foreign && death && introduce && !negation) {
    add('bad', 'Nach Klassenregeln unzulässig', 'Der Titel deutet auf eine Wiedereinführung der Todesstrafe. In der Schweiz verbieten Art. 10 Abs. 1 BV und Protokoll Nr. 13 zur EMRK die Todesstrafe.', 'Wähle eine andere Massnahme im Bereich Strafpolitik und prüfe dafür Ausgangslage, Zuständigkeit und den Spielraum für beide Seiten.');
    hints.length = 0;
    hints.push('Soll der Bund zusätzliche Programme zur Gewaltprävention in Gefängnissen finanzieren? (Falls dich Gewaltprävention im Strafvollzug interessiert.)');
  } else if (!foreign && allowsTorture) {
    add('bad', 'Nach Klassenregeln unzulässig', 'Der Titel deutet darauf hin, dass Folter erlaubt werden soll. Art. 10 Abs. 3 der Bundesverfassung verbietet Folter.', 'Falls dein Anliegen die Polizeiarbeit oder der Schutz von Gefangenen ist, frage nach einer Massnahme innerhalb des geltenden Rechtsrahmens.');
    hints.length = 0;
    hints.push('Soll der Kanton eine unabhängige Beschwerdestelle für Personen in Polizeigewahrsam einrichten? (Falls dich die Kontrolle der Polizeiarbeit interessiert.)');
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
  return { result, hints };
}

if (typeof module === 'object' && module.exports) module.exports = { checkProposal };
