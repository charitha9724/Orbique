// The Help chat's answers. To add or change one, edit this list:
// - question: shown as a suggestion button
// - keywords: words people might type (lowercase). More matches = better answer.
// - answer: what the helper replies

export type HelpTopic = {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'sell',
    question: 'How do I sell something?',
    keywords: ['sell', 'post', 'list', 'listing', 'upload', 'add item', 'new item', 'advert', 'ad'],
    answer:
      'Tap the Sell tab, add up to 5 photos, then fill in the title, price (in ₹, use 0 if it\'s free), category and condition. Tap "Post it" and people near you will see it on their Home feed.',
  },
  {
    id: 'edit',
    question: 'How do I mark my item as sold or remove it?',
    keywords: ['sold', 'remove', 'delete item', 'delete listing', 'take down', 'my listing', 'my item', 'edit', 'change price'],
    answer:
      'Go to Profile → Your listings and tap the item. You\'ll see "Mark as sold" and "Remove this listing". Sold items can be put back on sale. To change the price or details, remove it and post it again.',
  },
  {
    id: 'feed',
    question: 'Why do I only see some items?',
    keywords: ['feed', 'home', 'near', 'nearby', 'distance', 'km', 'radius', 'far', 'see items', 'no items', 'nothing', 'more items', 'see more', 'show more', 'few items', 'only'],
    answer:
      'Home shows items within 5, 10 or 25 km of your area (10 km at first). To see more, go to Profile → "Show things for sale within" and choose 25 km, then Save. You can also change your area on the map there.',
  },
  {
    id: 'area',
    question: 'How do I change my area?',
    keywords: ['area', 'location', 'map', 'move', 'city', 'change place', 'where i live', 'pin'],
    answer:
      'Go to Profile → "Change area on the map". Move the map so the pin is on your area, or search for it, or tap "Use my current location", then tap "Save my area".',
  },
  {
    id: 'search',
    question: 'How do I find a specific item?',
    keywords: ['search', 'find', 'look for', 'filter', 'category', 'books', 'electronics', 'furniture', 'clothing'],
    answer:
      'On Home, type in the Search box (for example "calculator") and press Enter. Tap a category like Books or Electronics to see only those items. Tap "All" to clear the category.',
  },
  {
    id: 'message',
    question: 'How do I contact a seller?',
    keywords: ['message', 'contact', 'chat', 'talk', 'ask seller', 'buy', 'interested', 'reply', 'seller'],
    answer:
      'Open the item and tap "Message seller". Your conversation appears in the Chats tab. A blue number on Chats means you have unread messages. You never need to share your phone number.',
  },
  {
    id: 'photo',
    question: 'Can I send photos in chat?',
    keywords: ['photo', 'picture', 'image', 'camera', 'send photo', 'pic'],
    answer:
      'Yes. In a chat, tap the camera button next to the message box and pick a photo. Chat photos are private: only the two people in that chat can see them.',
  },
  {
    id: 'safety',
    question: 'How do I stay safe when meeting?',
    keywords: ['safe', 'safety', 'meet', 'meeting', 'scam', 'fraud', 'trust', 'danger', 'cheat'],
    answer:
      'Meet in a busy public place like your college campus or a café, ideally in daylight, and bring a friend if you can. Check the item before paying. Never pay in advance or share OTPs, bank details or passwords. If something feels off, walk away and report the person.',
  },
  {
    id: 'pay',
    question: 'How does payment work?',
    keywords: ['pay', 'payment', 'money', 'upi', 'cash', 'price', 'cost', 'refund'],
    answer:
      'Orbique doesn\'t handle payments. You and the other person agree on the price in chat and pay when you meet, by cash or UPI. Only pay after you\'ve seen the item, and never send money in advance.',
  },
  {
    id: 'report',
    question: 'How do I report someone?',
    keywords: ['report', 'abuse', 'offensive', 'fake', 'spam', 'complain', 'complaint', 'rude', 'harass', 'harassing', 'harassment', 'bully', 'threat', 'threatening'],
    answer:
      'On an item, tap "Report this item". In a chat, tap ⋯ at the top right → Report, or press and hold one of their messages to report just that message. Pick a reason and tap "Send report".',
  },
  {
    id: 'block',
    question: 'How do I block or unblock someone?',
    keywords: ['block', 'unblock', 'stop messages', 'stop', 'annoying', 'bother'],
    answer:
      'In a chat, tap ⋯ → Block, or on their item tap "Block seller". Once blocked, neither of you can message the other and their items disappear from your feed. To undo it, go to Profile → Blocked people → Unblock.',
  },
  {
    id: 'privacy',
    question: 'Who can see my location?',
    keywords: ['privacy', 'private', 'see my location', 'exact', 'address', 'data', 'who can see'],
    answer:
      'Nobody sees your exact spot. Orbique only saves your area to about 1 km, and other people see just the area name (like "Indiranagar, Bengaluru") and roughly how far away it is.',
  },
  {
    id: 'account',
    question: 'How do I change my name or password?',
    keywords: ['name', 'password', 'forgot', 'reset', 'account', 'profile', 'log in', 'login', 'email', 'log out', 'logout'],
    answer:
      'To change your name, go to Profile, edit "Your name" and tap Save changes. If you forgot your password, log out, then on the log in page tap "Forgot password?" and we\'ll email you a reset link.',
  },
  {
    id: 'install',
    question: 'How do I install Orbique on my phone?',
    keywords: ['install', 'app', 'iphone', 'android', 'home screen', 'download', 'phone'],
    answer:
      'iPhone/iPad: open Orbique in Safari, tap the Share button, then "Add to Home Screen". Android: open it in Chrome, tap ⋮, then "Install app" or "Add to Home screen". It then opens like a normal app.',
  },
  {
    id: 'free',
    question: 'Is Orbique free?',
    keywords: ['free', 'fee', 'charge', 'commission', 'premium'],
    answer: 'Yes, Orbique is completely free to use. There are no fees for posting or selling.',
  },
];

/** Suggestions shown when the Help chat opens. */
export const STARTER_QUESTIONS = ['sell', 'message', 'safety', 'feed', 'block'];

/** Find the best answer for what someone typed, or null if nothing fits. */
export function findHelpTopic(text: string): HelpTopic | null {
  const words = ` ${text.toLowerCase().replace(/[^a-z0-9₹ ]+/g, ' ').replace(/\s+/g, ' ')} `;
  let best: HelpTopic | null = null;
  let bestScore = 0;
  for (const topic of HELP_TOPICS) {
    let score = 0;
    for (const keyword of topic.keywords) {
      // Whole words only ("ad" shouldn't match "address"); allow simple plurals like "photos".
      const pattern = new RegExp(`[ ]${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?[ ]`);
      if (pattern.test(words)) score += keyword.includes(' ') ? 2 : 1;
    }
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  return best;
}
