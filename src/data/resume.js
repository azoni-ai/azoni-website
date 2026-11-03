// The /resume page, copied word for word from public/CharltonResume.pdf (the
// March 2026 resume). Edit the two together: the page shows this text and its
// Download PDF button serves the file.

export const resumePdf = '/CharltonResume.pdf';

export const resume = {
  name: 'Charlton Smith',
  headline: 'Software Engineer | AI-assisted development workflows | Full-stack product engineering',
  location: 'Seattle, WA',
  contacts: [
    { label: 'charlton@azoni.ai', href: 'mailto:charlton@azoni.ai' },
    { label: 'linkedin.com/in/charltonsmith', href: 'https://www.linkedin.com/in/charltonsmith' },
    { label: 'github.com/azoni', href: 'https://github.com/azoni' },
    { label: 'azoni.ai', to: '/' },
    { label: 'azoni.ai/chat', to: '/chat' },
  ],
  summary: 'Software engineer with 7+ years building production web applications, internal tools, and consumer products across Python, JavaScript, SQL, and C#. AI-assisted development is a core part of my daily workflow, using Claude Code, Codex, and related tools to plan implementation, write and refactor code, debug issues, drive testing, and ship features faster across real production systems.',
  skills: [
    { label: 'Languages', value: 'Python, JavaScript, TypeScript, SQL, Java, C#' },
    { label: 'Frameworks', value: 'React, Next.js, React Native, FastAPI, Node.js, Django, Ruby on Rails, REST APIs, Chrome Extensions, Socket.io' },
    { label: 'Systems/Cloud', value: 'Linux, Windows, Docker, AWS (Lambda, EC2, S3, CloudWatch), Netlify Functions, Render, Firebase, PostgreSQL, Redis, SQLite, CI/CD; familiar with Kubernetes, TensorFlow, and PyTorch' },
    { label: 'AI Tools', value: 'OpenAI APIs, Anthropic APIs, Claude Code, Codex, MCP servers, tool integrations, RAG, embeddings; completing Anthropic Claude Code coursework' },
  ],
  experience: [
    {
      title: 'Independent Software Engineer', org: 'Self-Employed', place: 'Seattle, WA', dates: 'Nov 2023 - Present',
      bullets: [
        'Build and operate production web applications, developer tools, and product features across analytics, fitness, search, and portfolio experiences using Python, FastAPI, React, Firebase, PostgreSQL, and Netlify/Render deployments.',
        'Use AI-assisted development workflows with Claude Code, Codex, and related tools to plan, build, debug, and ship features faster, including CLAUDE.md guidance files, hooks, MCP servers, tool integrations, and multi-agent workflows for coding, testing, and operations.',
      ],
    },
    {
      title: 'Senior Software Engineer', org: 'Capital One', place: 'Remote', dates: 'Nov 2022 - Nov 2023',
      bullets: [
        'Maintained an automated testing pipeline for customer email notifications with test definitions stored in S3, execution in AWS Lambda, results logged to CloudWatch, and Slack/email alerts for failures.',
        'Designed extensible JSON schemas for test coverage and mentored a summer intern through scoping, code reviews, deployment, and stakeholder collaboration.',
      ],
    },
    {
      title: 'Software Engineer II', org: 'T-Mobile', place: 'Bellevue, WA', dates: 'Jun 2018 - Apr 2022',
      bullets: [
        'Built an internal automation platform that consolidated 4-5 tools used by network operations teams; evolved a Python/Django monolith into services, migrated the frontend to Angular, and authored GitLab CI/CD pipelines.',
        'Supported networking-related troubleshooting and worked closely with cross-functional partners and non-technical stakeholders.',
      ],
    },
    {
      title: 'Founder', org: 'Dustbunny', place: 'Seattle, WA', dates: 'Sep 2021 - Jun 2022',
      bullets: [
        'Built and operated an automated NFT bidding platform distributed across 50 machines, processing roughly 2,500 bids per minute with Redis-backed pricing, bidding safeguards, and blockchain data integrations.',
      ],
    },
    {
      title: 'Co-Founder & Technical Lead', org: 'OLI Fitness', place: 'Seattle, WA', dates: 'Jan 2016 - Mar 2018',
      bullets: [
        'Built motion-analysis software in C# using Microsoft Kinect SDK to evaluate squat and deadlift form against trainer-defined benchmarks; the work was published as an ACM CHI 2017 extended abstract and selected for Collision Alpha, Princeton Tiger Launch, and the UW Business Plan Competition.',
      ],
    },
    {
      title: 'Software Engineering Intern', org: 'GiveSafe (Samaritan)', place: 'Seattle, WA', dates: 'Dec 2016 - Apr 2017',
      bullets: [
        'Built features in Ruby on Rails for a cashless donation platform helping people experiencing homelessness in Seattle; supported Bluetooth-based donation workflows and a React Native app.',
      ],
    },
    {
      title: 'Computer Science Instructor (Part-time)', org: 'Nucamp Coding Bootcamp', place: 'Seattle, WA', dates: 'Jan 2018 - May 2018',
      bullets: [
        'Taught full-stack web development including JavaScript, HTML/CSS, Git, and REST APIs to students transitioning into tech careers.',
      ],
    },
    {
      title: 'Salesforce Engineer', org: 'Slalom Consulting', place: 'Seattle, WA', dates: 'Nov 2017 - Mar 2018',
      bullets: [
        'Earned three Salesforce certifications and contributed to CRM implementations for enterprise clients.',
      ],
    },
  ],
  // Each name links to its project page; the names and text are the PDF's.
  projects: [
    { names: [['FaB Stats', '/projects/fab-stats']], text: 'Built a competitive TCG analytics platform with 2,946+ registered users and 1.2M+ matches tracked, including Chrome extension imports, matchup analytics, messaging, and a player-facing assistant.' },
    { names: [['Azoni AI / azoni.ai', '/projects/azoni-ai']], text: 'Built a portfolio site with live GitHub telemetry, cross-product metrics, real-time dashboards, and an assistant for background and job-fit questions.' },
    { names: [['Old Ways Today', '/projects/old-ways-today']], text: 'Built a product search platform for family-safe and non-toxic alternatives with semantic search, retrieval workflows, automated content publishing, and a FastAPI/PostgreSQL backend.' },
    { names: [['BenchPressOnly', '/projects/bench-only'], ['RowCrew', '/projects/row-crew']], text: 'Built fitness apps with real users for workout generation, workout logging, rowing tracking, and shared dashboards.' },
  ],
  education: [
    { degree: 'M.S. Software Engineering', school: 'Colorado Technical University', note: 'Completed while working full-time at T-Mobile', year: '2021' },
    { degree: 'B.S. Computer Science', school: 'University of Washington Tacoma', note: 'Graduated with Honors; Teaching Assistant for Java and Python', year: '2017' },
  ],
};
