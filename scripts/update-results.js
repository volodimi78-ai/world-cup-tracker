const fs = require("fs");

const TERRIKON_URL = "https://terrikon.com/worldcup-2026";
const INDEX_PATH = "index.html";
const DRY_RUN = process.env.DRY_RUN === "1";

const TEAM_MAP = {
  "Австралия": "Australia",
  "Австрия": "Austria",
  "Алжир": "Algeria",
  "Англия": "England",
  "Аргентина": "Argentina",
  "Бельгия": "Belgium",
  "Босния": "Bosnia and Herzegovina",
  "Бразилия": "Brazil",
  "Гаити": "Haiti",
  "Гана": "Ghana",
  "Германия": "Germany",
  "ДР Конго": "DR Congo",
  "Египет": "Egypt",
  "Иордания": "Jordan",
  "Ирак": "Iraq",
  "Иран": "Iran",
  "Испания": "Spain",
  "Кабо-Верде": "Cabo Verde",
  "Канада": "Canada",
  "Катар": "Qatar",
  "Колумбия": "Colombia",
  "Коста-Рика": "Costa Rica",
  "Кот-д'Ивуар": "Ivory Coast",
  "Кот-д’Ивуар": "Ivory Coast",
  "Кюрасао": "Curacao",
  "Марокко": "Morocco",
  "Мексика": "Mexico",
  "Нидерланды": "Netherlands",
  "Новая Зеландия": "New Zealand",
  "Норвегия": "Norway",
  "Панама": "Panama",
  "Парагвай": "Paraguay",
  "Португалия": "Portugal",
  "Саудовская Аравия": "Saudi Arabia",
  "Сенегал": "Senegal",
  "США": "United States",
  "Тунис": "Tunisia",
  "Турция": "Turkey",
  "Узбекистан": "Uzbekistan",
  "Уругвай": "Uruguay",
  "Франция": "France",
  "Хорватия": "Croatia",
  "Чехия": "Czechia",
  "Швейцария": "Switzerland",
  "Швеция": "Sweden",
  "Шотландия": "Scotland",
  "Эквадор": "Ecuador",
  "ЮАР": "South Africa",
  "Южная Корея": "South Korea",
  "Япония": "Japan"
};

const PLAYER_MAP = {
  "Аббосбек Файзуллаев": "Abbosbek Fayzullaev",
  "Аймен Хуссейн": "Aymen Hussein",
  "Али Олван": "Ali Olwan",
  "Амад Диалло": "Amad Diallo",
  "Батурина М.": "Martin Baturina",
  "Беллингем Дж.": "Jude Bellingham",
  "Барколя Б.": "Bradley Barcola",
  "Берджесс": "Cameron Burgess",
  "Гарри Кейн": "Harry Kane",
  "Галарза": "Matias Galarza",
  "Галарса": "Matias Galarza",
  "Джака Г.": "Granit Xhaka",
  "Дэвид Дж.": "Jonathan David",
  "Даниэль Муньос": "Daniel Munoz",
  "Винисиус Жуниор": "Vinicius Junior",
  "Йоан Висса": "Yoane Wissa",
  "Калеб Йиренки": "Caleb Yirenkyi",
  "Кейн Г.": "Harry Kane",
  "Килиан Мбаппе": "Kylian Mbappe",
  "Леандро Кампас": "Leandro Campaz",
  "Ларин К.": "Cyle Larin",
  "Луис Диас": "Luis Diaz",
  "Кунья": "Matheus Cunha",
  "Манзамби": "Johan Manzambi",
  "Маркус Рэшфорд": "Marcus Rashford",
  "Марко Арнаутович": "Marko Arnautovic",
  "Манаи": "Al-Mannai",
  "Махмич": "Ermin Mahmic",
  "Мбаппе К.": "Kylian Mbappe",
  "Мбие И.": "Ibrahima Mbiaye",
  "Месси Л.": "Lionel Messi",
  "Мокоэна": "Teboho Mokoena",
  "Невеш Р.": "Ruben Neves",
  "Остигор Л.": "Leo Ostigard",
  "Петар Муса": "Petar Musa",
  "Романо Шмид": "Romano Schmid",
  "Ромо": "Luis Romo",
  "Сайбари": "Ismael Saibari",
  "Салиба": "Nathan Saliba",
  "Садилек М.": "Michal Sadilek",
  "Торстведт К.": "Kristian Thorstvedt",
  "Варгас Р.": "Ruben Vargas",
  "Фримен": "Alex Freeman",
  "Холанд Э.": "Erling Haaland",
  "Шмид Р.": "Romano Schmid",
  "Язан Аль-Араб": "Yazan Al-Arab"
};

