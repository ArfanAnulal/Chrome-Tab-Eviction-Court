// Toggle this to false when Dev 1 gives you the live FastAPI server
const USE_MOCK = true; 

async function getJudgeRuling(tabTitle, tabUrl, plea) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1800)); // Simulate thinking lag
    return {
      verdict: Math.random() > 0.3 ? "GUILTY" : "PARDONED",
      ruling: "Your claim of 'reading it later' has been scientifically disproven across 400 prior cases. The tab remains."
    };
  }
  const res = await fetch("http://127.0.0.1:8000/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tab_title: tabTitle, tab_url: tabUrl, plea: plea })
  });
  return await res.json();
}