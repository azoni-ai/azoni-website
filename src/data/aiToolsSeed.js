// Starter entries for the AI Tools series.
//
// The "Import starter entries" button in the /admin AI Tools tab reads this
// list (netlify/functions/ai-tools-admin.js requires it across the src
// boundary; esbuild bundles it into the function). Every entry lands as a
// draft, so nothing here is public until it is published by hand.
//
// An entry is imported once. If a doc with the same slug already exists it is
// skipped and never overwritten, which means editing an entry in this file
// does nothing after its import: Firestore is the source of truth from then
// on, and further edits belong in the admin editor.
//
// Every field passes through the same sanitizers the `update` action uses, so
// status, timestamps, research and history cannot be set from here.

export const AI_TOOLS_SEED = [
  {
    slug: 'kling-ai',
    name: 'Kling AI',
    maker: 'Kuaishou',
    url: 'https://klingai.com',
    logo: '/images/tools/kling-logo.png',
    heroImage: '',
    links: { site: 'https://klingai.com', docs: '', pricing: '' },
    category: 'Video',
    tags: ['video generation', 'text to video', 'image to video', 'kuaishou', 'subscription'],
    tagline: 'Text and image to video generation from Kuaishou.',
    pricing: 'Free daily credits, with paid plans billed monthly or yearly.',
    summary:
      'Kling AI is a video generation service from Kuaishou, the Chinese short video company. You give it a text prompt or a starting image and it returns a short generated clip. It also ships an image model and a set of controls for camera movement and for extending a clip past its original length.\n\nIt is sold as a subscription with a credit allowance. There is a free daily allowance that is enough to see what the output looks like before paying anything.',
    products: [
      {
        name: 'Kling video model',
        description: 'Text to video and image to video generation. This is the main product and what most people sign up for.',
        image: '/images/tools/kling-product-video.png',
        url: '',
      },
      {
        name: 'Kolors',
        description: 'The image generation model. Used on its own, and to make a starting frame for a video.',
        image: '/images/tools/kling-product-kolors.png',
        url: '',
      },
      {
        name: 'Motion controls',
        description: 'Motion brush, camera movement, and video extension applied on top of a generated clip.',
        image: '/images/tools/kling-product-motion.png',
        url: '',
      },
      {
        name: 'Developer API',
        description: 'Programmatic access to the video and image models for building it into something else.',
        image: '/images/tools/kling-product-api.png',
        url: '',
      },
    ],
    pros: [
      'Video output holds up against the better known models.',
      'The free daily credits are enough to judge the quality before paying.',
    ],
    cons: [
      'Cancelling is not one clear step, and a subscription started in the Android app keeps billing through Google Play after you cancel on the website.',
      'No pro-rated refund when you cancel. You pay through the end of the billing cycle either way.',
      'Refund requests after an auto-renewal get refused, including requests made within the hour.',
      'Some users report the renewal charge arriving with no warning email first.',
    ],
    voices: [
      {
        summary: 'Complaints about subscriptions renewing without warning and refund requests being turned down.',
        source: 'Complaint board',
        url: 'https://www.sikayetvar.com/en/kling-ai-us',
      },
      {
        summary: 'A walkthrough notes that cancelling on the website does not stop billing for subscriptions bought through the Android app.',
        source: 'AI Tool Curator',
        url: 'https://www.aitoolcurator.com/learn/kling-guide/how-to-cancel-kling-ai-subscription/',
      },
      {
        summary: 'Reviews are split between people who like the output and people describing billing and cancellation problems.',
        source: 'Trustpilot',
        url: 'https://www.trustpilot.com/review/klingai.com',
      },
    ],
    sources: [
      { title: 'Kling AI', url: 'https://klingai.com' },
      { title: 'How to cancel a Kling AI subscription', url: 'https://www.aitoolcurator.com/learn/kling-guide/how-to-cancel-kling-ai-subscription/' },
      { title: 'Kling AI complaints', url: 'https://www.sikayetvar.com/en/kling-ai-us' },
      { title: 'Kling AI on Trustpilot', url: 'https://www.trustpilot.com/review/klingai.com' },
    ],
    verdict: 'Skip it. The output quality does not make up for a subscription that is this hard to get out of.',
    myTake:
      "I am not recommending this one, and the reason has nothing to do with the model.\n\nThe billing is the problem. Cancelling is not a single obvious button, and if you subscribed through the Android app then cancelling on the website does not stop Google Play from charging you. People find that out on the next statement. There is no pro-rated refund when you do cancel, so you pay through the end of the cycle, and refund requests after an auto-renewal get turned down often enough that it shows up across complaint sites and review pages.\n\nThe video output is fine. Some of it is very good. That is not the point. A subscription that is easy to start and this awkward to leave is not something I want in my stack, and I would rather pay more somewhere else than argue with a support queue about a charge I did not want.\n\nThis entry is a placeholder. Before I publish it I want to walk the cancellation flow myself on a live account and write down exactly how many steps it takes.",
    status: 'draft',
  },
];
