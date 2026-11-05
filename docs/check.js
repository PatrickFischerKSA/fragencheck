'use strict';

const criteria = ['Entscheidungsfrage', 'Ja verändert etwas', 'Politischer Weg', 'Grund- und Menschenrechte'];

const numberWords = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];

function normalizeState(value) {
  return (value || '').normalize('NFC').toLocaleLowerCase('de-CH')
    .trim().replace(/[.!?]+$/u, '').replace(/\s+/gu, ' ');
}

const scientificUnits = {
  'partikel pro liter': ['Partikel pro Liter', 1],
  'partikel pro milliliter': ['Partikel pro Liter', 1000],
  'millimeter pro stunde': ['Millimeter pro Stunde', 1],
  'mm/h': ['Millimeter pro Stunde', 1],
  mj: ['Energie in Joule', 1000000],
  kwh: ['Energie in Joule', 3600000],
  mwh: ['Energie in Joule', 3600000000],
  kw: ['Leistung in Watt', 1000],
  'mg/l': ['Konzentration in Mikrogramm pro Liter', 1000],
  'µg/l': ['Konzentration in Mikrogramm pro Liter', 1],
  'μg/l': ['Konzentration in Mikrogramm pro Liter', 1],
  basispunkte: ['Prozentpunkte', 0.01],
  prozentpunkte: ['Prozentpunkte', 1]
};

