const params = new URLSearchParams(window.location.search);
const url = params.get("url") || "Unknown URL";
const title = params.get("title") || "Unknown Title";

document.getElementById("tab-url").textContent = url;
document.getElementById("tab-title").textContent = title;

document.getElementById("submit-btn").addEventListener("click", async () => {
  const plea = document.getElementById("plea").value;
  const verdictEl = document.getElementById("verdict");
  const sentenceEl = document.getElementById("sentence");
  const pdfBtn = document.getElementById("pdf-btn");

  verdictEl.textContent = "The Judge is deliberating...";
  sentenceEl.textContent = "";
  pdfBtn.style.display = "none";

  try {
    const res = await fetch("http://127.0.0.1:8000/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tab_url: url, tab_title: title, plea_text: plea })
    });

    let data = await res.json();
    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    const verdict = (data.verdict || "UNKNOWN").toUpperCase();
    const sentence = data.sentence || "No statement from the bench.";

    verdictEl.textContent = `VERDICT: ${verdict}`;
    sentenceEl.textContent = sentence;

    // Attach PDF link
    if (data.pdf_download_url) {
      pdfBtn.href = data.pdf_download_url;
      pdfBtn.style.display = "inline-block";
    }

    if (verdict.includes("GUILTY")) {
      chrome.runtime.sendMessage({ action: "REVIVE_TAB", url: url });
    }
  } catch (err) {
    console.error("Courtroom UI Error:", err);
    verdictEl.textContent = "Court Error: " + err.message;
  }
});