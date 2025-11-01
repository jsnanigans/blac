/**
 * Mock data generators for examples.
 * Generates realistic fake data for users, posts, products, and more.
 */

// ==================== Types ====================

export interface MockUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio?: string;
  verified?: boolean;
  followers?: number;
  following?: number;
}

export interface MockPost {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
  shares: number;
  images?: string[];
  tags?: string[];
}

export interface MockProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  quantity?: number;
  imageUrl?: string;
  rating?: number;
  reviews?: number;
}

export interface MockComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  timestamp: Date;
  likes: number;
}

export interface MockArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  publishedAt: Date;
  readTime: number; // minutes
  imageUrl?: string;
}

// ==================== Name Data ====================

const FIRST_NAMES = [
  'Alex',
  'Jamie',
  'Morgan',
  'Taylor',
  'Jordan',
  'Casey',
  'Riley',
  'Avery',
  'Parker',
  'Quinn',
  'Sage',
  'River',
  'Skylar',
  'Rowan',
  'Phoenix',
  'Dakota',
  'Finley',
  'Emerson',
  'Reese',
  'Blake',
  'Kendall',
  'Hayden',
  'Cameron',
  'Drew',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Walker',
  'Hall',
  'Allen',
];

const ADJECTIVES = [
  'Amazing',
  'Brilliant',
  'Creative',
  'Dynamic',
  'Elegant',
  'Fantastic',
  'Genuine',
  'Happy',
  'Incredible',
  'Joyful',
  'Kind',
  'Lively',
  'Magnificent',
  'Noble',
];

const NOUNS = [
  'Thunder',
  'Phoenix',
  'Shadow',
  'Crystal',
  'Horizon',
  'Nebula',
  'Echo',
  'Pulse',
  'Vortex',
  'Zenith',
  'Aurora',
  'Cosmos',
  'Quantum',
  'Prism',
  'Apex',
  'Nexus',
];

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Books',
  'Home & Garden',
  'Sports',
  'Toys',
  'Beauty',
  'Automotive',
  'Food',
  'Health',
  'Music',
  'Gaming',
];

const ARTICLE_CATEGORIES = [
  'Technology',
  'Science',
  'Business',
  'Design',
  'Health',
  'Travel',
  'Food',
  'Lifestyle',
  'Education',
  'Entertainment',
];

const TAGS = [
  'javascript',
  'typescript',
  'react',
  'vue',
  'angular',
  'node',
  'python',
  'design',
  'tutorial',
  'news',
  'tips',
  'review',
  'guide',
  'beginner',
];

const POST_TEMPLATES = [
  'Just finished {activity}! Feeling {emotion}.',
  'Excited to share my latest {thing}. Check it out!',
  'Hot take: {opinion}. What do you think?',
  'Anyone else {feeling} about {topic}?',
  '{number} reasons why {topic} matters.',
  'Unpopular opinion: {statement}',
  'TIL: {fact}',
  'Reminder: {reminder}',
];

// ==================== Helper Functions ====================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateUsername(firstName: string, lastName: string): string {
  const rand = randomInt(1, 999);
  return `${firstName.toLowerCase()}${lastName.toLowerCase()}${rand}`;
}

function generateEmail(username: string): string {
  const domains = ['email.com', 'example.com', 'mail.com', 'inbox.com'];
  return `${username}@${randomItem(domains)}`;
}

function generateAvatar(name: string): string {
  // Using UI Avatars service for consistent avatars
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
}

// ==================== Generators ====================

/**
 * Generate a mock user
 */
export function generateMockUser(): MockUser {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const username = generateUsername(firstName, lastName);

  return {
    id: generateId(),
    name,
    username,
    email: generateEmail(username),
    avatar: generateAvatar(name),
    bio:
      Math.random() > 0.5
        ? `${randomItem(ADJECTIVES)} ${randomItem(NOUNS)}`
        : undefined,
    verified: Math.random() > 0.7,
    followers: randomInt(10, 10000),
    following: randomInt(10, 1000),
  };
}

/**
 * Generate multiple mock users
 */
export function generateMockUsers(count: number): MockUser[] {
  return Array.from({ length: count }, generateMockUser);
}

/**
 * Generate a mock post
 */
