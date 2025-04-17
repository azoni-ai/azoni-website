const charltonBio = {
  intro: `Charlton Smith is a pragmatic, business-focused software engineer with 7+ years of experience building full-stack applications, AI tools, multiplayer games, and developer products. He blends creativity, problem-solving, and deep technical skill to create systems that feel alive.`,

  experience: {
    capitalOne: {
      company: "Capital One",
      role: "Senior Software Engineer, Capital One",
      duration: "1 year",
      summary:
        "Focused on improving internal developer tooling and test infrastructure. Led onboarding efforts, mentored interns, and helped design scalable testing workflows using AWS serverless architecture.",
    
      highlights: [
        "Designed and implemented a scalable testing pipeline using AWS Lambda, S3, and CloudWatch — reducing manual testing by 70%",
        "Built a JSON-driven configuration layer to define reusable test workflows for different application teams",
        "Created onboarding documentation and led weekly syncs with junior engineers and interns",
        "Collaborated with DevOps and QA teams to automate deployment verification pipelines"
      ],
      reasonForLeaving:
        "Charlton was laid off during a company-wide reduction in force that impacted remote employees. He used this time to focus on personal development, family, and independent projects — expanding his skillset in AI, full-stack development, and game systems.",

      stories: {
        conflictResolution: {
          question: "Tell me about a time you didn’t get along with someone and how you handled it.",
          situation:
            "While building a shared testing pipeline, I worked with an engineer from another team who insisted on hardcoding test parameters to improve speed, while I was advocating for a dynamic config system.",
          task:
            "I needed to create a test framework that could adapt to multiple use cases, even if it meant a slight hit to speed. But I also didn’t want to create tension or a fragmented solution.",
          action:
            "I acknowledged his speed concerns, then proposed a quick benchmark between the two approaches. We brought in a neutral team lead to review both ideas in a short architecture session. I listened actively and presented a hybrid solution — keeping dynamic configs, but caching common cases for speed.",
          result:
            "We shipped a flexible and fast system that satisfied both teams. The collaboration improved after that because we both felt heard and respected. It became a go-to example for cross-team compromise."
        },
    
        missedDeadline: {
          question: "Tell me about a time you missed a deadline and how you handled it.",
          situation:
            "We were delivering a new internal UI for test configuration, but API rate limits from an upstream service caused delays we hadn’t anticipated.",
          task:
            "I was responsible for shipping the config dashboard by end of sprint to unblock other teams relying on the automation.",
          action:
            "I immediately flagged the issue to the product lead, then built a lightweight CLI tool as a temporary workaround. I also added exponential backoff logic to reduce rate limit hits and created clear internal documentation for future teams.",
          result:
            "We missed the UI launch by 3 days, but users were unblocked immediately and appreciated the workaround. The team respected how I communicated proactively, and the long-term fix improved overall pipeline resilience."
        },
    
        mentorship: {
          question: "Tell me about a time you supported someone else’s growth.",
          situation:
            "I was assigned to mentor a new intern who was struggling with TypeScript and Lambda deployments.",
          task:
            "Help her become confident enough to ship her own features in a two-month window.",
          action:
            "I paired with her daily for the first week, built a sandbox project to practice deployments, and gave her progressively harder tasks. I also shared docs I’d written and involved her in standups to build confidence.",
          result:
            "By the end of the internship, she owned a production feature and presented her work to the team. She later got a return offer. I gained recognition for creating a repeatable onboarding plan we used again the next quarter."
        }
      }
    },    
    tmobile: {
      company: "T-Mobile",
      role: "Software Engineering Intern → Associate Engineer -> Software Engineer 2, T-Mobile",
      duration: "almost 4 years (internship + full-time)",
      summary:
        "Joined T-Mobile after winning a company-sponsored hackathon with a tool that automated hashtags on an image for instagram. Transitioned to a full-time engineering role focused on internal tools, and network configuration automation",
    
      highlights: [
        "Built Django-based internal tools for automating network equipment provisioning and visualizing rollout progress",
        "Used Python and Bash scripts to integrate with proprietary network systems",
        "Collaborated with senior engineers and product stakeholders to ship tools used by 50+ technicians"
      ],
    
      stories: {
        initiative: {
          question: "Tell me about a time you went above and beyond.",
          situation:
            "During the hackathon, I identified a pain point in how T-Mobile field engineers handled repetitive provisioning tasks, which often required manual input.",
          task:
            "Build a prototype that could reduce those steps and demonstrate the idea's value in just 48 hours.",
          action:
            "I teamed up with a small group, designed a CLI tool that mimicked those steps using Python automation, and built a React dashboard to visualize success/failure in real-time. I pitched the idea directly to senior engineers and PMs.",
          result:
            "We won the hackathon, and the project was adopted internally. It later helped me secure a full-time offer with the same team."
        },
    
        conflictResolution: {
          question: "Tell me about a time you had to resolve a disagreement in a group project.",
          situation:
            "While working on an internal dashboard, another developer and I had different ideas on how to handle a sensitive user permissions feature. They preferred hardcoded access groups, while I believed it needed to scale with role-based logic.",
          task:
            "Align on a permissions model that could be shipped quickly, but wouldn’t become a tech debt problem later.",
          action:
            "I scheduled a short async review with our team lead and proposed a hybrid model: start with the hardcoded groups, but abstract the logic to a helper module to keep flexibility. I offered to implement both paths and test them.",
          result:
            "We launched faster without blocking each other. My approach earned praise for balancing urgency with long-term maintainability."
        },
    
        ownership: {
          question: "Tell me about a time you owned a project end-to-end.",
          situation:
            "The team needed a visualization tool to track network rollout metrics by region and equipment type.",
          task:
            "Design, build, and deliver a working prototype that could integrate with live data streams and be used by stakeholders within 2 weeks.",
          action:
            "I gathered requirements from project managers, iterated quickly in React and D3, and connected it to existing network logs using Python scripts and REST APIs. I tested it with sample data and wrote a usage guide.",
          result:
            "The dashboard was demoed to a leadership group and became a go-to internal reference tool for engineers monitoring 5G deployments."
        }
      },
    
      reasonForLeaving:
        "Charlton left T-Mobile to pursue new challenges and focus on more creative, user-facing projects. His interest in AI and real-time systems led him to begin working on Azoni AI and other independent tools."
    },
    slalom: {
      role: "Engineer",
      company: "Slalom Consulting",
      duration: "6 months",
      summary:
        "Worked on the Cross-Market team designing thoughtful, stakeholder-driven solutions using Salesforce tools and architecture best practices. Gained multiple Salesforce certifications and contributed to internal knowledge sharing.",
      highlights: [
        "Salesforce Certified Integration Architect Designer, Administrator, and Platform App Builder",
        "Collaborated with cross-functional teams to design scalable client-facing solutions",
        "Worked with stakeholders to translate business needs into technical implementations within the Salesforce ecosystem"
      ],
      stories: {
        certificationPace: {
          question: "Tell me about a time you achieved something under a tight deadline.",
          situation: "Slalom wanted me to get multiple Salesforce certifications early in the engagement to qualify for upcoming client work.",
          task: "Earn three Salesforce certifications in under two months while onboarding and supporting projects.",
          action: "Created a structured study plan, worked nights and weekends, and engaged with internal SME resources for review sessions.",
          result: "Achieved all three certifications within six weeks and was immediately placed on a client-facing project with high visibility."
        }
      },
      reasonForLeaving:
        "Slalom was a short-term engagement designed to prepare Charlton for client consulting work. He transitioned out after completing certification and delivery milestones to pursue longer-term engineering roles."
    },
  
    oliFitness: {
      role: "Co-Founder & Technical Lead",
      company: "OLI Fitness",
      duration: "2 years 3 months",
      tenure: "2 years",
      summary:
        "Built a computer vision system using Microsoft Kinect to help powerlifters avoid injury. Focused on biomechanical joint movement analysis to detect risky lifting patterns in real-time.",
      highlights: [
        "Developed a C# Kinect-based motion capture system for analyzing lifts",
        "Designed and trained a rule-based AI model to recognize potentially injurious movement patterns",
        "Presented the concept at hackathons and used it as a launchpad for his undergrad research project",
        "Finalist for both UW tacoma, and Seattles annual business plan competition"
      ],
      reasonForLeaving:
        "Charlton paused development of OLI Fitness to focus on other projects and engineering roles after completing the initial prototype phase."
    },
  
    nucamp: {
      role: "Computer Science Instructor",
      company: "Nucamp",
      duration: "5 months",
      tenure: "5 months",
      summary:
        "Taught full stack development and computer science fundamentals to new programmers. Helped students understand key concepts including git, React, backend APIs, and deployment workflows.",
      highlights: [
        "Created live examples and interactive assignments to demystify coding for beginners",
        "Mentored students 1-on-1 through career changes and bootcamp projects",
        "Covered HTML, CSS, JavaScript, React, and git in a structured course format"
      ],
      reasonForLeaving:
        "Completed the teaching term and returned to full-time software development."
    },
  
    givesafe: {
      role: "Ruby on Rails Intern",
      company: "Givesafe (now Samaritan)",
      duration: "5 months",
      tenure: "5 months",
      summary:
        "Supported backend and feature development for a social impact platform helping people without housing access resources and move forward.",
      highlights: [
        "Contributed to a Ruby on Rails codebase and helped integrate user-facing features",
        "Collaborated with a small dev team on core product iterations",
        "Tested and fixed bugs in the mobile API and admin dashboard"
      ],
      reasonForLeaving:
        "Completed internship term and returned to school to finish his undergraduate degree."
    },
  
  },
  leadership:
    "Served as president of the UW Tacoma coding club and attended over 30 hackathons, frequently placing in the top 3. Hackathons became a launchpad for many of his project ideas, including Oli Fitness and HashMaps.",
  projects: [
    {
      name: "Azoni AI",
      description: `A flagship creative sandbox that blends AI tooling with multiplayer interactivity. Built a real-time web game using React and WebSockets where users can move, chat, train skills (like woodcutting), and interact with AI-powered NPCs. Includes agents like FAB-GPT and PDF-GPT with persistent memory and context awareness.`,
      highlights: [
        "Built real-time multiplayer engine using React, WebSockets, and Python",
        "Integrated OpenAI Assistants API for AI NPCs with memory and game-like dialog",
        "Designed and implemented skill systems (XP, inventory, trading) inspired by RuneScape",
        "Built Discord + Twitter integrations for outreach and experimentation"
      ],
      tech: ["React", "WebSockets", "Python", "Flask", "OpenAI API", "SQLite"]
    },
  
    {
      name: "DustBunny",
      description: `A solo-built NFT bidding bot for OpenSea. Focused on trait-based arbitrage with configurable strategy profiles and rate-limited bid queues.`,
      highlights: [
        "Implemented Redis-backed queues for high-throughput bidding with real-time caps",
        "Built a modular engine to support different NFT trait strategies",
        "Created a CLI and UI for managing bids, filters, and pricing rules",
        "Handled OpenSea listing events and ERC721 transfer events directly"
      ],
      tech: ["Node.js", "Redis", "OpenSea API", "JavaScript", "CLI tools"]
    },
  
    {
      name: "Oli Fitness",
      description: `A hackathon-started prototype for injury prevention in powerlifting. Used a Microsoft Kinect with the C# SDK to track joint motion and detect risky lift patterns.`,
      highlights: [
        "Used Kinect’s depth sensors and joint mapping to track squat/deadlift form in real time",
        "Applied vector-based math and rule-based analysis to assess movement quality",
        "Created proof-of-concept feedback alerts for injury-prone knee or back mechanics"
      ],
      tech: ["C#", "Microsoft Kinect SDK", "3D math", "biomechanics"]
    },
  
    {
      name: "HashMaps",
      description: `A T-Mobile hackathon-winning project that gamified network configuration. Visualized cell site data on interactive maps and let engineers simulate configuration changes.`,
      highlights: [
        "Used React Native to build a mobile map interface with real-world location overlays",
        "Pulled from mock LTE/5G site data to support site performance toggling",
        "Gamified system configuration to engage users with network optimization choices"
      ],
      tech: ["android studio", "java", "Map APIs"]
    },
  
    {
      name: "Neverwinter Nights Balance Rework",
      description: `Modernized a legacy persistent NWN server by rebuilding game systems. Rebalanced gear, added DPS tracking, and implemented custom scripting for new boss mechanics.`,
      highlights: [
        "Wrote custom scripts for new gear drop logic and combat mechanics",
        "Implemented persistent XP, DPS meters, and gear tiers",
        "Collaborated with the modding community to preserve game balance while modernizing it"
      ],
      tech: ["NWN Script", "Object-oriented design", "Legacy game engines"]
    }
  ],
  skills: [
    "React",
    "Java",
    "Node.js",
    "Python",
    "Flask",
    "SQL",
    "WebSockets",
    "Redis",
    "AWS",
    "Render",
    "Netlify",
    "OpenAI API",
    "System Design",
    "GitHub Actions",
    "Mentorship",
  ],
  // Not used yet.
  stack: {
    frontend: ["React", "JavaScript", "HTML", "CSS"],
    backend: ["Node.js", "Python", "Flask"],
    devops: ["AWS", "Render", "Netlify", "GitHub Actions"],
    databases: ["PostgreSQL", "SQLite", "Firebase", "Redis"],
    ai: ["OpenAI API", "LangChain"],
    networking: ["WebSockets"],
    softSkills: ["Mentorship", "Product Thinking"]
  },
  ai: {
    motivation:
      "Charlton is drawn to AI for its transformative power. It's changed how he learns, builds, and interacts with technology.",
    philosophy:
      "AI should augment — not replace — human experience. His vision for Azoni AI is a personal companion that helps with tooling, games, reminders, fitness, humor, and more.",
    futureGoals:
      "Plans to experiment with vector databases, embeddings, multi-agent systems, and tools like LangChain to push Azoni AI further.",
  },

  philosophy: {
    ux: "Clean and minimal. He designs for clarity and simplicity.",
    dev: "Hack when needed. Polish when you can — and if you can't, make time.",
    interaction: "Feedback is what makes a system feel alive.",
    collaboration:
      "Flexible and adaptive — Charlton thrives in any team environment and tests early and often with users.",
    growth:
      "Driven by solving problems and helping others. As a competitive gamer, he embraces failure as a learning opportunity.",
  },

  funFacts: [
    "Charlton ranked #1 in the U.S. and #2 globally in StarCraft 2 2v2 random queue.",
    "He lead climbed a 5.12a outdoors and still enjoys bouldering and strength sports.",
    "He built a Twitter bot that replies to mentions with OpenAI-generated responses based on logged conversations.",
    "He still plays RuneScape and Neverwinter Nights — nostalgic experiences that shaped his love of systems and progression.",
  ],

  education: {
    bachelors: "B.S. in Computer Science, University of Washington - Tacoma",
    masters: "M.S. in Computer Science, Colorado Technical University (Online)",
  },

  personal: {
    interests: [
      "Powerlifting (315 lb bench)",
      "Rock climbing (lead climbed 5.12a outdoors)",
      "Snowboarding",
      "Tennis",
      "StarCraft",
      "RuneScape",
      "Game development",
      "Spending time with his two kids",
    ],
    strengths: [
      "Passionate",
      "Efficient",
      "Caring",
      "Communication",
      "Leadership",
      "Adaptable",
    ],
    family: {
      kids: 2,
      values:
        "Charlton is a dedicated father who balances ambition with strong family values. He took time off to focus on family and returned stronger, sharper, and more motivated than ever.",
    },
  },

  mindset: {
    engineering:
      "Starts projects with small wins, builds momentum fast, and isn’t afraid to ship rough drafts. Gets MVPs deployed early, then polishes.",
    tools:
      "Primarily uses VS Code, React, Flask, Python, and JavaScript. Loves experimenting with emerging technologies and staying on the edge of what’s possible.",
    hiddenStrength:
      "Charlton has a natural ability to lead and optimize — sharpened during his time managing restaurants. Known for his obsessive attention to detail, process design, and team scaling mindset.",
  },

  gapExplanation:
    "Charlton took a break from full-time work to focus on his family and personal development — including building new skills, launching personal projects, and exploring cutting-edge AI tools. This time was instrumental in shaping his current direction and deepening his technical range.",
};

export default charltonBio;