function decodeHtml(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ""));
}

function mapTeam(name) {
  return TEAM_MAP[decodeHtml(name)] || decodeHtml(name);
}

function normalizePlayer(raw) {
  let name = decodeHtml(raw)
    .replace(/\((?:п\.?|пен\.?|pen\.?|пенальти)\)/gi, "")
    .replace(/\((?:а\/г|аг|авт\.?|автогол|own goal)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return PLAYER_MAP[name] || name;
}

function isOwnGoal(raw) {
  return /\((?:а\/г|аг|авт\.?|автогол|own goal)\)/i.test(raw);
}

function extractMatches(html) {
  const rows = [...html.matchAll(/<table class="gameresult">([\s\S]*?)<\/table>/g)]
    .flatMap(match => [...match[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(row => row[1]));

  return rows.map(row => {
    const score = row.match(/<td class="score">\s*<a href="\/football\/matches\/(\d+)"\s*>(\d+):(\d+)<\/a>\s*<\/td>/);
    if (!score) return null;
    const teams = [...row.matchAll(/<td class="team"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/td>/g)]
      .map(team => stripTags(team[1]));
    if (teams.length < 2) return null;
    return {
      terrikonId: score[1],
      home: mapTeam(teams[0]),
      away: mapTeam(teams[1]),
      homeScore: Number(score[2]),
      awayScore: Number(score[3])
    };
  }).filter(Boolean);
}

function parseLocalMatches(html) {
  const matches = new Map();
  const pattern = /m\("([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)","([^"]+)"\)/g;
  for (const match of html.matchAll(pattern)) {
    matches.set(`${match[4]}|${match[5]}`, {
      id: match[1],
      group: match[2],
      home: match[4],
      away: match[5],
      venue: match[6]
    });
  }
  return matches;
}

function extractOfficialResultsSource(html) {
  const start = html.indexOf("const OFFICIAL_RESULTS = ");
  if (start === -1) throw new Error("OFFICIAL_RESULTS not found");
  const objectStart = html.indexOf("{", start);
  let depth = 0;
  for (let i = objectStart; i < html.length; i += 1) {
    const ch = html[i];
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) {
      return {
        start: objectStart,
        end: i + 1,
        source: html.slice(objectStart, i + 1)
      };
    }
  }
  throw new Error("OFFICIAL_RESULTS object end not found");
}

function parseOfficialResults(html) {
  const object = extractOfficialResultsSource(html);
  return {
    ...object,
    data: Function(`"use strict"; return (${object.source});`)()
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "world-cup-tracker-github-action"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

function parseGoalLine(raw, team) {
  const text = stripTags(raw);
  const minuteMatch = text.match(/(\d+(?:\+\d+)?)'/);
  if (!minuteMatch) return null;
  const playerRaw = text.slice(0, minuteMatch.index).trim();
  if (!playerRaw) return null;
  const minute = minuteMatch[1].includes("+") ? minuteMatch[1] : Number(minuteMatch[1]);
  return {
    team,
    scorer: normalizePlayer(playerRaw),
    minute,
    ...(isOwnGoal(playerRaw) ? { ownGoal: true } : {})
  };
}

async function fetchGoals(terrikonId) {
  const html = await fetchText(`https://terrikon.com/football/matches/${terrikonId}`);
  const teams = [...html.matchAll(/<div class="team[12]">[\s\S]*?<img[^>]*alt="([^"]+)"[^>]*>/g)]
    .map(team => mapTeam(team[1]));
  if (teams.length < 2) return null;

  const goalsBlock = html.match(/<div><strong>Голы<\/strong><\/div>([\s\S]*?)<div style="width:100%; overflow: hidden;">/);
  if (!goalsBlock) return [];

  const goals = [];
  const divPattern = /<div style="float:\s*(left|right);[^>]*>([\s\S]*?)<\/div>/g;
  for (const match of goalsBlock[1].matchAll(divPattern)) {
    const team = match[1] === "left" ? teams[0] : teams[1];
    const parts = match[2].split(/<br\s*\/?>/i).map(part => part.trim()).filter(Boolean);
    for (const part of parts) {
      const goal = parseGoalLine(part, team);
      if (goal) goals.push(goal);
    }
  }
  return goals;
}

function formatValue(value) {
  if (typeof value === "string") return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (value === null) return "null";
  throw new Error(`Unsupported value: ${value}`);
}

function formatGoal(goal) {
  const entries = [
    ["team", goal.team],
    ["scorer", goal.scorer],
    ["minute", goal.minute]
  ];
  if (goal.ownGoal) entries.push(["ownGoal", true]);
  return `{ ${entries.map(([key, value]) => `${key}: ${formatValue(value)}`).join(", ")} }`;
}

function formatResults(results) {
  const ids = Object.keys(results).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const chunks = ids.map(id => {
    const result = results[id];
    const goals = result.goals || [];
    return `      ${id}: {
        home: ${result.home},
        away: ${result.away},
        status: ${formatValue(result.status || "done")},
        source: ${formatValue(result.source || "Terrikon")},
        goals: [
${goals.map(goal => `          ${formatGoal(goal)}`).join(",\n")}
        ]
      }`;
  });
  return `{\n${chunks.join(",\n")}\n    }`;
}

async function main() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  if (!html.includes("<title>ЧМ 2026 - трекер</title>")) {
    throw new Error("index.html is not valid UTF-8 tracker HTML");
  }

  const localMatches = parseLocalMatches(html);
  const official = parseOfficialResults(html);
  const terrikonHtml = await fetchText(TERRIKON_URL);
  const terrikonMatches = extractMatches(terrikonHtml);

  let changed = false;
  for (const terrikonMatch of terrikonMatches) {
    const local = localMatches.get(`${terrikonMatch.home}|${terrikonMatch.away}`);
    if (!local) {
      console.log(`Skipped unmatched match: ${terrikonMatch.home} - ${terrikonMatch.away}`);
      continue;
    }

    const existing = official.data[local.id];
    const existingGoalsAreComplete =
      Array.isArray(existing?.goals) &&
      (existing.goals.length > 0 || (existing.home === 0 && existing.away === 0));
    if (
      existing &&
      existing.home === terrikonMatch.homeScore &&
      existing.away === terrikonMatch.awayScore &&
      existing.status === "done" &&
      existingGoalsAreComplete
    ) {
      continue;
    }

    const goals = await fetchGoals(terrikonMatch.terrikonId);
    if (goals === null) {
      console.log(`Skipped ${local.id}: goal protocol not found`);
      continue;
    }
    if ((terrikonMatch.homeScore + terrikonMatch.awayScore) > 0 && goals.length === 0) {
      console.log(`Skipped ${local.id}: non-zero score without goal protocol`);
      continue;
    }

    official.data[local.id] = {
      home: terrikonMatch.homeScore,
      away: terrikonMatch.awayScore,
      status: "done",
      source: `Terrikon, ${new Date().toISOString().slice(0, 10)}`,
      goals
    };
    changed = true;
    console.log(`Updated ${local.id}: ${terrikonMatch.home} ${terrikonMatch.homeScore}-${terrikonMatch.awayScore} ${terrikonMatch.away}`);
  }

  if (!changed) {
    console.log("No result updates found.");
    return;
  }

  const nextHtml = html.slice(0, official.start) + formatResults(official.data) + html.slice(official.end);
  if (!nextHtml.includes("<title>ЧМ 2026 - трекер</title>")) {
    throw new Error("Refusing to write: UTF-8 title check failed");
  }
  Function(`"use strict"; ${nextHtml.match(/<script>([\s\S]*)<\/script>/)[1]}`);

  if (DRY_RUN) {
    console.log("DRY_RUN=1: changes detected but index.html was not written.");
    return;
  }

  fs.writeFileSync(INDEX_PATH, nextHtml, "utf8");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