export function generateMockPost(userId?: string): MockPost {
  const template = randomItem(POST_TEMPLATES);
  const content = template
    .replace(
      '{activity}',
      randomItem(['coding', 'reading', 'learning', 'building']),
    )
    .replace(
      '{emotion}',
      randomItem(['great', 'excited', 'motivated', 'inspired']),
    )
    .replace(
      '{thing}',
      randomItem(['project', 'article', 'tutorial', 'design']),
    )
    .replace(
      '{opinion}',
      randomItem([
        'JavaScript is amazing',
        'TypeScript rocks',
        'React is the best',
      ]),
    )
    .replace(
      '{feeling}',
      randomItem(['excited', 'curious', 'confused', 'amazed']),
    )
    .replace(
      '{topic}',
      randomItem(['web development', 'design systems', 'performance']),
    )
    .replace('{number}', String(randomInt(3, 10)))
    .replace(
      '{statement}',
      randomItem(['Tabs > Spaces', 'Vim > Emacs', 'Dark mode only']),
    )
    .replace(
      '{fact}',
      randomItem(['something new', 'an interesting fact', 'a cool trick']),
    )
    .replace(
      '{reminder}',
      randomItem(['Stay hydrated', 'Take breaks', 'Back up your code']),
    );

  return {
    id: generateId(),
    userId: userId || generateId(),
    content,
    timestamp: new Date(Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000)), // Last 7 days
    likes: randomInt(0, 1000),
    comments: randomInt(0, 100),
    shares: randomInt(0, 50),
    images:
      Math.random() > 0.7
        ? Array.from(
            { length: randomInt(1, 4) },
            (_, i) =>
              `https://picsum.photos/400/300?random=${generateId()}-${i}`,
          )
        : undefined,
    tags: Math.random() > 0.5 ? randomItems(TAGS, randomInt(1, 3)) : undefined,
  };
}

/**
 * Generate multiple mock posts
 */
export function generateMockPosts(
  count: number,
  userIds?: string[],
): MockPost[] {
  return Array.from({ length: count }, () =>
    generateMockPost(userIds ? randomItem(userIds) : undefined),
  );
}

/**
 * Generate a mock product
 */
export function generateMockProduct(): MockProduct {
  const adjective = randomItem(ADJECTIVES);
  const noun = randomItem(NOUNS);
  const category = randomItem(CATEGORIES);

  return {
    id: generateId(),
    name: `${adjective} ${noun}`,
    description: `A high-quality ${noun.toLowerCase()} perfect for your ${category.toLowerCase()} needs.`,
    price: randomInt(10, 500) + 0.99,
    category,
    inStock: Math.random() > 0.2,
    quantity: randomInt(0, 100),
    imageUrl: `https://picsum.photos/300/300?random=${generateId()}`,
    rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 - 5.0
    reviews: randomInt(0, 500),
  };
}

/**
 * Generate multiple mock products
 */
export function generateMockProducts(count: number): MockProduct[] {
  return Array.from({ length: count }, generateMockProduct);
}

/**
 * Generate a mock comment
 */
export function generateMockComment(
  postId: string,
  userId?: string,
): MockComment {
  const comments = [
    'Great post!',
    'Thanks for sharing!',
    'I completely agree.',
    'Interesting perspective.',
    'This is exactly what I needed.',
    'Could you elaborate more?',
    'Nice work!',
    'Very helpful, thank you!',
  ];

  return {
    id: generateId(),
    postId,
    userId: userId || generateId(),
    content: randomItem(comments),
    timestamp: new Date(Date.now() - randomInt(0, 24 * 60 * 60 * 1000)), // Last 24 hours
    likes: randomInt(0, 50),
  };
}

/**
 * Generate multiple mock comments
 */
export function generateMockComments(
  count: number,
  postId: string,
  userIds?: string[],
): MockComment[] {
  return Array.from({ length: count }, () =>
    generateMockComment(postId, userIds ? randomItem(userIds) : undefined),
  );
}

/**
 * Generate a mock article
 */
export function generateMockArticle(): MockArticle {
  const title = `${randomItem(ADJECTIVES)} Guide to ${randomItem(NOUNS)}`;
  const category = randomItem(ARTICLE_CATEGORIES);

  return {
    id: generateId(),
    title,
    excerpt: `Learn about ${randomItem(NOUNS).toLowerCase()} and how it can improve your ${category.toLowerCase()} skills.`,
    content: `This is the full content of the article about ${title}. Lorem ipsum dolor sit amet.`,
    author: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
    category,
    tags: randomItems(TAGS, randomInt(2, 4)),
    publishedAt: new Date(Date.now() - randomInt(0, 30 * 24 * 60 * 60 * 1000)), // Last 30 days
    readTime: randomInt(3, 15),
    imageUrl: `https://picsum.photos/800/400?random=${generateId()}`,
  };
}

/**
 * Generate multiple mock articles
 */
export function generateMockArticles(count: number): MockArticle[] {
  return Array.from({ length: count }, generateMockArticle);
}

/**
 * Generate searchable items for search examples
 */
export interface SearchableItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

export function generateSearchableItems(count: number): SearchableItem[] {
  return Array.from({ length: count }, () => ({
    id: generateId(),
    title: `${randomItem(ADJECTIVES)} ${randomItem(NOUNS)}`,
    description: `A comprehensive ${randomItem(['guide', 'tutorial', 'overview', 'introduction'])} to ${randomItem(NOUNS).toLowerCase()}.`,
    category: randomItem(ARTICLE_CATEGORIES),
    tags: randomItems(TAGS, randomInt(2, 4)),
  }));
}
