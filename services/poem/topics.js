/**
 * Poem Topics - Random inspiration sources
 */

const TOPICS = {
  // Natural elements
  weather: [
    'morning fog',
    'afternoon rain',
    'the first snow',
    'summer heat',
    'autumn wind',
    'a passing cloud',
    'thunder in the distance',
    'dew on grass',
    'a rainbow fading',
    'frost on windows'
  ],

  // Time of day
  time: [
    'the hour before dawn',
    '3am thoughts',
    'golden hour',
    'the blue hour',
    'midnight',
    'the moment before sleep',
    'waking slowly',
    'a lazy afternoon',
    'dusk settling in',
    'the space between days'
  ],

  // Objects
  objects: [
    'an empty teacup',
    'old photographs',
    'a half-written letter',
    'keys on a hook',
    'a worn book',
    'a cracked mirror',
    'tangled headphones',
    'a flickering candle',
    'an unmade bed',
    'a window left open',
    'forgotten laundry',
    'a stopped clock',
    'yesterday\'s coffee',
    'a single sock',
    'dusty piano keys'
  ],

  // Emotions
  emotions: [
    'quiet contentment',
    'gentle melancholy',
    'unexpected joy',
    'soft anxiety',
    'nostalgia',
    'the ache of missing someone',
    'peaceful solitude',
    'hopeful uncertainty',
    'tender exhaustion',
    'bittersweet gratitude'
  ],

  // Colors
  colors: [
    'the color of silence',
    'dusty rose',
    'midnight blue',
    'the grey between storms',
    'faded yellow',
    'the orange of old streetlights',
    'sea glass green',
    'the white of empty pages',
    'bruise purple',
    'honey gold'
  ],

  // Abstract / surreal
  abstract: [
    'the weight of unspoken words',
    'the sound of growing older',
    'what the walls remember',
    'the taste of almost',
    'where lost things go',
    'the shape of waiting',
    'conversations with shadows',
    'the museum of small regrets',
    'letters to no one',
    'the library of unfinished dreams',
    'what the mirror doesn\'t show',
    'the geography of loneliness',
    'collecting moments',
    'the arithmetic of absence',
    'things that dissolve in light'
  ],

  // Small moments
  moments: [
    'the last sip',
    'finding an old receipt',
    'a stranger\'s laugh',
    'the bus arriving late',
    'forgetting why you walked into a room',
    'rereading an old text',
    'the smell of someone else\'s dinner',
    'a song you haven\'t heard in years',
    'noticing the moon during the day',
    'the click of a closing door'
  ]
};

// Poem styles
const STYLES = [
  'haiku',
  'short free verse',
  'couplets',
  'four line verse',
  'prose poem'
];

/**
 * Get a random item from an array
 */
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a random topic from any category
 */
function getRandomTopic() {
  const categories = Object.keys(TOPICS);
  const category = randomFrom(categories);
  const topic = randomFrom(TOPICS[category]);
  return { category, topic };
}

/**
 * Get a random style
 */
function getRandomStyle() {
  return randomFrom(STYLES);
}

/**
 * Get a random topic from a specific category
 */
function getTopicFromCategory(category) {
  if (TOPICS[category]) {
    return { category, topic: randomFrom(TOPICS[category]) };
  }
  return getRandomTopic();
}

module.exports = {
  TOPICS,
  STYLES,
  getRandomTopic,
  getRandomStyle,
  getTopicFromCategory,
  randomFrom
};
