<div align="center">

# ✨ APPIXO ✨

### 🔄 AI-Powered Code Language Converter

<p align="center">
  <em>Translate code between programming languages instantly using Google Gemini AI</em>
</p>

<br/>

![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Chakra UI](https://img.shields.io/badge/Chakra_UI-2.8-319795?style=for-the-badge&logo=chakraui&logoColor=white)

<br/>

[🚀 Features](#-features) •
[📸 Screenshots](#-screenshots) •
[🛠 Tech Stack](#-tech-stack) •
[⚡ Quick Start](#-quick-start) •
[📁 Project Structure](#-project-structure) •
[🤝 Contributing](#-contributing)

---

</div>

<br/>

## 🎯 What is Appixo?

**Appixo** is a sleek, modern web application that converts code between **10 programming languages** using the power of **Google Gemini AI**. Whether you're migrating a project, learning a new language, or just curious how your code looks in another syntax — Appixo has you covered.

> 💡 Paste your code, pick a target language, click convert — and get **idiomatic, production-ready** output with a detailed summary of what changed.

<br/>

## 🚀 Features

| Feature | Description |
|---|---|
| 🔄 **Smart Code Conversion** | Translate code between 10 languages with one click |
| 🤖 **Gemini AI Powered** | Uses Google's Gemini 2.0 Flash for accurate, context-aware translations |
| 📝 **Custom Instructions** | Guide the conversion with your own style preferences |
| 🏷️ **Preset Instructions** | Quick-apply common conversion guidelines |
| 🔀 **Language Swap** | Instantly swap source and target languages |
| 📋 **One-Click Copy** | Copy the converted output to clipboard |
| 📊 **Conversion Insights** | Get a summary, key changes, and warnings for every conversion |
| 🎨 **Stunning UI** | Glassmorphism design with liquid chrome animated background |
| 📱 **Fully Responsive** | Works seamlessly on desktop, tablet, and mobile |
| ⚡ **Real-Time Feedback** | Loading states, error banners, and health checks |

<br/>

## 💻 Supported Languages

<div align="center">

| | Language | | Language |
|---|---|---|---|
| 🟦 | **C** | 🟧 | **C++** |
| 🟨 | **JavaScript** | 🔵 | **TypeScript** |
| 🐍 | **Python** | ☕ | **Java** |
| 🐹 | **Go** | 🦀 | **Rust** |
| 🟣 | **C#** | 🐘 | **PHP** |

</div>

<br/>

## 🛠 Tech Stack

### 🎨 Frontend
- **⚛️ React 18** — Component-based UI
- **⚡ Vite** — Lightning-fast dev server & build tool
- **🎭 Chakra UI** — Accessible component library
- **🎬 Framer Motion** — Smooth animations
- **✏️ Ace Editor** — Professional code editing with syntax highlighting
- **📄 React Markdown** — Rich text rendering
- **🌊 OGL** — WebGL liquid chrome background effect

### ⚙️ Backend
- **🟢 Node.js + Express** — RESTful API server
- **🤖 Google Generative AI SDK** — Gemini integration with structured output
- **🔐 dotenv** — Secure environment variable management
- **🔄 CORS** — Cross-origin request handling

<br/>

## ⚡ Quick Start

### 📋 Prerequisites

- **Node.js** `v18+` recommended
- **npm** or **yarn**
- **Google Gemini API Key** — [Get one free here](https://aistudio.google.com/app/apikey)

### 1️⃣ Clone the repository

```bash
git clone https://github.com/ShubhamSinghRawat10/APPIXO.git
cd APPIXO
```

### 2️⃣ Set up the Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

> ⚠️ **Important:** Replace `your_gemini_api_key_here` with your actual Gemini API key.

Start the backend server:

```bash
npm start
```

The backend will be running at `http://localhost:8080` 🟢

### 3️⃣ Set up the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be running at `http://localhost:3000` 🎨

### 4️⃣ Open & Enjoy! 🎉

Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser and start converting code!

<br/>

## 📁 Project Structure

```
APPIXO/
│
├── 📂 backend/                    # Express API server
│   ├── 📄 index.js                # Server entry point & API routes
│   ├── 📄 .env.example            # Environment variable template
│   ├── 📄 .env                    # Your environment variables (git-ignored)
│   ├── 📄 package.json            # Backend dependencies
│   └── 📄 .gitignore
│
├── 📂 frontend/                   # React + Vite application
│   ├── 📂 src/
│   │   ├── 📂 components/
│   │   │   ├── 📄 CodeEditor.jsx       # Code editor wrapper
│   │   │   ├── 📄 DisplayInformation.jsx # Result display
│   │   │   ├── 📄 Footer.jsx           # Page footer
│   │   │   ├── 📄 GithubLink.jsx       # GitHub import feature
│   │   │   ├── 📄 LiquidChrome.jsx     # WebGL background effect
│   │   │   ├── 📄 Loading.jsx          # Loading spinner
│   │   │   └── 📄 Navbar.jsx           # Navigation bar
│   │   ├── 📂 data/
│   │   │   └── 📄 languages.js         # Language configs & examples
│   │   ├── 📂 pages/
│   │   │   └── 📄 Home.jsx             # Main home page
│   │   ├── 📂 utils/
│   │   ├── 📄 App.jsx                  # Root application component
│   │   ├── 📄 App.css                  # Global styles
│   │   └── 📄 main.jsx                 # Vite entry point
│   ├── 📄 vite.config.mjs              # Vite configuration
│   └── 📄 package.json                 # Frontend dependencies
│
└── 📄 README.md                   # You are here! 👋
```

<br/>

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | 🏥 Health check — returns server status and Gemini config |
| `POST` | `/api/convert` | 🔄 Convert code between languages |

### 📨 Convert Request Body

```json
{
  "sourceLanguage": "python",
  "targetLanguage": "javascript",
  "sourceCode": "def hello():\n    print('Hello, World!')",
  "instructions": "Keep it clean and idiomatic"
}
```

### 📬 Convert Response

```json
{
  "sourceLanguage": "python",
  "targetLanguage": "javascript",
  "convertedCode": "function hello() {\n  console.log('Hello, World!');\n}",
  "summary": "Converted Python function to JavaScript using console.log for output.",
  "keyChanges": ["Replaced print() with console.log()", "Used function declaration"],
  "warnings": [],
  "model": "gemini-2.0-flash"
}
```

<br/>

## 🎨 Design Highlights

- 🌊 **Liquid Chrome Background** — mesmerizing WebGL-powered animated backdrop
- 🪟 **Glassmorphism UI** — frosted-glass panels with backdrop blur
- 🌈 **Custom Color Palette** — teal primary, warm orange accents on a deep dark surface
- ✨ **Micro-Animations** — smooth hover effects, transitions, and button feedback
- 📐 **Responsive Grid Layout** — adapts beautifully from mobile to ultrawide

<br/>

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. 🍴 **Fork** the repository
2. 🌿 **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 **Commit** your changes (`git commit -m '✨ Add amazing feature'`)
4. 📤 **Push** to the branch (`git push origin feature/amazing-feature`)
5. 📝 **Open** a Pull Request

<br/>

## 📜 License

This project is licensed under the **ISC License**.

<br/>

## 👤 Author

<div align="center">

**Shubham Singh Rawat**

[![Gmail](https://img.shields.io/badge/Gmail-shubhamsinghrawat01-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:shubhamsinghrawat01@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-ShubhamSinghRawat10-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ShubhamSinghRawat10)

</div>

<br/>

## ⭐ Show Your Support

If you found this project helpful or interesting, please consider giving it a ⭐ **star** on GitHub — it means a lot! 🙏

<div align="center">

---

<p>
  Made with ❤️ and ☕ by <strong>Shubham Singh Rawat</strong>
</p>

<p>
  <sub>🔄 Appixo — Convert code, not your patience.</sub>
</p>

</div>
