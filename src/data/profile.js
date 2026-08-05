export const profile = {
  name: "Charlton Smith",
  title: "Software Engineer",
  degree: "M.S. Software Engineering",
  location: "Seattle, WA",
  email: "charltonuw@gmail.com",
  tagline: "Software Engineer · AI applications",
  bio: `Full-stack engineer with 10 years of experience building production systems and AI
applications. I currently run a set of live products on a shared agent stack, including FaB Stats
(2,900+ users) and several fitness and search apps. Earlier: startup co-founder (published ACM
CHI research), senior engineer at Capital One, and several hackathon wins.`,
  // Surfaced as the "Now ·" pill in the home hero. Falls back to the latest
  // Scribe blog post if not set. Keep it short, one sentence max.
  currentlyBuilding: "Working on the agent stack and this site.",
  links: {
    github: "https://github.com/azoni",
    linkedin: "https://linkedin.com/in/charltonsmith",
    twitter: "https://x.com/azonitcg",
    resume: "/CharltonResume.pdf"
  }
};

export const skills = {
  languages: ["Python", "JavaScript", "Java", "SQL", "C#"],
  frontend: ["React", "HTML", "CSS"],
  backend: ["Node.js", "Django", "FastAPI", "REST APIs", "Microservices"],
  ai: ["OpenAI APIs", "Claude API", "LLM Agents", "Computer Vision"],
  cloud: ["AWS Lambda", "EC2", "S3", "Docker", "CI/CD"],
  databases: ["PostgreSQL", "MongoDB", "Redis", "MySQL", "Firebase"],
  web3: ["Ethereum", "Smart Contracts", "OpenSea SDK", "Etherscan API"]
};

export const experience = [
  {
    title: "Independent Software Engineer",
    company: "Self-Employed",
    period: "Nov 2023 – Present",
    type: "AI & full-stack",
    highlights: [
      "Ship and operate 15+ live products on a shared agent + RAG stack (Firebase, FastAPI, Netlify/Render)",
      "Built EmbedRoute, a one-key gateway over four embedding providers, powering RAG across the ecosystem",
      "Run autonomous agents (Conductor, Scribe, Moltbook) with per-call cost and error logging"
    ]
  },
  {
    title: "Senior Software Engineer",
    company: "Capital One",
    period: "Nov 2022 – Nov 2023",
    highlights: [
      "Enhanced automated testing pipelines using AWS Lambda and S3",
      "Developed Python microservices for test automation",
      "Mentored intern who shipped test automation tool"
    ]
  },
  {
    title: "Web3 Automation Engineer",
    company: "Dustbunny",
    period: "Sep 2021 – Jun 2022",
    highlights: [
      "Built NFT bidding system across 50 machines, 2,500 req/min",
      "Created floor polling utility with Redis caching",
      "Developed intelligent bidding algorithms"
    ]
  },
  {
    title: "Software Engineer II",
    company: "T-Mobile",
    period: "Jun 2018 – Apr 2022",
    highlights: [
      "Built automation app reducing workload by 80%",
      "Designed Python/Django backend with microservices",
      "Migrated frontend from Django templates to Angular"
    ]
  },
  {
    title: "Co-Founder & Technical Lead",
    company: "OLI Fitness",
    period: "Jan 2016 – Mar 2018",
    highlights: [
      "Built computer vision fitness tracking with Kinect SDK",
      "Published at ACM CHI 2017",
      "Princeton Tiger Launch finalist"
    ]
  }
];

export const education = [
  {
    degree: "M.S. Software Engineering",
    school: "Colorado Technical University",
    year: "2021",
    note: "Completed while working full-time"
  },
  {
    degree: "B.S. Computer Science",
    school: "University of Washington Tacoma",
    year: "2017",
    note: "Graduated with Honors • Teaching Assistant • President, Huscii Coding Club"
  }
];

export const awards = [
  { title: "1st Place", event: "T-Mobile Big Data Hackathon", description: "HashMaps - auto-hashtag tool" },
  { title: "Finalist", event: "T-Mobile IoT Hackathon", description: "Presented at Seattle Interactive Conference" },
  { title: "Published", event: "ACM CHI 2017", description: "Computer vision for fitness applications" },
  { title: "Head Organizer", event: "Global AI Hackathon Seattle 2017", description: "Coordinated sponsors and judges" }
];