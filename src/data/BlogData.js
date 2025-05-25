// src/data/blogData.js
export const blogPosts = [
{
id: "lifting-code-and-plates",
title: "From Lifting Code to Lifting Plates: Building AI, Games, and a Better Bench",
date: "May 25, 2025",
summary: "Based on our conversations can you write me a 500 word blog post?        ",
content: `For the past year, I’ve been living at the intersection of software engineering, artificial intelligence, and powerlifting—three passions that, at first glance, might not seem connected. But to me, they’re all about optimization, iteration, and building things that last.

After a career in software engineering, including roles at Capital One and T-Mobile, I took time off to focus on my growing family and personal development. That break turned out to be one of the most productive periods of my life. I went deep into full-stack development, launched AI-driven projects, built a multiplayer game from scratch, and restructured my strength training program to hit new PRs—both in the gym and in my codebase.

One of my flagship projects is Azoni AI, my portfolio and playground for building next-gen AI experiences. It features a series of intelligent agents—custom GPTs that serve real users. Whether you’re a recruiter asking about my experience, a card gamer interacting with FAB-GPT, or someone uploading PDFs to chat with their documents, each assistant has its own context, tone, and purpose. It’s not just a website—it’s a living ecosystem that evolves as I do.

Beyond web development, I’ve been diving into the world of AI agents and backend orchestration. I integrated FastAPI and MLflow to log usage and support future scaling, and I’m actively experimenting with how different LLMs (like OpenAI, Grok, and DeepSeek) can act as NPCs in an interactive virtual world. It’s part dev sandbox, part game, and entirely open to wherever my curiosity leads.

But I don’t just train models—I train myself too. I recently benched 315 lbs and have my sights set on a 405 bench, 500 squat, and 600 deadlift by the end of the year. My training group is dialed in, and we’ve even started developing a workout web app that mimics the way we build our weekly programs: collaborative, data-driven, and chat-based. It includes user logins, workout generation via AI, and real-time editing—because our progress should be as adaptive as our code.

The beauty of this journey is that every project feeds into the next. Lessons from lifting—like discipline, progressive overload, and recovery—translate into how I approach engineering problems. And building AI systems that feel alive requires the same empathy and iteration I bring to coaching a lifter through a tough set.

If there’s one thing I’ve learned, it’s that success isn’t about grinding one track forever—it’s about following the threads of what excites you, learning fast, and building what no one else sees yet. Whether it’s a blockchain transaction analyzer, a Neverwinter Nights mod, or an AI gym coach, I’m always pushing to turn ideas into action.

This is just the beginning. I’m building smarter agents, stronger code, and a stronger me—one rep at a time.`
}

,
{
id: "introducing-azoni-ai",
title: "Introducing Azoni AI",
date: "May 18, 2025",
summary: "Learn how Azoni AI is redefining personal AI experiences with custom assistants, intelligent agents, and conversational tools that empower users and developers alike.",
content: `
## What is Azoni AI?

Azoni AI is a personalized AI platform built for modern users and developers who want more than just a chatbot. It's a system of intelligent agents, custom assistants, and extensible tools designed to help you build, learn, and interact in smarter ways.

Whether you're creating content, writing code, applying for jobs, or just exploring ideas — Azoni AI adapts to you.

---

## Why I Built It

The existing AI tools felt either too generic or too rigid. I wanted to build something that:

- Understands your unique context
- Supports **multiple assistants** (not just one)
- Is **developer-friendly**, with support for extensibility
- Has a personality — or several — that you can customize

---

## Key Features

### 🎭 Multi-Agent Support
Switch between different AI assistants on the fly — from a career-focused helper to a game master or a PDF analyst.

### 🧠 Persistent Memory
Each assistant can store context over time, so conversations stay relevant — whether you're debugging code or preparing for an interview.

### 📄 Document-Aware Assistants
Upload resumes, job descriptions, or PDF manuals — and have an assistant tailored to those documents instantly.

### 🔒 Secure & Private
All prompts and context are routed through a custom backend. Azoni AI does not store personal data without your permission.

---

## Designed for Real Use Cases

Azoni AI was created to support real workflows:

- Recruiters and job seekers use it to prep resumes and craft better applications.
- Students use it to clarify course content and explore research ideas.
- Developers create new tools and test prompts for LLMs.
- Gamers and creatives use it for lore, character writing, and interactive NPCs.

---

## What’s Next?

I'm working on:
- 🎮 Game-world integration with live AI characters
- 🛠️ Tool use with agents (via LangChain + OpenAI functions)
- 📊 MLflow tracking for AI performance and behavior
- 🧬 Local AI support for full privacy

---

## Try It Out

Azoni AI is live now at [azoni.ai](https://azoni.ai). Talk to one of the built-in assistants — or create your own.

This is just the beginning. I'm building a world where everyone has their own digital brain — and the tools to shape it.
`
},
{
id: "how-i-use-gpt4o",
title: "Behind the Scenes: How I Use GPT-4o",
date: "May 10, 2025",
summary: "A technical dive into how Azoni leverages OpenAI’s GPT-4o model.",
content: `
By optimizing prompts, managing context, and layering assistants, I keep conversations natural and lightning-fast.
`
}
];
//   {
//     id: "how-i-use-gpt4o",
//     title: "Behind the Scenes: How I Use GPT-4o",
//     date: "May 10, 2025",
//     summary: "A technical dive into how Azoni leverages OpenAI’s GPT-4o model.",
//     content: `    `
//   }