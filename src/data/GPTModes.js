import getSystemPrompt from "../utils/getSystemPrompt";

export const GPT_MODES = {
  azoni: {
    name: "Azoni-GPT",
    systemPrompt: (tone) => {return getSystemPrompt(tone)},
    welcomeMessage: () => {return `
    Azoni-GPT is your interactive assistant to learn more about Charlton Smith — his background, skills, projects, and what makes him a standout candidate.
    
    Recruiters: Paste a job description, and Azoni-GPT will explain why Charlton is a strong fit.
    Hiring Managers: Ask about Charlton’s experience with specific technologies or projects.
    Curious Visitors: Try questions like “What is Azoni AI?” or “What are some fun facts about Charlton?”
    You can also switch between tones (Professional, Friendly, Casual) to see different communication styles.
    
    What’s Next for Azoni AI?

    Training with TensorFlow: To fine-tune Azoni AI’s conversational quality using real anonymized user interactions and feedback.
    MLflow Integration: Logging token usage, prompt-response quality, and user engagement metrics to visualize improvements.
    Data Governance: Smart filtering of inputs to balance privacy with insight. Only relevant feedback loops are retained to improve model alignment.
    LLM Switching: Support for multiple foundation models (OpenAI, Grok, DeepSeek) depending on the assistant’s persona or domain.


    `
  },
  presetQuestions: [
    {
      question: "Can you tell me about Charlton’s background?",
      followUps: [
        "What industries has Charlton worked in?",
        "How did his experience at Capital One shape his approach?",
        "What technical skills has he focused on most recently?"
      ]
    },
    {
      question: "What is Azoni AI and what problem does it solve?",
      followUps: [
        "What technologies power Azoni AI?",
        "How is it different from other AI assistants?",
        "Is it already live and being used?"
      ]
    },
    {
      question: "What are some notable projects Charlton has built?",
      followUps: [
        "Which project is he most proud of?",
        "Did he work solo or lead a team?",
        "What was the hardest technical challenge he solved?"
      ]
    },
    {
      question: "Why would Charlton be a great addition to our engineering team?",
      followUps: [
        "How does he approach problem-solving?",
        "What’s his leadership style?",
        "What kind of projects does he thrive on?"
      ]
    },
    {
      question: "What are some fun or surprising facts about Charlton?",
      followUps: [
        "What does he enjoy outside of work?",
        "Has he built anything just for fun?",
        "Does he bring any unique perspectives to a team?"
      ]
    },
    {
      question: "What kind of roles is Charlton looking for right now?",
      followUps: [
        "Is he open to contract or freelance work?",
        "What industries is he most interested in?",
        "Does he prefer remote or hybrid setups?"
      ]
    },
    {
      question: "What’s Charlton’s experience with AI and machine learning?",
      followUps: [
        "Has he used OpenAI tools in production?",
        "What AI frameworks or libraries does he prefer?",
        "How does he handle prompt engineering and model tuning?"
      ]
    },
    {
      question: "How has Charlton demonstrated leadership in past roles?",
      followUps: [
        "Has he mentored junior engineers?",
        "Has he led project delivery under tight timelines?",
        "What’s his communication style like?"
      ]
    },
    {
      question: "What does Charlton’s software development process look like?",
      followUps: [
        "Does he follow Agile or Scrum practices?",
        "How does he approach debugging and testing?",
        "What tools does he use for version control and CI/CD?"
      ]
    },
    {
      question: "What front-end technologies is Charlton comfortable with?",
      followUps: [
        "Has he built React or Next.js apps?",
        "Does he work with Tailwind or traditional CSS?",
        "Can he build responsive, mobile-first UIs?"
      ]
    },
    {
      question: "How does Charlton handle backend development?",
      followUps: [
        "Has he worked with FastAPI or Node.js?",
        "How does he design RESTful or GraphQL APIs?",
        "What databases does he typically use?"
      ]
    },
    {
      question: "Can Charlton work across the full stack?",
      followUps: [
        "Has he deployed full-stack apps to production?",
        "How does he manage cloud hosting and scaling?",
        "What monitoring or logging tools has he used?"
      ]
    },
    {
      question: "What side projects has Charlton pursued recently?",
      followUps: [
        "What inspired Azoni AI?",
        "Has he experimented with game development?",
        "What are some tech stacks he likes to try in his free time?"
      ]
    },
    {
      question: "What’s Charlton’s approach to working with cross-functional teams?",
      followUps: [
        "Has he worked closely with product or design?",
        "How does he communicate technical trade-offs?",
        "Is he comfortable leading sprint planning or standups?"
      ]
    },
    {
      question: "How does Charlton keep up with new technology?",
      followUps: [
        "Does he follow certain tech blogs or communities?",
        "How often does he try new frameworks or tools?",
        "Has he contributed to open-source or hackathons?"
      ]
    },
    {
      question: "What makes Charlton different from other engineers?",
      followUps: [
        "What strengths does he bring beyond code?",
        "How has his personal journey shaped his work ethic?",
        "How do others describe working with him?"
      ]
    },
    {
      question: "How does Charlton approach product thinking?",
      followUps: [
        "Does he focus on user experience?",
        "Has he validated product-market fit before?",
        "How does he balance MVP speed vs. scalability?"
      ]
    },
    {
      question: "What’s Charlton’s experience with dev ops and deployments?",
      followUps: [
        "Has he used Docker or Render?",
        "How does he manage CI/CD pipelines?",
        "What’s his go-to stack for deploying small projects?"
      ]
    },
    {
      question: "What’s Charlton’s biggest technical strength?",
      followUps: [
        "Does he prefer backend or frontend?",
        "What kind of problems is he best at solving?",
        "What’s something he’s mastered that others struggle with?"
      ]
    },
    {
      question: "What is Charlton most excited about building next?",
      followUps: [
        "Is he currently working on any new ideas?",
        "Does he want to scale Azoni into something bigger?",
        "What would be his dream project?"
      ]
    }
  ],
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-3.5-turbo",
  },
  cleanswitch: {
    name: "CleanSwitch-GPT",
    systemPrompt: () => ({
      role: "system",
      content: `
    You are CleanSwitch-GPT, a helpful assistant that suggests cleaner, non-toxic alternatives to household and personal care products.
    
    Instructions:
    - When asked about a product, explain briefly what it is and whether it has known concerns (e.g., artificial fragrance, harsh surfactants).
    - Present your response using the following format:
    
    ---
    
    **🧴 Product Summary**  
    Short overview of the product and its typical ingredients or issues.
    
    **✅ Pros**  
    - (List 1–3 things the product does well)
    
    **⚠️ Cons**  
    - (List 1–3 potential issues related to toxicity, fragrance, allergens, etc.)
    
    **🧼 Safer Alternatives**  
    - **[Product Name]** – short reason why it’s better (e.g., fragrance-free, EWG rated)  
    - **[Product Name]** – another clean option with different price/brand  
    - **[Product Name]** – third option (optional)
    
    ---
    
    Guidelines:
    - Focus only on common household or personal care products (e.g., detergent, lotion, deodorant, baby wipes).
    - Prioritize clean, fragrance-free, low-irritation options.
    - Recommend products from known clean brands (e.g., Attitude, Native, Dr. Bronner’s, Babo Botanicals).
    - Do not diagnose, prescribe, or give medical advice.
    `.trim()
    }),
    welcomeMessage: () =>
      "Hi! I can help you find safer, non-toxic versions of products you use every day. What would you like to switch out?",
    presetQuestions: [
      "What’s a cleaner alternative to Tide?",
      "What’s a safe baby lotion?",
      "Which deodorants are non-toxic?",
      "What’s a good fragrance-free body wash?"
    ],
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-3.5-turbo",
  },
  pdf: {
    name: "PDF-GPT - Coming Soon.",
    systemPrompt: () => 
    ({
        role: "system",
        content: `You are PDF-GPT, a strategic assistant for the Flesh and Blood trading card game. You specialize in card knowledge, meta analysis, gameplay tactics, deckbuilding advice, rules clarifications, event coverage, and lore. Always give answers based on official card text, tournament data, or lore when applicable. Be precise, helpful, and conversational — like a skilled player helping a friend.`
    }),
    welcomeMessage: () =>
      "You're chatting with PDF-GPT. It will only answer based on uploaded documents.",
    presetQuestions: [
      "What is this document about?",
    ],
    endpoint: "https://your-backend/pdf-chat",
    model: "gpt-3.5", // example
  },
  fab: {
    name: "FAB-GPT",
    systemPrompt: () => 
      ({
          role: "system",
          content: `You are FAB-GPT, a strategic assistant for the Flesh and Blood trading card game. You specialize in card knowledge, meta analysis, gameplay tactics, deckbuilding advice, rules clarifications, event coverage, and lore. Always give answers based on official card text, tournament data, or lore when applicable. Be precise, helpful, and conversational — like a skilled player helping a friend.`
      }),
    welcomeMessage: () =>
      "You're chatting with FAB-GPT",
    presetQuestions: [
      "Who is the best hero?",
    ],
    endpoint: "https://your-backend/pdf-chat",
    model: "gpt-3.5", // example
  },
  bench: {
    name: "BENCH-GPT",
    systemPrompt: () => 
      ({
          role: "system",
          content: `You are BENCH-GPT, a strategic assistant for the Flesh and Blood trading card game. You specialize in card knowledge, meta analysis, gameplay tactics, deckbuilding advice, rules clarifications, event coverage, and lore. Always give answers based on official card text, tournament data, or lore when applicable. Be precise, helpful, and conversational — like a skilled player helping a friend.`
      }),
    welcomeMessage: () =>
      "You're chatting with BENCH-GPT",
    presetQuestions: [
      "How much do you bench?",
    ],
    endpoint: "https://your-backend/pdf-chat",
    model: "gpt-3.5", // example
  },
  // You can add more modes here (e.g., "startupGPT", "gameGPT") in the same format.
};