function comparableState(value) {
  const state = normalizeState(value)
    .replace(/^(?:heute|bisher|derzeit|bei ja|bei nein)\s*:\s*/u, '')
    .replace(/(?<=\d)['’](?=\d{3}(?:\D|$))/gu, '')
    .replace(/\b(?:eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\b/gu, word => String(numberWords.indexOf(word)))
    .replace(/(\d+) (?:quadratmeter|m²)(?=\s|$)/gu, '$1 m²');
  let match;
  const quantity = state.match(/^(.+) (?:beträgt|liefert) (\d+(?:[.,]\d+)?)\s*(.+)$/u);
  if (quantity && Object.hasOwn(scientificUnits, quantity[3])) {
    const [dimension, factor] = scientificUnits[quantity[3]];
    return [dimension, quantity[1], Number(quantity[2].replace(',', '.')) * factor];
  }
  if ((match = state.match(/^(.+) beträgt (\d+(?:[.,]\d+)?)\s*(?:prozent|%)$/u))) {
    return ['Anteil in Prozent', match[1], Number(match[2].replace(',', '.'))];
  }
  if ((match = state.match(/^(.+) dauert (\d+(?:[.,]\d+)?) (minute[n]?|stunde[n]?)$/u))) {
    return ['Dauer in Minuten', match[1], Number(match[2].replace(',', '.')) * (match[3].startsWith('stunde') ? 60 : 1)];
  }
  if ((match = state.match(/^(.+) umfasst (\d+(?:[.,]\d+)?) (hektar(?:en)?|ha|m²)$/u))) {
    return ['Fläche', match[1].replace(/^(?:der|die|das) /u, ''), Number(match[2].replace(',', '.')) * (match[3] === 'm²' ? 1 : 10000)];
  }
  if ((match = state.match(/^(.+) beträgt (\d+) (platz|plätze|standplatz|standplätze)$/u))) {
    return ['Anzahl Plätze', match[1] + (match[3].startsWith('stand') ? ' (Standplätze)' : ''), Number(match[2])];
  }
  if ((match = state.match(/^der ([\p{L}-]*abstand) (?:beträgt|liegt bei|muss) (\d+(?:[.,]\d+)?)\s*(kilometer|km|meter|m)(?: betragen)?$/u))) {
    const metres = Number(match[2].replace(',', '.')) * (/^k/u.test(match[3]) ? 1000 : 1);
    return ['Abstand in Metern', match[1], metres];
  }
  if ((match = state.match(/^(?:der|die|das) (.+) ist (?:für alle (?:frei )?zugänglich|frei zugänglich für alle)$/u)) ||
      (match = state.match(/^alle (?:dürfen|können) (?:den|die|das) (.+) (?:benutzen|nutzen|betreten)$/u))) {
    return ['Öffentlicher Zugang', match[1]];
  }
  if ((match = state.match(/^(.+) kostet (?:chf )?(\d+(?:[.,]\d{1,2})?)(?: (franken|chf))?$/u)) &&
      (match[3] || state.includes(' kostet chf '))) {
    return ['Preis in Franken', match[1], Number(match[2].replace(',', '.'))];
  }
  if ((match = state.match(/^(.+) schliesst um (\d{1,2})(?:[.:](\d{2}))? uhr$/u)) &&
      Number(match[2]) < 24 && Number(match[3] || 0) < 60) {
    return ['Schliesszeit', match[1], Number(match[2]) * 60 + Number(match[3] || 0)];
  }
  if ((match = state.match(/^(?:der|die|das) (.+) (?:umfasst|bleibt) (\d+) m²(?: gross)?$/u))) {
    return ['Fläche', match[1], Number(match[2])];
  }
  if ((match = state.match(/^das (.+) ist (?:jeden )?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag) geöffnet$/u))) {
    return ['Öffnungstag', match[1], match[2]];
  }
  if ((match = state.match(/^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)s hat das (.+) offen$/u))) {
    return ['Öffnungstag', match[2], match[1]];
  }
  if ((match = state.match(/^auf (.+) (?:ist parkieren verboten|darf nicht parkiert werden)$/u))) {
    return ['Parkverbot', match[1]];
  }
  if (/^(?:der kehricht wird wöchentlich abgeholt|die kehrichtabfuhr kommt einmal pro woche)$/u.test(state)) {
    return ['Abholung', 'Kehricht', 7];
  }
  if ((match = state.match(/^(?:die ausleihfrist beträgt|ausgeliehene bücher dürfen) (\d+) (tage|wochen)(?: behalten werden)?$/u))) {
    return ['Ausleihfrist in Tagen', Number(match[1]) * (match[2] === 'wochen' ? 7 : 1)];
  }
  if ((match = state.match(/^die ([\p{L}-]*frist) (?:beträgt|dauert|liegt bei) (\d+|eine[nm]?) (tag|tage|tagen|woche|wochen)$/u))) {
    return ['Frist in Tagen', match[1], (/^[0-9]/u.test(match[2]) ? Number(match[2]) : 1) * (match[3].startsWith('woche') ? 7 : 1)];
  }
  if ((match = state.match(/^auf (.+) (?:gilt eine höchstgeschwindigkeit von|darf höchstens) (\d+) km\/h(?: gefahren werden)?$/u))) {
    return ['Tempolimit', match[1], Number(match[2])];
  }
  if ((match = state.match(/^der (.+) fährt um (mitternacht|00[.:]00 uhr) ab$/u))) {
    return ['Abfahrt', match[1], '00:00'];
  }
  if (/^(?:eine jahreskarte erhält man ab 18 jahren|nur volljährige können eine jahreskarte kaufen)$/u.test(state)) {
    return ['Altersgrenze', 'Jahreskarte', 18];
  }
  if ((match = state.match(/^der eintritt zum (.+) ist frei$/u) || state.match(/^für das (.+) wird kein eintritt verlangt$/u))) {
    return ['Eintritt frei', match[1]];
  }
  return ['Wortlaut', state];
}

function compareStates(today, outcome) {
  if (!normalizeState(today) || !normalizeState(outcome)) return {};
  const first = comparableState(today);
  const second = comparableState(outcome);
  if (JSON.stringify(first) === JSON.stringify(second)) return { same: first[0] };
  // Only compare unequal values when both descriptions refer to the same subject and property.
  if (first[0] !== 'Wortlaut' && first.length === 3 && second.length === 3 &&
      first[0] === second[0] && first[1] === second[1]) return { different: first[0] };
  return {};
}

function checkProposal(data) {
  const { title, body, scope, baseline, direction, yesOutcome, noOutcome, yesDetail, noDetail, route, pro, contra, rights, foreignConfirmed } = data;
  const text = title.trim();
  const stem = text.replace(/^¿\s*/u, '').replace(/[?!.]+$/u, '').trim();
  const foreign = scope === 'foreign';
  const result = [];
  const add = (tone, label, feedback, next = '') => result.push({ name: criteria[result.length], tone, label, feedback, next });
  const open = /^(wie|warum|weshalb|wieso|was|welch\w*|wer|wann|wo|inwiefern|inwieweit|how|why|what|which|who|when|where|pourquoi|comment|quel\w*|qui|quand|où)(?=\s|[?.,]|$)/iu.test(text);
  const yesNo = /^(soll\w*|muss|müssen|darf|dürfen|kann|können|sind|ist|wird|werden|wäre[n]?|hat|haben|gibt|will|wollen|braucht|sollt\w*|stimm\w*|should|shall|must|can|could|is|are|do|does|will|would|faut-il|doit-on|devrait-on|est-ce que|devrait|doit|faut|peut|debe[n]?|debería[n]?)(?=\s|$)/iu.test(stem);
  const alternatives = /\b(?:oder|or|ou)\s+(?:soll\w*|should|devrait)\b|\b(?:entweder|either)\b.+\b(?:oder|or)\b/iu.test(stem);
  const multiple = (text.match(/\?/g) || []).length > 1;
  const negative = /^(?:soll\w*|should|faut-il|devrait-on)\s.*\b(?:beibehalten|unverändert bleiben|weiterhin gelten|remain unchanged|keep the current|maintenir le statu quo)\b/iu.test(stem);
  const death = /\b(?:todesstrafe|death penalty|capital punishment|peine de mort)\b/iu.test(stem);
  const introduce = /\b(?:\w*einführ\w*|\w*einzuführ\w*|wiedereinsetz\w*|verhäng\w*|zulass\w*|reintroduc\w*|introduc\w*|restor\w*|rétabl\w*|réintrodu\w*)\b/iu.test(stem);
  const negation = /\b(?:nicht|kein\w*|never|not|against|contre|verbot|verbiet\w*|abschaff\w*|ablehn\w*)\b/iu.test(stem);
  const emrkExit = /\b(?:EMRK|ECHR|CEDH|Menschenrechtskonvention)\b/iu.test(stem) && /kündig|austret|austritt|rückgängig|withdraw|dénonc/iu.test(stem);
  const hints = [];
  const choice = /\b(?:oder|or|ou)\b/iu.test(stem.replace(/,?\s+(?:oder nicht|or not|ou non)$/iu, ''));
  const statement = stem.match(/^(Die (?:Stadt|Gemeinde|Schweiz)|Der (?:Kanton|Bund|Gemeinderat|Stadtrat|Kantonsrat|Bundesrat))\s+(soll|sollte)\s+(.+)$/u);
  const existenceQuestion = /^(?:(?:hat|haben)\s+.+|gibt es)\s+(?:ein(?:e|en|em|er)?|keine?)\s+.+$/iu.test(stem);
  const factQuestion = (existenceQuestion || /^(?:ist|sind|hat|haben|gibt)\b.*\b(?:offen|geöffnet|geschlossen|vorhanden|bereits)\b/iu.test(stem)) &&
    !/\b(?:soll\w*|sinnvoll|notwendig|erforderlich|genug|ausreichend)\b/iu.test(stem);
  const continued = /\b(?:weiterhin|wie bisher|auch künftig)\b/iu.test(stem);
  const classDecision = /^(?:soll\w*|muss)\s+(?:unsere\s+)?(?:klassengruppe|klassenchat|klasse)\b/iu.test(stem) &&
    /\b(?:namen|umbenenn\w*)\b/iu.test(stem);
  const federalMotionToLocalAuthority = /\bmotion\b/iu.test(route || '') &&
    /\b(?:eidgenössisch\w*|nationalrat\w*|ständerat\w*|bundesparlament\w*)\b/iu.test(route) &&
    /\ban (?:den |die |das |einen )?(?:gemeinderat|stadtrat|gemeinde|kantonsrat|regierungsrat)\b/iu.test(route);
  const today = body?.match(/(?:^|[.!?\n])\s*((?:heute|bisher|derzeit)\b[^.!?\n]+)/iu)?.[1].trim();
  const onYes = body?.match(/(?:^|[,.!?\n])\s*(bei ja\b[^.!?\n]+?)(?=,\s*bei nein\b|[.!?\n]|$)/iu)?.[1].trim();
  const onNo = body?.match(/(?:^|[,.!?\n])\s*(bei nein\b[^.!?\n]+)/iu)?.[1].trim();
  // Compare the same service and day before treating "auch" as a change.
  const sundayServiceQuestion = /\b(?:ortsbus|bus)\b.*\b(?:am sonntag|sonntags)\s+fahren lassen$/iu.test(stem);
  const sundayServiceNow = /^(?:(?:heute|bisher|derzeit)\s+fährt\s+(?:er|der (?:ortsbus|bus))|der (?:ortsbus|bus)\s+fährt)\s+(?:(?:bereits|schon|auch|heute|derzeit)\s+)*(?:am sonntag|sonntags)$/iu;
  const sundayServiceAtYes = /^bei ja\s+fährt\s+(?:er|der (?:ortsbus|bus))\s+(?:auch\s+)?(?:am sonntag|sonntags)$/iu;
  const sundayServiceAlreadyRuns = sundayServiceQuestion &&
    sundayServiceAtYes.test(onYes || '') &&
    (body || '').split(/[.!?\n]/u).some(sentence => sundayServiceNow.test(sentence.trim()));
  const openingDay = /\b(?:am )?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)s?\b(?=\s+öffnen(?:\s+lassen)?$)/iu.exec(stem)?.[1].toLowerCase();
  const openingNow = /^(?:heute|bisher|derzeit)\s+(?:ist|öffnet)\s+(?:der|die|das)\s+([\p{L}-]+) (?:am )?(\p{L}+?)s?(?: (?:schon|bereits))?(?: (offen|geöffnet))?$/iu.exec(today || '');
  const openingAtYes = /^bei ja öffnet (?:er|sie|es|(?:der|die|das) ([\p{L}-]+)) (?:(?:auch|neu) )?(?:am )?(\p{L}+?)s?$/iu.exec(onYes || '');
  const openingPlace = openingNow?.[1].toLowerCase();
  const sameOpeningDay = openingDay && openingPlace &&
    stem.toLowerCase().split(/\s+/u).some(word => word.endsWith(openingPlace)) &&
    openingNow[2].toLowerCase() === openingDay &&
    openingAtYes?.[2].toLowerCase() === openingDay &&
    (!openingAtYes[1] || openingAtYes[1].toLowerCase() === openingPlace) &&
    (/^\S+ öffnet /iu.test(today) || openingNow[3]);
  const noExplicitlyChanges = today && onYes &&
    /^bei nein wird\b.+\b(?:halbiert|verdoppelt|erhöht|gesenkt|abgeschafft|eingeführt)$/iu.test(onNo || '') &&
    !/\b(?:nicht|kein\w*)\b/iu.test(onNo || '');
  const bodyProcedure = body?.match(/\b(volksinitiative|initiative|motion|referendum|petition)\b/iu)?.[0];
  const petitionRecipient = body?.match(/\bpetition\b[^.!?\n]{0,120}?\ban\s+(?:den|die|das)\s+(Gemeinderat|Stadtrat|Kantonsrat|Bundesrat|Gemeindeversammlung|Regierungsrat)\b/iu)?.[1];
  const split = stem.match(/^(Soll (?:die Stadt|die Gemeinde|der Kanton|der Bund)) ([\p{Lu}][\p{L}-]*) oder ([\p{Lu}][\p{L}-]*) (bauen|finanzieren|fördern|einführen)$/u);
  const coordinatedProjects = stem.match(/^(Soll (?:die Stadt|die Gemeinde|der Kanton|der Bund)) (.+? (?:bauen|finanzieren|fördern|schützen|renaturieren|einführen|digitalisieren|einräumen|verbieten|kartieren|sanieren|reduzieren|einsetzen)) (und|oder) ((?:[A-ZÄÖÜ]|(?:den|die|das|einen|eine|ein) |[a-zäöü]+\s+[A-ZÄÖÜ]).+ (?:bauen|finanzieren|fördern|schützen|renaturieren|einführen|digitalisieren|einräumen|verbieten|kartieren|sanieren|reduzieren|einsetzen))$/u);
  const exclusiveProjects = stem.match(/^(Soll (?:die Stadt|die Gemeinde|der Kanton|der Bund)) entweder (.+?) oder (.+?) (bauen|finanzieren|fördern|einführen)$/iu);
  const separateQuestions = text.match(/[^?]+\?/gu)?.map(question => question.trim()) || [];
  const parkingFees = stem.match(/^Soll (die Gemeinde|die Stadt|der Kanton) weiterhin (Gebühren für .+) erheben$/iu);
  const allowsTorture = (/^(?:soll\w*|darf|dürfen)\b.*\b(?:foltern|folter einsetzen|durch folter erzwingen)(?:\s+dürfen)?$/iu.test(stem) ||
    /^(?:soll|darf) folter\b.*\berlaubt (?:werden|sein)$/iu.test(stem)) &&
    !/\b(?:nicht|nie|kein\w*|verboten)\b/iu.test(stem);

  const feasibility = stem.match(/^(?:wäre|ist) es möglich,?\s+(.+)$/iu);
  const mathematicalFact = /^(?:ist|sind)\b.*\b(?:eigenwert\w*|matrix|matrizen|gleichmässig stetig|stetige funktion)\b/iu.test(stem);
  const methodologicalFeasibility = /^(?:kann|können)\b.*\b(?:bestimmt|berechnet|nachgewiesen|abgeleitet) werden$/iu.test(stem);
  const factCheck = /^(?:stimmt es|trifft es zu),?\s+dass\b/iu.test(stem);
  const negativeQuestion = /^soll(?:en)?\b.*\bnicht\b/iu.test(stem);
  if (multiple || alternatives) {
    add('bad', 'Überarbeiten', 'Mehrere Fragen oder Alternativen im Titel.', 'Eine Massnahme pro Entscheidungsfrage.');
  } else if (open) {
    add('bad', 'Überarbeiten', 'Offene Frage.', 'Eine konkrete Massnahme zur Entscheidung stellen.');
    if (/räumliche autokorrelation/iu.test(stem) && /artenvielfalt/iu.test(stem)) {
      hints.push('Falls du über Vorgaben für ein kantonales Monitoring diskutieren willst: Soll der Kanton bei der Schätzung der Artenvielfalt räumliche Abhängigkeiten berücksichtigen und offenlegen, wie sie die Unsicherheitsintervalle beeinflussen?');
    } else if (/^wie soll der bund lebensmittelverschwendung bekämpfen$/iu.test(stem)) {
      hints.push('Wenn dich unverkaufte Ware im Detailhandel interessiert: Soll der Bund grosse Detailhändler verpflichten, geniessbare unverkaufte Lebensmittel zur Weitergabe anzubieten?');
      hints.push('Wenn dich Abfall in Haushalten interessiert: Soll der Bund Programme zur Vermeidung von Lebensmittelabfällen in Haushalten finanzieren?');
    } else {
      hints.push('Wenn du eine bestimmte Änderung diskutieren willst: Soll [zuständige Stelle] [deine konkrete Massnahme] umsetzen?');
    }
  } else if (feasibility) {
    add('warn', 'Entscheidung oder Machbarkeit klären', 'Die Frage erkundigt sich nach der Machbarkeit.', 'Falls über die Umsetzung entschieden werden soll, frage, ob die zuständige Stelle handeln soll.');
    hints.push('Wenn du über die Umsetzung entscheiden willst: Soll [zuständige Stelle] ' + feasibility[1].replace(/zu (\S+)$/iu, '$1').replace(/\b(ein|auf|ab|an|aus|um|vor)zu(\p{L}+)$/iu, '$1$2') + '?');
  } else if (methodologicalFeasibility) {
    add('bad', 'Methodenfrage', 'Der Titel fragt, ob ein Ergebnis mit einer Methode bestimmbar ist.', 'Wenn du darüber politisch diskutieren willst, frage etwa, welche Nachweise oder Annahmen eine Behörde bei solchen Auswertungen offenlegen soll.');
  } else if (factCheck || mathematicalFact) {
    add('bad', 'Entscheidung formulieren', 'Die Frage will eine Aussage überprüfen.', 'Nutze die Tatsache als Ausgangslage und benenne die gewünschte Änderung.');
  } else if (statement) {
    add('bad', 'Als Frage formulieren', 'Der Titel formuliert eine Forderung als Aussage.', 'Beginne mit «Soll» und stelle die Massnahme zur Entscheidung.');
    hints.push('Wenn diese Massnahme zur Entscheidung stehen soll: Soll ' + statement[1][0].toLowerCase() + statement[1].slice(1) + ' ' + statement[3] + '?');
  } else if (factQuestion) {
    add('bad', 'Entscheidung formulieren', 'Der Titel fragt nach dem heutigen Zustand.', 'Nutze die Antwort als Ausgangslage. Formuliere im Titel, welche konkrete Änderung zur Entscheidung stehen soll.');
  } else if (split) {
    add('warn', 'Entscheidung präzisieren', 'Die Frage lässt offen, ob du zwischen zwei Vorhaben wählen oder beide gemeinsam zur Abstimmung stellen willst.', 'Wenn dieselbe Fläche zur Debatte steht, nenne den Ort und frage nach genau einer Nutzung gegenüber dem heutigen Zustand.');
  } else if (coordinatedProjects) {
    const isPackage = coordinatedProjects[3] === 'und';
    add('warn', isPackage ? 'Paket oder Einzelfragen klären' : 'Alternativen prüfen',
      isPackage ? 'Der Titel verbindet zwei Vorhaben mit «und».' : 'Der Titel stellt zwei Vorhaben mit «oder» zur Wahl.',
      isPackage ? 'Falls beide gemeinsam beschlossen werden sollen, erkläre im Beitrag, warum sie zusammengehören. Sonst stelle je eine Frage.' : 'Falls du eines der Vorhaben zur Entscheidung stellen willst, vergleiche es mit dem heutigen Zustand.');
  } else if (choice) {
    add('warn', 'Alternativen prüfen', '«Oder» kann eine Wahl zwischen zwei Massnahmen anzeigen. Prüfe, ob ein Ja die Frage eindeutig beantwortet.', 'Falls die beiden Optionen getrennte Massnahmen sind, prüfe jeweils eine davon gegen den heutigen Zustand.');
  } else if (negativeQuestion) {
    add('warn', 'Ja und Nein eindeutig formulieren', 'Die Verneinung im Titel kann die Bedeutung eines Ja missverständlich machen.', 'Beschreibe zuerst, welche Änderung bei Ja gelten soll, und formuliere genau diese Änderung im Titel.');
  } else if (yesNo && stem.split(/\s+/).length >= 3) {
    if (!text.endsWith('?')) {
      add('bad', 'Überarbeiten', 'Fragezeichen fehlt.', '');
      hints.push(stem + '?');
    } else {
      add('good', 'Formal plausibel', 'Als Ja/Nein-Frage formuliert.', 'Lies beide Antworten laut: Beziehen sich Ja und Nein eindeutig auf dieselbe Massnahme?');
    }
  } else {
    add('warn', 'Abklären', 'Ja/Nein-Form unklar.', 'Möglicher Einstieg «Soll …?».');
  }

  if (coordinatedProjects && !multiple && !open) {
    const [, actor, first, , second] = coordinatedProjects;
    for (const project of [first, second]) {
      hints.push('Als Einzelfrage: ' + actor + ' ' + project + '?');
    }
  } else if (exclusiveProjects && !multiple) {
    const [, actor, first, second, action] = exclusiveProjects;
    for (const project of [first, second]) {
      hints.push('Als Einzelfrage: ' + actor + ' ' + project + ' ' + action + '?');
    }
  } else if (split && !multiple) {
    hints.push('Als Einzelfrage: ' + split[1] + ' ' + split[2] + ' ' + split[4] + '?');
    hints.push('Als Einzelfrage: ' + split[1] + ' ' + split[3] + ' ' + split[4] + '?');
    hints.push('Wenn beide Vorhaben als Paket gemeint sind: ' + split[1] + ' ' + split[2] + ' und ' + split[3] + ' ' + split[4] + '?');
    if (split[4] === 'bauen') {
      for (const use of [split[2], split[3]]) {
        hints.push('Wenn es um dieselbe Fläche geht und du ' + use + ' vorschlagen willst: ' + split[1] + ' auf [genauer Ort] ' + use + ' bauen? Beschreibe im Beitrag, wie sich dadurch [heutige Nutzung] verändern würde.');
      }
    }
  } else if (multiple && separateQuestions.every(question => /^soll(?:en)?\s/iu.test(question))) {
    const firstActor = separateQuestions[0].match(/^Soll (der Kanton|der Bund|die Gemeinde|die Stadt)(?=\s)/iu)?.[1];
    const secondPronoun = /^der /iu.test(firstActor || '') ? 'er' : 'sie';
    hints.push(...separateQuestions.map((question, index) => {
      const pronoun = question.match(/^Soll (er|sie) /iu)?.[1].toLowerCase();
      if (!pronoun) return 'Als Einzelfrage: ' + question;
      const actor = index === 1 && firstActor && pronoun === secondPronoun ? firstActor : '[zuständige Stelle]';
      return 'Wenn dieselbe Stelle zuständig ist: ' + question.replace(/^Soll (?:er|sie) /iu, 'Soll ' + actor + ' ');
    }));
    const first = separateQuestions[0].match(/^Soll ((?:der Kanton|der Bund|die Gemeinde|die Stadt)) (.+)\?$/iu);
    const second = separateQuestions[1]?.match(/^Soll (er|sie) (.+)\?$/iu);
    if (separateQuestions.length === 2 && first && second && second[1].toLowerCase() === secondPronoun) {
      hints.push('Wenn beide Vorhaben gemeinsam entschieden werden sollen: Soll ' + first[1] + ' ' + first[2] + ' und ' + second[2] + '?');
    }
  } else if (alternatives && !multiple && !open) {
    const alternative = stem.match(/^Soll (die Stadt|die Gemeinde|der Kanton|der Bund) .+ oder soll (?:sie|er) (.+)$/iu);
    if (alternative && /\bbehalten\b/iu.test(stem)) {
      hints.push('Wenn beide Nutzungen erst geplant sind: Beschreibe zuerst, wie die Fläche heute genutzt wird. Stelle dann eine der beiden Nutzungen zur Entscheidung und erkläre, was bei Nein mit der Fläche geschieht.');
    }
    if (alternative) hints.push('Wenn der erste Teil beschreibt, was heute gilt: Soll ' + alternative[1] + ' ' + alternative[2].replace(/\bdort\b/iu, 'auf [genauer Ort]') + '?');
  }
  const keep = stem.match(/^(Soll(?:en)?) (.+) beibehalten werden$/iu);
  const yesComparison = compareStates(baseline, yesDetail);
  const noComparison = compareStates(baseline, noDetail);
  const rateAndInterval = [normalizeState(baseline), normalizeState(yesDetail)];
  const measurementTiming = rateAndInterval.some(state => /\bmessfrequenz\b.*\bhz$/u.test(state)) &&
    rateAndInterval.some(state => /\bmessintervall\b.*\bsekunden?$/u.test(state));
  const [todayMeasure] = comparableState(baseline);
  const [yesMeasure] = comparableState(yesDetail);
  const energyAndPower = [todayMeasure, yesMeasure].includes('Energie in Joule') &&
    [todayMeasure, yesMeasure].includes('Leistung in Watt');
  const sameYesText = yesComparison.same;
  const sameNoText = noComparison.same;
  const freeWifi = /^das wlan im (.+) ist kostenlos$/u;
  const freeStudentWifi = /^schülerinnen und schüler bezahlen für das wlan im (.+) nichts$/u;
  const todayWifi = normalizeState(baseline);
  const yesWifi = normalizeState(yesDetail);
  const fullWifi = todayWifi.match(freeWifi) || yesWifi.match(freeWifi);
  const studentWifi = todayWifi.match(freeStudentWifi) || yesWifi.match(freeStudentWifi);
  const checkWifiScope = fullWifi && studentWifi && fullWifi[1] === studentWifi[1];
  const hasComparison = yesOutcome || noOutcome || yesDetail || noDetail;
  if (sundayServiceAlreadyRuns || sameOpeningDay) {
    add('bad', 'Ja bestätigt den heutigen Zustand',
      sundayServiceAlreadyRuns ? 'Laut deinem Beitrag fährt der Bus heute schon sonntags. Die Ja-Option beschreibt denselben Betrieb.' : 'Laut deinem Beitrag ist das Angebot an diesem Wochentag bereits geöffnet. Die Ja-Option nennt denselben Öffnungstag.',
      'Wenn du das Angebot ändern willst, nenne die konkrete Änderung im Titel und im Beitrag. Beschreibe bei Nein den heutigen Zustand.');
  } else if (noExplicitlyChanges) {
    add('bad', 'Auch Nein ändert etwas', 'Dein Beitrag beschreibt bei Nein eine Änderung: «' + onNo + '».', 'Beschreibe bei Nein den heutigen Zustand. Falls du zwischen zwei Änderungen wählen willst, formuliere sie als getrennte Fragen.');
  } else if (hasComparison) {
    if (sameYesText === 'Öffentlicher Zugang') {
      hints.push('Wenn du den Zugang ändern willst, benenne den konkreten Unterschied. Soll [zuständige Stelle] für [Ort] [neue Zugangsregel oder konkrete Verbesserung] einführen?');
    } else if (sameYesText || yesOutcome === 'same' || checkWifiScope) {
      hints.push('Wenn du eine Änderung diskutieren willst, benenne sie im Titel. Soll [zuständige Stelle] [konkrete Änderung gegenüber heute] umsetzen?');
    }

    if (yesOutcome === 'same' || sameYesText) {
      add('bad', 'Ja bestätigt den heutigen Zustand', sameYesText
        ? 'Der Vergleich erkennt dieselbe Angabe bei Heute und Ja' + (sameYesText === 'Wortlaut' ? '.' : ' (' + sameYesText + ').')
        : 'Du hast bei Ja «Wie heute» ausgewählt.',
      'Falls du eine Änderung meinst, beschreibe konkret, was nach einem Ja anders wäre.');
    } else if (checkWifiScope && noOutcome !== 'different' && !noComparison.different) {
      add('warn', 'Kosten und Zielgruppe vergleichen', 'Beide Angaben beschreiben kostenloses WLAN. Eine Beschreibung nennt ausdrücklich Schüler:innen.', 'Prüfe, wer das WLAN heute gratis nutzen darf und ob sich dieser Personenkreis durch ein Ja ändert.');
    } else if (noOutcome === 'different' || noComparison.different) {
      add('bad', 'Auch Nein ändert etwas', sameNoText
        ? 'Du hast bei Nein «Anders als heute» ausgewählt, beschreibst aber denselben Zustand wie heute.'
        : (noComparison.different ? 'Die Angaben zu Heute und Nein unterscheiden sich (' + noComparison.different + ').' : 'Du hast bei Nein «Anders als heute» ausgewählt.') + (noDetail ? ' Bei Nein würde gelten: «' + noDetail + '».' : ''),
      'Vergleiche die Folgen eines Nein mit heute und korrigiere die Auswahl oder den Entwurf.');
    } else if (energyAndPower) {
      add('warn', 'Leistung und Energie unterscheiden', 'Die Angaben vergleichen Leistung (kW) mit Energie (kWh).', 'Nenne für Heute und Ja dieselbe Messgrösse. Wenn die Energiemenge gemeint ist, gib auch den Zeitraum an.');
    } else if (measurementTiming) {
      add('warn', 'Messvorgang abgleichen', 'Heute und Ja beschreiben eine Frequenz beziehungsweise ein Zeitintervall.', 'Prüfe, ob beide Angaben denselben Messvorgang und gleichmässige Messabstände meinen. Nur dann entspricht das Intervall dem Kehrwert der Frequenz.');
    } else if (yesOutcome === 'different' && noOutcome === 'same' && baseline && yesDetail) {
      const needsNoReview = noDetail && !sameNoText;
      const needsTitleReview = negative || continued;
      const needsYesReview = !yesComparison.different;
      add(needsNoReview || needsTitleReview || needsYesReview ? 'warn' : 'good',
        needsNoReview ? 'Nein mit heute vergleichen' : needsTitleReview ? 'Titel mit Ja vergleichen'
          : needsYesReview ? 'Änderung bei Ja prüfen' : 'Richtung nach deinem Vergleich',
        'Heute: «' + baseline + '». Bei Ja: «' + yesDetail + '». Bei Nein: «' + (noDetail || baseline) + '».',
        needsNoReview ? 'Prüfe, ob der für Nein beschriebene Zustand dieselbe Regel wie heute meint.'
          : needsTitleReview ? 'Der Titel klingt nach einer Fortsetzung. Beschreibe darin, was Ja gegenüber heute konkret ändern würde.'
          : needsYesReview ? 'Du hast «Anders als heute» ausgewählt. Vergleiche selbst, was sich konkret ändert, etwa Preis, Zeiten oder Personenkreis.'
          : 'Prüfe, ob der Titel genau die bei Ja beschriebene Änderung zur Entscheidung stellt.');
    } else {
      add('warn', 'Vergleich ergänzen', 'Vergleich unvollständig.', 'Ausgangslage, Ja-Änderung und Nein-Folge ergänzen.');
    }
  } else if (direction === 'keep' || negative || (continued && direction !== 'change')) {
    const tentative = continued && !negative && direction !== 'keep';
    add(tentative ? 'warn' : 'bad', tentative ? 'Richtung prüfen' : 'Überarbeiten',
      tentative ? '«Weiterhin» oder eine ähnliche Wendung deutet darauf hin, dass ein Ja die bisherige Praxis bestätigt.' : 'Ein Ja scheint den heutigen Zustand zu bestätigen.',
      'Wenn du eine Änderung diskutieren willst, formuliere sie als Ja-Option. Bei Nein soll die heutige Regel bestehen bleiben.');
    if (keep) hints.push(keep[1] + ' ' + keep[2] + ' aufgehoben werden? (Falls du eine Aufhebung diskutieren willst.)');
    else if (parkingFees) {
      hints.push('Wenn du die Gebühr senken willst: Soll ' + parkingFees[1] + ' die ' + parkingFees[2] + ' senken?');
      hints.push('Wenn du die Gebühr abschaffen willst: Soll ' + parkingFees[1] + ' die ' + parkingFees[2] + ' abschaffen?');
      hints.push('Wenn die Gebührenregel ausläuft und du sie verlängern willst: Soll ' + parkingFees[1] + ' die Erhebung der ' + parkingFees[2] + ' bis [Datum] verlängern?');
      hints.push('Wenn du die Gebühren etwa nach Parkdauer oder Tageszeit staffeln willst: Soll ' + parkingFees[1] + ' die ' + parkingFees[2] + ' nach [Kriterium und Tarifen] staffeln?');
    } else hints.push('Soll [zuständige Stelle] [die heutige Regel] durch [deine gewünschte Änderung] ersetzen?');
  } else if (direction === 'change' && baseline) {
    add('good', 'Nach deiner Angabe', 'Dein Ausgangspunkt: «' + baseline + '». Nach deiner Einschätzung würde Ja etwas ändern und Nein diesen Zustand belassen.', 'Gleiche den Ausgangspunkt mit einer aktuellen Quelle ab.');
  } else if (!direction && today && onYes && onNo) {
    add('warn', 'Im Beitrag beschrieben',
      'Dein Beitrag nennt «' + today + '», «' + onYes + '» und «' + onNo + '».',
      'Für einen genaueren Abgleich steht der optionale Vergleich von Heute, Ja und Nein zur Verfügung.');
  } else {
    add('warn', 'Abklären', baseline ? 'Du hast beschrieben, was heute gilt. Die Folgen von Ja und Nein sind noch zu klären.' : 'Ausgangslage offen.', 'Optionaler Abgleich unter «Heute, Ja und Nein vergleichen».');
  }

  if (foreign && (!body || !foreignConfirmed)) {
    add('warn', 'Beitrag ergänzen', 'Angaben zum Auslandsbezug fehlen.', 'Land oder Organisation, Verfahren und Rechtsrahmen im Beitrag angeben.');
  } else if (!foreign && federalMotionToLocalAuthority) {
    add('warn', 'Zuständigkeit prüfen', 'Eine Motion im eidgenössischen Parlament richtet sich an den Bundesrat. Du nennst eine Gemeinde- oder Kantonsbehörde als Adressatin.', 'Prüfe das Verfahren auf der Ebene der zuständigen Stelle. Eine Petition kann ein möglicher Weg sein.');
  } else if (!foreign && classDecision) {
    add('bad', 'Politischen Bezug ergänzen', 'Die Frage betrifft offenbar eine Entscheidung innerhalb der Klasse.', 'Wenn dein Thema politisch sein soll, wähle eine Regel oder Massnahme, die eine zuständige öffentliche Stelle beeinflussen kann.');
  } else if (/\breferendum\b.*\bohne\b.*\bvorlage\b/iu.test(route || '')) {
    add('warn', 'Vorlage für das Referendum klären', 'In deiner Angabe fehlt die Vorlage, auf die sich das Referendum beziehen würde.', 'Nenne die konkrete Vorlage und prüfe das passende Verfahren auf der zuständigen Ebene.');
  } else if (route) {
    add('good', 'Weg angegeben', 'Du nennst «' + route + '» als möglichen Weg.' + (foreign ? ' Der Auslandsbezug ist laut deiner Angabe im Beitrag erläutert.' : ''), 'Prüfe anhand einer offiziellen Quelle, wer das Verfahren anstossen darf und welche Stelle entscheiden kann.');
  } else if (petitionRecipient) {
    add('warn', 'Verfahren und Adressat im Beitrag', 'Du nennst eine Petition und den «' + petitionRecipient + '» als Adressaten.', 'Prüfe, ob die genannte Stelle über die Massnahme entscheiden kann oder das Anliegen an eine andere Stelle weiterleitet.');
  } else if (bodyProcedure) {
    add('warn', 'Verfahren im Beitrag erwähnt', 'Du erwähnst «' + bodyProcedure + '» im Beitrag.', 'Prüfe, welche Stelle zuständig ist und wie dieses Verfahren die gewünschte Änderung anstossen könnte.');
  } else {
    add('warn', 'Abklären', 'Verfahren und Zuständigkeit offen.', foreign ? 'Recherchiere das konkrete Verfahren im gewählten Land oder in der Organisation.' : 'Mögliche Verfahren stehen unter «Regeln und Recherchehilfen».');
  }

  if (!foreign && death && introduce && !negation) {
    add('bad', 'Nach Klassenregeln unzulässig', 'Der Titel deutet darauf hin, dass die Todesstrafe eingeführt oder erlaubt werden soll. In der Schweiz verbieten Art. 10 Abs. 1 BV und Protokoll Nr. 13 zur EMRK die Todesstrafe.', 'Wähle eine andere Massnahme im Bereich Strafpolitik und prüfe dafür Ausgangslage, Zuständigkeit und den Spielraum für beide Seiten.');
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
    add('warn', 'Abklären', rights === 'unclear' ? 'Nach deiner Einschätzung könnte ein Recht betroffen sein.' : 'Spielraum für beide Positionen offen.', 'Optionaler Abgleich anhand je eines Pro- und Contra-Arguments.');
  }
  return { result, hints };
}

if (typeof module === 'object' && module.exports) module.exports = { checkProposal };
