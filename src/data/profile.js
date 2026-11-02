export const profile = {
  name: "Charlton Smith",
  photo: "/images/charlton-linkedin.jpg",
  businessName: "Azoni",
  title: "Principal software engineer",
  degree: "M.S. Software Engineering",
  location: "Seattle area, WA",
  email: "charlton@azoni.ai",
  tagline: "Principal engineering · Applied AI",
  bio: `I'm Charlton Smith. I build and run AI products and the infrastructure behind them. I spent my college weekends at hackathons, co-founded OLI Fitness, and worked at T-Mobile and Capital One. Over the last few years I've gone deep into AI, building and running my own products alongside my current work as a principal software engineer for a client.`,
  // Lead paragraph of the HTML résumé (/resume).
  summary: `I build and run AI products and the infrastructure behind them. I work with a client as a principal software engineer with a strong focus on AI, and I build and operate my own products, including AI agents, retrieval systems and web applications. Earlier, I built internal tools at T-Mobile, developed test automation at Capital One and co-founded OLI Fitness.`,
  // Surfaced as the "Now ·" pill in the home hero. Falls back to the latest
  // Scribe blog post if not set. Keep it short, one sentence max.
  currentlyBuilding: "AI software for a client, plus the products and agents I run through Azoni.",
  links: {
    github: "https://github.com/azoni",
    linkedin: "https://www.linkedin.com/in/charltonsmith",
    twitter: "https://x.com/azonitcg",
    resume: "/CharltonSmith-Consulting.pdf"
  }
};

export const skills = {
  languages: ["Python", "TypeScript", "JavaScript", "Java", "SQL", "C#"],
  frontend: ["React", "Next.js", "HTML", "CSS"],
  backend: ["Node.js", "Django", "FastAPI", "REST APIs", "Microservices"],
  ai: ["OpenAI APIs", "Claude API", "LLM Agents", "Computer Vision"],
  cloud: ["AWS Lambda", "EC2", "S3", "Docker", "CI/CD"],
  databases: ["PostgreSQL", "MongoDB", "Redis", "MySQL", "Firebase"],
  web3: ["Ethereum", "Smart Contracts", "OpenSea SDK", "Etherscan API"]
};

export const skillLabels = {
  languages: "Languages",
  frontend: "Frontend",
  backend: "Backend",
  ai: "AI",
  cloud: "Cloud",
  databases: "Databases",
  web3: "Web3"
};

// The one source for About's experience list and the /resume page.
// kind: 'role' is a job or engagement; 'project' is something I built and ran myself.
// summary is the one-paragraph version (About); highlights are résumé bullets.
export const experience = [
  {
    id: "principal",
    kind: "role",
    title: "Principal software engineer",
    company: "Independent consulting",
    period: "Current",
    type: "AI & software engineering",
    summary: "I work with a client as a principal software engineer, with a strong focus on AI.",
    highlights: [
      "Working with a client as a principal software engineer with a strong focus on AI"
    ]
  },
  {
    id: "independent-products",
    kind: "role",
    title: "Independent software engineer",
    company: "My own products",
    period: "Nov 2023 – Present",
    type: "AI & full-stack",
    summary: "I build and operate my own products, including AI agents, retrieval systems and web applications, on a shared agent and retrieval stack.",
    highlights: [
      "Build and operate AI and full-stack products on a shared agent and retrieval stack (Firebase, FastAPI, Netlify, Render)",
      "Built EmbedRoute, a shared API for embedding providers and a lab for comparing models",
      "Run autonomous agents (Conductor, Scribe) with per-call cost and error logging"
    ],
    links: [{ label: "See the products", to: "/projects" }]
  },
  {
    id: "capital-one",
    kind: "role",
    title: "Senior software engineer",
    company: "Capital One",
    period: "Nov 2022 – Nov 2023",
    summary: "I developed Python microservices for test automation on AWS Lambda and S3, and mentored an intern who shipped a test automation tool for the team.",
    highlights: [
      "Developed Python microservices for test automation on AWS Lambda and S3",
      "Mentored an intern who shipped a test automation tool for the team"
    ]
  },
  {
    id: "dustbunny",
    kind: "project",
    title: "Independent project",
    company: "Dustbunny",
    period: "Sep 2021 – Jun 2022",
    summary: "A distributed NFT bidding bot I built and ran: 50 Dockerized workers with Redis-backed coordination, handling about 2,500 requests per minute. Eventually the marketplace cooled and I shut it down.",
    highlights: [
      "Built and ran a distributed NFT bidding bot: 50 Dockerized workers with Redis-backed coordination",
      "Handled about 2,500 requests per minute, with floor polling, Redis caching and kill-switches for runaway bids",
      "Adapted the bidding strategy daily as other bots changed their patterns"
    ],
    links: [{ label: "Project notes", to: "/projects/dustbunny" }]
  },
  {
    id: "t-mobile",
    kind: "role",
    title: "Software Engineer II",
    company: "T-Mobile",
    period: "Jun 2018 – Apr 2022",
    summary: "I built an internal automation application that reduced a team’s manual workload by about 80%, developed Python/Django services and migrated a frontend to Angular.",
    highlights: [
      "Built an internal automation application that reduced a team’s manual workload by about 80%",
      "Designed a Python/Django backend with microservices",
      "Migrated the frontend from Django templates to Angular"
    ]
  },
  {
    id: "oli-fitness",
    kind: "role",
    title: "Co-founder & technical lead",
    company: "OLI Fitness",
    period: "Jan 2016 – Mar 2018",
    summary: "I led a team of five building computer vision software with the Kinect SDK that gave people real-time exercise feedback. We published an extended abstract at ACM CHI 2017 and reached the Princeton Tiger Launch finals.",
    highlights: [
      "Led a team of five building Kinect-based computer vision for real-time exercise feedback",
      "Published an extended abstract at ACM CHI 2017",
      "Princeton Tiger Launch finalist"
    ],
    links: [
      { label: "CHI 2017 paper", href: "https://dl.acm.org/doi/abs/10.1145/3027063.3048429" },
      { label: "Project notes", to: "/projects/oli-fitness" }
    ]
  }
];

export const education = [
  {
    degree: "M.S. Software Engineering",
    school: "Colorado Technical University",
    year: "2021",
    note: "Completed while working full-time at T-Mobile"
  },
  {
    degree: "B.S. Computer Science",
    school: "University of Washington Tacoma",
    year: "2017",
    note: "Graduated with honors · Teaching assistant · President, Huscii Coding Club"
  }
];

export const awards = [
  { title: "1st Place", event: "T-Mobile Big Data Hackathon", description: "HashMaps, an auto-hashtag tool", link: { label: "Project notes", to: "/projects/hashmaps" } },
  { title: "Finalist", event: "T-Mobile IoT Hackathon", description: "Presented at Seattle Interactive Conference" },
  { title: "Published", event: "ACM CHI 2017", description: "Extended abstract on OLI Fitness's computer vision for exercise", link: { label: "Read the paper", href: "https://dl.acm.org/doi/abs/10.1145/3027063.3048429" } },
  { title: "Head Organizer", event: "Global AI Hackathon Seattle 2017", description: "Coordinated sponsors and judges" }
];
