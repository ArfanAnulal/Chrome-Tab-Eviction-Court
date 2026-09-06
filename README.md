<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />



# Attorney General Tab-ney Wright 🎯


## Basic Details
### Team Name: Potato Gang


### Team Members
- Member 1: Seona Ann Tom - Viswajyothi college of Engineering and Technology
- Member 2: Arfan V Anulal - Viswajyothi college of Engineering and Technology

### Project Description
Every tab deserves to live. This Chrome extension turns closing a tab into a high-stakes legal battle. Whenever you try to close a webpage, you are immediately dragged into a retro courtroom where a local AI judge named Tab-ney Wright (running on Ollama) puts you on trial to defend why you just killed that tab.

### The Problem (that doesn't exist)
Billions of innocent Chrome tabs are mercilessly shut down every day without due process. From that 3-week-old article you swear you'll finish reading to the random Wikipedia page you opened at 2 AM, countless tabs are wiped out of existence with zero legal representation or chance to defend themselves.

### The Solution (that nobody asked for)
Tab Eviction Court introduces real judicial consequences to your browsing habits:
Plead Your Case: Type out your defense explaining why the closed tab had to go.
Guilty Verdict: If the judge rejects your excuse, the murdered tab is immediately resurrected, and you are locked out of Chrome for 30 minutes to think about what you did.
Not Guilty Verdict: If your plea convinces the court, the tab is officially allowed to close in peace.
Official Court Affidavit: Win or lose, you get a downloadable PDF court affidavit documenting the trial, your testimony, and the final ruling.

## Technical Details
### Technologies/Components Used
For Software:
Languages:
Python 3.11+,JavaScript ,HTML5 & CSS3 

Frameworks & Servers:
FastAPI (RESTful API backend)
Uvicorn (ASGI web server)

Libraries:
ReportLab (Automated PDF affidavit generation)
Pydantic (Request validation & JSON schema enforcement)
Requests / HTTPX (Ollama API bridge communication)

Tools & Runtimes:
Ollama (llama3.2:3b edge model runtime)
Google Chrome / DevTools (Extension sandbox & tab event debugging)
Git & GitHub (Source control & release distribution)


### Implementation
For Software:

# Installation

### 1. Download Project
Download and extract the project `.zip` file (or clone the repository):
```bash
git clone https://github.com/ArfanAnulal/Chrome-Tab-Eviction-Court.git
cd Chrome-Tab-Eviction-Court
```

### 2. Install Ollama & Pull the AI Model
1. Download and install **[Ollama](https://ollama.com/)**.
2. Open your terminal and pull the local Llama 3.2 3B model:
```bash
ollama pull llama3.2:3b
```

### 3. Setup Python Virtual Environment & Dependencies
Create a Python virtual environment and install backend dependencies:
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Load the Chrome Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** via the top-right toggle switch.
3. Click **Load unpacked**.
4. Select the `extension/` directory inside the project folder.

---

# Run

### 1. Launch the Local Server & AI Backend
Double-click or run `run_court.bat` from your project folder:
```cmd
run_court.bat
```
*This launches both the Ollama engine and the FastAPI server on `http://127.0.0.1:8000`.*

### 2. Test in Chrome
1. Open any active tab in Google Chrome.
2. Close the tab.
3. You will be automatically summoned to the **Tab Eviction Courtroom** to present your defense before Judge Tab-ney Wright!


### Project Documentation
For Software:

# Screenshots (Add at least 3)
![[Screenshot1]](https://github.com/ArfanAnulal/Chrome-Tab-Eviction-Court/blob/main/Screenshot1.png)(Courtin Session-1)
*Case is being presented in the court*

![[Screenshot2]](https://github.com/ArfanAnulal/Chrome-Tab-Eviction-Court/blob/main/Screenshot2.png)(Verdict-1)
*User found Guilty*

![[Screenshot3]](https://github.com/ArfanAnulal/Chrome-Tab-Eviction-Court/blob/main/Screenshot%203.png)(Court order)
*Court order on being guilty*

![[Screenshot4]](https://github.com/ArfanAnulal/Chrome-Tab-Eviction-Court/blob/main/Screenshot4.png)(Courtin Session-2)
*Case is being presented in the court*

![[Screenshot5]](https://github.com/ArfanAnulal/Chrome-Tab-Eviction-Court/blob/main/Screenshot5.png)(Verdict-2)
*User Pardoned*

![[Screenshot6]](https://github.com/ArfanAnulal/Chrome-Tab-Eviction-Court/blob/main/Screenshot6.png)(Court Order)
*Court order on pardoned*

![[Screenshot7]](https://github.com/ArfanAnulal/Chrome-Tab-Eviction-Court/blob/main/Screenshot7.png)(Discord Notification)
*Discord Notification for conviction*

# Diagrams
![Workflow](Add your workflow/architecture diagram here)
*Add caption explaining your workflow*

### Project Demo
# Video
[Video Link](https://drive.google.com/file/d/1H3EtlZkuHIhQEKU5VeuETLDfvTjsMj4I/view?usp=sharing)
*This video demonstrates the tab eviction court in action.*


## Team Contributions
- **Seona Ann Tom**: Developed the FastAPI backend architecture, local Ollama Llama 3.2 3B prompt engineering & structured verdict inference engine, automated ReportLab PDF court affidavit generator, and Discord webhook notification system.
- **Arfan V Anulal**: Designed and implemented the retro Ace Attorney courtroom UI/UX, interactive typewriter dialogue system, dynamic audio engine (SFX & TTS speech synthesis), CSS stage animations, and Chrome Extension Manifest V3 background tab management.


---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)



